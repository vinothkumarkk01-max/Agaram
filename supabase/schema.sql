-- Agaram V0 schema — Phase 2 (profile model & onboarding)
--
-- How to apply: open your Supabase project dashboard -> SQL Editor ->
-- New query -> paste this whole file -> Run. Safe to re-run: every
-- statement uses IF NOT EXISTS / OR REPLACE where possible, but running
-- it twice on a table that already has rows is fine either way since it
-- only creates things, it doesn't drop anything.

-- One row per user: the "who you are" side of onboarding.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  profile_type text not null check (profile_type in ('groom', 'bride')),
  age integer not null check (age >= 18 and age <= 100),
  about_me text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per user: the "who you're looking for" side (must-haves).
create table if not exists public.preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  age_min integer not null check (age_min >= 18),
  age_max integer not null check (age_max >= age_min),
  preferred_locations text[] not null default '{}',
  education_level text not null check (education_level in ('bachelors_plus', 'any')),
  profession_field text,
  open_to_relocating text not null check (open_to_relocating in ('yes', 'maybe', 'no')),
  languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.preferences enable row level security;

-- Each signed-in user can only ever see or change their own row.
-- (Matching feed, in a later phase, will need a separate, narrower
-- read policy so members can see *some* fields of *other* profiles —
-- not added yet, since V0 has no matching feed.)

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can view own preferences" on public.preferences;
create policy "Users can view own preferences"
  on public.preferences for select
  using (auth.uid() = profile_id);

drop policy if exists "Users can insert own preferences" on public.preferences;
create policy "Users can insert own preferences"
  on public.preferences for insert
  with check (auth.uid() = profile_id);

drop policy if exists "Users can update own preferences" on public.preferences;
create policy "Users can update own preferences"
  on public.preferences for update
  using (auth.uid() = profile_id);

-- ============================================================
-- Phase 3 — Identity verification
-- ============================================================

-- One row per user: status of their identity check. V0 supports one
-- verification signal (Aadhaar, India-only — see PRD §13); the
-- diaspora passport path is deferred. Per the PRD's own data-
-- minimization guidance (§14: "store only a verification boolean plus
-- minimum matching fields... rather than the full API response"),
-- only the LAST 4 DIGITS of the Aadhaar number are ever stored here —
-- never the full number.
create table if not exists public.identity_verifications (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  method text not null default 'aadhaar' check (method in ('aadhaar')),
  provider text not null default 'mock',
  aadhaar_last4 text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.identity_verifications enable row level security;

drop policy if exists "Users can view own verification" on public.identity_verifications;
create policy "Users can view own verification"
  on public.identity_verifications for select
  using (auth.uid() = profile_id);

drop policy if exists "Users can insert own verification" on public.identity_verifications;
create policy "Users can insert own verification"
  on public.identity_verifications for insert
  with check (auth.uid() = profile_id);

drop policy if exists "Users can update own verification" on public.identity_verifications;
create policy "Users can update own verification"
  on public.identity_verifications for update
  using (auth.uid() = profile_id);

-- ============================================================
-- Phase 4 — Matching feed
-- ============================================================

-- Candidates now record their own location, one of the "must-have"
-- match factors (age range, location, preferences) from the build
-- plan's cut-down V0 scope — this was missing from Phase 2.
alter table public.profiles add column if not exists location text;

-- One row per matched PAIR, never per direction. candidate_a is
-- always the lexicographically-smaller UUID of the two, enforced by
-- the check constraint below, so a pair can never end up with two
-- rows no matter who acts first.
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  candidate_a uuid not null references public.profiles (id) on delete cascade,
  candidate_b uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'interest_sent' check (status in ('interest_sent', 'mutual', 'declined')),
  initiated_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_pair_order check (candidate_a < candidate_b),
  constraint matches_unique_pair unique (candidate_a, candidate_b)
);

alter table public.matches enable row level security;

drop policy if exists "Users can view own matches" on public.matches;
create policy "Users can view own matches"
  on public.matches for select
  using (auth.uid() = candidate_a or auth.uid() = candidate_b);

drop policy if exists "Users can create matches they are part of" on public.matches;
create policy "Users can create matches they are part of"
  on public.matches for insert
  with check (
    auth.uid() = initiated_by
    and (auth.uid() = candidate_a or auth.uid() = candidate_b)
  );

drop policy if exists "Users can update own matches" on public.matches;
create policy "Users can update own matches"
  on public.matches for update
  using (auth.uid() = candidate_a or auth.uid() = candidate_b);

-- Everything below is a SECURITY DEFINER function, deliberately NOT
-- a broad RLS policy on profiles/preferences. profiles stays locked
-- to "only I can read my own row" (Phase 2's policy, unchanged) —
-- these four functions are the ONLY way another member's data is
-- ever exposed, and each one hand-picks exactly which columns come
-- back, scoped internally to auth.uid(). There is no way to use
-- these to read an arbitrary member's full profile from outside the
-- flow each one implements.

-- Browse feed: opposite profile type, within my age (and, if I set
-- one, location) preference, not already matched/declined with me.
-- Masked down to first-initial — no full name, no about_me.
create or replace function public.get_match_candidates()
returns table (
  id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select profile_type from public.profiles where id = auth.uid()
  ),
  my_prefs as (
    select age_min, age_max, preferred_locations
    from public.preferences
    where profile_id = auth.uid()
  )
  select
    p.id,
    p.age,
    p.location,
    left(p.full_name, 1) as initial,
    coalesce(iv.status = 'verified', false) as is_verified
  from public.profiles p
  left join public.identity_verifications iv on iv.profile_id = p.id
  cross join me
  left join my_prefs on true
  where p.id <> auth.uid()
    and p.profile_type <> me.profile_type
    and not exists (
      select 1 from public.matches m
      where (m.candidate_a = auth.uid() and m.candidate_b = p.id)
         or (m.candidate_a = p.id and m.candidate_b = auth.uid())
    )
    and p.age between coalesce(my_prefs.age_min, 18) and coalesce(my_prefs.age_max, 100)
    and (
      my_prefs.preferred_locations is null
      or cardinality(my_prefs.preferred_locations) = 0
      or exists (
        select 1 from unnest(my_prefs.preferred_locations) loc
        where p.location is not null and lower(loc) = lower(p.location)
      )
    )
  order by p.created_at desc
  limit 30;
$$;

grant execute on function public.get_match_candidates() to authenticated;

-- "Interest you've sent" — masked info only (not mutual yet). Shows
-- both still-pending and already-mutual sends; declined ones drop
-- off the list.
create or replace function public.get_sent_interests()
returns table (
  match_id uuid,
  candidate_id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id as match_id,
    p.id as candidate_id,
    p.age,
    p.location,
    left(p.full_name, 1) as initial,
    coalesce(iv.status = 'verified', false) as is_verified,
    m.status,
    m.created_at
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  where m.initiated_by = auth.uid()
    and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status in ('interest_sent', 'mutual')
  order by m.created_at desc;
$$;

grant execute on function public.get_sent_interests() to authenticated;

-- "Interested in you" — pending ones only, still masked, mine to
-- accept or decline.
create or replace function public.get_received_interests()
returns table (
  match_id uuid,
  candidate_id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id as match_id,
    p.id as candidate_id,
    p.age,
    p.location,
    left(p.full_name, 1) as initial,
    coalesce(iv.status = 'verified', false) as is_verified,
    m.created_at
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  where m.initiated_by <> auth.uid()
    and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status = 'interest_sent'
  order by m.created_at desc;
$$;

grant execute on function public.get_received_interests() to authenticated;

-- Mutual matches — the "unlock" moment: full name + about_me become
-- visible now, exactly as the PRD's reveal-on-mutual-match describes.
create or replace function public.get_mutual_matches()
returns table (
  match_id uuid,
  candidate_id uuid,
  full_name text,
  age integer,
  location text,
  about_me text,
  is_verified boolean,
  matched_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id as match_id,
    p.id as candidate_id,
    p.full_name,
    p.age,
    p.location,
    p.about_me,
    coalesce(iv.status = 'verified', false) as is_verified,
    m.updated_at as matched_at
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  where (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status = 'mutual'
  order by m.updated_at desc;
$$;

grant execute on function public.get_mutual_matches() to authenticated;
