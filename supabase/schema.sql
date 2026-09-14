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
