# Agaram — Project Scaffold (V0, Phase 1)

This is the first phase of the build order from `Agaram_Solo_Founder_Build_Plan.md`:
a working Next.js + Supabase scaffold with real signup/login/logout, nothing
product-specific yet. It proves the basic pipes work before any product
screens get built on top.

What's here:
- `/` — landing page with links to sign up / sign in
- `/signup`, `/login` — email + password forms wired to Supabase Auth
- `/dashboard` — a protected page; you can only reach it while signed in
- `src/proxy.ts` — keeps the session refreshed and redirects signed-out
  users away from `/dashboard` (and signed-in users away from `/login`)
- Colors, type, and the brand mark already match `Agaram_Visual_Design_System_v1.md`

Phone-number OTP sign-in is deferred to the next phase — it needs an SMS
provider (Twilio/MSG91) wired into Supabase's Auth settings first.

---

## 1. Create your Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and sign up with your GitHub
   account.
2. Click **New project**. Name it (e.g. `agaram`), set a database password
   (save it somewhere safe), pick a region close to India if offered, and
   wait ~2 minutes for it to provision.
3. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon / public** key.
4. In this project folder, copy `.env.local.example` to `.env.local` and
   paste those two values in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   `.env.local` is already in `.gitignore` — it will never be committed to
   GitHub. Never put the **service_role** key here or anywhere in this app.

5. By default, Supabase requires email confirmation before a new account
   can sign in. For quick local testing, you can turn this off temporarily
   under **Authentication → Providers → Email → Confirm email** (toggle
   off), or just click the confirmation link Supabase emails you.

## 2. Run it locally

```bash
npm install
npm run dev
```

Open the local URL it prints, click **Create account**, sign up with a
real email + password, confirm the email if required, and you should land
on `/dashboard` signed in.

## 3. Push to GitHub

Your repo already exists at `https://github.com/vinothkumarkk01-max/Agaram`,
and this folder is already a git repo with everything committed locally.
From inside this project folder:

```bash
git remote add origin https://github.com/vinothkumarkk01-max/Agaram.git
git branch -M main
git push -u origin main
```

(If `git remote add origin` says the remote already exists, run
`git remote set-url origin https://github.com/vinothkumarkk01-max/Agaram.git`
instead.) GitHub will prompt you to sign in the first time you push —
follow its prompts (it may open a browser window or ask for a
personal access token instead of your password).

## 4. Deploy to Vercel (free)

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub
   account.
2. Click **Add New… → Project**, then **Import** next to your `Agaram`
   repo.
3. Before clicking Deploy, expand **Environment Variables** and add the
   same two values from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. In a minute or two you'll have a live URL
   (`agaram-xxxx.vercel.app`) that anyone can open.
5. One more Supabase step once you have that URL: go to your Supabase
   project → **Authentication → URL Configuration**, and add your Vercel
   URL to **Site URL** and **Redirect URLs**. Without this, email
   confirmation links will point at the wrong address.

## Identity verification (Phase 3) — mock vendor, real flow

After profile + preferences, members hit `/onboarding/verification`: a
consent + Aadhaar-number form, a "verifying…" screen, then a
Verified badge on the dashboard. The pending → verified transition is
real — but the actual identity check is currently a **mock** (it
always resolves to "verified" after ~2 seconds), because Agaram
doesn't have a real e-KYC vendor account yet:

- **HyperVerge** (the vendor picked earlier) does offer a self-serve
  free trial — go to `hyperverge.co/pricing`, pick the **Start** plan,
  and click **Start Free Trial**. It's advertised as a sandbox
  environment, 1-month period, "integrate in less than 4 hours." (An
  earlier check of theirs turned up no self-serve option and pointed
  at emailing `contact@hyperverge.co` instead — that's outdated; use
  the free trial signup.) Once you're in, check their dashboard/docs
  to confirm Aadhaar e-KYC is included at this tier (the Start plan's
  comparison table calls out a 14-day data-retention window and a
  3-user cap, and doesn't include Face Liveness or a few other add-ons
  — Aadhaar verification itself wasn't explicitly confirmed either way
  from the pricing page alone).
- Once you have real sandbox credentials (`appId`/`appKey`) and their
  actual e-KYC API docs, the only file that needs to change is
  `src/app/actions/verification.ts` — specifically the
  `resolveMockVerification` function. Everything else (the form, the
  status page, the dashboard badge) just reads the
  `identity_verifications.status` column in Supabase, so it keeps
  working unchanged.
- Only the **last 4 digits** of the Aadhaar number are ever stored in
  the database, per the PRD's own data-minimization guidance — the
  full number is used for the one request and discarded.

**Database:** the `identity_verifications` table is at the bottom of
`supabase/schema.sql`. If your Supabase project already has the
Phase 2 tables, just re-run the whole file in the SQL Editor — every
statement is safe to re-run (`create table if not exists`, etc.), so
it will only add what's new.

## Matching feed (Phase 4) — simple rules, blurred until mutual

Verified members land on `/matches`, a 4-tab flow: **Browse** (new
candidates, opposite profile type, filtered by your age-range and — if
you set one — location preference), **Sent** / **Received** (interest
you've sent or gotten, still masked to a first initial), and
**Mutual** (once both sides say yes, the real name and "about me"
unlock).

This is deliberately the cut-down V0 version from the build plan, not
the full PRD (§8) matching feed:

- **No Jathagam/horoscope scoring** — the PRD's weighted compatibility
  model needs an astrology API and horoscope data collection, neither
  of which exist yet. Matching here is just profile-type-opposite +
  your age range + (optionally) location.
- **No weekly Friday cadence** — candidates show up whenever you
  browse, not in a scheduled batch. The PRD's "Friday 4pm, your 3
  introductions" model needs a scheduled job + email, which isn't
  built. Easy to add later; skipped for now to keep this phase small.
- **No match-explanation card** ("why we introduced you") — deferred
  for the same reason as Jathagam scoring above.
- **The "blur" is real, not just CSS.** Masked candidates never have
  their real name fetched by the browse/sent/received queries at
  all — the database only ever returns a first-initial, age, location,
  and verified badge for anyone who isn't a mutual match yet. That's
  enforced with four Postgres functions at the bottom of
  `supabase/schema.sql` (`get_match_candidates`, `get_sent_interests`,
  `get_received_interests`, `get_mutual_matches`) — each one is the
  *only* way another member's data is ever exposed, and each hand-picks
  exactly which columns come back. The existing "only I can read my
  own row" policy on `profiles` is untouched.
- **Location is new on `profiles`.** Phase 2's basic-info form never
  asked for the candidate's own city, so a location-based match wasn't
  possible until now. If your own test profile predates this, open
  **Edit profile** and fill in your city — otherwise you won't show up
  in anyone's location-filtered search, and your own results won't be
  location-filtered either.
- **Testing this needs two accounts.** A "mutual match" only happens
  between two different people, one of each profile type (a groom and
  a bride), each verified and with preferences set. Sign up a second
  test account to see the full Browse → Interested → Accept → Mutual
  loop end to end — one account alone will only ever see the empty
  states.

## What's next

Per the build plan's suggested order: payments & the paywall, then
messaging (unlocked only after a mutual match), then admin basics —
plus swapping in the real HyperVerge call above once their sandbox
access comes through. Bring this repo and `Agaram_Premium_PRD_v2.md` /
the clickable prototype into your next session and we'll build the
next phase on top of this.
