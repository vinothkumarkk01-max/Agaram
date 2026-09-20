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
--
-- DROP + CREATE, not CREATE OR REPLACE: later phases (23, 29) change
-- this function's return column list, and re-running this whole file
-- against a database that already has one of those later shapes
-- applied would otherwise fail right here with "cannot change return
-- type of existing function" — the exact bug already called out and
-- fixed for get_mutual_matches()/get_match_thread() below; this
-- definition just hadn't been brought in line with that fix yet.
drop function if exists public.get_match_candidates();

create function public.get_match_candidates()
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
--
-- DROP + CREATE, not CREATE OR REPLACE — same reason as
-- get_match_candidates() just above: later phases change this
-- function's return columns too.
drop function if exists public.get_sent_interests();

create function public.get_sent_interests()
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
--
-- DROP + CREATE, not CREATE OR REPLACE — same reason as
-- get_match_candidates() above.
drop function if exists public.get_received_interests();

create function public.get_received_interests()
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
-- (or renews) Elite in one transaction. SECURITY DEFINER so it can
-- write payments.status and profiles.subscription_tier/expires_at,
-- both locked against direct member writes (see the policy above and
-- the column-privilege revoke below). Returns false if there's no
-- matching "created" order for this caller to finalize (already
-- finalized, wrong order, or not theirs) so the caller can surface a
-- clear error instead of silently no-op'ing.
--
-- Renewal note (V1): the new expiry EXTENDS from whichever is later
-- — the member's current subscription_expires_at, or now() —
-- rather than always resetting from now(). Someone renewing a few
-- weeks before their Elite lapses keeps the remaining paid days
-- instead of losing them; someone renewing after it's already
-- expired (or a first-time purchase, subscription_expires_at null)
-- simply starts fresh from now(), same as before.
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
      subscription_expires_at =
        greatest(now(), coalesce(subscription_expires_at, now()))
        + make_interval(days => p_period_days),
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
-- DROP + CREATE, not CREATE OR REPLACE — Phase 11 further down this
-- file changes this function's column list again (adds
-- current_milestone), and CREATE OR REPLACE can't do that. Without
-- the drop here, re-running this whole file on a database where
-- Phase 11 has already applied fails with "cannot change return type
-- of existing function" the moment Postgres reaches THIS earlier
-- definition, before it ever gets to Phase 11's — this bug shipped
-- with Phase 11 and is fixed here.
drop function if exists public.get_match_thread(uuid);

create function public.get_match_thread(p_match_id uuid)
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
-- DROP + CREATE, not CREATE OR REPLACE — same reasoning as
-- get_match_thread() above: Phase 11 further down adds
-- current_milestone to this function's column list, and re-running
-- the whole file after Phase 11 has already applied would otherwise
-- fail right here.
drop function if exists public.get_family_shared_matches(uuid);

create function public.get_family_shared_matches(p_owner_id uuid)
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

-- ============================================================
-- Phase 12 (V1) — Admin: member search & suspension
-- ============================================================
--
-- Search itself needs no new function: "Admins can view all profiles"
-- (Phase 7) already lets an is_admin() account select any profile
-- row directly, so /admin/members just queries public.profiles with
-- .ilike()/.eq() like any other read. Suspension is the part that
-- needs care.

alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

-- Same privileged-column treatment as is_admin / subscription_tier /
-- subscription_expires_at (Phase 8): these three are only ever
-- supposed to change via set_member_suspended() below, after the
-- is_admin() check inside it — never by a member writing their own
-- row directly. Without this revoke, a signed-in member could call
-- supabase.from("profiles").update({is_suspended: false}) on their
-- own row and lift their own suspension.
revoke insert (is_suspended, suspended_at, suspended_reason)
  on public.profiles from authenticated;
revoke update (is_suspended, suspended_at, suspended_reason)
  on public.profiles from authenticated;

-- SECURITY DEFINER so it can write the privileged columns above after
-- checking is_admin() itself — same belt-and-suspenders pattern as
-- finalize_elite_payment(). Suspending is a soft block, not a
-- deletion or a ban from signing in: a suspended member's row,
-- matches, and messages are all left alone, and they can still sign
-- in and see their own /account (V0 has no separate appeals flow, so
-- that's deliberately where any dispute has to start). What actually
-- changes is enforced at the two points below — get_match_candidates
-- (new Browse discovery) and the messages insert policy (new
-- outgoing messages) — not a blanket account lock.
create or replace function public.set_member_suspended(
  p_profile_id uuid,
  p_suspended boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized.';
  end if;

  update public.profiles
  set is_suspended = p_suspended,
      suspended_at = case when p_suspended then now() else null end,
      suspended_reason = case when p_suspended then p_reason else null end,
      updated_at = now()
  where id = p_profile_id;
end;
$$;

grant execute on function public.set_member_suspended(uuid, boolean, text) to authenticated;

-- get_match_candidates (Phase 4) needs to stop surfacing suspended
-- profiles in Browse. CREATE OR REPLACE is enough here (unlike the
-- Phase 11 functions) because the column list isn't changing — but
-- it still has to live down here, after is_suspended exists above,
-- since a `language sql` function body is validated against the
-- catalog at creation time and Phase 4 runs long before this section
-- on a fresh database.
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
    and not p.is_suspended
    and not exists (
      select 1 from public.matches m
      where (m.candidate_a = auth.uid() and m.candidate_b = p.id)
         or (m.candidate_a = p.id and m.candidate_b = auth.uid())
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
    and p.age between coalesce(my_prefs.age_min, 18) and coalesce(my_prefs.age_max, 100)
    and (
      my_prefs.preferred_locations is null
      or array_length(my_prefs.preferred_locations, 1) is null
      or p.location = any (my_prefs.preferred_locations)
    );
$$;

grant execute on function public.get_match_candidates() to authenticated;

-- Messages insert policy (Phase 6) needs the same stop: a suspended
-- member can still read existing threads (their "select" policy is
-- untouched) but can't send new ones. Extends the same
-- profiles-lookup subquery that already checks the sender's Elite
-- subscription, rather than adding a separate exists() clause.
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
        and not p.is_suspended
    )
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

-- ============================================================
-- Phase 13 (V1) — Messaging upgrades: Realtime, typing, read receipts
-- ============================================================

-- Swaps MessageThread's 4-second poll (see the V0 comment on that
-- component) for a live Supabase Realtime subscription on new rows
-- in a match's thread. Postgres Changes only ever streams a row to a
-- client whose own RLS SELECT policy would already return it —
-- Realtime authorizes each change against the connecting user's
-- session the same way a normal query would — so this adds no new
-- exposure beyond what "Match participants can view messages"
-- (Phase 6) already allows; it's the same reads, just pushed instead
-- of polled. The guard makes re-running this file safe — ALTER
-- PUBLICATION ... ADD TABLE has no IF NOT EXISTS form and errors on
-- a second run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- One row per (match, member): how far that member has read into the
-- thread. Lets each side show "Seen" on their own latest message once
-- the other participant's last_read_at passes it — nothing more
-- granular than that (no per-message read state, no "delivered" vs
-- "read" distinction, and typing indicators below are ephemeral
-- Realtime Broadcast events, not stored here or anywhere at all).
create table if not exists public.message_read_state (
  match_id uuid not null references public.matches (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, profile_id)
);

alter table public.message_read_state enable row level security;

-- Deliberately readable by BOTH participants, not just "your own
-- row" — the whole point is that each side needs to see the OTHER
-- person's last_read_at to know whether their own messages have been
-- seen.
drop policy if exists "Match participants can view read state" on public.message_read_state;
create policy "Match participants can view read state"
  on public.message_read_state for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = message_read_state.match_id
        and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    )
  );

drop policy if exists "Members can set their own read state" on public.message_read_state;
create policy "Members can set their own read state"
  on public.message_read_state for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = message_read_state.match_id
        and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    )
  );

drop policy if exists "Members can update their own read state" on public.message_read_state;
create policy "Members can update their own read state"
  on public.message_read_state for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_read_state'
  ) then
    alter publication supabase_realtime add table public.message_read_state;
  end if;
end $$;

-- ============================================================
-- Phase 14 (V1) — Subscription lifecycle: auto-renewing billing
-- ============================================================
--
-- Everything up to here only ever moved Elite forward through a
-- one-off Razorpay Order — the member had to come back and click
-- "Renew" by hand every six months. finalize_elite_payment() (Phase
-- 5, above) already extends the expiry rather than resetting it, so
-- no paid days are lost, but nothing re-charges automatically. This
-- phase adds a genuinely recurring option on top, using Razorpay's
-- Subscriptions product: createEliteSubscription()
-- (src/app/actions/payments.ts) creates a Razorpay Subscription tied
-- to a Plan the founder creates once in the Razorpay dashboard (see
-- README), and a webhook (src/app/api/webhooks/razorpay/route.ts)
-- does the actual renewal work every time Razorpay successfully
-- charges it — using the service-role client (src/lib/supabase/
-- admin.ts), the same one deleteAccount() already uses, since a
-- webhook call has no member session to run RLS as. The original
-- one-time-order path is untouched and still works side by side: a
-- member who'd rather pay manually every time, with no auto-renewal,
-- can still do that.

alter table public.profiles
  add column if not exists razorpay_subscription_id text,
  add column if not exists subscription_status text
    check (subscription_status in ('created', 'active', 'cancel_requested', 'cancelled', 'halted', 'completed'));

-- Same treatment as is_admin/subscription_tier/is_suspended above:
-- locked against ordinary member writes, only ever changed through
-- the SECURITY DEFINER functions below (member-initiated, via their
-- own session) or the webhook route (service-role key, which bypasses
-- RLS and these column grants entirely — they're only revoked from
-- `authenticated`).
revoke insert (razorpay_subscription_id, subscription_status)
  on public.profiles from authenticated;
revoke update (razorpay_subscription_id, subscription_status)
  on public.profiles from authenticated;

-- A subscription charge has no "order" in the classic Orders-API
-- sense the way a one-time payment does, so razorpay_order_id can no
-- longer be required on every row (the UNIQUE constraint still holds
-- fine — Postgres allows any number of NULLs under a unique
-- constraint). razorpay_subscription_id links a charge row back to
-- the subscription that produced it. The partial unique index on
-- razorpay_payment_id is what makes the webhook safe to receive twice
-- for the same charge (Razorpay retries a webhook delivery whenever
-- it doesn't get a 2xx back) — the second insert attempt for the same
-- payment id just fails, and the handler treats that as "already
-- recorded, nothing to do."
alter table public.payments
  alter column razorpay_order_id drop not null,
  add column if not exists razorpay_subscription_id text;

create unique index if not exists payments_razorpay_payment_id_key
  on public.payments (razorpay_payment_id)
  where razorpay_payment_id is not null;

-- Called right after createEliteSubscription() creates the Razorpay
-- Subscription object, before the checkout modal even opens, so the
-- subscription id is on file regardless of whether the member
-- actually finishes the first payment.
create or replace function public.start_elite_subscription(p_subscription_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set razorpay_subscription_id = p_subscription_id,
      subscription_status = 'created',
      updated_at = now()
  where id = auth.uid();
$$;

grant execute on function public.start_elite_subscription(text) to authenticated;

-- Called by cancelSubscription() right after the Razorpay API call to
-- cancel (with cancel_at_cycle_end: true) succeeds. Deliberately
-- doesn't touch subscription_tier/subscription_expires_at — the
-- member keeps Elite for whatever period they've already paid for;
-- only future auto-renewal stops. The webhook moves this on to
-- 'cancelled' once Razorpay confirms the final cycle has actually
-- ended.
create or replace function public.record_subscription_cancel_requested()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set subscription_status = 'cancel_requested',
      updated_at = now()
  where id = auth.uid()
    and razorpay_subscription_id is not null;
$$;

grant execute on function public.record_subscription_cancel_requested() to authenticated;

-- ============================================================
-- Phase 15 (V1) — Push notifications for new messages
-- ============================================================
--
-- One row per browser/device a member has turned notifications on
-- for (a member can have several — phone, laptop, ...). Populated by
-- savePushSubscription() (src/app/actions/push.ts) after the browser
-- grants Notification permission and the Push API hands back a
-- subscription object; consumed by sendMessage()
-- (src/app/actions/messages.ts), which looks up the OTHER match
-- participant's rows here and pushes to each one via web-push
-- (src/lib/push/send.ts).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can view own push subscriptions" on public.push_subscriptions;
create policy "Users can view own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = profile_id);

drop policy if exists "Users can create own push subscriptions" on public.push_subscriptions;
create policy "Users can create own push subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = profile_id);

-- savePushSubscription() upserts on conflict (endpoint) — needed for
-- the ordinary case of the SAME member re-registering the same
-- browser (permission re-granted, app reopened, ...). An endpoint
-- colliding with a DIFFERENT member's row is, in practice,
-- cryptographically impossible (push endpoints are unique per
-- browser registration), so this being scoped to own profile_id costs
-- nothing real while still being the correct boundary.
drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
create policy "Users can update own push subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = profile_id);

-- sendMessage() runs as the SENDER's own session, but needs to read
-- the RECIPIENT's push_subscriptions rows — which the owner-only
-- policy above deliberately doesn't allow directly. SECURITY DEFINER
-- sidesteps that the same way get_match_thread()/get_mutual_matches()
-- already do for other cross-member reads, and is scoped tightly: it
-- only ever returns rows for whichever profile is the OTHER half of
-- a match auth.uid() is actually part of (the case expression
-- resolves to null, matching no rows, for anyone who isn't).
create or replace function public.get_push_subscriptions_for_match_peer(p_match_id uuid)
returns table (endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
stable
as $$
  select ps.endpoint, ps.p256dh, ps.auth
  from public.push_subscriptions ps
  join public.matches m on m.id = p_match_id
  where ps.profile_id = case
      when m.candidate_a = (select auth.uid()) then m.candidate_b
      when m.candidate_b = (select auth.uid()) then m.candidate_a
      else null
    end;
$$;

grant execute on function public.get_push_subscriptions_for_match_peer(uuid) to authenticated;

-- ============================================================
-- Phase 16 (V1) — Admin message oversight & action audit log
-- ============================================================
--
-- Two things: a record of what admins have done (so a solo founder
-- with more than one admin account, or just their own future self,
-- can see who suspended whom and why), and a narrow, logged way for
-- an admin to read a reported conversation's messages when
-- investigating a report — something admins previously couldn't do
-- at all, even from the Reports queue.
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

drop policy if exists "Admins can view the audit log" on public.admin_actions;
create policy "Admins can view the audit log"
  on public.admin_actions for select
  using (is_admin());

-- Every admin server action (src/app/actions/admin.ts) inserts its
-- own row right after acting, using the admin's own session — never
-- a service-role key or a SECURITY DEFINER function — so admin_id is
-- always genuinely whoever was signed in when it happened; the WITH
-- CHECK below is what stops anyone else from forging an entry as
-- someone else.
drop policy if exists "Admins can log their own actions" on public.admin_actions;
create policy "Admins can log their own actions"
  on public.admin_actions for insert
  with check (is_admin() and admin_id = auth.uid());

-- Lets an admin open a reported conversation's message history from
-- /admin/reports (see src/app/admin/reports/[id]/messages/page.tsx —
-- the one place this is surfaced in the UI; there's no general
-- "browse all messages" screen). That page also writes an
-- admin_actions row every single time it's opened, since reading
-- someone else's private messages is exactly the kind of action that
-- most needs a record. This is a SEPARATE, additional select policy
-- alongside "Match participants can view messages" (Phase 6) —
-- Postgres OR's multiple permissive policies together, so this only
-- ever widens who can read, never narrows the existing participant
-- access.
drop policy if exists "Admins can view all messages" on public.messages;
create policy "Admins can view all messages"
  on public.messages for select
  using (is_admin());

-- ============================================================
-- Phase 17 (V1) — DPDP consent capture at signup
-- ============================================================
--
-- Section 7 of /privacy has always said "explicit consent (a checkbox
-- naming the DPDP Act directly)" is how Agaram gets consent — true
-- for the Aadhaar identity check (Phase 3's consent column on
-- identity_verifications) but never actually captured for account
-- creation itself. saveBasicInfo() (src/app/actions/profile.ts), the
-- very first onboarding step after signup, now requires and records
-- this. Not a privileged column — a member sets it about themselves,
-- once, same as full_name or location — so no revoke here.
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

-- ============================================================
-- Phase 18 (V1) — Employment & education verification
-- ============================================================
--
-- A real (not yet vendor-backed) verification flow for the
-- Employment/Professional/Education badges that Phase 3 left as
-- "not yet verified" placeholders (see the build plan, Section 3).
-- Two methods, matching two of the three named on the PRD's
-- EmploymentVerificationMethod screen (§7.1.1/§7.1.3) — EPFO
-- verification needs a real vendor (IDfy/AuthBridge) integration and
-- stays deferred, same as Aadhaar e-KYC:
--
--   work_email           — genuinely automated, no vendor needed: a
--                           one-time code is emailed to the claimed
--                           work address via Resend, and confirming
--                           it is a real, working verification —
--                           proving control of a company-domain inbox
--                           is a legitimate Medium-confidence signal
--                           per §7.1.2.
--   employer_attestation — the "ask your employer" path (§7.1.3).
--                           Without Attestr/VerifyAll wired in, this
--                           stays the honest hybrid the PRD itself
--                           allows for the residual manual case
--                           (§7.1.1's "what stays manual, and why
--                           that's fine"): the candidate records
--                           consent + the employer's contact, and it
--                           lands in the admin queue for a human
--                           decision, exactly like identity
--                           verification does today.
create extension if not exists pgcrypto;

create table if not exists public.employment_verifications (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  method text not null check (method in ('work_email', 'employer_attestation')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'unable_to_verify')),
  work_email text,
  otp_code_hash text,
  otp_expires_at timestamptz,
  otp_attempts integer not null default 0,
  employer_name text,
  employer_contact_email text,
  consent_at timestamptz,
  admin_note text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.employment_verifications enable row level security;

drop policy if exists "Users can view own employment verification" on public.employment_verifications;
create policy "Users can view own employment verification"
  on public.employment_verifications for select
  using (auth.uid() = profile_id);

-- Same pattern as identity_verifications (Phase 3/8): a member can
-- freely write their own row while requesting a code or submitting an
-- attestation, but WITH CHECK pins the WRITTEN status to 'pending' on
-- every client-side write — only confirm_work_email_otp() below
-- (SECURITY DEFINER) can ever move a row to 'verified', and only an
-- admin (separate policy below) can move one to 'unable_to_verify'.
drop policy if exists "Users can insert own employment verification" on public.employment_verifications;
create policy "Users can insert own employment verification"
  on public.employment_verifications for insert
  with check (auth.uid() = profile_id and status = 'pending');

drop policy if exists "Users can update own employment verification" on public.employment_verifications;
create policy "Users can update own employment verification"
  on public.employment_verifications for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id and status = 'pending');

drop policy if exists "Admins can view all employment verifications" on public.employment_verifications;
create policy "Admins can view all employment verifications"
  on public.employment_verifications for select
  using (is_admin());

drop policy if exists "Admins can update all employment verifications" on public.employment_verifications;
create policy "Admins can update all employment verifications"
  on public.employment_verifications for update
  using (is_admin());

-- The one legitimate way a work_email row moves to 'verified'. Takes
-- the candidate's submitted code as a parameter and does the hash
-- comparison INSIDE this SECURITY DEFINER function, rather than
-- trusting a boolean the caller computed — a function that just
-- flipped status to 'verified' with no parameter, the way
-- resolve_mock_verification() does for identity, would let any
-- signed-in member call it directly from the browser console and
-- self-verify with no code at all, since grant execute ... to
-- authenticated makes it callable by anyone. The code is hashed with
-- sha256 both here and where it's generated (src/app/actions/
-- employment.ts) so the raw code is never stored in the clear.
create or replace function public.confirm_work_email_otp(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.employment_verifications%rowtype;
begin
  select * into v_row
  from public.employment_verifications
  where profile_id = auth.uid()
    and method = 'work_email'
    and status = 'pending'
  for update;

  if not found or v_row.otp_expires_at is null or v_row.otp_expires_at < now() then
    return false;
  end if;

  if v_row.otp_attempts >= 5 then
    return false;
  end if;

  if v_row.otp_code_hash is distinct from encode(digest(p_code, 'sha256'), 'hex') then
    update public.employment_verifications
    set otp_attempts = otp_attempts + 1, updated_at = now()
    where profile_id = auth.uid();
    return false;
  end if;

  update public.employment_verifications
  set status = 'verified',
      verified_at = now(),
      updated_at = now(),
      otp_code_hash = null
  where profile_id = auth.uid();

  return true;
end;
$$;

grant execute on function public.confirm_work_email_otp(text) to authenticated;

-- ============================================================
-- Phase 19 (V1) — "Who is this profile for?" (created_by_relation)
-- ============================================================
--
-- Records the PRD's relation list (§5's "Elite Alliance for" field:
-- Self/Son/Daughter/Brother/Sister/Friend/Relative) at onboarding.
-- This is deliberately NOT the PRD's full parent-creates-profile-first
-- model — that model needs the actual candidate to eventually take
-- over an INDEPENDENT login from whoever first created the account,
-- which means transferring a profile's identity from one auth.users
-- row to another (matches, messages, payments and every other table
-- keyed to profiles.id would all need to move with it, including
-- re-satisfying the matches table's candidate_a < candidate_b
-- ordering constraint). That's real, higher-risk data-migration
-- engineering this round doesn't take on — see the build plan for the
-- honest scoping note. What this phase DOES do: record who actually
-- filled the profile in, and use it (src/app/account/page.tsx) to
-- point a parent toward the existing, already-safe Family
-- Collaborator invite (Phase 10) as a standing way to keep following
-- along, and to set honest expectations for a proxy creator
-- (sibling/friend/relative) that their own access is a one-time
-- favor, not a permanent role, exactly as the PRD states.
alter table public.profiles
  add column if not exists created_by_relation text
    not null default 'self'
    check (created_by_relation in ('self', 'son', 'daughter', 'brother', 'sister', 'friend', 'relative'));

-- ============================================================
-- Phase 20 (V1) — Weekly curated match digest
-- ============================================================
--
-- A scheduled email (see /api/cron/weekly-digest) summarizing new
-- Browse candidates, interests received, and unread mutual-match
-- messages since the member's last digest — the closest honest
-- approximation of the PRD's automated "Friday 4pm, your 3
-- introductions" cadence (§8) that's buildable without the real
-- Jathagam/ML matching engine described there. On by default (this is
-- core product engagement, not marketing) with a one-click,
-- no-login-required unsubscribe link in every email (see
-- /api/digest/unsubscribe) — weekly_digest_opt_out is an ordinary
-- member-owned preference (no revoke needed, same as locale).
-- last_digest_sent_at is system-managed (only ever written by the
-- cron route's service-role client, which bypasses these grants
-- entirely) so it gets the same revoke treatment as other
-- admin/system-only columns — an ordinary member has no legitimate
-- reason to write it themselves.
alter table public.profiles
  add column if not exists weekly_digest_opt_out boolean not null default false,
  add column if not exists last_digest_sent_at timestamptz;

revoke insert (last_digest_sent_at) on public.profiles from authenticated;
revoke update (last_digest_sent_at) on public.profiles from authenticated;

-- ============================================================
-- Phase 21 (V1) — Royal Concierge tier intake
-- ============================================================
--
-- The Concierge tier (§11) is explicitly a human-run matchmaking
-- service, not a software feature — this table is just the front
-- door: an application lands here, and you work it by hand (phone
-- call, negotiate pricing, etc.), tracked from a new /admin/concierge
-- queue. No Razorpay checkout is wired to this tier in this round —
-- per §11's own flow (a qualification call before anything is
-- charged), an instant self-serve checkout would be the wrong shape
-- for this tier anyway.
create table if not exists public.concierge_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  contact_phone text not null,
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'contacted', 'in_progress', 'closed')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concierge_applications enable row level security;

drop policy if exists "Members can submit their own concierge application" on public.concierge_applications;
create policy "Members can submit their own concierge application"
  on public.concierge_applications for insert
  with check (profile_id = auth.uid());

drop policy if exists "Members can view their own concierge applications" on public.concierge_applications;
create policy "Members can view their own concierge applications"
  on public.concierge_applications for select
  using (profile_id = auth.uid());

drop policy if exists "Admins can view all concierge applications" on public.concierge_applications;
create policy "Admins can view all concierge applications"
  on public.concierge_applications for select
  using (is_admin());

drop policy if exists "Admins can update all concierge applications" on public.concierge_applications;
create policy "Admins can update all concierge applications"
  on public.concierge_applications for update
  using (is_admin());

-- ============================================================
-- Phase 22 (V1) — Profile photos: private storage + blur-until-match
-- ============================================================
--
-- Storage layout, per profile: profile-photos/<profile_id>/original.jpg
-- (the real photo, full quality) and profile-photos/<profile_id>/blurred.jpg
-- (a heavily blurred derivative generated at upload time — see
-- actions/photo.ts). The bucket itself is PRIVATE (not public) —
-- every read goes through a signed URL or one of the policies below,
-- never a guessable public path. The two-file layout is what makes
-- "blur until mutual match" a storage-level guarantee rather than a
-- UI-level one: a browsing member's client is only ever handed a
-- signed URL to blurred.jpg, and Postgres itself refuses a request
-- for original.jpg unless the match is already mutual (or the
-- requester is the owner or an admin) — there's no code path in the
-- app that could accidentally leak the unblurred photo early, because
-- the database enforces it independent of the app.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

-- Mirrors is_admin() above: a SECURITY DEFINER function so this can
-- be called from a storage.objects policy without that policy having
-- to reason about RLS on public.matches itself. Deliberately narrower
-- than "are these two profiles matched at all" — only 'mutual' counts,
-- exactly matching the PRD's blur-until-match rule.
create or replace function public.is_mutual_match_with(p_other_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.matches
    where status = 'mutual'
      and (
        (candidate_a = auth.uid() and candidate_b = p_other_profile_id)
        or (candidate_a = p_other_profile_id and candidate_b = auth.uid())
      )
  );
$$;

grant execute on function public.is_mutual_match_with(uuid) to authenticated;

-- storage.objects ships with row level security already enabled on
-- every Supabase project — these are additive policies scoped to the
-- profile-photos bucket only, and multiple permissive policies on the
-- same table/action are OR'd together by Postgres, so a request is
-- allowed the moment ANY one of these four matches.

-- storage.foldername(name) splits "abc-123/original.jpg" into
-- {'abc-123', 'original.jpg'} — [1] is the profile id segment, which
-- this policy set treats as the owning member's own id (enforced by
-- casting it against auth.uid() below, not by trusting the client).
drop policy if exists "Members manage their own profile photo folder" on storage.objects;
create policy "Members manage their own profile photo folder"
  on storage.objects for all
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Any signed-in member can view anyone's blurred.jpg — that's the
-- whole point of it existing as a separate object from original.jpg.
drop policy if exists "Signed-in members can view blurred profile photos" on storage.objects;
create policy "Signed-in members can view blurred profile photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and storage.filename(name) = 'blurred.jpg'
  );

-- Mutual-match participants can view each other's original.jpg —
-- gated by the same 'mutual' status the rest of the app uses to
-- reveal full profile info (get_mutual_matches()).
drop policy if exists "Mutual match participants can view original profile photos" on storage.objects;
create policy "Mutual match participants can view original profile photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and storage.filename(name) = 'original.jpg'
    and public.is_mutual_match_with(((storage.foldername(name))[1])::uuid)
  );

-- Same admin-oversight pattern as every other table in this schema
-- (identity_verifications, concierge_applications, reports, ...).
drop policy if exists "Admins can view all profile photos" on storage.objects;
create policy "Admins can view all profile photos"
  on storage.objects for select
  using (is_admin());

-- Denormalized flag so pages that list many profiles at once (Browse,
-- Sent, Received, dashboard candidate cards) can decide whether to
-- even attempt a signed-URL fetch for a given profile without an
-- extra storage lookup per card. Written by the member's own upload
-- and delete actions (actions/photo.ts) — an ordinary self-editable
-- profile field, same trust level as full_name or about_me, not a
-- privileged column like is_admin or subscription_tier.
alter table public.profiles
  add column if not exists has_photo boolean not null default false;

-- has_photo needs to reach every place a candidate's masked or
-- unlocked info is already surfaced, so the UI knows whether it's
-- worth requesting a signed URL at all (see src/lib/photo.ts). DROP +
-- CREATE, not CREATE OR REPLACE, since every one of these functions
-- is gaining a column — same constraint the Phase 11 comment above
-- explains. Each one otherwise keeps its existing logic unchanged.
drop function if exists public.get_match_candidates();

create function public.get_match_candidates()
returns table (
  id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  has_photo boolean
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
    coalesce(iv.status = 'verified', false) as is_verified,
    p.has_photo
  from public.profiles p
  left join public.identity_verifications iv on iv.profile_id = p.id
  cross join me
  left join my_prefs on true
  where p.id <> auth.uid()
    and p.profile_type <> me.profile_type
    and not p.is_suspended
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
    and p.age between coalesce(my_prefs.age_min, 18) and coalesce(my_prefs.age_max, 100)
    and (
      my_prefs.preferred_locations is null
      or array_length(my_prefs.preferred_locations, 1) is null
      or p.location = any (my_prefs.preferred_locations)
    )
    -- Phase 24 (re-surfacing cooldown) replaces the plain "no matches
    -- row at all" exclusion below — see that section for the reason
    -- this became an or-clause instead of a bare not exists.
    and (
      not exists (
        select 1 from public.matches m
        where (m.candidate_a = auth.uid() and m.candidate_b = p.id)
           or (m.candidate_a = p.id and m.candidate_b = auth.uid())
      )
      or exists (
        select 1 from public.matches m
        where (
          (m.candidate_a = auth.uid() and m.candidate_b = p.id)
          or (m.candidate_a = p.id and m.candidate_b = auth.uid())
        )
        and m.status = 'declined'
        and m.updated_at < now() - interval '30 days'
      )
    );
$$;

grant execute on function public.get_match_candidates() to authenticated;

drop function if exists public.get_sent_interests();

create function public.get_sent_interests()
returns table (
  match_id uuid,
  candidate_id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  has_photo boolean,
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
    p.has_photo,
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

drop function if exists public.get_received_interests();

create function public.get_received_interests()
returns table (
  match_id uuid,
  candidate_id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  has_photo boolean,
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
    p.has_photo,
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
  has_photo boolean,
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
    p.has_photo,
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
  has_photo boolean,
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
    p.has_photo,
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

-- ============================================================
-- Phase 24 (V1) — Re-surface declined matches after a cooldown
-- ============================================================
--
-- Before this phase, a 'declined' matches row excluded that pair from
-- Browse forever, on both sides, permanently — a single accidental
-- "Pass" tap (or a change of heart 6 months later) had no way back.
-- get_match_candidates() above now re-admits a declined pair once its
-- updated_at is more than 30 days old (the or-clause added to that
-- function's where-clause). A 'mutual' match is never re-surfaced —
-- only 'declined' rows are eligible, and only after they've sat
-- untouched for the cooldown window, so this doesn't undo an active
-- decision either side just made.
--
-- The other half of this feature is in actions/matches.ts's
-- expressInterest(): when the existing row for a re-surfaced pair is
-- still 'declined' (the only way that's reachable is if Browse just
-- showed it, i.e. the cooldown already passed), it now updates that
-- row back to 'interest_sent' instead of silently no-op'ing — see the
-- comment there. Nothing further to add here — both function bodies
-- above already carry the actual predicate.

-- ============================================================
-- Phase 25 (V1) — Extended preferences: family / lifestyle / cultural
-- ============================================================
--
-- The PRD's §7.3 describes these as "progressive" tiers, collected
-- any time after a profile goes live — never required at signup,
-- unlike the must-have tier (age/location/education/relocation/
-- language) that already exists on `preferences`. That's why these
-- live on /account (an anytime-editable settings surface) rather than
-- onboarding, and why every one of them defaults to something inert
-- ('no_preference' or null) instead of forcing a choice.
--
-- IMPORTANT SCOPING NOTE: none of these columns are read by
-- get_match_candidates() this round. Wiring them into actual
-- filtering/scoring is real design work (the PRD's §8 rule-based
-- weighting model) that deserves its own pass rather than a
-- last-minute addition here — adding a filter column that silently
-- does nothing yet is honest; adding one that HALF-filters based on
-- an under-designed weighting would not be. Storing them now still
-- has value: it's real profile-completeness data the moment matching
-- does get smarter, and it's already useful as human-readable context
-- once two members are messaging.
--
-- Self-description ("who I am") vs preference ("who I want") is kept
-- as two separate columns for every one of these, exactly like the
-- existing profiles.community / preferences.community_preference
-- split the PRD calls out explicitly — never inferred one from the
-- other, never merged into one field in the UI.
alter table public.profiles
  add column if not exists family_type text
    check (family_type is null or family_type in ('nuclear', 'joint')),
  add column if not exists diet text
    check (diet is null or diet in ('vegetarian', 'non_vegetarian')),
  add column if not exists native_district text,
  add column if not exists community text;

alter table public.preferences
  -- Family tier
  add column if not exists family_type_preference text not null default 'no_preference'
    check (family_type_preference in ('nuclear', 'joint', 'no_preference')),
  add column if not exists family_involvement_preference text not null default 'no_preference'
    check (family_involvement_preference in ('low', 'medium', 'high', 'no_preference')),
  -- Lifestyle tier
  add column if not exists diet_preference text not null default 'no_preference'
    check (diet_preference in ('vegetarian', 'non_vegetarian', 'no_preference')),
  add column if not exists drinking_preference text not null default 'no_preference'
    check (drinking_preference in ('yes', 'no', 'occasionally', 'no_preference')),
  add column if not exists smoking_preference text not null default 'no_preference'
    check (smoking_preference in ('yes', 'no', 'no_preference')),
  -- Cultural tier
  add column if not exists native_district_preference text,
  add column if not exists community_preference text not null default 'no_preference',
  add column if not exists religious_practice_preference text not null default 'no_preference'
    check (religious_practice_preference in ('important', 'no_preference'));

-- ============================================================
-- Phase 26 (V1) — Jathagam / horoscope details capture
-- ============================================================
--
-- HONEST SCOPING DECISION, stated plainly: this is a details-capture-
-- and-sharing feature ONLY. There is no Porutham/Dosham compatibility
-- score anywhere in this schema, and none should be added without a
-- real astrologer-reviewed rule set behind it. The PRD (§8) describes
-- Jathagam compatibility as a weighted scoring input to a rule-based
-- matching engine — building a fake or naively-hardcoded version of
-- that (e.g. "same rasi = +1 point") would present invented pseudo-
-- astrology as if it were a real, considered compatibility signal for
-- a decision as consequential as marriage. That's the same ethical
-- line already drawn for identity verification's mock provider (which
-- is honestly labeled as a placeholder to the member) and for the
-- weekly digest (which never overstates what it's summarizing) — the
-- honest version here is: capture the details, let the member choose
-- to share them once mutually matched, and say nothing about what
-- they mean together. A real Porutham engine, if ever built, deserves
-- its own reviewed phase, not a bolt-on to a photo/preferences round.
create table if not exists public.jathagam_details (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date,
  -- Exact birth time is routinely unknown or approximate for a family
  -- filling this in from memory — nullable, not required.
  birth_time time,
  birth_place text,
  birth_star text, -- nakshatra
  rasi text, -- moon sign
  visibility text not null default 'private' check (visibility in ('private', 'mutual_match')),
  updated_at timestamptz not null default now()
);

alter table public.jathagam_details enable row level security;

drop policy if exists "Members can view their own jathagam details" on public.jathagam_details;
create policy "Members can view their own jathagam details"
  on public.jathagam_details for select
  using (profile_id = auth.uid());

drop policy if exists "Members can upsert their own jathagam details" on public.jathagam_details;
create policy "Members can upsert their own jathagam details"
  on public.jathagam_details for insert
  with check (profile_id = auth.uid());

drop policy if exists "Members can update their own jathagam details" on public.jathagam_details;
create policy "Members can update their own jathagam details"
  on public.jathagam_details for update
  using (profile_id = auth.uid());

drop policy if exists "Members can delete their own jathagam details" on public.jathagam_details;
create policy "Members can delete their own jathagam details"
  on public.jathagam_details for delete
  using (profile_id = auth.uid());

-- Sharing is global-per-profile (one visibility toggle, not a
-- per-match share list) — same simplification the PRD's own
-- "share with family" toggle already makes for family sharing, and
-- consistent with is_mutual_match_with() (Phase 22) already existing
-- as the one place "are these two mutually matched" is answered from
-- a policy, so this reuses it rather than re-deriving the same check.
drop policy if exists "Mutual match participants can view shared jathagam details" on public.jathagam_details;
create policy "Mutual match participants can view shared jathagam details"
  on public.jathagam_details for select
  using (
    visibility = 'mutual_match'
    and public.is_mutual_match_with(profile_id)
  );

-- ============================================================
-- Phase 27 (V1) — Instant email alerts (new interest / new mutual match)
-- ============================================================
--
-- A SEPARATE opt-out from weekly_digest_opt_out (Phase 20), not a
-- reuse of it: a member who wants the once-a-week roundup may not
-- want an email the instant someone expresses interest, and the
-- reverse (someone who reads instant pings but finds a weekly summary
-- redundant) is just as plausible — same reasoning already applied to
-- every other "own description" vs "preference" column pair in this
-- schema (Phase 25's comment). Defaults to on, same as the digest,
-- since this is core product engagement (knowing someone is
-- interested in you) rather than marketing. The one-click unsubscribe
-- link on these emails (see /api/alerts/unsubscribe) deliberately
-- reuses signUnsubscribeToken/verifyUnsubscribeToken and
-- DIGEST_UNSUB_SECRET from src/lib/email/digest.ts rather than
-- introducing a second secret: that HMAC only ever proves "this
-- request really is for this profile id" with no login, and nothing
-- about its name ties it to the weekly digest specifically — minting
-- a second server-only secret for the exact same proof would be pure
-- duplication with no security benefit.
alter table public.profiles
  add column if not exists instant_alerts_opt_out boolean not null default false;

-- ============================================================
-- Phase 28 (V1) — Founder analytics dashboard (/admin/analytics)
-- ============================================================
--
-- Read-only aggregate counts for the founder (signups, verification
-- funnel, match funnel, Elite subscriber count, revenue) — same
-- "additive, is_admin()-gated, OR'd with the existing owner-only
-- policy" shape already used for reports/verifications/employment/
-- concierge (Phase 7 and later). profiles and identity_verifications
-- already have an admin-wide select policy from Phase 7; matches and
-- payments didn't need one until now, so those two are added here.
drop policy if exists "Admins can view all matches" on public.matches;
create policy "Admins can view all matches"
  on public.matches for select
  using (
    public.is_admin()
  );

drop policy if exists "Admins can view all payments" on public.payments;
create policy "Admins can view all payments"
  on public.payments for select
  using (
    public.is_admin()
  );

-- ============================================================
-- Phase 29 (V1) — Phone number + OTP verification (mocked)
-- ============================================================
--
-- A SECOND, independent identity signal alongside Aadhaar-based
-- identity_verifications (Phase 3/8) — not a replacement, and not
-- merged into that table, since a member's phone and their Aadhaar
-- e-KYC result are two different claims that can each be true or
-- false on their own.
--
-- HONEST SCOPING DECISION, stated as plainly as identity_verifications'
-- own mock-vendor note (see actions/verification.ts): sending a real
-- SMS OTP needs a vendor (Twilio, MSG91, ...) with an account and API
-- credentials, neither of which exists for this project yet. Unlike
-- work-email verification (Phase 18), which genuinely sends and checks
-- a real code because Resend can actually deliver that email, there is
-- no delivery channel here to make a real code meaningful — showing
-- the member a "type back the code we just displayed on this same
-- screen" step would be pure security theater, worse than admitting
-- there's no real check yet. So this follows identity_verifications'
-- own honest pattern instead: submit the phone number, mark the row
-- "pending", and let a mock resolver (resolve_mock_phone_verification,
-- standing in for the vendor's async callback) flip it to "verified" —
-- clearly labeled to the member as a placeholder, exactly like the
-- Aadhaar mock. Swapping in a real SMS vendor later only means
-- replacing what resolve_mock_phone_verification()'s caller does
-- (src/app/actions/phone.ts) — nothing downstream (the badge, this
-- table's shape) needs to change, same promise identity_verifications
-- already makes.
--
-- The full phone number IS stored (not just last 4, unlike
-- aadhaar_last4) — a real SMS vendor integration will need the whole
-- number to actually send to, whereas Aadhaar's full number was never
-- needed again after the one-time verification call.
create table if not exists public.phone_verifications (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  provider text not null default 'mock',
  phone_number text not null,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.phone_verifications enable row level security;

drop policy if exists "Users can view own phone verification" on public.phone_verifications;
create policy "Users can view own phone verification"
  on public.phone_verifications for select
  using (auth.uid() = profile_id);

-- Same WITH CHECK reasoning as identity_verifications (Phase 8): a
-- member can freely (re)submit a phone number, always landing back on
-- "pending", but only resolve_mock_phone_verification() below
-- (SECURITY DEFINER) can ever mark a row verified.
drop policy if exists "Users can insert own phone verification" on public.phone_verifications;
create policy "Users can insert own phone verification"
  on public.phone_verifications for insert
  with check (auth.uid() = profile_id and status = 'pending');

drop policy if exists "Users can update own phone verification" on public.phone_verifications;
create policy "Users can update own phone verification"
  on public.phone_verifications for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id and status = 'pending');

drop policy if exists "Admins can view all phone verifications" on public.phone_verifications;
create policy "Admins can view all phone verifications"
  on public.phone_verifications for select
  using (
    public.is_admin()
  );

create or replace function public.resolve_mock_phone_verification()
returns void
language sql
security definer
set search_path = public
as $$
  update public.phone_verifications
  set status = 'verified',
      verified_at = now(),
      updated_at = now()
  where profile_id = auth.uid();
$$;

grant execute on function public.resolve_mock_phone_verification() to authenticated;

-- is_phone_verified needs to reach the same masked/unlocked surfaces
-- is_verified already does, so a "Phone verified" badge can sit next
-- to "Identity verified" wherever that one already shows. DROP +
-- CREATE for the same reason as Phase 23's has_photo rollout — every
-- one of these functions is gaining a column.
drop function if exists public.get_match_candidates();

create function public.get_match_candidates()
returns table (
  id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  has_photo boolean,
  is_phone_verified boolean
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
    coalesce(iv.status = 'verified', false) as is_verified,
    p.has_photo,
    coalesce(pv.status = 'verified', false) as is_phone_verified
  from public.profiles p
  left join public.identity_verifications iv on iv.profile_id = p.id
  left join public.phone_verifications pv on pv.profile_id = p.id
  cross join me
  left join my_prefs on true
  where p.id <> auth.uid()
    and p.profile_type <> me.profile_type
    and not p.is_suspended
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
    and p.age between coalesce(my_prefs.age_min, 18) and coalesce(my_prefs.age_max, 100)
    and (
      my_prefs.preferred_locations is null
      or array_length(my_prefs.preferred_locations, 1) is null
      or p.location = any (my_prefs.preferred_locations)
    )
    and (
      not exists (
        select 1 from public.matches m
        where (m.candidate_a = auth.uid() and m.candidate_b = p.id)
           or (m.candidate_a = p.id and m.candidate_b = auth.uid())
      )
      or exists (
        select 1 from public.matches m
        where (
          (m.candidate_a = auth.uid() and m.candidate_b = p.id)
          or (m.candidate_a = p.id and m.candidate_b = auth.uid())
        )
        and m.status = 'declined'
        and m.updated_at < now() - interval '30 days'
      )
    );
$$;

grant execute on function public.get_match_candidates() to authenticated;

drop function if exists public.get_sent_interests();

create function public.get_sent_interests()
returns table (
  match_id uuid,
  candidate_id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  has_photo boolean,
  is_phone_verified boolean,
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
    p.has_photo,
    coalesce(pv.status = 'verified', false) as is_phone_verified,
    m.status,
    m.created_at
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  left join public.phone_verifications pv on pv.profile_id = p.id
  where m.initiated_by = auth.uid()
    and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status in ('interest_sent', 'mutual')
  order by m.created_at desc;
$$;

grant execute on function public.get_sent_interests() to authenticated;

drop function if exists public.get_received_interests();

create function public.get_received_interests()
returns table (
  match_id uuid,
  candidate_id uuid,
  age integer,
  location text,
  initial text,
  is_verified boolean,
  has_photo boolean,
  is_phone_verified boolean,
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
    p.has_photo,
    coalesce(pv.status = 'verified', false) as is_phone_verified,
    m.created_at
  from public.matches m
  join public.profiles p
    on p.id = (case when m.candidate_a = auth.uid() then m.candidate_b else m.candidate_a end)
  left join public.identity_verifications iv on iv.profile_id = p.id
  left join public.phone_verifications pv on pv.profile_id = p.id
  where m.initiated_by <> auth.uid()
    and (m.candidate_a = auth.uid() or m.candidate_b = auth.uid())
    and m.status = 'interest_sent'
  order by m.created_at desc;
$$;

grant execute on function public.get_received_interests() to authenticated;

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
  has_photo boolean,
  is_phone_verified boolean,
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
    p.has_photo,
    coalesce(pv.status = 'verified', false) as is_phone_verified,
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
  left join public.phone_verifications pv on pv.profile_id = p.id
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
  has_photo boolean,
  is_phone_verified boolean,
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
    p.has_photo,
    coalesce(pv.status = 'verified', false) as is_phone_verified,
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
  left join public.phone_verifications pv on pv.profile_id = p.id
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
