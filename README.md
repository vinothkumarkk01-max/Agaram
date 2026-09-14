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

- **HyperVerge** (the vendor picked earlier) has no self-serve
  sandbox — you need to email `contact@hyperverge.co` and ask for
  sandbox access to their Aadhaar e-KYC verification API. Do this
  whenever you get a chance; it can take a few days for them to
  respond, so it's worth starting even if you're not ready to wire it
  in yet.
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

## What's next

Per the build plan's suggested order: the matching feed, payments,
messaging, and admin basics — plus swapping in the real HyperVerge
call above once their sandbox access comes through. Bring this repo
and `Agaram_Premium_PRD_v2.md` / the clickable prototype into your
next session and we'll build the next phase on top of this.
