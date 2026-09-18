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

-- WITH CHECK pins the WRITTEN status to 'pending' -- a member can
-- submit or resubmit a check (both go through this policy, since
-- submitIdentityVerification always upserts status: "pending"), but
-- can never write "verified"/"failed" themselves. Before Phase 8 this
-- policy had no WITH CHECK at all, which meant a member could call
-- supabase.from("identity_verifications").update({status: "verified"})
-- directly from their own session -- bypassing the vendor check (mock
-- today, HyperVerge later) entirely. Only resolve_mock_verification()
-- below (SECURITY DEFINER, so it bypasses this policy as the table
-- owner) is allowed to actually mark a row verified.
drop policy if exists "Users can insert own verification" on public.identity_verifications;
create policy "Users can insert own verification"
  on public.identity_verifications for insert
  with check (auth.uid() = profile_id and status = 'pending');

drop policy if exists "Users can update own verification" on public.identity_verifications;
create policy "Users can update own verification"
  on public.identity_verifications for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id and status = 'pending');

-- Stands in for the vendor webhook (see verification.ts) -- the one
-- legitimate way a row moves to "verified". SECURITY DEFINER lets it
-- write a status the policy above otherwise blocks, the same pattern
-- is_admin() and get_mutual_matches() already use to sidestep RLS.
create or replace function public.resolve_mock_verification()
returns void
language sql
security definer
set search_path = public
as $$
  update public.identity_verifications
  set status = 'verified',
      verified_at = now(),
      updated_at = now()
  where profile_id = auth.uid();
$$;

grant execute on function public.resolve_mock_verification() to authenticated;

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

-- WITH CHECK blocks one specific move: you can never flip your OWN
-- sent interest straight to "mutual" yourself (initiated_by = you).
-- Before Phase 8 this policy had no WITH CHECK, so a member could call
-- supabase.from("matches").update({status: "mutual"}) directly on a
-- row they'd initiated -- forcing a "mutual" match (and everything
-- that unlocks: profile reveal, messaging) with someone who never
-- actually accepted. actions/matches.ts already only ever completes a
-- match from the NON-initiating side (expressInterest's "they already
-- expressed interest in me" branch, and respondToInterest) -- this
-- just makes that the only path the database allows too. Declining
-- your own sent interest, and either side declining, are unaffected.
drop policy if exists "Users can update own matches" on public.matches;
create policy "Users can update own matches"
  on public.matches for update
  using (auth.uid() = candidate_a or auth.uid() = candidate_b)
  with check (
    (auth.uid() = candidate_a or auth.uid() = candidate_b)
    and not (status = 'mutual' and auth.uid() = initiated_by)
  );

-- ============================================================
-- Phase 9 (V1) — Member blocking
-- ============================================================
--
-- Declining a match (either from Browse's "Pass" or Received's
-- "Decline") is already effectively permanent in this schema: once
-- ANY matches row exists for a pair, get_match_candidates()'s
-- not-exists check below permanently excludes them from re-appearing
-- for either person, regardless of that row's status. So `blocks`
-- doesn't add a stronger technical exclusion than declining already
-- provides -- what it adds is: (1) an explicit, safety-framed action
-- distinct from an ordinary "not interested" decline, (2) a durable,
-- dedicated record so a member can actually see and manage who
-- they've blocked (declined matches aren't surfaced in any list
-- today), and (3) a signal that doesn't depend on the mutable
-- `matches` state machine, so it keeps working even if matching
-- logic changes later (e.g. a future "reconsider after 6 months"
-- feature should never resurrect someone a member deliberately
-- blocked). Placed here, before get_match_candidates() below, since
-- that function is about to reference this table -- a plain `language
-- sql` function is validated against the catalog at creation time,
-- so the table has to exist first.
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_not_self check (blocker_id <> blocked_id),
  constraint blocks_unique_pair unique (blocker_id, blocked_id)
);

alter table public.blocks enable row level security;

-- Deliberately NOT symmetric: you can see and manage your own
-- blocklist, but never whether someone else has blocked you (the
-- usual norm for this kind of feature, and it avoids giving a member
-- a reason to retaliate against whoever blocked them).
drop policy if exists "Members can view their own blocklist" on public.blocks;
create policy "Members can view their own blocklist"
  on public.blocks for select
  using (blocker_id = auth.uid());

drop policy if exists "Members can block others" on public.blocks;
create policy "Members can block others"
  on public.blocks for insert
  with check (blocker_id = auth.uid());

drop policy if exists "Members can unblock" on public.blocks;
create policy "Members can unblock"
  on public.blocks for delete
  using (blocker_id = auth.uid());

-- Masked summary for the "Blocked members" list on /account -- same
-- initial/age/location/verified shape as the other pre-reveal lists
-- (get_match_candidates, get_received_interests), since blocking
-- doesn't require or imply an Elite unlock.
create or replace function public.get_blocked_members()
returns table (
  blocked_id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  blocked_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as blocked_id,
    p.age,
    p.location,
    left(p.full_name, 1) as initial,
    coalesce(iv.status = 'verified', false) as is_verified,
    b.created_at as blocked_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  left join public.identity_verifications iv on iv.profile_id = p.id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

grant execute on function public.get_blocked_members() to authenticated;

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
    -- Phase 9: never resurface someone in either blocking direction,
    -- independent of the matches-row check above (a block can exist
    -- with no prior match row at all -- see blocks table below).
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
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
-- (get_mutual_matches() itself is defined once, in the Phase 5
-- section below, where it grew an `is_unlocked` column for the Elite
-- paywall — keeping only one definition avoids the exact
-- "cannot change return type of existing function" error a stale
-- second definition caused on re-runs.)

-- ============================================================
-- Phase 5 — Payments & paywall (Razorpay, Elite tier)
-- ============================================================

alter table public.profiles
  add column if not exists subscription_tier text not null default 'free' check (subscription_tier in ('free', 'elite')),
  add column if not exists subscription_expires_at timestamptz;

-- One row per Razorpay order this member started. `status` moves
-- created -> paid (signature verified server-side) or -> failed
-- (signature mismatch). Only ever written by the member's own
-- server actions, using their own session — never a service-role key.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  amount integer not null,
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = profile_id);

drop policy if exists "Users can create own payments" on public.payments;
create policy "Users can create own payments"
  on public.payments for insert
  with check (auth.uid() = profile_id and status = 'created');

-- WITH CHECK pins the WRITTEN status back to 'created' -- before
-- Phase 8 this policy had none, so a member could call
-- supabase.from("payments").update({status: "paid"}) on their own
-- order directly, planting a fake "paid" row without ever going
-- through Razorpay or the HMAC signature check in
-- verifyElitePayment(). It couldn't grant Elite by itself even then
-- (profiles.subscription_tier is separately locked down below), but
-- it could leave forged payment history lying around. Now the only
-- way a row actually becomes "paid" or "failed" is
-- finalize_elite_payment() / mark_payment_failed() below, both
-- SECURITY DEFINER and both called only after verifyElitePayment has
-- already checked the signature server-side.
drop policy if exists "Users can update own payments" on public.payments;
create policy "Users can update own payments"
  on public.payments for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id and status = 'created');

-- Called by verifyElitePayment() ONLY after the HMAC-SHA256 signature
-- check passes. Marks the matching "created" order paid and activates
-- Elite in one transaction. SECURITY DEFINER so it can write
-- payments.status and profiles.subscription_tier/expires_at, both
-- locked against direct member writes (see the policy above and the
-- column-privilege revoke below). Returns false if there's no
-- matching "created" order for this caller to finalize (already
-- finalized, wrong order, or not theirs) so the caller can surface a
-- clear error instead of silently no-op'ing.
create or replace function public.finalize_elite_payment(
  p_order_id text,
  p_payment_id text,
  p_period_days integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.payments
  where razorpay_order_id = p_order_id
    and profile_id = auth.uid()
    and status = 'created';

  if v_id is null then
    return false;
  end if;

  update public.payments
  set status = 'paid',
      razorpay_payment_id = p_payment_id,
      verified_at = now()
  where id = v_id;

  update public.profiles
  set subscription_tier = 'elite',
      subscription_expires_at = now() + make_interval(days => p_period_days),
      updated_at = now()
  where id = auth.uid();

  return true;
end;
$$;

grant execute on function public.finalize_elite_payment(text, text, integer) to authenticated;

-- Called by verifyElitePayment() when the signature check fails.
-- SECURITY DEFINER for the same reason as finalize_elite_payment()
-- above; only ever moves a caller's own "created" order to "failed".
create or replace function public.mark_payment_failed(p_order_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.payments
  set status = 'failed'
  where razorpay_order_id = p_order_id
    and profile_id = auth.uid()
    and status = 'created';
$$;

grant execute on function public.mark_payment_failed(text) to authenticated;

-- get_mutual_matches (Phase 4) now needs to withhold full_name/
-- about_me from members who aren't on an active Elite subscription —
-- DROP + CREATE because its return columns changed (added
-- is_unlocked), and CREATE OR REPLACE can't change a RETURNS TABLE
-- function's column list.
drop function if exists public.get_mutual_matches();

create function public.get_mutual_matches()
returns table (
  match_id uuid,
  candidate_id uuid,
  full_name text,
  age integer,
  location text,
  about_me text,
  is_verified boolean,
  matched_at timestamptz,
  is_unlocked boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select
      (
        subscription_tier = 'elite'
        and (subscription_expires_at is null or subscription_expires_at > now())
      ) as unlocked
    from public.profiles
    where id = auth.uid()
  )
  select
    m.id as match_id,
    p.id as candidate_id,
    case when me.unlocked then p.full_name else null end as full_name,
    p.age,
    p.location,
    case when me.unlocked then p.about_me else null end as about_me,
    coalesce(iv.status = 'verified', false) as is_verified,
    m.updated_at as matched_at,
    coalesce(me.unlocked, false) as is_unlocked
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  cross join me
  where (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status = 'mutual'
    -- Phase 9 belt-and-suspenders: blockMember() already declines the
    -- underlying match, which alone would drop it from this list, but
    -- this makes the exclusion hold even if that update somehow
    -- didn't land.
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by m.updated_at desc;
$$;

grant execute on function public.get_mutual_matches() to authenticated;

-- ============================================================
-- Phase 6 — Messaging (unlocked only after a mutual match, and
-- only for an active Elite subscription — the same gate as the
-- profile-reveal in get_mutual_matches above)
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

-- V1 (Phase 11) — message milestone tagging (PRD §8/§12). A milestone
-- row is an ordinary message (same insert policy, same participant/
-- mutual/Elite gate below) that also carries one of these four stage
-- tags. The UI renders a milestone row as a distinct divider instead
-- of a normal chat bubble and ignores its `body` — body still has to
-- satisfy the not-empty check above, so it's set to the milestone
-- code itself, never shown. A match's "current" stage is just the
-- most recently tagged message in its thread (see the three
-- functions below) -- deliberately not enforced as a one-way
-- progression, so either participant can (re)tag at their own pace.
alter table public.messages
  add column if not exists milestone text
    check (
      milestone is null
      or milestone in ('getting_to_know', 'family_intro', 'video_call', 'planning_to_meet')
    );

alter table public.messages enable row level security;

-- Either participant in the match can read the whole thread — this
-- is shared data between two consenting matched members, unlike the
-- profile-reveal case above, so a normal RLS policy is enough (no
-- SECURITY DEFINER function needed for reads).
drop policy if exists "Match participants can view messages" on public.messages;
create policy "Match participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    )
  );

-- Sending is gated three ways, all enforced here (not just in the
-- app): you must be the sender, the match must actually be mutual,
-- and YOUR OWN subscription must be active Elite — mirrors the PRD's
-- "Elite gates the message action" rule (build plan, Section 5).
drop policy if exists "Elite members can message their mutual matches" on public.messages;
create policy "Elite members can message their mutual matches"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and m.status = 'mutual'
        and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.subscription_tier = 'elite'
        and (p.subscription_expires_at is null or p.subscription_expires_at > now())
    )
    -- Phase 9 belt-and-suspenders, same reasoning as
    -- get_mutual_matches() above.
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = (
        select case when m2.candidate_a = auth.uid() then m2.candidate_b else m2.candidate_a end
        from public.matches m2 where m2.id = messages.match_id
      ))
      or (b.blocked_id = auth.uid() and b.blocker_id = (
        select case when m2.candidate_a = auth.uid() then m2.candidate_b else m2.candidate_a end
        from public.matches m2 where m2.id = messages.match_id
      ))
    )
  );

-- Single-match version of get_mutual_matches, for the thread header:
-- who am I talking to, and is my own subscription unlocked (so the
-- page can show the upgrade prompt instead of the thread otherwise).
create or replace function public.get_match_thread(p_match_id uuid)
returns table (
  match_id uuid,
  candidate_id uuid,
  full_name text,
  age integer,
  location text,
  is_verified boolean,
  is_unlocked boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select
      (
        subscription_tier = 'elite'
        and (subscription_expires_at is null or subscription_expires_at > now())
      ) as unlocked
    from public.profiles
    where id = auth.uid()
  )
  select
    m.id as match_id,
    p.id as candidate_id,
    case when me.unlocked then p.full_name else null end as full_name,
    p.age,
    p.location,
    coalesce(iv.status = 'verified', false) as is_verified,
    coalesce(me.unlocked, false) as is_unlocked
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  cross join me
  where m.id = p_match_id
    and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status = 'mutual'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    );
$$;

grant execute on function public.get_match_thread(uuid) to authenticated;

-- ============================================================
-- Phase 7 — Admin basics (reports + manual verification review)
-- ============================================================

-- No self-serve way to become an admin — deliberately. Grant it to
-- your own account once, directly in the SQL Editor:
--   update public.profiles set is_admin = true where id = '<your auth user id>';
-- (Find your user id under Authentication -> Users in the dashboard.)
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- A plain `exists (select ... from profiles where ...)` INSIDE a
-- policy ON profiles recurses — Postgres re-applies every policy on
-- profiles (including this one) to that inner subquery, forever,
-- and fails with "infinite recursion detected in policy for relation
-- profiles". A SECURITY DEFINER function sidesteps this the same way
-- get_mutual_matches() etc. already sidestep RLS to read other
-- members' rows: it runs as the function's owner, which bypasses RLS
-- entirely for the query inside it, so calling it from a policy
-- never re-enters policy evaluation.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- One row per report a member files against another. V0 scopes
-- reporting to a mutual-match conversation (see README) — that's the
-- one place a member actually knows enough about who they're talking
-- to to have something concrete to report.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) > 0 and char_length(reason) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

alter table public.reports enable row level security;

drop policy if exists "Members can file their own reports" on public.reports;
create policy "Members can file their own reports"
  on public.reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "Members can view reports they filed" on public.reports;
create policy "Members can view reports they filed"
  on public.reports for select
  using (reporter_id = auth.uid());

drop policy if exists "Admins can view all reports" on public.reports;
create policy "Admins can view all reports"
  on public.reports for select
  using (
    public.is_admin()
  );

drop policy if exists "Admins can resolve reports" on public.reports;
create policy "Admins can resolve reports"
  on public.reports for update
  using (
    public.is_admin()
  );

-- Trust & safety oversight is deliberately NOT gated by the Elite
-- paywall — that gate is between members, not between a member and
-- whoever is running the platform. These two policies are additive
-- (OR'd with the existing "own row only" policies), scoped strictly
-- to is_admin accounts, and don't touch the base member-facing
-- policies at all.
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    public.is_admin()
  );

drop policy if exists "Admins can view all verifications" on public.identity_verifications;
create policy "Admins can view all verifications"
  on public.identity_verifications for select
  using (
    public.is_admin()
  );

drop policy if exists "Admins can update all verifications" on public.identity_verifications;
create policy "Admins can update all verifications"
  on public.identity_verifications for update
  using (
    public.is_admin()
  );

-- ============================================================
-- Phase 8 — Polish & harden (security pass)
-- ============================================================

-- profiles.is_admin, .subscription_tier and .subscription_expires_at
-- are all "privileged" columns: is_admin is granted by hand in the SQL
-- Editor only (see README); subscription_tier/expires_at are only
-- ever supposed to change via finalize_elite_payment() above, after a
-- real Razorpay signature check.
--
-- Row-level policies can't protect individual columns -- "Users can
-- update own profile" (Phase 2) correctly restricts WHICH ROW a
-- member can touch, but says nothing about WHICH COLUMNS, and
-- Supabase grants `authenticated` write access to every column by
-- default. That meant, until this revoke, any signed-in member could
-- call supabase.from("profiles").update({is_admin: true}) — or
-- {subscription_tier: "elite"} — on their OWN row directly, with no
-- server action, no payment, and no admin involved, and RLS would
-- happily allow it (auth.uid() = id was the only thing being
-- checked). This is the most serious finding from the Phase 8 review:
-- a straight privilege-escalation / free-Elite hole open since Phase
-- 7 (is_admin) and Phase 5 (subscription_tier) were added.
--
-- The fix is a column-level privilege revoke, not another RLS policy
-- -- Postgres RLS has no concept of "this column, not that one",
-- while GRANT/REVOKE does. After this, ordinary member writes to
-- these three columns are rejected at the permissions layer before
-- RLS is even evaluated; the SECURITY DEFINER functions above/below
-- can still write them because they run as the function owner, which
-- isn't subject to these grants.
revoke insert (is_admin, subscription_tier, subscription_expires_at)
  on public.profiles from authenticated;
revoke update (is_admin, subscription_tier, subscription_expires_at)
  on public.profiles from authenticated;

-- ============================================================
-- Phase 10 (V1) — Family Collaborator accounts
-- ============================================================
--
-- Scoped-down V1 slice of the PRD's full Family Collaborator model
-- (see build plan §3/§5): a candidate generates a shareable invite
-- link from their own account and sends it themselves (WhatsApp, SMS,
-- however they like); whoever opens it creates their own login and
-- gets persistent, read-only access to that one candidate's basic
-- profile plus the status of matches the candidate has explicitly
-- chosen to share — nothing else. Deliberately NOT built this round:
-- a parent creating a profile before the candidate exists, and a
-- sibling/friend proxy-creator flow with auto-expiring access (the
-- PRD's fuller model) — both are real extra scope and can be added
-- later without disturbing this table.
--
-- One row per invite/link. `collaborator_id` stays null until
-- claimed; a partial unique index below keeps at most one live
-- (pending or active) link per owner at a time, matching the PRD's
-- "steady state: only the Owner and (optionally) one persistent
-- family collaborator" model (§5).
create table if not exists public.account_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  collaborator_id uuid references auth.users (id) on delete cascade,
  collaborator_name text,
  role text not null default 'family_collaborator' check (role in ('family_collaborator')),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  invite_code text not null unique,
  invite_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint account_links_not_self check (collaborator_id is distinct from owner_id)
);

create unique index if not exists account_links_one_live_per_owner
  on public.account_links (owner_id)
  where status in ('pending', 'active');

alter table public.account_links enable row level security;

-- Owners manage their own invite/link rows directly (create, view,
-- revoke). Claiming an invite is deliberately NOT a client-side
-- update policy -- see claim_family_invite() below for why.
drop policy if exists "Owners can view their family links" on public.account_links;
create policy "Owners can view their family links"
  on public.account_links for select
  using (owner_id = auth.uid());

drop policy if exists "Owners can create family invites" on public.account_links;
create policy "Owners can create family invites"
  on public.account_links for insert
  with check (
    owner_id = auth.uid()
    and status = 'pending'
    and collaborator_id is null
  );

drop policy if exists "Owners can revoke family links" on public.account_links;
create policy "Owners can revoke family links"
  on public.account_links for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status = 'revoked');

-- A collaborator can see the links where THEY are the linked
-- collaborator, once active -- never the pending/unclaimed state of
-- someone else's invite.
drop policy if exists "Collaborators can view their active links" on public.account_links;
create policy "Collaborators can view their active links"
  on public.account_links for select
  using (collaborator_id = auth.uid() and status = 'active');

-- Candidate-controlled, per-mutual-match visibility to a family
-- collaborator. Defaults to false -- sharing is always opt-in, never
-- automatic, per the PRD's family-sharing rule (§5, §7).
alter table public.matches
  add column if not exists shared_with_family boolean not null default false;

-- Looking a pending invite up by its code, before the person decides
-- whether to accept it. Deliberately returns only the owner's first
-- name -- granted to `authenticated` only (not `anon`), so this never
-- runs until the person has at least signed in or created an account,
-- even though the code itself carries enough entropy (a v4 UUID) that
-- guessing one isn't realistic either way.
--
-- `is_self` (added after the first V1 delivery) tells the caller
-- whether the signed-in user IS the invite's own owner, WITHOUT
-- excluding that row from the result -- the first version filtered it
-- out entirely (`and al.owner_id <> auth.uid()`), which meant a
-- candidate testing their own freshly-generated link while still
-- signed in as themselves saw a generic "this invite isn't valid"
-- message, indistinguishable from a genuinely expired/used one.
-- claim_family_invite() below still independently refuses to let an
-- owner claim their own invite -- this change is UI clarity only, not
-- a security change. drop+create (not create-or-replace) because the
-- return columns changed, which Postgres doesn't allow in place.
drop function if exists public.get_family_invite_preview(text);
create function public.get_family_invite_preview(p_code text)
returns table (owner_first_name text, is_valid boolean, is_self boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    split_part(p.full_name, ' ', 1) as owner_first_name,
    true as is_valid,
    (al.owner_id = auth.uid()) as is_self
  from public.account_links al
  join public.profiles p on p.id = al.owner_id
  where al.invite_code = p_code
    and al.status = 'pending'
    and al.collaborator_id is null
    and al.invite_expires_at > now();
$$;

grant execute on function public.get_family_invite_preview(text) to authenticated;

-- Claiming an invite has to happen as a SECURITY DEFINER function,
-- not a client-side "update account_links set collaborator_id = ..."
-- policy -- a policy's USING clause can't verify that the caller
-- actually knows the secret invite_code (that check only lives in the
-- query text, which RLS doesn't enforce), so a broad policy allowing
-- "any signed-in user can claim any pending, unclaimed row" would let
-- someone claim a stranger's invite without ever seeing the code.
-- This function does the code check itself, the same pattern
-- is_admin() and resolve_mock_verification() already use for
-- controlled mutation outside ordinary RLS.
create or replace function public.claim_family_invite(p_code text, p_name text)
returns table (owner_id uuid, owner_first_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
  v_owner_id uuid;
begin
  select al.id, al.owner_id into v_link_id, v_owner_id
  from public.account_links al
  where al.invite_code = p_code
    and al.status = 'pending'
    and al.collaborator_id is null
    and al.invite_expires_at > now()
  limit 1;

  if v_link_id is null or v_owner_id = auth.uid() then
    return;
  end if;

  update public.account_links
  set collaborator_id = auth.uid(),
      collaborator_name = nullif(btrim(coalesce(p_name, '')), ''),
      status = 'active',
      accepted_at = now()
  where id = v_link_id;

  return query
    select p.id, split_part(p.full_name, ' ', 1)
    from public.profiles p
    where p.id = v_owner_id;
end;
$$;

grant execute on function public.claim_family_invite(text, text) to authenticated;

-- The candidate's own basic profile fields, read-only, for whoever
-- they've linked as a Family Collaborator -- deliberately NOT a
-- broad RLS select policy on `profiles` (same reasoning as the
-- get_match_candidates()-family of functions above: profiles stays
-- locked to "only I can read my own row", and every other-member read
-- is a hand-picked column list from a SECURITY DEFINER function).
create or replace function public.get_family_links_for_collaborator()
returns table (
  link_id uuid,
  owner_id uuid,
  owner_full_name text,
  owner_profile_type text,
  owner_age integer,
  owner_location text,
  owner_about_me text,
  linked_since timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    al.id as link_id,
    p.id as owner_id,
    p.full_name as owner_full_name,
    p.profile_type as owner_profile_type,
    p.age as owner_age,
    p.location as owner_location,
    p.about_me as owner_about_me,
    al.accepted_at as linked_since
  from public.account_links al
  join public.profiles p on p.id = al.owner_id
  where al.collaborator_id = auth.uid() and al.status = 'active'
  order by al.accepted_at desc;
$$;

grant execute on function public.get_family_links_for_collaborator() to authenticated;

-- Status only, per the PRD (§5): "see whether a match is
-- pending/mutual (status only)". Deliberately returns no identity of
-- the other candidate in the match -- not their name, initial, age,
-- or location -- since the PRD is explicit that a Family Collaborator
-- reviews matches the candidate shared, not the match's counterpart.
create or replace function public.get_family_shared_matches(p_owner_id uuid)
returns table (match_id uuid, status text, matched_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select m.id as match_id, m.status, m.updated_at as matched_at
  from public.matches m
  where (m.candidate_a = p_owner_id or m.candidate_b = p_owner_id)
    and m.shared_with_family = true
    and m.status = 'mutual'
    and exists (
      select 1 from public.account_links al
      where al.collaborator_id = auth.uid()
        and al.status = 'active'
        and al.owner_id = p_owner_id
    )
  order by m.updated_at desc;
$$;

grant execute on function public.get_family_shared_matches(uuid) to authenticated;

-- Toggling shared_with_family is done through a function rather than
-- a direct client update, so it never has to interact with the
-- existing "Users can update own matches" WITH CHECK clause (Phase 8)
-- -- that clause blocks the ORIGINAL interest-sender from ever
-- setting status = 'mutual' themselves, evaluated against the NEW
-- row on every update including ones that leave status untouched, so
-- a plain client-side update to just this one column would have been
-- silently rejected whenever the candidate toggling it happened to be
-- the one who sent the original interest. This function only ever
-- touches shared_with_family (not status, not updated_at, so the
-- Mutual list's sort order by updated_at is undisturbed by sharing
-- toggles), and checks match participancy itself.
create or replace function public.set_match_family_sharing(p_match_id uuid, p_shared boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.matches
  set shared_with_family = p_shared
  where id = p_match_id
    and status = 'mutual'
    and (candidate_a = auth.uid() or candidate_b = auth.uid());
$$;

grant execute on function public.set_match_family_sharing(uuid, boolean) to authenticated;

-- ============================================================
-- Phase 11 (V1) — Message milestone tagging (PRD §8/§12)
-- ============================================================
-- The `milestone` column itself was added directly on the `messages`
-- table above (Phase 6 section), since ALTER TABLE has no ordering
-- constraint. These three read functions are re-created here instead
-- of in place, for two reasons: they now need to reference
-- public.messages, which doesn't exist yet at their original
-- (earlier) position in this file, and DROP + CREATE is required
-- anyway since their return columns are changing (see the existing
-- get_mutual_matches note above for why CREATE OR REPLACE can't do
-- this). Whichever version runs last during a full re-run of this
-- file is the one that takes effect, which is this one.

drop function if exists public.get_mutual_matches();

create function public.get_mutual_matches()
returns table (
  match_id uuid,
  candidate_id uuid,
  full_name text,
  age integer,
  location text,
  about_me text,
  is_verified boolean,
  matched_at timestamptz,
  is_unlocked boolean,
  current_milestone text
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select
      (
        subscription_tier = 'elite'
        and (subscription_expires_at is null or subscription_expires_at > now())
      ) as unlocked
    from public.profiles
    where id = auth.uid()
  )
  select
    m.id as match_id,
    p.id as candidate_id,
    case when me.unlocked then p.full_name else null end as full_name,
    p.age,
    p.location,
    case when me.unlocked then p.about_me else null end as about_me,
    coalesce(iv.status = 'verified', false) as is_verified,
    m.updated_at as matched_at,
    coalesce(me.unlocked, false) as is_unlocked,
    (
      select msg.milestone
      from public.messages msg
      where msg.match_id = m.id and msg.milestone is not null
      order by msg.created_at desc
      limit 1
    ) as current_milestone
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  cross join me
  where (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status = 'mutual'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by m.updated_at desc;
$$;

grant execute on function public.get_mutual_matches() to authenticated;

drop function if exists public.get_match_thread(uuid);

create function public.get_match_thread(p_match_id uuid)
returns table (
  match_id uuid,
  candidate_id uuid,
  full_name text,
  age integer,
  location text,
  is_verified boolean,
  is_unlocked boolean,
  current_milestone text
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select
      (
        subscription_tier = 'elite'
        and (subscription_expires_at is null or subscription_expires_at > now())
      ) as unlocked
    from public.profiles
    where id = auth.uid()
  )
  select
    m.id as match_id,
    p.id as candidate_id,
    case when me.unlocked then p.full_name else null end as full_name,
    p.age,
    p.location,
    coalesce(iv.status = 'verified', false) as is_verified,
    coalesce(me.unlocked, false) as is_unlocked,
    (
      select msg.milestone
      from public.messages msg
      where msg.match_id = m.id and msg.milestone is not null
      order by msg.created_at desc
      limit 1
    ) as current_milestone
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  cross join me
  where m.id = p_match_id
    and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status = 'mutual'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    );
$$;

grant execute on function public.get_match_thread(uuid) to authenticated;

drop function if exists public.get_family_shared_matches(uuid);

create function public.get_family_shared_matches(p_owner_id uuid)
returns table (match_id uuid, status text, matched_at timestamptz, current_milestone text)
language sql
security definer
set search_path = public
stable
as $$
  select
    m.id as match_id,
    m.status,
    m.updated_at as matched_at,
    (
      select msg.milestone
      from public.messages msg
      where msg.match_id = m.id and msg.milestone is not null
      order by msg.created_at desc
      limit 1
    ) as current_milestone
  from public.matches m
  where (m.candidate_a = p_owner_id or m.candidate_b = p_owner_id)
    and m.shared_with_family = true
    and m.status = 'mutual'
    and exists (
      select 1 from public.account_links al
      where al.collaborator_id = auth.uid()
        and al.status = 'active'
        and al.owner_id = p_owner_id
    )
  order by m.updated_at desc;
$$;

grant execute on function public.get_family_shared_matches(uuid) to authenticated;
