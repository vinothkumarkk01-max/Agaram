# Agaramiya — Project Scaffold (V0, Phase 1)

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
   repo (the GitHub repo itself is still named `Agaram` — renaming the
   app's brand doesn't rename the repo; do that separately on GitHub if
   you want the repo name to match).
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
always resolves to "verified" after ~2 seconds), because Agaramiya
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

## Payments & the Elite paywall (Phase 5) — Razorpay, real checkout

Once two members are a mutual match, their card on `/matches/mutual`
is blurred (name + about-me hidden) unless the viewer is on **Elite**
(₹15,000 / 6 months, per the PRD's §11 pricing). `/upgrade` shows the
plan and, for Free members, an "Upgrade to Elite" button that opens a
real Razorpay Checkout popup.

- **Two environment variables to add** — locally in `.env.local`, and
  in Vercel under **Project Settings → Environment Variables**:
  ```
  RAZORPAY_KEY_ID=your-key-id
  RAZORPAY_KEY_SECRET=your-key-secret
  ```
  Get these from the [Razorpay dashboard](https://dashboard.razorpay.com/)
  → **Settings → API Keys**. Sign up is free and self-serve; you're
  dropped into **Test Mode** immediately, no business KYC needed yet.
  Test mode uses [dummy card numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/)
  — no real money moves, so you can try the whole upgrade flow safely
  before going live.
- **Test mode vs. live mode** — this mirrors the HyperVerge corporate-
  email situation from Phase 3: real (live-mode) payments need
  Razorpay's full business KYC — PAN, bank account, business proof —
  which is an RBI-mandated compliance step, not something either of us
  can shortcut. Until that's done, everything works end-to-end in test
  mode, so the whole flow (order creation, Checkout popup, signature
  verification, subscription activation) can be built and demoed now.
  Swap in live keys later and nothing else changes.
- **Payment is verified server-side, not trusted from the browser.**
  `src/app/actions/payments.ts` creates the Razorpay order
  (`createEliteOrder`) and, after checkout, independently recomputes
  the HMAC-SHA256 signature from the returned order/payment IDs
  (`verifyElitePayment`) before ever marking a subscription active —
  the client-side "success" callback alone is never enough.
- **Two ways to pay: one-time, or genuinely auto-renewing.** The
  original one-time Razorpay Checkout (order → signature verify)
  still works exactly as described above and always will — renewing
  manually now correctly *extends* from your current expiry rather
  than resetting from today, so renewing early never throws away days
  you already paid for. Alongside it, V1 added real recurring billing
  via Razorpay's separate Subscriptions API — see "Subscription
  lifecycle: renewal & billing" below for both.
- **Database:** the `payments` table and the updated
  `get_mutual_matches()` function are new additions at the bottom of
  `supabase/schema.sql` — re-run the whole file in the SQL Editor, it's
  safe to re-run in full.

## Messaging (Phase 6) — mutual matches only, Elite only

Once you're both Elite and a mutual match unlocks, a **Message**
button on `/matches/mutual` opens a real two-way chat thread at
`/matches/mutual/<match id>`.

- **Three gates, all enforced in the database, not just the UI** —
  the same "narrowly-scoped SQL as the only way data is exposed"
  pattern as Phases 4 and 5:
  - You must be one of the two people in the match.
  - The match must actually be `mutual` (not just interest sent).
  - **Your own** subscription must be active Elite — matches the
    PRD's rule that Elite gates both "unlock full profile" and
    "message" (Section 5 of the build plan). If your match is Elite
    but you're on Free, you'll see an upgrade prompt instead of the
    thread; if it's the other way around, they will.
  - All three live in `supabase/schema.sql`'s `messages` table RLS
    policies — re-run the whole file (safe, as always) to pick this
    up.
- **Now on Supabase Realtime, not a plain poll.** The original V0
  build polled every 4 seconds; it's since been upgraded to a live
  Realtime subscription (with a slow 15-second poll left in only as
  a safety net for a dropped socket) — see "Messaging upgrades" (V1)
  below for the details, including typing indicators and read
  receipts.
- **Milestone tagging is now built** — see "Message milestone
  tagging (V1)" below.
- **Push notifications are now built** — see "Push notifications for
  messages" below. You'll see a new message the moment it arrives
  *while the thread is open* regardless (Realtime, above); this adds
  a browser notification for when you're elsewhere in the app, or
  the app isn't open at all.
- **Testing this needs the same two-account setup as Phase 4**, both
  now also upgraded to Elite (Phase 5) — sign a message from each
  account and confirm it shows up on the other side within a few
  seconds.

## Admin basics (Phase 7) — reports and manual verification review

A minimal `/admin` area for the one person running Agaramiya (you) to
review member reports and manually override a stuck identity
verification.

- **There's no self-serve way to become an admin, and no UI for it
  either — deliberately.** Grant it to your own account once,
  directly in Supabase's SQL Editor:
  ```sql
  update public.profiles set is_admin = true where id = '<your auth user id>';
  ```
  Find your user id under **Authentication → Users** in the Supabase
  dashboard (match it by your email). Anyone whose `profiles.is_admin`
  isn't `true` gets quietly bounced from `/admin` back to their own
  dashboard — it doesn't reveal that the page exists.
- **Reporting is scoped to mutual-match conversations only.** A
  **Report** link on `/matches/mutual/<match id>` opens a short reason
  form; the report always ties back to that specific match, and one
  report per conversation per reporter (submitting again just shows
  "already reported"). This was the narrowest version that still gives
  an admin something concrete to act on — reporting a masked Browse
  candidate you've never actually talked to wouldn't give either side
  enough context to matter.
- **What the admin dashboard shows:** a **Reports** tab (open ones
  first, with a "Mark resolved" button) and a **Verifications** tab
  (every identity check ever submitted, with "Mark verified" / "Mark
  failed" buttons on anything still `pending`). Admin access itself is
  enforced by Postgres RLS policies in `supabase/schema.sql` — the
  same "database, not just the UI" pattern as every prior phase — so
  admin visibility into other members' names and verification status
  isn't behind the Elite paywall; that gate is between members, not
  between a member and whoever runs the platform.
- **What's deliberately NOT built yet:**
  - **No blocking yet in V0** — added afterward, see "Member
    blocking, data export & account deletion" below.
  - **Member search &amp; suspension are now built** — see "Admin:
    member search &amp; suspension (V1)" below.
  - **Admin message oversight &amp; an action audit log are now
    built too** — see "Admin message oversight &amp; audit log (V1)"
    below. Admins can read a *reported* conversation's messages (and
    only that — there's still no general "browse all messages"
    screen), and every admin action anywhere in `/admin` — resolving
    a report, a verification override, a suspension, opening a
    reported conversation — is now recorded in an `admin_actions`
    table with who, what, and when.

## Polish & harden (Phase 8) — error tracking, a security pass, and a privacy policy

Three pieces, covered in order below: error tracking (Sentry), a
security pass on auth/authorization (there's no file-upload feature
yet — see the note at the end of that section), and a first-draft
privacy policy.

### Error tracking — Sentry

Wired up with `@sentry/nextjs`, following this Next.js version's own
`instrumentation.ts` / `instrumentation-client.ts` conventions (see
`src/instrumentation.ts`, `src/instrumentation-client.ts`,
`sentry.server.config.ts`, `sentry.edge.config.ts`). It captures
unhandled errors from Server Components, Route Handlers, Server
Actions, and the proxy/middleware automatically via `onRequestError`,
plus client-side errors via `src/app/error.tsx` (route-level) and
`src/app/global-error.tsx` (root-layout-level, last resort).

**Without any Sentry env vars set, this is a safe no-op** — `Sentry.init({ dsn: undefined })`
initializes but never sends anything, so local dev and the current
deployment keep working exactly as before. To turn it on:

1. Create a free account at [sentry.io](https://sentry.io) and a new
   project (platform: Next.js).
2. Copy its DSN (Settings → Client Keys (DSN)) and add:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@oXXXXXX.ingest.<region>.sentry.io/XXXXXXX
   ```
   to `.env.local` (local) and your Vercel project's environment
   variables (production) — the `NEXT_PUBLIC_` prefix is required
   (it needs to reach the browser bundle too), and a DSN is not a
   secret, so this is safe to expose.
3. **Optional, for readable stack traces in production** (source map
   upload at build time): add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and
   `SENTRY_PROJECT` (from Sentry's dashboard). Without these, the build
   still succeeds — it just skips the source-map-upload step with a
   warning, and Sentry shows minified stack traces instead.
4. Redeploy. Trigger a test error (any thrown exception) and confirm
   it shows up in the Sentry project's Issues tab.

### Security pass — auth & authorization

**There's no file-upload feature in the app yet** — identity
verification takes a typed Aadhaar number (Phase 3), not a document
photo, so "a security pass on file uploads" from the build plan
doesn't apply yet. This pass covered auth and authorization instead,
which is where the app's actual attack surface is today. Reviewing
every RLS policy in `supabase/schema.sql` against what a member's own
Supabase session can call directly (not just what the app's own
screens do) turned up four real gaps — all fixed in this phase's
`schema.sql` changes:

- **Privilege escalation (most serious).** `profiles.is_admin`,
  `.subscription_tier`, and `.subscription_expires_at` had no
  column-level write protection — only row-level ("can you touch your
  own row at all"), not column-level ("which columns on it"). Any
  signed-in member could have called
  `supabase.from("profiles").update({is_admin: true})` — or
  `{subscription_tier: "elite"}` — directly from their own session,
  bypassing the app entirely, and RLS would have allowed it. Fixed by
  revoking column-level `insert`/`update` privileges on those three
  columns from the `authenticated` role; the only way they can change
  now is the manual admin SQL grant (`is_admin`, unchanged from Phase
  7) and a new `finalize_elite_payment()` function (below).
- **Self-verification.** The identity-verification `status` column
  could be set to `"verified"` directly by the member it belongs to,
  skipping the actual check (mock today, a real vendor later)
  entirely. Fixed with a `WITH CHECK` that pins a member's own writes
  to `status = 'pending'`, plus a new `resolve_mock_verification()`
  function (`SECURITY DEFINER`, same pattern as `is_admin()` from
  Phase 7) as the one path that can actually mark a row verified.
- **Self-approving your own match.** Either side of a pending
  "interest sent" could set `matches.status` to `"mutual"` directly —
  including the person who *sent* the interest, letting them force a
  match with someone who never accepted, unlocking profile reveal and
  messaging. Fixed with a `WITH CHECK` that blocks exactly that one
  move (`status = 'mutual' and you are the original sender`); the
  app's own logic already never attempted it, so no app code changed.
- **Forged payment records.** A member could set their own
  `payments.status` to `"paid"` directly, without a real Razorpay
  transaction (this alone didn't grant Elite, once the point above was
  fixed, but it left fake records in payment history). Fixed the same
  way as identity verification — `WITH CHECK` pins member writes to
  `status = 'created'`, and two new functions, `finalize_elite_payment()`
  and `mark_payment_failed()`, are the only paths that can mark a
  payment `paid`/`failed`. `src/app/actions/payments.ts` now calls
  these via `supabase.rpc(...)` instead of updating the tables
  directly — `verifyElitePayment()`'s HMAC signature check is
  unchanged, only what happens *after* it passes.

None of these were exploitable through the app's own screens — every
one requires calling the Supabase client library directly with a
signed-in member's own session, bypassing the UI. That's exactly why
they're worth fixing regardless: RLS policies are the actual security
boundary here (the same principle every prior phase's comments already
state), not the React components sitting in front of them.

**Also added, lower severity:**
- **Security headers** (`next.config.ts`): `Strict-Transport-Security`,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` (camera/microphone/geolocation all denied — this
  app never asks for them).
- **A Content-Security-Policy, shipped in `Report-Only` mode.** It's
  built to cover what the app actually loads (Supabase, Razorpay's
  checkout, Sentry's ingestion endpoint), but Razorpay's checkout flow
  touches several of its own subdomains (card entry, 3D-Secure/OTP
  redirects, UPI/QR) that a single test transaction won't all exercise
  — shipping it in enforcing mode without being able to click through
  every path against the live deployment risked silently breaking
  checkout, which is already confirmed working. Report-Only mode
  changes nothing for members; it just logs would-be violations to the
  browser console. **Flipping it to enforcing is now a config
  toggle, not a code change:** set `CSP_ENFORCE=true` as an
  environment variable (locally and in Vercel) once — but only once —
  you've done a full run-through with the browser console open (sign
  up, verify identity, run an Elite checkout *both* ways — one-time
  and auto-renew — send a message, turn on notifications) and seen
  zero `[Report Only]` CSP warnings. Leave it unset until then; if
  something unexpected breaks after setting it, just remove the
  environment variable and redeploy to fall back to Report-Only
  immediately.
- **Not changed:** rate limiting on login/signup relies on Supabase
  Auth's own built-in limits — nothing custom added here. Worth
  revisiting (Vercel's WAF, or a library like Arcjet) if real signups
  ever show abuse.

### Privacy policy — first draft

`/privacy` — linked from the landing page, the signup form, and the
dashboard footer. It plainly describes what the app's code actually
collects and does today (account info, profile fields, the
last-4-digits-only Aadhaar handling from Phase 3, Razorpay payment
metadata, matches/messages, reports) and who it's shared with
(Supabase, Razorpay, Vercel, Sentry, and HyperVerge/Signzy once
connected). **This is a first draft, not a substitute for the DPDP-Act
legal review the build plan's Section 7 already calls for** —
`[bracketed placeholders]` in the page itself (effective date, the
named grievance-officer contact the DPDP Act requires) still need real
answers, and a real deletion/export flow (mentioned in the page's
retention section) still needs building.

## Member blocking, data export & account deletion (V1)

The first deferred V1 feature from Section 3 of the build plan, built
after all 8 V0 phases were live. Three pieces, all reachable from a
new **Account & privacy** link on `/dashboard`:

- **Blocking.** A **Block** button on `/matches/mutual/<match id>`
  (next to Report) and on `/matches/received` (next to Decline/Accept)
  adds the other member to your `blocks` table row and immediately
  declines any existing match between you. Blocking is one-directional
  and asymmetric — you can see and manage your own blocklist on
  `/account`, but a blocked member is never told they've been blocked.
  It's enforced in the database, not just hidden in the UI: the same
  `blocks` check is added to `get_match_candidates()`,
  `get_mutual_matches()`, `get_match_thread()`, and the `messages`
  insert policy in `supabase/schema.sql`, so a blocked member can't
  resurface as a new match, in your mutual list, or in a message
  thread, however they reach the database. This is a genuinely new
  capability, not just a rename of "decline" — declining a match was
  already effectively permanent in this schema, but blocking gives an
  explicit, safety-framed, always-visible, independently-manageable
  list, separate from the mutual-match state machine.
- **Data export.** "Download my data" on `/account` streams a single
  JSON file with everything Supabase's RLS already lets you read about
  yourself: profile, preferences, identity verification status,
  payment history, both directions of matches, every message you're
  part of, reports you filed, and your blocklist. Deliberately
  excluded: reports filed *against* you, and blocked members' own
  identities — those are the other side's own thread. See
  `src/app/api/account/export/route.ts` for the full field list.
- **Account deletion.** The danger-zone section at the bottom of
  `/account` requires ticking a checkbox and typing your account email
  before it does anything. **New environment variable required** — see
  `.env.local.example`:
  ```
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
  ```
  from the same Project Settings → API page as your anon key, under
  **service_role secret**. Deleting an account uses the Supabase Admin
  API (`auth.admin.deleteUser`) — the only way to remove a row from
  `auth.users`, which no regular Postgres role can be granted
  permission to do, so this is the one place in the app that uses the
  service-role key (see the comment at the top of
  `src/lib/supabase/admin.ts` for why that's safe: server-only, never
  `NEXT_PUBLIC_`, used for nothing except this one call, and only ever
  with the id of whoever is currently signed in). Every other table in
  `supabase/schema.sql` already cascades from `profiles.id`, which
  itself cascades from `auth.users.id`, so deleting that one row
  quietly removes everything else too — no per-table cleanup code
  needed.

  Two trade-offs worth knowing, not fixed here: deleting your account
  also deletes the *other* person's half of any shared match/message
  thread — there's no way to erase only your own side of a
  conversation — and any report you filed or that was filed against
  you disappears too, which is consistent with a right-to-erasure
  reading of the DPDP Act but is also a way to make an open trust &
  safety case vanish. Worth an anonymized-record approach later if
  this becomes a real vector; not addressed now.

  **Database:** the `blocks` table, its RLS policies, and
  `get_blocked_members()` are new additions in `supabase/schema.sql`
  (placed right after the Phase 4 matches policies, so the functions
  that reference `blocks` can find it — not at the bottom of the file
  like most other phases' additions). Re-run the whole file in the SQL
  Editor, as always — every statement is safe to re-run.

## Tamil-language UI toggle (V1)

The second deferred V1 feature from Section 3. An **English / தமிழ்**
toggle appears wherever a language choice makes sense — the landing
page, sign-up/login, the dashboard, the matches area, and `/account`
— and switches every member-facing screen: onboarding, the matching
feed (Browse/Sent/Received/Mutual), messaging, the report flow,
account/data-export/deletion, and the error/not-found pages.

- **How it works.** A single cookie (`agaram_locale`, one year,
  `sameSite: lax`, deliberately *not* `httpOnly` — see below) holds
  `"en"` or `"ta"`. Toggling calls a Server Function
  (`src/app/actions/locale.ts`) that sets the cookie and revalidates
  the whole app, so the page you're on updates immediately — no
  reload, no redirect. Every Server Component reads it via
  `src/lib/i18n/server.ts`'s `getDictionary()`; the two error
  boundaries (`error.tsx`, `global-error.tsx`) are React Client
  Components and can't use that path, so they read the same cookie
  directly from `document.cookie` via `src/lib/i18n/client.ts` — which
  is the one reason the cookie isn't `httpOnly` (it's a UI preference,
  not a secret, so that's a fine trade-off).
- **The dictionary is typed, not just translated.** `src/lib/i18n/dictionary.ts`
  defines the English strings first, derives a `Dictionary` type from
  their shape, then types the Tamil object against that same type
  (`satisfies Dictionary`). A key present in one language but missing
  from the other is a `tsc` type error, not a silent English fallback
  at runtime — this is what the build verification step for this
  feature actually caught and fixed (a stray `as const` was making
  every English string a literal type, which rejected every Tamil
  translation as "not assignable"; removing it widened the type to
  plain `string` while keeping the parity check).
- **Two screens stay English-only, on purpose:**
  - **`/admin`** (the reports/verifications dashboard, Phase 7) is
    founder-only tooling — no member ever sees it, so translating it
    wouldn't serve the point of this feature.
  - **`/privacy`** is DPDP-Act consent and compliance language.
    Auto-translating legal text without a native-Tamil-speaking legal
    review pass risks a mistranslation in exactly the document that
    matters most for getting consent right — worse than leaving it in
    the one language that's actually been drafted and is already
    flagged (Section 7 of the build plan) as needing its own legal
    review before real members rely on it. It stays English-only
    until that review happens, same flag as the English text itself.
- **The Tamil text itself is a solid first pass, not a native-speaker-reviewed
  final draft** — same honesty this build plan applies to the mock
  identity vendor and the privacy policy's own draft status. Worth a
  read-through by a Tamil-speaking member (or yourself) before this
  goes in front of real users; if anything reads awkwardly, the fix is
  entirely in `src/lib/i18n/dictionary.ts` — one file, no other code
  changes needed.
- **Side effect worth knowing:** the root layout now reads the locale
  cookie on every request (`src/app/layout.tsx`), which — per Next.js's
  own rule that reading cookies opts a route into dynamic rendering —
  means the landing page, `/login`, `/signup`, and `/privacy` are no
  longer statically pre-rendered; they render per-request now, same as
  every other page in this app already did. At this app's scale that's
  not a noticeable cost, just a change worth knowing about if you ever
  look at Vercel's build output and wonder why those routes changed
  from a static `○` to a dynamic `ƒ`.

## Family Collaborator accounts (V1)

The third deferred V1 feature from Section 3 — a deliberately
scoped-down slice of the PRD's full Family Collaborator model (§5),
not the whole thing. What's built: a candidate can invite one parent
or family member to get their own login with persistent, read-only
access to that candidate's basic profile and the status of whatever
matches the candidate chooses to share — nothing else. What's **not**
built this round, and why: the PRD's fuller model also has a parent
creating a profile *before* the candidate even signs up (with a later
claim/ownership-transfer step), and a sibling/friend proxy-creator
flow whose access auto-expires once the real candidate takes over.
Both are real extra scope on top of this app's current
one-account-per-profile model, and neither was needed to make family
sharing genuinely useful — they're listed here so a future session
doesn't have to rediscover that they're still open.

- **Inviting someone.** A new **Family sharing** section on `/account`
  (candidates only — a pure Family Collaborator with no profile of
  their own doesn't see it) has a **Generate invite link** button.
  This creates a row in the new `account_links` table with a random,
  unguessable code and a 7-day expiry, and shows a copyable URL like
  `https://your-app/family/join?code=<code>` — the candidate shares it
  themselves however they like (WhatsApp, SMS, email); there's no
  email-sending vendor involved, on purpose, to avoid a new
  integration for a V1 slice. Only one live invite/link per candidate
  at a time (a partial unique index enforces this at the database
  level), matching the PRD's "steady state: one persistent Family
  Collaborator" model — generating a new one only appears once the
  previous invite is cancelled or the link is revoked.
- **Accepting an invite.** `/family/join?code=...` works whether or
  not you're already signed in: signed out, it explains what the link
  is and sends you to sign up or log in — carrying the invite code
  through as a `next` redirect param (a small, generic addition to
  `src/app/actions/auth.ts` and `AuthForm`, not family-specific
  itself) so you land back on the same invite page afterward instead
  of the dashboard. Signed in, it looks up the invite (by code, via a
  `SECURITY DEFINER` function so an invalid guess never leaks whether
  *any* invite exists), shows who invited you, and asks for your name
  before accepting — that name is shown back to the candidate on
  their `/account` page ("X is helping with your search"), since
  otherwise there'd be no way to show them who accepted.
- **What a Family Collaborator can and can't see**, enforced at the
  database layer via a new set of `SECURITY DEFINER` functions
  (`get_family_links_for_collaborator()`, `get_family_shared_matches()`)
  — the same "hand-picked column list, `profiles` itself stays locked
  to one row per person" pattern the matching-feed functions already
  use, not a broad new RLS policy:
  - The candidate's basic profile (name, groom/bride, age, location,
    about-me) — read-only, at `/family`.
  - The **status only** of matches the candidate has explicitly
    toggled "Share with family" on `/matches/mutual` (a new
    `shared_with_family` column, default `false` — sharing is always
    opt-in). Deliberately shows no identity of the other person in
    that match, not even a masked initial — the PRD's own wording
    here ("status only") reads ambiguous, so this errs conservative.
  - **Cannot** see any message, who else the candidate passed on,
    private photos (there are none yet), or act on a match
    (accept/decline/message) — there is no code path that lets a
    Family Collaborator do any of these; `/family` is entirely
    read-only.
- **Revoking access** (same "Family sharing" section on `/account`)
  also resets `shared_with_family` back to `false` on every one of the
  candidate's matches, so a later, different collaborator doesn't
  silently inherit whatever was shared with whoever just lost access.
- **A pure Family Collaborator never has a `profiles` row** — they
  never go through onboarding at all. `/dashboard` now checks for an
  active collaborator link before showing the usual "let's set up
  your profile" nudge, and sends them straight to `/family` instead;
  someone who happens to be both a candidate *and* a collaborator for
  someone else sees a normal dashboard plus a link into `/family`.
  `/account` (data export, blocking, deletion) already worked for any
  signed-in user regardless of profile, so it needed no changes to
  keep working for a Family Collaborator too — including account
  deletion, which cascades correctly since `account_links.collaborator_id`
  references `auth.users.id` directly (not `profiles.id`, which a pure
  collaborator doesn't have a row in).
- **No new environment variables or vendor accounts** — same as the
  Tamil toggle. The invite link's domain is read from the incoming
  request's own `Host` header (`src/lib/site-url.ts`), not a hardcoded
  URL, so it's correct on a Vercel preview deploy, a custom domain, or
  `localhost` with zero configuration.
- **Database:** the `account_links` table, its RLS policies, the
  `shared_with_family` column on `matches`, and five new
  `SECURITY DEFINER` functions are appended at the very end of
  `supabase/schema.sql` (Phase 10). Re-run the whole file in the SQL
  Editor, as always — every statement is safe to re-run.

## Message milestone tagging (V1)

Per the PRD's original messaging model (§8, §12), a mutual match's
chat thread can now be tagged with its current stage — **Getting to
know each other**, **Family introductions**, **Video call**, or
**Planning to meet** — right from the chat screen at
`/matches/mutual/<match id>`.

- **How it works** — a row of four small stage buttons sits above the
  message box. Tapping one inserts a distinct, centered divider into
  the thread (not a normal chat bubble) announcing the new stage, and
  the most recently set stage becomes the match's "current" one —
  shown at the top of the chat, next to each match on `/matches/mutual`,
  and (when that match is shared) on the Family Collaborator's
  `/family` dashboard.
- **Either person in the match can set it, at any pace** — there's no
  enforced one-way progression (you can re-mark an earlier stage, or
  jump straight to "Planning to meet"). This is a shared, informational
  tag for both people to see, not a gate on anything else in the app.
- **Same gate as sending a message, because it *is* a message** — a
  milestone tag is stored as an ordinary row in the `messages` table
  with a `milestone` column set, insertable only through the exact
  same RLS policy as a normal chat message (match participant, mutual
  match, active Elite subscription, not blocked). No separate
  permission model to get wrong.
- **A nice fit with Family Collaborator accounts** — a collaborator
  already only ever sees a shared match's status, never its messages;
  now they also see *which stage* that match has reached (e.g.
  "Currently: Family introductions"), without the tag ever exposing
  message content.
- **Database:** a nullable `milestone` column (with a `CHECK` against
  the four allowed values) was added directly to the `messages` table,
  and `get_mutual_matches()`, `get_match_thread()`, and
  `get_family_shared_matches()` were all re-created (Phase 11, at the
  very end of `supabase/schema.sql`) to also return each match's
  current milestone. Re-run the whole file, as always.

## Subscription lifecycle: renewal & billing (V1)

`/upgrade` now handles the whole lifecycle of an Elite subscription,
not just the first purchase, and `/account` gained a **Billing**
section.

- **Renewing now correctly extends, not resets.**
  `finalize_elite_payment()` used to always set
  `subscription_expires_at = now() + 182 days` — fine for a first
  purchase, but it meant renewing two weeks before expiry threw away
  those two remaining weeks. It now extends from whichever is later,
  your current expiry or now, so renewing early never costs you paid
  time. (Database: `supabase/schema.sql`, the in-place fix to
  `finalize_elite_payment()` in the Phase 5 section — safe to re-run
  the whole file, as always.)
- **`/upgrade` now has three states**, not two: the original "Free →
  Upgrade to Elite" pitch is unchanged, but an active Elite member now
  sees a **Renew** option too (same Razorpay checkout, just relabeled
  and reusing the extend-not-reset fix above), and within 14 days of
  expiry that becomes a more prominent "expiring soon, renew now"
  prompt. An Elite member whose subscription has already lapsed sees
  a dedicated "expired, renew to continue" message instead of being
  quietly dropped back into the first-time-buyer pitch.
- **`/account` → Billing** shows your current plan (Free, active
  Elite with its expiry date, or expired Elite) plus every payment
  you've made — date, amount, and status (Paid / Failed / Incomplete)
  — pulled straight from the `payments` table your own RLS policy
  already lets you read (no new function needed for this part).
- **Real auto-recurring billing is now built too, alongside the
  manual path above — not instead of it.** On `/upgrade`, an
  "Auto-renew every 6 months" checkbox (checked by default) sits
  above the Upgrade/Renew button. Checked, it creates a Razorpay
  *Subscription* against a Plan you create once (see below) instead
  of a one-time Order; unchecked, it's the exact same one-time-order
  flow as before, unchanged.
  - **One-time setup you have to do yourself, in the Razorpay
    dashboard** (this can't be done from here — it's your business's
    Razorpay account): **Subscriptions → Plans → create a plan** —
    ₹15,000, billing frequency "every 6 months" (Razorpay Plans are
    period + interval, so "Monthly" with interval `6`), any plan name
    you like. Copy its Plan ID (`plan_...`) and add it as
    `RAZORPAY_PLAN_ID` — locally in `.env.local`, and in Vercel's
    environment variables. Then, webhooks live somewhere else in the
    dashboard — they're account-wide, not under Subscriptions —
    **Account & Settings (bottom of the left sidebar) → Website and
    app settings → Webhooks → "+ Add New Webhook"**, URL
    `https://<your-domain>/api/webhooks/razorpay`, active events:
    `subscription.charged`, `subscription.cancelled`,
    `subscription.completed`, `subscription.halted`. Razorpay shows
    you a webhook secret when you create it — add that as
    `RAZORPAY_WEBHOOK_SECRET` (same two places). **Test Mode and Live
    Mode each have their own separate webhooks and their own separate
    Plans** (the Test/Live toggle near the top of the dashboard
    switches which one you're looking at) — while you're still on
    test keys (`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` starting with
    `rzp_test_`), create the Plan and the webhook while that toggle is
    set to **Test Mode**; you'll repeat both steps once more, in Live
    Mode, when you eventually go live. Without
    `RAZORPAY_PLAN_ID` set, the auto-renew checkbox still shows, but
    trying to use it gives a clear "not configured yet" error instead
    of a broken checkout — the one-time path keeps working regardless.
  - **The webhook, not the checkout success callback, is what
    actually grants Elite for a subscription charge** —
    `src/app/api/webhooks/razorpay/route.ts`, verified via
    HMAC-SHA256 over the raw request body against
    `RAZORPAY_WEBHOOK_SECRET` (Razorpay's own documented scheme),
    using the service-role client since a server-to-server webhook
    call has no member session. This is deliberate: Razorpay's own
    confirmation that money actually moved is the one source of
    truth, not the browser's "checkout succeeded" callback, which is
    only used to make the UI feel responsive while the real webhook
    (usually a few seconds behind) does the actual work.
  - **Cancelling stops future charges without cutting off access
    early.** A "Cancel auto-renew" button on `/account` → Billing
    (shown whenever you have an active or newly-created subscription)
    calls Razorpay's cancel API with `cancel_at_cycle_end`, so you
    keep Elite until whatever period you've already paid for actually
    ends — same as letting a one-time payment lapse naturally. You
    can subscribe again afterward if you change your mind.
  - **Database:** `profiles` gained `razorpay_subscription_id` /
    `subscription_status`, locked down with the same column-privilege
    revoke as `is_admin`/`subscription_tier`; `payments.razorpay_order_id`
    is now nullable (a subscription charge has no classic "order"),
    and a partial unique index on `razorpay_payment_id` makes the
    webhook safe to receive the same event twice (Razorpay retries on
    anything but a 2xx response) — all in the new Phase 14 section at
    the end of `supabase/schema.sql`. Safe to re-run the whole file.

## Push notifications for messages (V1)

Turn it on from `/account` → **Message notifications** — a browser
push notification arrives when a mutual match sends you a message,
even if Agaramiya isn't open in a tab.

- **One-time setup:** generate a VAPID keypair (`npx web-push
  generate-vapid-keys` — pure crypto, no account needed) and add
  three environment variables, locally and in Vercel:
  ```
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=<the public key>
  VAPID_PUBLIC_KEY=<the same public key>
  VAPID_PRIVATE_KEY=<the private key — keep this one secret>
  VAPID_SUBJECT=mailto:support@agaramiya.com
  ```
  (The public key needs both names because the browser reads the
  `NEXT_PUBLIC_` one and the server reads the plain one — same value,
  different variable so only what's meant to be public is exposed.)
  Without these set, the "Message notifications" section on `/account`
  simply doesn't appear — nothing breaks, it just isn't offered.
- **Opt-in, per browser, and reversible.** Turning it on asks the
  browser's own notification permission, registers a minimal service
  worker (`public/sw.js`), and saves the resulting subscription;
  turning it off removes that subscription. A member can have several
  (phone, laptop, ...) — each is notified independently.
- **Sent from inside `sendMessage()` itself** (`src/app/actions/
  messages.ts`), right after the message insert succeeds, using
  `web-push` and a narrowly-scoped `SECURITY DEFINER` function
  (`get_push_subscriptions_for_match_peer`) that only ever returns
  the *other* participant's subscriptions for a match the sender is
  actually part of. A push failure — a stale subscription, the push
  service being briefly unreachable — never affects whether the
  message itself sent; a stale subscription (404/410 from the push
  service) is quietly deleted so it stops being retried.
- **Deliberately minimal.** No message preview in the notification
  body (just "New message from <name>", for the same reason a lock
  screen shouldn't show private content), no read/unread badge count,
  no notification for milestone-tag messages — just "someone sent you
  a message, go look."

## Admin: member search & suspension (V1)

A **Members** tab on `/admin`, alongside Reports and Verifications.

- **Search, don't browse.** The page shows nothing until you search
  by full name or paste an exact profile ID (e.g. from a report
  elsewhere in `/admin`) — deliberately not a scrollable list of every
  member, so it doesn't become its own moderation surface to worry
  about. It just runs a straightforward `.ilike()` / `.eq()` query
  against `profiles`, since "Admins can view all profiles" (Phase 7)
  already permits that — no new read function needed.
- **Suspension is a soft block, not a ban.** A suspended member's
  profile, matches, and messages are all left completely alone, and
  they can still sign in and see their own `/account` — V0 has no
  separate appeals flow, so that's deliberately where any dispute has
  to start. What actually changes: they drop out of everyone else's
  Browse feed (`get_match_candidates()`), and they can't send new
  messages (the messages insert policy) — existing threads stay
  readable on both sides. Suspending always requires typing a short
  reason first (kept as an admin-only note next to the member, since
  V0 still has no separate audit-log table); unsuspending is one
  click.
- **Database:** `profiles` gained `is_suspended` / `suspended_at` /
  `suspended_reason`, locked down with the same column-privilege
  revoke as `is_admin`/`subscription_tier` (Phase 8) — only
  `set_member_suspended()`, a new `SECURITY DEFINER` function that
  checks `is_admin()` itself, can ever write them.
  `get_match_candidates()` and the messages insert policy were both
  updated to check `is_suspended` (Phase 12, at the end of
  `supabase/schema.sql`, for the same "function body validated at
  creation time" ordering reason as Phase 11's milestone work). Safe
  to re-run the whole file, as always.

## Admin message oversight & audit log (V1)

Two related additions to `/admin`, both about accountability for what
admin access actually lets you do.

- **A "View conversation" link on every row in `/admin/reports`**
  opens a read-only view of that specific reported match's message
  history — `viewReportMessages()` (`src/app/actions/admin.ts`) logs
  the fact that this happened, then redirects to
  `/admin/reports/[id]/messages`. This is deliberately narrow: there's
  still no general "browse all members' messages" screen anywhere —
  the only way in is from a specific report, and every time it's
  used, it's on the record. Enforced by a new, additional,
  admin-only `select` policy on `messages` in `supabase/schema.sql`
  (Phase 16) — on top of, not instead of, the existing
  participants-only policy.
- **An `admin_actions` audit log**, with a new **Audit log** tab on
  `/admin`. Every admin action anywhere in the app — resolving a
  report, a manual verification override, suspending or unsuspending
  a member, opening a reported conversation — now writes one row:
  who, what, against whom/what, when, and (where relevant, like a
  suspension reason) why. Read-only in the UI; there's no way to
  edit or delete a logged entry, by design.
- **Database:** the new `admin_actions` table (Phase 16,
  `supabase/schema.sql`) — admins can read all rows, and can only
  ever insert a row with their own `admin_id`, enforced by RLS, not a
  service-role key or a `SECURITY DEFINER` function, so `admin_id` is
  always genuinely whoever was signed in.

## Messaging upgrades: Realtime, typing indicators & read receipts (V1)

The chat thread at `/matches/mutual/<match id>` no longer just polls.

- **Realtime.** New messages now arrive over a live Supabase Realtime
  subscription (Postgres Changes on the `messages` table) instead of
  waiting for the next poll tick. A slow 15-second poll is still
  there underneath, purely as a safety net in case a socket silently
  drops — it's not the primary path anymore. Postgres Changes only
  ever streams a row to a session whose own RLS `select` policy would
  already return it, so this is exactly the same access as before,
  just pushed instead of pulled.
- **Typing indicators.** Each side broadcasts a lightweight "typing"
  event (throttled to at most one every 1.5 seconds) over a Realtime
  Broadcast channel while composing a reply; the other side shows
  "Typing…" for up to 3 seconds after the last event. Nothing here is
  ever written to the database — there's no "stopped typing" event
  either, it just expires client-side.
- **Read receipts.** A new `message_read_state` table holds one row
  per (match, member): how recently that member has viewed the
  thread. Your own latest message shows a small "Seen" once the other
  person's read-state passes its timestamp. Deliberately coarse — no
  per-message read state, no "delivered" vs. "read" distinction, just
  "have they looked at the thread since I sent this."
- **Database:** `message_read_state` (new table, RLS policies letting
  both match participants read either row but only their own row's
  owner write it) plus `messages` and `message_read_state` both added
  to the `supabase_realtime` publication — all in the new Phase 13
  section at the end of `supabase/schema.sql`. Re-run the whole file;
  the publication-membership checks are written to be safe on a
  second run too, unlike a plain `ALTER PUBLICATION ... ADD TABLE`.

## DPDP-Act grievance officer (V1)

`/privacy`'s Section 8 named a real contact instead of a
`[bracketed placeholder]`: Vinothkumar Kannan, Founder & Grievance
Officer, at a dedicated `privacy@agaram.app` inbox (not a personal
address) — required under Section 8 read with Section 13 of the DPDP
Act, 2023. **This inbox still needs to actually exist** — set up
`privacy@agaram.app` (Google Workspace, or forwarding from wherever
you'll host the real domain) before this page goes in front of real
members; right now it's correct copy on a page still marked "draft,
not yet reviewed by a lawyer," same as the rest of `/privacy`. The
`[DATE]` and `[When live]` placeholders elsewhere on that page are
unrelated and still open, per the Phase 8 privacy-policy note above.

**Update, Sept 25, 2026:** `agaramiya.com` is now registered, with a
real `support@agaramiya.com` inbox — the founder confirmed both. The
`privacy@agaram.app` placeholder above is now `support@agaramiya.com`
on both `/privacy`'s Grievance Officer contact and the new `/support`
page (which didn't exist yet when this section was first written —
see "Landing page" below). It's the one confirmed real inbox right
now, reused for both general support and DPDP grievances rather than
inventing a separate `privacy@agaramiya.com` that hasn't been
confirmed to exist — worth splitting into a dedicated grievance-only
inbox later if that's wanted. **`agaramiya.com` itself is registered
but not yet live** — not added as a custom domain in the Vercel
project, DNS not pointed at the deployment (confirmed: it doesn't
currently resolve) — so `SITE_URL` (`src/lib/site.ts`) still falls
back to the Vercel URL. Once the domain is added in Vercel and DNS is
live, set `NEXT_PUBLIC_SITE_URL=https://agaramiya.com` as a Vercel
project env var to flip OG tags/sitemap/robots.txt over.

**A related but separate DPDP gap, also closed this round: consent
was never actually captured at account creation.** Section 7 of
`/privacy` has always described "explicit consent (a checkbox naming
the DPDP Act directly)" as how Agaramiya gets consent, and the Aadhaar
identity check (Phase 3) always did capture it — but plain account
creation itself never did. The very first onboarding step (Basic
Info, right after signup) now has a required checkbox linking to
`/privacy`, and `saveBasicInfo()` records the timestamp in a new
`profiles.terms_accepted_at` column (Phase 17, `supabase/schema.sql`
— safe to re-run the whole file). This is narrower than the full
DPDP-Act legal review the build plan's Section 7 calls for (still
open, see "What's next") — it closes one concrete, checkable gap,
not the whole review.

## Test accounts (dev utility)

Testing most features — a mutual match, messaging, milestone tagging,
Family Collaborator accounts — needs at least two separate signed-in
accounts, which normally means signing up with two different real
email addresses. This utility skips that: it creates (or resets) seven
fixed test accounts directly, no email confirmation needed.

**It's off by default.** Add `DEV_SEED_SECRET` as an environment
variable (a long random value you make up — `.env.local` for
`npm run dev`, or Vercel's Project Settings → Environment Variables for
your live deploy, redeploying afterward same as any other env var
change here). Until you set it, `/api/dev/seed-test-data` always
returns a 404 and creates nothing.

Once it's set, visit (replacing the domain with `localhost:3000` if
you're testing locally, and `<secret>` with the exact value you set):

```
https://agaram-ten.vercel.app/api/dev/seed-test-data?secret=<secret>
```

That creates:

- **Test Bride A** (`bride.a@agaram-test.dev`) and **Test Groom A**
  (`groom.a@agaram-test.dev`) — already a confirmed mutual match, both
  Elite and identity-verified, ready to open straight away for
  messaging, milestone tagging, and family-sharing tests.
- **Test Bride B** and **Test Groom B** — Elite and verified, but not
  matched with anyone, for testing Browse → send interest → accept.
- **Test Collaborator** (`collaborator@agaram-test.dev`) — deliberately
  has no profile at all, so it's ready to accept a Family invite link
  from one of the other accounts and land on the read-only `/family`
  dashboard.
- **Test Son Profile** (`son-profile@agaram-test.dev`) — seeded with
  `created_by_relation` set to `son`, so logging in and opening
  `/account` → Family sharing shows the parent-track nudge (the one
  aimed at a son/daughter profile) without you having to walk through
  onboarding by hand to set that value yourself.
- **Test Relative Profile** (`relative-profile@agaram-test.dev`) —
  seeded with `created_by_relation` set to `relative`, to show the
  *other* nudge (any relation besides self/son/daughter) on the same
  screen.

The page that loads back shows every account's email and a shared
password (`AgaramiyaTest#2026` — change it in the route file if you'd
rather use your own). Log in at `/login` with any of them. Visiting
the URL again is safe — it updates these same seven accounts in place
rather than creating duplicates.

**This is a testing convenience, not something to leave reachable
once real members are signing up.** Keep `DEV_SEED_SECRET` private —
anyone who has it can (re)create or reset these fake profiles on your
live database at any time. When you're done testing for good, either
remove the environment variable (the route goes back to always
404ing) or delete `src/app/api/dev/seed-test-data/route.ts` outright.

## Bulk test profiles for visualizing the customer journey (dev utility)

The seven fixed accounts above are enough to test individual features,
but they're not enough to see what the app actually *feels* like as a
customer — a Browse feed with two or three cards in it doesn't tell
you much. This second dev utility seeds up to **100 bride + 100 groom**
test profiles, each with a unique generated placeholder photo, so you
can log in and browse something closer to a real, populated app.

**Reuses the same `DEV_SEED_SECRET`** — no second secret to manage.
Off by default the same way, 404s on any missing/wrong secret.

**The photos are deliberately NOT real or photorealistic.** Every one
is a procedurally-generated illustrated avatar (`lib/testData/
avatar.ts`) — a gradient card with a couple of soft decorative circles
and the member's initial, unique per profile via a golden-angle hue
spread so 200 of them don't cluster into a handful of similar colors.
Two things were deliberately ruled out instead: scraping real
strangers' photos into a fake matrimony database, and generating
photorealistic AI faces to stand in for "test people" — the second one
specifically is a kind of synthetic media this app avoids producing
even privately, since a photorealistic synthetic "person" in a
marriage-candidate context is the wrong thing to create even for your
own testing. Each generated image still runs through the exact same
`original.jpg` / `blurred.jpg` derivation a real upload gets, so
blur-until-match behaves identically.

**Batched, not one giant call.** 100+100 accounts is too much work for
one serverless request, so this is called repeatedly with an
increasing `offset` (`count` defaults to 20, capped at 50 per call).
Visit, replacing `<secret>` with your value:

```
https://agaram-ten.vercel.app/api/dev/seed-bulk-profiles?secret=<secret>&offset=0&count=20
```

The JSON response includes `nextCallUrl` — the exact URL to visit
next — and `remainingPerGender`, so you can just keep opening the link
it gives you until that reaches 0. Five calls at the default `count=20`
covers all 200.

Every profile gets: a name from a deliberately non-caste-associated
pool (see `lib/testData/pools.ts`'s own note on why), a Tamil Nadu
city, an age in a realistic range per gender, varied family type/diet/
native district, a mix of identity-verification states (verified/
pending/none) and phone-verification (on/off) so badge variety is
visible in Browse, and **broad preferences** (age 18–60, no location
filter) so whichever seeded account you log into, the full opposite-
gender batch actually shows up rather than being filtered down to
almost nothing.

Deterministic and idempotent, same spirit as `seed-test-data` — the
same `offset` always regenerates the exact same 20 profiles, so
re-running a batch (say, after a timeout) never creates duplicates.

**Cleanup:** there's no delete route for these either. When you're
done, remove them from the Supabase dashboard's SQL editor:

```sql
delete from auth.users where email like 'test.bride-%@agaram-test.dev'
   or email like 'test.groom-%@agaram-test.dev';
```

(`on delete cascade` on `profiles`/`preferences`/verifications handles
the rest; the storage objects are keyed by the now-deleted user id and
can be cleared from the `profile-photos` bucket in the dashboard.)

## Employment & education verification (V1)

A second, independent trust badge on `/account` alongside identity
verification (Phase 3) — a member can verify their employment either
automatically or with human help.

- **Work email (fully automated).** Enter your work email address, get
  a 6-digit code, enter it back — same shape as any OTP flow. No
  vendor involved: it's real Resend email plus a hash comparison done
  inside Postgres (`confirm_work_email_otp()`, `supabase/schema.sql`
  Phase 18), so the code itself is never trusted client-side.
- **Employer attestation (human-reviewed).** For anyone without a
  company email address, consent to Agaramiya contacting your employer's
  HR/manager directly. This lands in a queue on `/admin` →
  **Employment** for you to review by hand — there's no vendor (like
  Attestr/IDfy) wired in for automated EPFO checks yet, so this is the
  honest fallback, mirroring how identity verification's mock check
  works today.
- **One-time setup:** requires `RESEND_API_KEY` and
  `RESEND_FROM_ADDRESS` (see `.env.local.example`) — without them, the
  work-email path shows a clear "email sending isn't configured yet"
  message instead of silently failing; employer attestation doesn't
  need email at all and works regardless.
- **Database:** `employment_verifications` (Phase 18) — one row per
  member, RLS-scoped to their own row plus admin read/update, same
  shape as `identity_verifications`.

## Family Collaborator: relation context at onboarding (V1)

Onboarding's first question is now "Who's setting up this profile?" —
self, son, daughter, brother, sister, friend, or relative — stored as
`profiles.created_by_relation` (`supabase/schema.sql` Phase 19).

This is a deliberately scoped-down piece of the PRD's full "parent
creates the profile, child claims it later with their own login"
model. Building that fully means transferring a `profiles` row's
primary key from one `auth.users` id to another — which would also
need to migrate every `matches` row for that person (the
`matches_pair_order` check constraint means the two candidate columns
have to stay sorted, so a changed id can require re-sorting the row),
plus `preferences`, `identity_verifications`, `messages`, `payments`,
and more. That's a lot of blast radius for a live app to take on in
one round, so V1 ships the safer slice instead: recording *why* the
profile was created, and using it to nudge the parent/relative toward
the Family Collaborator invite mechanism that already exists (Phase
10 — see "Family Collaborator accounts (V1)" above) rather than
inventing new ownership-transfer machinery. On `/account`, a member
whose profile says "for my son/daughter" or another relation sees a
tailored nudge inside the existing Family sharing section pointing
them at the invite link. Revisit the full transfer model separately if
it becomes a real blocker.

## Weekly curated match digest (V1)

A weekly email — "N new profiles, N interests received, N unread
messages" — the closest honest version of the PRD's "Friday 4pm, your
3 introductions" idea that this app can compute without a real
Jathagam/ML matching engine behind it.

- **On by default** (it's core engagement, not marketing) — turn it
  off from `/account` → **Weekly match digest**, or with the one-click
  unsubscribe link at the bottom of every digest email (no login
  needed for that link).
- **One-time setup:** three environment variables, on top of the
  `RESEND_API_KEY`/`RESEND_FROM_ADDRESS` pair above (see
  `.env.local.example` for the full explanation of each):
  ```
  CRON_SECRET=<a long random value you make up>
  DIGEST_UNSUB_SECRET=<a different long random value>
  ```
  `CRON_SECRET` also needs to exist as a Vercel project environment
  variable (same value) — once it's set, Vercel Cron picks up the
  schedule already committed in `vercel.json` (Fridays, 10:00 UTC ≈
  3:30pm IST) with **no dashboard configuration required**; it sends
  that secret back automatically as an `Authorization: Bearer` header
  so `api/cron/weekly-digest` can confirm the call is really from
  Vercel Cron and not a random visitor hitting the URL.
- **Never spams an empty week.** If a member has nothing new (no new
  candidates, no interests, no unread messages) since their last
  digest, no email goes out that week — but the "since" watermark
  (`profiles.last_digest_sent_at`, Phase 20) still advances, so a quiet
  month doesn't turn into one giant catch-up email later.
- **Runs entirely through the service-role client**
  (`src/lib/supabase/admin.ts`) since a cron trigger has no signed-in
  member session and needs to read/write every member's row in turn —
  the same reason the Razorpay webhook route needs it.

## Royal Concierge tier intake (V1)

A third tier, alongside Free and Elite, on `/upgrade` — but
deliberately **not** another automated checkout. Royal Concierge (PRD
§11) is a founder-run, hands-on matchmaking service: a real phone
call, pricing negotiated directly. Wiring a Razorpay flow to something
that's actually a human conversation would be pretending a level of
automation that doesn't exist yet.

- **Member side:** `/concierge/apply` — phone number plus optional
  notes, nothing else. Submitting just files a row; there's no payment
  step here at all.
- **Founder side:** `/admin` → **Concierge** — a simple queue you
  advance by hand as you actually talk to each applicant: submitted →
  contacted → in progress → closed. This is your own record of where
  a real conversation has gotten to, not a status the member sees
  reflected anywhere.
- **Database:** `concierge_applications` (Phase 21) — member can
  insert/view their own applications, admin can view/update all.

## Profile photos — blur until match (V1)

A private photo per profile, enforced at the database level, not just
hidden in the UI. `/account` → **Profile photo** lets a candidate
upload one (JPEG/PNG/WEBP, up to 8 MB); the upload action
(`actions/photo.ts`) generates two derivatives with `sharp` and stores
both in a private Supabase Storage bucket:

- `original.jpg` — resized to fit within 1600×1600, re-encoded as a
  normal-quality JPEG. `sharp`'s `.rotate()` call bakes in the phone's
  EXIF orientation before the file is re-encoded (otherwise a portrait
  photo would come out sideways) — and `sharp` strips all other
  metadata by default, including embedded GPS coordinates, unless you
  explicitly call `.withMetadata()` (nothing here does). That's a
  deliberate privacy property worth relying on, not an accident: no
  uploaded photo ever carries location metadata into storage.
- `blurred.jpg` — the same photo shrunk to 24px wide and re-enlarged
  (which destroys almost all detail through the resampling itself),
  plus a further gaussian blur on top. This is what every other member
  sees until a mutual match exists.

**The blur is enforced by Postgres, not by the app choosing which file
to fetch.** `supabase/schema.sql` Phase 22 adds `storage.objects` RLS
policies scoped to the `profile-photos` bucket: the owner can read/
write their own folder; any signed-in member can read anyone's
`blurred.jpg`; `original.jpg` is only readable by its owner, an admin,
or a member with a `'mutual'` row in `matches` against that profile
(`is_mutual_match_with()`, a `SECURITY DEFINER` function so the policy
doesn't need to reason about RLS on `matches` itself). `src/lib/photo.ts`
tries `original.jpg` first and falls back to `blurred.jpg` — it's a
convenience wrapper, not the security boundary, since `createSignedUrl()`
simply fails for a path the caller's RLS doesn't allow. There's no code
path in the app that could accidentally leak the unblurred photo early,
because the database refuses the request independent of what the UI
asks for.

- `profiles.has_photo` is a denormalized flag so list pages (Browse,
  Sent, Received, Mutual) know whether it's worth requesting a signed
  URL at all, without an extra query per card.
- Photos show up everywhere a candidate's masked or unlocked info
  already does: the dashboard summary, Browse/Sent/Received/Mutual
  cards, and the chat thread header — falling back to the existing
  initial-letter circle whenever there's no photo or no URL this
  viewer is allowed to see yet.
- **HEIC isn't accepted** (`actions/photo.ts` checks the MIME type) —
  `sharp`'s prebuilt binary on Vercel isn't guaranteed to be built with
  HEIF decode support, so this fails with a clear message at upload
  time instead of a confusing 500. Most browsers already convert a
  file picker's `image/*` selection to JPEG, and recent iPhones offer
  a "Most Compatible" camera setting that saves JPEG directly — this
  only affects a HEIC file picked from an existing photo library.
- **Testing this needs the mutual-match pair** — `bride.a@agaram-test.dev`
  / `groom.a@agaram-test.dev` from the dev seed utility below are
  already mutually matched, so uploading a photo to one and viewing it
  from the other is the fastest way to see the unblur happen.

## Extended preferences — family, lifestyle & cultural tiers (V1)

The PRD's §7.3 describes three "progressive" preference tiers,
collected any time after a profile goes live, on top of the
must-have tier (age/location/education/relocation/language) that's
been there since Phase 2. `/account` → **Family, lifestyle & cultural
background** adds them, split into two visibly separate forms exactly
like the existing `profiles.community` / `preferences.community_preference`
split — self-description ("who I am": family type, diet, native
district, community — new columns on `profiles`) is never the same
field as preference ("who I want": the matching `*_preference` columns
on `preferences`, every one defaulting to `'no_preference'`).

**These columns are not read by `get_match_candidates()` this round.**
Wiring them into actual filtering/scoring is the PRD §8 rule-based
weighting model — real design work that deserves its own reviewed
pass, not a last-minute addition bolted onto a photos-and-preferences
round. Storing them now is still worthwhile: it's real profile-
completeness data for the moment matching does get smarter, and it's
already useful as human-readable context once two members are
messaging. See the Phase 25 comment in `supabase/schema.sql` for the
full reasoning.

## Jathagam / horoscope details — capture and sharing only (V1)

`/account` → **Jathagam / horoscope details** captures birth date,
approximate birth time (optional — it's routinely not known exactly),
birth place, birth star (nakshatra), and rasi, plus a single toggle:
share these once mutually matched, or keep them private.

**There is no compatibility score anywhere in this feature — stated
plainly, not just omitted by oversight.** The PRD (§8) describes
Jathagam/Porutham compatibility as a weighted input to a rule-based
matching engine. Building even a simplified version of that scoring
(e.g. "same rasi = +1 point") would present invented pseudo-astrology
as if it were a real, considered signal for a decision as
consequential as marriage — the same line already drawn for identity
verification's honestly-labeled mock provider, and for the weekly
digest never overstating what it's summarizing. The honest version
here: capture the details, let the member choose to share them, say
nothing about what they mean together. A real Porutham engine, if
ever built, deserves its own reviewed phase with an actual astrologer
in the loop — not a bolt-on to this round.

- **Database:** `jathagam_details` (Phase 26, `supabase/schema.sql`) —
  owner-only RLS for read/write, plus one additional SELECT policy
  that reuses `is_mutual_match_with()` (already built for photos
  above) to let a mutual match view a shared row. Sharing is a single
  global toggle per profile, not a per-match share list — the same
  simplification the existing "share with family" toggle already
  makes.
- Shared details (whichever of birth star / rasi / birth place the
  other person filled in) show up as a small line above the chat
  input on `/matches/mutual/[matchId]` — nothing is shown until the
  other member has both filled the row in and turned sharing on; RLS
  is what actually decides that, the page just renders whatever comes
  back.

## Re-surfacing declined matches after a cooldown (V1)

Before this, tapping "Pass" on a candidate (or being passed on)
excluded that pair from Browse forever, on both sides, permanently —
a single accidental tap, or a change of heart six months later, had no
way back. `get_match_candidates()` (Phase 24, `supabase/schema.sql`)
now re-admits a `'declined'` pair once it's sat untouched for 30 days.
A `'mutual'` match is never re-surfaced, and a `'declined'` row that's
still fresh stays excluded — this only undoes an old, inactive
decision, never a recent one.

The other half lives in `actions/matches.ts`'s `expressInterest()`:
when the existing row for a re-surfaced pair is still `'declined'`
(the only way that branch is reachable is if Browse just legitimately
showed the card, i.e. the cooldown already passed), it now updates
that same row back to `'interest_sent'` instead of silently doing
nothing — inserting a second row for the same pair would violate the
`matches_unique_pair` constraint, so this restarts the interest cycle
on the original row rather than creating a new one.

## Match explanation card — honest "why this match", no fabricated score (V1)

Browse cards (`/matches`) now show a short "Why this match" list under
each candidate — a handful of plain, literally-true statements
("within your 25–32 age range", "lives in Chennai", "identity
verified", "has a profile photo"), never a score, ranking, or weighted
combination.

**Why not the PRD's real version:** PRD §8 describes this as a
must-have, but its own version is backed by a weighted multi-factor
matching ENGINE (Jathagam, education/professional tier, lifestyle
answers, and so on) that doesn't exist in this app — Browse is a
simple hard-filter query (`get_match_candidates()`). Building a fake
weighted score on top of a hard-filter query would present invented
precision the underlying system doesn't have — the same line already
drawn for Jathagam compatibility. `src/lib/matchReasons.ts` states this
reasoning inline, and only ever computes reasons from data the viewer
already has (their own preferences, and the same masked fields Browse
already shows).

**Scope note:** this only shows on Browse, since that's the one place
comparing several new candidates side-by-side benefits from a "why"
line. Sent/Received/Mutual don't get it — those are already narrowed
to specific people the member has acted on.

## New-interest & new-match email alerts (V1)

An instant email — via the existing Resend integration — the moment a
member receives a new interest, or a pair becomes mutual, on top of
the weekly digest above.

- **Separate opt-out from the weekly digest.** `/account` →
  **Instant alerts** turns these off independently
  (`profiles.instant_alerts_opt_out`, Phase 27) — wanting one and not
  the other is entirely reasonable, so they were never merged into one
  flag. Every alert email also carries a one-click, no-login
  unsubscribe link (`/api/alerts/unsubscribe`), same shape as the
  digest's.
- **Reuses the digest's unsubscribe secret.** Both links are verified
  with the same HMAC helper and `DIGEST_UNSUB_SECRET` — see the Phase
  27 schema comment for why minting a second secret for the identical
  proof ("this request really is for this profile") would be pure
  duplication.
- **Never leaks more than the in-app UI already would.** These emails
  never include a name — only the same masked fields (age, location,
  a verified badge) every masked candidate card already shows any
  signed-in member, mirroring `get_received_interests()` /
  `get_mutual_matches()`'s own masking exactly.
- **Best-effort, never blocking.** `notifyNewInterest()` /
  `notifyNewMutualMatch()` (`app/actions/matches.ts`) wrap every step
  in a try/catch — a Resend outage or missing env var never turns
  expressing interest or accepting a match into a failed action.
- **No new environment variables** — this reuses `RESEND_API_KEY`,
  `RESEND_FROM_ADDRESS`, and `DIGEST_UNSUB_SECRET`, all already set up
  for the weekly digest above.

## Founder analytics dashboard (V1)

`/admin` → **Analytics** — a read-only glance at the numbers a
solo founder actually checks: total members and signups over the last
7/30 days (plus a 14-day trend strip), the identity verification
funnel (not started / pending / verified / failed), the match funnel
(interest sent / mutual / declined), the active Elite subscriber
count, and total revenue collected.

- **No new dependency.** No charting library — a handful of counts
  plus one dependency-free CSS bar strip is the honest amount of
  engineering for one founder's dashboard, not a BI product.
- **Runs through the admin's own session**, same as every other
  `/admin` page (`createClient()`, gated by the `/admin` layout's
  `is_admin` check) — not the service-role client. `matches` and
  `payments` didn't have an admin-wide SELECT policy until now; Phase
  28 (`supabase/schema.sql`) adds both, the same additive,
  `is_admin()`-gated shape every other admin policy already uses.
- **Revenue** sums `payments.amount` (paise) where `status = 'paid'`,
  summed in JS rather than a DB aggregate — the Supabase JS client has
  no server-side `SUM`, and at a solo founder's current volume,
  fetching the paid rows is cheap.

## Phone number + OTP verification — mocked, honestly labeled (V1)

`/account` → **Phone verification** — a second, independent identity
signal alongside Aadhaar-based identity verification, shown as its own
"✓ Phone verified" badge everywhere "✓ Identity verified" already
shows (dashboard, Browse, Sent, Received, Mutual, the chat thread
header).

**Honestly mocked, the same way as Aadhaar — stated plainly, not
just omitted:** sending a real SMS OTP needs a vendor (Twilio, MSG91,
...) with an account and API credentials, neither of which exists for
this project yet. Unlike work-email verification (which genuinely
sends and checks a real code, since Resend can actually deliver that
email), there's no delivery channel here to make a real code
meaningful — showing a member a "type back the code we just displayed
on this same screen" step would be pure security theater, worse than
admitting there's no real check yet. So this follows
`identity_verifications`' own honest pattern instead: submit a phone
number, mark it "pending", and a mock resolver
(`resolve_mock_phone_verification()`) flips it to "verified" after a
couple of simulated seconds — the exact same UX shape as
`VerificationPending`/`resolveMockVerification` for Aadhaar, just
embedded inline on `/account` instead of a full onboarding step.

- **Database:** `phone_verifications` (Phase 29, `supabase/schema.sql`)
  — one row per profile, owner-only read/write (write always pinned
  back to `status = 'pending'`, same WITH CHECK pattern as
  `identity_verifications`), admin can view all. The full phone number
  is stored (unlike Aadhaar's last-4-only) since a real SMS vendor
  integration will actually need it to send to.
- **TO GO LIVE:** replace `resolveMockPhoneVerification()`
  (`app/actions/phone.ts`) with a real send-and-check flow — mirroring
  `confirm_work_email_otp()`, which already does this for real over
  email. Nothing else needs to change, since every reader only ever
  looks at `phone_verifications.status`.

## Extended preferences wired into Browse filtering (V1)

The four preference/self-description pairs added by "Extended
preferences — family, lifestyle & cultural tiers" above (family type,
diet, native district, community) now actually affect who shows up in
Browse, closing the gap that section explicitly flagged as deferred.

**A hard filter, not a score — deliberately the same shape as the
existing age/location filter:** your own stated preference only ever
excludes a candidate when (a) you've actually set a real preference
(not "No preference") **and** (b) the candidate has positively stated
a conflicting value. A candidate who simply hasn't filled in that
optional field yet is never excluded for it — these are all optional
fields, most profiles won't have them filled in for a while, and
penalizing an honestly-incomplete profile for an optional field would
defeat the point of making it optional.

The other four preference-only columns (family involvement, drinking,
smoking, religious practice) still aren't wired in, and the README/UI
say so plainly — there's no matching "about me" field on `profiles`
yet for those to compare against, and inventing what "drinks" means
for the other person without one would be exactly the kind of
half-designed filter this project has avoided elsewhere.

- **Database:** `get_match_candidates()` (`supabase/schema.sql`,
  Phase 30) — DROP + CREATE, same reason as every prior column
  addition to this function.
- **A pre-existing `schema.sql` re-run bug, same shape as V1 features
  7 and 11's, checked for and confirmed absent this time:** the
  earlier fix (converting every function whose columns change across
  phases to DROP + CREATE) already covers `get_match_candidates()`, so
  this round's column addition didn't reintroduce it — verified with
  the same drop/create-count script used for the earlier fixes.

## Match explanation card: compatibility breakdown (V1)

The "Why this match" card on Browse (see the earlier match
explanation card entry) now also shows a **Compatibility** breakdown —
Profile, Location, Lifestyle, and Family & cultural preferences, each
labeled **Strong** or **Good**, styled after the PRD's own example
format.

**Still no fabricated score, same honesty line as everywhere else in
this app:** because Browse now hard-filters on any preference you've
actually set (see above), every candidate you see already satisfies
those preferences — so "Strong" vs. "Good" isn't measuring whether
you're compatible (you already are, or the filter would have excluded
them). It's measuring how much the candidate has **positively
confirmed** about themselves, as opposed to simply not having filled
that optional field in yet. A category with nothing confirmed is left
out of the card entirely, rather than shown as "Good" by default —
omitting a category is more honest than implying a match on data that
was never actually compared.

- **Code:** `buildCompatibilityBreakdown()` in `src/lib/
  matchReasons.ts`, alongside the existing `buildMatchReasons()`.
- Two new design tokens, `--warn`/`--warn-soft`, were added to
  `globals.css` to render "Good" (partial, not a failure) — the same
  amber the PRD's Design System v1 reserves for "needs a look," never
  for a destructive/danger action.

## Mutual-match celebration moment (V1)

Accepting a received interest, or expressing interest on someone who
already liked you, now lands you on a proper celebration screen — a
brief confetti animation over a "🎉 It's a match!" card — instead of
the mutual list quietly gaining a new row. This was PRD §18's own
recorded P1 backlog item ("a dedicated mutual-match celebration
moment... a fuller celebratory treatment"), picked up this round.

- **How it's wired:** `expressInterest()`'s mutual-completing branch
  and `respondToInterest()`'s accept branch (`app/actions/matches.ts`)
  now `redirect()` to `/matches/mutual?justMatched=<matchId>` instead
  of silently revalidating in place. `/matches/mutual` reads that
  query param, finds the matching row, and renders
  `MutualMatchCelebration` — a client component — above the list.
- **The confetti is pure CSS, no library** — small absolutely-
  positioned bars animated with a CSS `@keyframes` fall, randomized
  (position/color/timing) in a `useEffect` that runs only after the
  first mount. That's deliberate: generating the randomness during
  render would make the server-rendered HTML and the client's first
  hydration pass disagree (`Math.random()` returns different values on
  each), which React reports as a hydration mismatch. Rendering nothing
  extra on the first pass and adding the confetti a tick later avoids
  that entirely.
- The card's call-to-action differs by whether the match is unlocked:
  **Say hello** straight into the chat thread if you're Elite, or
  **Upgrade to Elite** if not — reusing the same copy the mutual list
  already shows for each case.

## Matchmaking journey stage tracker (V1)

`/account` → **Your matchmaking journey** — a row of clickable stage
chips (Just exploring / Actively looking / Talking to someone / Family
discussions / Meeting someone / Paused / Married), matching PRD §6's
"intent / stage state" concept, plus a compact read-only line on
`/dashboard` ("Where you are: ...") linking back to `/account` to
change it. This is PRD §18's other recorded P1 backlog item —
"a member-facing visualization of the `intent_stage` state... as a
visible journey rather than a private settings field."

**Deliberately self-only, stated plainly:** your stage is never shown
to the other side of any match, and — unlike everything else added
this round — it's never read by `get_match_candidates()` or any
matching/filtering logic. This is a personal reflection tool ("where
am I in this process"), not a signal Agaramiya acts on; PRD §6 describes
it as something the *platform* could eventually use to avoid
recommending someone who's already deep in a conversation, but that's
real product-behavior design this round doesn't attempt.

- **Database:** `profiles.intent_stage` (`supabase/schema.sql`,
  Phase 31) — a plain checked text column, default `actively_looking`,
  updatable through the same general "update your own profile row" RLS
  policy every other self-description field already uses (no new
  policy needed).
- **Code:** `saveIntentStage()` (`app/actions/profile.ts`) and
  `JourneyStageTracker` (`components/JourneyStageTracker.tsx`) — plain
  server-rendered forms, one per stage, same pattern as the digest/
  instant-alerts toggles on the same page; no client JS needed for a
  row of buttons that each submit one value.

## UX polish pass: account scroll, edit-profile, photo sizing & desktop width

Five customer-reported usability fixes (Sept 2026), none touching the
data model:

- **`/account` was one long scroll.** Every section — photo, journey,
  extended preferences, Jathagam, billing, notifications, employment,
  phone, digest, instant alerts, blocked members, family sharing,
  delete account — is now a collapsed-by-default accordion
  (`AccountSection`, `components/AccountSection.tsx`, a plain
  `<details>/<summary>` — no client JS) with a short status badge on
  the closed header (Added/Not added, Verified/Pending, On/Off, a
  count, etc.) so a member can see most of what matters without
  opening anything.
- **Editing your profile forced you through onboarding again.** The
  "Edit profile" link from `/dashboard` reused the onboarding
  basic-info screen, which always redirected to `/onboarding/
  preferences` afterward — a real workflow bug, not just a cosmetic
  one. `saveBasicInfo()` (`app/actions/profile.ts`) now branches on a
  hidden `mode` field (`edit` vs `onboarding`): an edit skips the
  one-time relation question and consent checkbox (already answered
  once), doesn't re-stamp `terms_accepted_at`, and redirects back to
  `/dashboard` instead of the preferences step. The same screen also
  drops its "Day 1 · Step 2 of 3" onboarding chrome when editing
  (`OnboardingShell`'s `stepChip`/`progress` props are now optional).
- **Dashboard showed two avatars.** A generic brand-mark circle
  ("அ") next to the account email duplicated the real profile-photo
  avatar directly below it — removed; the email line now stands
  alone.
- **Candidate photos were too small to register.** The 48px avatar
  used on Browse cards, and on the Sent/Received match lists, is now
  64px (`CandidateCard`, `matches/received`, `matches/sent`); the
  mutual-match list moved from 44px to 56px. This applies even to the
  no-photo placeholder — the point is registering at a glance on a
  browsing feed, not just showing more of an actual photo.
- **Wide empty margins on desktop.** The app is deliberately
  mobile-first (a narrow centered column throughout), which is
  correct on a phone but reads as unused space in a full-width
  desktop browser window. Rather than a blanket redesign, Browse/
  Matches and Admin — the two densest, most-used screens — now widen
  to `max-w-4xl` at the `lg` breakpoint (1024px+) and only there;
  every other screen, and these two on mobile/tablet, are unchanged.

## Dashboard: activity strip, "Today's introduction" & honest digest cadence (V1)

Direct answer to a founder question this round — "how does a member
who just logs in and looks at their own profile get pulled back in;
is the dashboard actually interesting to them?" A competitor pass
(Shaadi.com, BharatMatrimony, Jeevansathi, TamilMatrimony, plus
Hinge/Bumble for engagement-design ideas — written up in the Agaram
project (the Claude Project this build lives in — still named "Agaram"
regardless of the app's own brand name) as
`Agaram_Dashboard_Competitor_Analysis.md`) found the same
gap on every one of them: the old `/dashboard` was entirely
self-facing (your own name, preferences, verification, subscription)
with nothing about outside activity. Three honest, real-data additions
close that gap — deliberately excluding the manipulative mechanics
that analysis flagged (fabricated demand signals, a paywalled
"someone liked you" blur, artificial scarcity):

- **Activity strip.** Two real counts — interests waiting for your
  response, and mutual matches — each linking straight to `/matches/
  received` and `/matches/mutual`. Plain current totals, not a
  "new since your last visit" delta (that would need a new
  last-viewed timestamp this round doesn't add); still real, still
  actionable.
- **"Today's introduction"** (`components/TodaysIntroCard.tsx`,
  picked by `lib/dashboardIntro.ts`) — the PRD's own "preview-
  introduction moment... ahead of the Friday cadence" (§8), finally
  built. Every candidate `get_match_candidates()` returns already
  satisfies the viewer's hard preference filters equally — there's no
  real weighted matching engine to rank them by (the same honesty
  line `lib/matchReasons.ts` already draws) — so `pickTodaysIntroduction()`
  only decides which one of several equally-valid candidates to
  feature first; that internal tie-breaker is never shown to the
  member. The card itself is a deliberately smaller version of
  `CandidateCard` — at most two reasons, no compatibility breakdown —
  so this doesn't quietly undo the same-round work that shortened the
  rest of the dashboard. Its Pass/Interested buttons are the real
  `expressInterest`/`passOnCandidate` actions, not a link out.
- **Honest weekly-digest cadence line.** `lib/schedule.ts`'s
  `nextWeeklyDigestRun()` computes the real next Friday 10:00 UTC run
  of `api/cron/weekly-digest` (see "Weekly curated match digest"
  above) and shows it plainly — e.g. "Your weekly match summary
  email: Fri, 3:30 PM". This is NOT a "your next 3 introductions
  unlock in..." countdown: Browse stays open and hard-filtered all
  week, nothing about candidates is withheld until Friday, so framing
  it as a content-gating countdown would have been misleading. It only
  ever states the real, literal next time the summary email goes out.

`expressInterest`/`passOnCandidate`'s `revalidateMatches()` now also
revalidates `/dashboard`, so acting on a match from anywhere in the
app keeps the dashboard's counts and "Today's introduction" pick
current.

## Trust profile summary on the dashboard (V1)

Direct follow-up to two independent reviews this round — the Claude
Project's own `Agaram_Dashboard_Competitor_Analysis.md` ("surface the
compatibility/verification story earlier... rather than requiring a
trip into Browse to see it") and an external product review (asked
for a "Trust profile"/"Verification status" indicator) both flagged
the same gap from different directions: the dashboard only ever
surfaced Identity verification, as a single pass/fail gate, and never
told a member about their own Employment or Phone verification status
even though both have existed on `/account` since earlier rounds.

- **`components/TrustProfileSummary.tsx`** — a compact card near the
  top of `/dashboard` showing all three real signals at once (Identity,
  Employment, Phone), each with its actual status (✓ Verified / Pending
  / Not verified) and a link to where a member can act on it. The
  header shows a plain "X of 3 verified" count — a literal tally of
  real database rows, never a weighted or fabricated score, consistent
  with the same honesty rule the match-explanation card already
  follows.
- **Deliberately three signals, not the PRD's five.** The PRD's
  verification architecture (§7.1) describes five eventual signals —
  Identity, Employment, Professional, Education, Diaspora — but only
  Identity, Employment, and Phone actually exist as real tables today
  (`identity_verifications`, `employment_verifications`,
  `phone_verifications`). This card only ever shows what's real; adding
  Professional/Education/Diaspora rows here is future work once those
  verification paths are actually built, not before.
  See `Agaram_Premium_PRD_v2.md` §7.1 for the full target model.
- **Anchor links into `/account`.** The Employment and Phone rows link
  to `/account#employment` and `/account#phone` — `AccountSection` (the
  collapsible `<details>` wrapper every `/account` section uses) now
  takes an optional `id` prop, and modern browsers auto-expand a
  `<details>` element when a URL fragment targets something inside it,
  so tapping either row lands directly on the right section, already
  open, instead of a collapsed page top.
- **The old standalone Identity banner is gone** — its "✓ Identity
  verified" state now lives inside the trust-profile card like the
  other two signals; the not-yet-verified/pending banner (with its
  "Verify now"/"Check status" call to action) still shows separately
  above it, since that one still gates the rest of the dashboard
  (Browse, activity strip, Today's introduction) and deserves its own
  prominent action, not a quiet row.

## PWA manifest & app icons — installable, but still not a native app

Direct follow-up to a founder question this round — "when is the right
time to build a native app?" The honest answer was: not yet, and
before native there's a much cheaper step — a real web app manifest —
that gets most of the "feels like an app" benefit for close to zero
cost. This round builds that step, not a native app.

- **Full icon set**, all generated by `scripts/generate-icons.mjs` from
  the real brand mark (see "Real brand artwork" below): `public/icons/
  icon-{192,512}.png` ("any" purpose) and `icon-maskable-{192,512}.png`
  (safe-zone padded, for Android's adaptive-icon crop) for the
  manifest; `public/apple-touch-icon.png` plus Next's own file-
  convention icons (`src/app/icon.png`, `src/app/apple-icon.png`,
  `src/app/favicon.ico` — a real multi-resolution 16/32/48 `.ico`, not
  the default Next.js placeholder) so the browser tab, bookmarks, and
  "Add to Home Screen" on both iOS and Android all show the real
  Agaramiya mark instead of a generic bookmark icon. Re-run with
  `npm run icons:generate` any time the brand artwork changes.
- **`src/app/manifest.ts`** — Next's manifest file convention, served
  at `/manifest.webmanifest` and linked automatically (no manual
  `<link rel="manifest">` needed). Sets `display: "standalone"` (no
  browser address bar once installed), `theme_color` (Agaramiya Maroon —
  also the color Android tints the status bar/task switcher),
  `background_color` (Warm Ivory — the splash-screen color shown
  briefly before the app's own first paint), and the icon set above.
- **`layout.tsx`**: added a `viewport` export with `themeColor` (Next
  requires this on `viewport`, not `metadata` — it warns otherwise)
  and `appleWebApp: { capable: true, statusBarStyle:
  "black-translucent", title: "Agaramiya" }`, which is what makes an
  iPhone launch the installed icon full-screen instead of opening
  Safari with browser chrome.

### Real brand artwork (Sept 2026) — replaces the earlier rendered-text mark

The founder supplied the actual Agaramiya logo this round: a
script-style monogram (a stylized "அ"/A hybrid with a small gold leaf
accent) over the wordmark **AGARAMIYA** in small-caps serif, with the
tagline "A good beginning matters." beneath it in gold, on the same
warm-ivory background as the app's own `--bg` token. This replaces
everything that was previously a *rendered* mark — an SVG-drawn Tamil
letter **அ** on a maroon gradient circle, generated from code rather
than real artwork.

- **`public/brand/`** (new) holds three crops derived from the
  founder's uploaded logo:
  - `agaramiya-logo.png` — the full lockup (monogram + wordmark +
    tagline), used on the landing-page hero (`src/app/page.tsx`).
  - `agaramiya-lockup.png` — monogram + wordmark, no tagline (for a
    compact header that shouldn't repeat the tagline — not yet used
    anywhere in the app, available for future screens).
  - `agaramiya-mark-source.png` — a square, pre-padded crop of just
    the monogram, used as the source for every generated app
    icon/favicon.
- **`scripts/generate-icons.mjs`** was rewritten to derive every icon
  from `agaramiya-mark-source.png` (via `sharp`, padding the canvas
  around the mark to hit a target fill percentage) instead of
  rendering SVG text — so the app icon, favicon, and the landing/
  privacy-page marks are now all the same real artwork at different
  sizes and crops, not a code-drawn approximation of it. This also
  removes the earlier dependency on the `fonts-noto-core` system
  package (it was only needed to render the Tamil glyph via
  fontconfig; there's no glyph rendering left to do).
- **`src/app/page.tsx`** (landing page) now renders
  `public/brand/agaramiya-logo.png` directly via `next/image` in place
  of the old gradient-circle-அ mark and separate `<h1>` brand text.
- **`src/app/privacy/page.tsx`** now renders
  `public/brand/agaramiya-mark-source.png` as the small header mark,
  replacing the same old placeholder circle.

See `Agaram_Visual_Design_System_v1.md`'s "Brand mark" section (in the
Claude Project) for the full design rationale.

**What this is not:** a native app. There's no App Store/Play Store
listing, and this doesn't add one — it makes the existing
mobile-responsive web app installable and full-screen, which closes
most of the visual "feels like an app" gap for near-zero ongoing cost
(no separate codebase, no app-store review, no per-platform
maintenance). The real signals for when native is actually worth
building: iOS web push reliability becoming a real drag on match/
message notifications reaching members (Safari's web push, added in
16.4, is still less reliable than a real APNs push — the gap a native
app would close), a meaningful share of traffic on iOS specifically,
and/or organic App Store search demand once there's enough of a user
base to see it. None of those signals exist yet at this stage, so
native stays a later, deliberate decision rather than a default next
step.

## Landing-page hero: a portrait collage instead of text-only (V1)

Direct response to founder feedback this round: "your hero section
should show people... the current page is almost entirely textual/
functional... I would use 3–5 beautiful profile portraits with subtle
cards around them, but don't make it look like a dating app — editorial
+ premium + warm + trustworthy rather than swipe + dating +
gamification."

- **`src/components/PortraitCollage.tsx`** (new) renders a scattered,
  editorial-style arrangement of 5 portrait-aspect cards above the
  brand lockup on the landing page — rounded corners, soft shadow, a
  thin `--line` border, and a slight independent rotation/vertical
  offset per card (`sm:` and up only, so mobile shows a clean flat
  grid rather than an overlapping mess) for a loosely-scattered
  editorial spread rather than a rigid photo grid. No hearts, no
  swipe-deck framing, no fabricated stats or "X people liked you"
  gamification anywhere near it.
- **Not real member photos yet — and said so in the code.** This
  sandbox has no image-generation tool and outbound fetches to
  stock-photo CDNs are blocked by the organization's network policy,
  so each card is currently an elegant placeholder: a soft warm
  gradient (mixing `--accent-soft`, `--bg-sunken`, and a muted gold
  tone from the token set) plus a simple silhouette bust drawn in
  low-opacity `--text`, framed exactly like a real photo would be. No
  names, quotes, or "verified" badges are attached to these cards —
  staying consistent with the app's honesty-first positioning (the
  same "no fabricated score" principle used everywhere else) rather
  than implying these particular shapes are real members.
- **Revised (same day)** — the first pass rendered each placeholder
  as a flat grey circle-and-shoulders icon, which read as a generic
  empty-state icon rather than anything "beautiful," caught by
  actually opening the live page. Replaced with a soft, warm-lit
  "silhouette study": blurred radial-gradient glows in the brand's
  maroon/gold/ivory tones suggesting a head-and-shoulders form, like
  an out-of-focus editorial portrait, plus a thin gold "caption rule"
  at the foot of each card (an editorial-print detail, deliberately
  left blank) — same card frame, same layout, just a more premium
  placeholder treatment while real photography isn't available.
- **Swapping in real photography is a one-line change per card** —
  each entry in `PortraitCollage.tsx`'s `CARDS` array takes an
  optional `photoSrc`; once licensed portrait photography exists (the
  founder's own photoshoot, or a stock library the founder has usage
  rights to), dropping a file path into that slot replaces the
  gradient placeholder with the real image, same card frame, same
  layout, no other changes needed.
- **`src/app/page.tsx`** — the hero's outer container widened
  (`max-w-md` → `max-w-xl`) to give the 5-card collage room, and the
  collage now renders first, ahead of the wordmark lockup — the page
  leads with people, then confirms the brand, rather than the other
  way around.

## Brand naming architecture: "Agaramiya [X]" (V1)

Direct response to founder feedback this round: "I'd strongly consider
restructuring the brand as: AGARAMIYA / A good beginning matters. /
Then: Agaramiya Verified / Agaramiya Introductions / Agaramiya Elite /
Agaramiya Concierge / That is a much stronger architecture."

Applied the "Agaramiya [X]" prefix consistently across the app's
user-facing copy, in both the English and Tamil dictionaries
(`src/lib/i18n/dictionary.ts`) and the few places that had a
hardcoded string instead of going through it:

- **Verified** — the dashboard's trust-profile card heading (already
  built as `TrustProfileSummary.tsx`, no component changes needed)
  renamed from "Trust profile" / "நம்பகத் தன்மை சுயவிவரம்" to
  "Agaramiya Verified" / "அகரமியா உறுதிசெய்யப்பட்டது" — this already
  matched the design system doc's "Verified badge: unified into one
  'Agaramiya Verified' hero mark" note almost exactly.
- **Introductions** — a new `dashboard.introductionsHeading` key
  ("Agaramiya Introductions" / "அகரமியா அறிமுகங்கள்") now renders as a
  small uppercase kicker above the dashboard's activity strip (the
  "waiting for response" / "mutual matches" count cards), in the same
  style already used for the Concierge kicker on `/upgrade` and
  `/concierge/apply`.
- **Elite** — every member-facing mention of the paid tier now reads
  "Agaramiya Elite" rather than bare "Elite": the account/billing
  screen, the upgrade/renew flow (including the Razorpay checkout
  modal's own `description` field, which members see inside Razorpay's
  UI, not just this app's), the match-gating upsell copy, and the two
  "couldn't send that" error messages on messaging actions that
  mention an inactive Elite subscription. The "Browse matches" button
  itself was deliberately left as an action verb, not renamed to a
  brand term.
- **Concierge** — "Royal Concierge" renamed to "Agaramiya Concierge"
  everywhere a member or admin actually sees it: the concierge card
  and apply flow (English + Tamil dictionary), the admin concierge
  queue's empty state and explainer text, and the success message
  after submitting a concierge request. Internal code comments citing
  "Royal Concierge" against PRD §11 / the Phase 21 schema were left
  as-is — they're developer-facing history, not member-facing copy.
- Each string kept its own pre-existing Latin-vs-Tamil-transliteration
  convention (e.g. "Elite" stays a Latin loanword in some Tamil
  strings and becomes "எலீட்" in others, matching how that specific
  string already read) rather than imposing one new rule across the
  whole dictionary.

Not done this round: the Claude Project docs (PRD, build plan) still
say "Royal Concierge" throughout, matching how they read before this
app's own earlier "Agaram" → "Agaramiya" rebrand pass was applied to
them. Worth a follow-up pass if the founder wants those docs to track
this same "Agaramiya [X]" architecture going forward.

## Signup redesign: two warm questions before email/password (V1)

Direct response to founder feedback this round: the old signup
opener — "Start with your email — you can add everything else
after" — was "technically simple, but not emotionally engaging," and
should instead feel like matchmaking, not account creation.

- **`src/components/SignupIntentStep.tsx`** (new) is now the first
  thing `/signup` shows: "Let's begin well. / Tell us a little about
  yourself." followed by two questions — "I am looking for:" (a
  partner for myself / for my son or daughter / helping a family
  member) and "What matters most to you?" (Values, Education, Career,
  Family, Location, Lifestyle, Religion, Jathagam — pick as many as
  you like). Only after answering does the familiar email/password
  step appear.
- **`src/components/SignupWizard.tsx`** (new) orchestrates the two
  screens client-side, with no page navigation between them — step
  two reuses the existing `AuthForm` exactly as it already worked,
  through two new optional, additive-only props (`signupIntent`,
  `onBack`). The login page renders `AuthForm` directly and was not
  touched at all.
- **"I am looking for" isn't a new question** — it's a friendlier,
  coarser front door to the "Who's setting up this profile?" dropdown
  `BasicInfoForm` already asks in more detail right after signup.
  Rather than ask twice, the signup answer now just pre-selects a
  sensible starting point there (self → Myself, son/daughter → My
  son, family member → A relative), still fully editable on that next
  screen.
- **"What matters most to you" is new profile data** —
  `profiles.priority_focus` (`supabase/schema.sql` Phase 32), a
  short text array. Since no profile row exists yet at signup, the
  answer rides in a short-lived, `httpOnly` cookie
  (`agaramiya_signup_intent`, set by the `signup` action) until
  `BasicInfoForm`'s save actually creates the profile — at which
  point it's written for real and the cookie is cleared. Shown again
  there too (pre-filled, editable), not asked silently.
- **Honestly scoped, on purpose**: this is a lightweight, self-
  reported signal captured once, not a rerun of the detailed family/
  lifestyle/cultural preference tiers Phase 25 deliberately kept off
  onboarding and on `/account` instead — see that phase's comment in
  `schema.sql` for why. `priority_focus` isn't read by
  `get_match_candidates()` or any matching/filtering logic this
  round; storing it now is the same "capture first, wire in later"
  pattern already used for Phases 25 and 30.
- **`src/components/MultiPillGroup.tsx`** (new) is a small multi-
  select chip control, alongside the existing single-select
  `PillGroup` — used for the priorities question on both the signup
  screen and `BasicInfoForm`.

**Needs a database update**: re-run the whole `supabase/schema.sql`
in the Supabase SQL Editor to add Phase 32's `priority_focus` column
before this can save — same as every other schema change in this
project.

## Dashboard: a real desktop layout, built separately from mobile (V1)

Direct response to founder feedback this round, comparing a
competitor's app screens: the dashboard needed a large profile photo,
a visible brand name, a notification icon and a menu presented like
real top-bar chrome — not a mobile-width card simply stretched across
a wide screen. "We should build App view and desktop view
differently." Scoped to the dashboard only this round (not
Matches/Browse or any other screen), and the competitor's launch-offer
promo was noted but is not reflected in any pricing/promo change here.

- **`src/components/DashboardTopBar.tsx`** (new) is a desktop-only top
  bar — `hidden md:flex`, so it renders nothing below the `md`
  breakpoint, where the existing mobile dashboard is untouched. Left
  side: the "அ" brand mark plus the "Agaramiya" wordmark. Right side:
  the language toggle, a notification bell, and a profile menu.
  - The bell opens a small dropdown. It's deliberately honest about
    having nothing behind it yet — no unread badge, no invented count,
    just "You're all caught up — no new notifications yet." — the same
    "never show what isn't real" rule `TrustProfileSummary` already
    follows for verification signals.
  - The profile menu (photo + name + chevron) replaces the mobile
    page's stacked bottom links with a dropdown: edit profile, account
    & privacy, family (if a family link exists), admin (if the viewer
    is an admin), privacy policy, and sign out.
- **`src/app/dashboard/page.tsx`** now renders three siblings instead
  of one: `DashboardTopBar` (always, desktop only), the entire
  original mobile layout unchanged except for one added class
  (`md:hidden`, so it disappears at desktop width instead of stretching
  into it), and a brand-new desktop block (`hidden md:block`) built
  from the exact same server-fetched data. The desktop block gives the
  profile photo real room (88px, versus the mobile card's smaller one)
  and lays the page out as a two-column grid — main content
  (introduction, activity, Browse Matches) on the left, a trust/status
  sidebar on the right — rather than one long stacked column.
- **One data-fetch, two layouts, not two apps**: there's no device
  detection, no separate route, and no duplicated Supabase queries —
  just two different arrangements of JSX toggled by a Tailwind
  breakpoint, both reading the same variables. Existing components
  (`ProfilePhotoAvatar`, `TrustProfileSummary`, `TodaysIntroCard`) are
  reused as-is in the new desktop layout.
- **No new dependency**: the bell and chevron icons are small hand-
  written inline SVGs, matching the fact that no icon library or
  `<svg>` existed anywhere else in the codebase before this.

No database changes this round.

## Real brand mark everywhere, replacing the placeholder circle (V1)

Direct response to founder feedback: "why still using old logo." The
founder supplied real brand artwork back in the Sept 2026 branding
round (`Agaram_Visual_Design_System_v1.md`'s "Brand mark" section),
and it was already wired into the landing page hero and every
generated app icon/favicon — but every other in-app header (login,
signup, onboarding, the dashboard, admin, matches, family, and the
404/error pages) had kept drawing its own maroon-gradient circle with
a plain "அ" character, the placeholder that artwork was supposed to
replace. This closes that gap.

- **`src/components/BrandMark.tsx`** (new) renders the actual
  monogram — `public/brand/agaramiya-mark-source.png`, the same
  source every PWA icon and favicon is already generated from —
  clipped to a circle at whatever size a header needs, in place of
  the old div-plus-letter.
- Swapped into every header that still had the placeholder:
  `AuthForm`, `OnboardingShell`, `SignupIntentStep`, `DashboardTopBar`,
  and the admin, matches, family, family/join, error, and 404 pages —
  ten spots in total, one component.
- **`src/app/global-error.tsx`** (the root-layout crash fallback) is
  the one exception — it intentionally can't depend on anything
  layout.tsx or the rest of the app provides, so it uses a plain
  `<img>` pointed at the same source file instead of the shared
  component.

No database changes this round.

## Dashboard top bar & bigger profile photo now on mobile too (V1)

Founder feedback, referencing the same competitor's actual mobile app:
the previous round's brand/notification/menu top bar and larger
profile photo only shipped for desktop — mobile still had the old
plain "signed in as" line and a 48px avatar.

- **`DashboardTopBar`** now renders at every width instead of only
  `md:` and up. To keep it from crowding a phone screen, two pieces
  step out below `md`: the language toggle (still reachable from the
  mobile card's own footer, so it isn't lost, just not shown twice)
  and the name label next to the profile menu's avatar (the avatar and
  chevron stay, so the menu button is still obviously tappable).
- The mobile dashboard's own profile photo — shown once a member has
  completed their profile — goes from 48px to 64px, closer to the
  desktop hero's 88px given the narrower card it sits in.
- No new data, no new routes — same component, same fetches as the
  desktop round; this just stops gating it to `md:` and up.

No database changes this round.

## Brand mark sizing standardized (V1)

Founder feedback: "I seeing inconsistency logo appearing from one
screen to another." Sizes had drifted to one-off numbers (32/36/40/56)
as the mark got added screen by screen the previous round. Fixed to
three sizes by role — documented directly in `BrandMark`'s own comment
this time, so it doesn't drift again:

- **32** — a persistent, slim top app-bar next to other nav controls
  (`DashboardTopBar`, the admin and matches section headers). Already
  consistent, unchanged.
- **40** — a page-level header lockup, mark beside the "Agaramiya"
  wordmark, above a centered card (`AuthForm`, `SignupIntentStep`, and
  now also `OnboardingShell` and the family dashboard header, both
  previously 36).
- **56** — a standalone mark with no wordmark text, centered on an
  otherwise-empty screen (error, 404, and now also the family invite
  screen, previously 40).

No database changes this round.

## Other members' photos now shown large, not as a small icon (V1)

Direct founder feedback: "I am interested [to] see other profile
picture big as much as possible, rather than just as icon, also if
picture showing as big, candidate can provide more stylish photo to
impress." Every screen that shows a candidate or match — Browse,
Today's Introduction, Received, Sent, Mutual — used a 48–64px circular
avatar next to a block of text. Fixed everywhere at once, not
screen by screen.

- **`src/components/CandidatePhoto.tsx`** (new) — a large 4:5 portrait
  photo instead of a small circle, specifically for someone ELSE's
  photo. Deliberately kept separate from `ProfilePhotoAvatar`, which
  stays a small circular icon for identity chrome (a member's own
  avatar in the dashboard top bar and profile menu) — a different job
  this feedback wasn't about.
  - A "Private until mutual interest" chip overlays the photo only
    while it's still the blurred variant (`src/lib/photo.ts` already
    decides that server-side; this just reflects it). This is
    `Agaram_Visual_Design_System_v1.md`'s own "Profile card" spec —
    privacy state on the photo itself, not a bare tag — applied to the
    live app for the first time rather than only the design prototype.
  - Verified/phone-verified moved off the photo into real pill-shaped
    badges in the info block below, per that same spec (previously
    plain green text lines).
- **`CandidateCard`** (Browse), **`TodaysIntroCard`** (dashboard), and
  the **Received / Sent / Mutual** list pages are all rebuilt around
  it — photo leads, info and actions follow below. Browse, Received,
  Sent, and Mutual moved from a single stacked column to a responsive
  photo-card grid (1 column on phones, 2 on tablets, 3 on desktop) so
  the larger cards don't turn every list into one long scroll.
- New dictionary key `matches.privateUntilMutual` (en/ta).

No database changes this round.

### Landing page: premium first impression, footer, OG image, sitemap/robots, support page (V1)

Founder direction, after a grounded go-live checklist review: "start working on landing page's first impression, and polish" while legal/trust work happens separately. Before this round, `src/app/page.tsx` was a single hero screen (logo, tagline, two buttons, a bare Privacy Policy link) — none of the PRD's own positioning work had made it to the actual public-facing page.

- **New below-the-fold sections**, each its own component, all Server Components (no client JS needed):
  - `LandingTrustSection` — "how we verify," surfacing exactly the three real signals (Identity, Employment, Phone — matching `TrustProfileSummary` on the dashboard), not the PRD's fuller five-signal aspiration.
  - `LandingHowItWorks` — the PRD's signature mechanic ("3 curated introductions a week") as a numbered 3-step sequence, in front of a visitor for the first time.
  - `LandingPricing` — Free / Elite (₹15,000 / 6 months) / Concierge, with real prices instead of requiring signup to see them. Concierge links straight to the existing `/concierge/apply` page.
  - `LandingFaq` — five real pre-signup questions (privacy, cost, differentiation, family involvement, data safety), using native `<details>`/`<summary>` disclosures.
  - `LandingFooter` — brand mark, tagline, Support and Privacy Policy links, copyright line. Deliberately does **not** link a Terms of Service page, since none exists yet (see the go-live checklist — the founder is handling this directly); linking one here would mean fabricating legal text.
- **New `/support` page** — before this, there was no way to reach a human outside the grievance email buried in `/privacy`. A plain contact page (General support, Privacy & data requests, a Concierge link) — no contact form, since a form implying a ticketing system that doesn't exist would be less honest than a direct mailto.
- **Social-share (Open Graph) image** — `src/app/opengraph-image.tsx`, generated via `next/og`'s `ImageResponse` from the real brand mark asset, so sharing the link (e.g. on WhatsApp) now shows a branded preview card instead of a bare title/description. No custom font loaded (Google Fonts isn't reachable from every build environment this project runs in) — falls back to `next/og`'s bundled default font.
- **`sitemap.xml` / `robots.txt`** — `src/app/sitemap.ts` / `src/app/robots.ts`, covering only the public marketing surface (`/`, `/signup`, `/login`, `/concierge/apply`, `/support`, `/privacy`) and disallowing every account-gated area (`/dashboard`, `/matches`, `/account`, `/admin`, `/family`, `/onboarding`, `/api`).
- **`src/lib/site.ts`** — a single `SITE_URL` constant (env-var driven, falling back to the current Vercel deployment URL) that the sitemap, robots, and `metadataBase` all read from — so the one thing that needs to change once `agaramiya.com` is registered is an env var, not code.
- New dictionary keys: `landing.trust*` / `landing.how*` / `landing.pricing*` / `landing.faq*` / `landing.footer*`, and a new top-level `support` section (en/ta).

Not done in this round, and worth knowing why: Sentry's DSN (needs a real account, not a code change), a distinct Royal Concierge dashboard state (a separate, larger feature), and the CSP `Content-Security-Policy` enforcement flag (already implemented as a documented env var — flipping it needs one real signup→verification→checkout→messaging run-through with the browser console open, not a code change). See the go-live checklist artifact for the full picture.

No database changes this round.

## Security audit follow-through: CI/Dependabot, Aadhaar consent tracking & self-service password reset (Sept 2026)

A full 37-section security & privacy audit (see the project's `Agaram_Security_Audit_Full` doc) turned up a short, concrete punch list. This round closes three of the four items that didn't need a founder decision or a vendor account first — the fourth, rate limiting on login/signup/messages, is documented separately below once a vendor (Upstash vs. Arcjet) is chosen.

- **Dependabot + CI (`.github/`).** This repo had no CI at all before this round — the first commit to `.github/`. `dependabot.yml` checks npm dependencies and GitHub Actions versions weekly (Mondays), grouping routine minor/patch bumps into one PR so a solo founder isn't fielding a dozen individual PRs. `workflows/ci.yml` runs on every push to `main` and every PR: `npm run lint`, a new `npm run typecheck` script (`tsc --noEmit` — didn't exist as a named script before), a full `npm run build` (against placeholder Supabase env vars, same pattern as local pre-commit verification — it only needs to prove the app compiles, not reach a real project), and `npm audit --audit-level=high`, which fails the run on any high/critical dependency vulnerability.
- **Aadhaar consent tracking (`identity_verifications`).** A real inconsistency the audit's Consent Management section (§25) flagged: `employment_verifications` has always stamped a `consent_at` timestamp separately from `submitted_at`; `identity_verifications` — for Aadhaar, the more sensitive of the two checks — only ever had `submitted_at`, conflating "hit submit" with "consented." Fixed with two new columns (`consent_at`, `consent_version` — the latter missing on *both* tables before this, so a future Privacy Policy text change now has something to point at) and a new `PRIVACY_POLICY_VERSION` constant (`src/lib/consent.ts`) that `submitIdentityVerification` (`actions/verification.ts`) stamps on every submission. Also added to the member's own data export (`/api/account/export`), since a consent record is squarely "their own data."
- **Self-service password reset (`/forgot-password`, `/reset-password`).** Named in the audit as the single biggest missing account-recovery feature — before this, a member who forgot their password had no way back into their account at all. `requestPasswordReset` / `updatePassword` (`actions/auth.ts`) wrap Supabase Auth's own `resetPasswordForEmail()` / `updateUser()` — deliberately thin, since Supabase already handles the secure token generation and one-time-use enforcement. The recovery link reuses the existing `/auth/callback` route (same code-exchange handler the Google/Apple sign-in flows use) rather than a new callback, landing on `/reset-password` once exchanged. **Important operational note:** the reset email itself is sent by Supabase Auth's own mail delivery — configured under Supabase Dashboard → Authentication → Emails/SMTP — not by this app's `RESEND_API_KEY` (that only powers work-email OTPs and the weekly digest, both sent directly via Resend's HTTP API from app code). Supabase's built-in sender works for testing but is rate-limited; set up custom SMTP there before relying on this for real volume — Resend's own SMTP credentials would be one option, configured Supabase-side, separate from this app's existing Resend integration. Also deliberately does *not* reveal whether a submitted email has an account — `resetPasswordForEmail` itself never leaks that, and the UI shows the same "check your email" message either way, to avoid email enumeration.

No new environment variables required for any of the three items above.

## Rate limiting on login, signup & message-send (Sept 2026)

The fourth security-audit punch-list item — the one that needed a vendor decision first. Upstash Ratelimit, backed by Upstash's serverless Redis (`@upstash/ratelimit` + `@upstash/redis`), the founder's chosen vendor over Arcjet.

`src/lib/rateLimit.ts` is the one file this touches conceptually: a `checkRateLimit(action, identifier)` helper, with a separate sliding-window limiter per action — login is checked by **both** IP (10/min — stops one source brute-forcing many accounts) and email (5/min — stops a targeted brute-force against one account spread across many IPs), signup by IP only (5/hour — signup abuse looks like one source creating many different accounts, not many attempts against one), and message-send by the sender's own id (30/min — sized to stop scripted flooding, not to slow down a real fast-moving conversation). Wired into `login()` / `signup()` (`actions/auth.ts`) and `sendMessage()` (`actions/messages.ts`).

**Same optional-integration shape as Resend/Razorpay auto-renew/VAPID push, with one important difference: this fails OPEN.** With `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` unset, every check simply passes — login/signup/messaging work exactly as they did before this file existed, just with no abuse protection. That's deliberate (an unconfigured limiter should never be the reason a member can't sign in) but also means **this is a no-op until those two env vars are actually set.** See `.env.local.example` for where to get them (a free Upstash account and Redis database — the REST URL/token from its "REST API" tab, not the Redis connection string) — set them locally and in Vercel to actually turn this on.

No database changes. `package.json` gained two new dependencies (`@upstash/ratelimit`, `@upstash/redis`).

## What's next

All 8 V0 build-plan phases are live, plus thirty V1 features now:
member blocking/data export/account deletion, the Tamil UI toggle,
Family Collaborator accounts, message milestone tagging, subscription
renewal & billing history, real auto-recurring billing with
self-serve cancellation, push notifications for messages, admin
member search & suspension, admin message oversight & an action audit
log, the messaging upgrades (Realtime/typing/read receipts), the
DPDP-Act grievance officer contact, DPDP consent capture at signup,
employment/education verification, relation context at onboarding (a
scoped-down slice of the Family Collaborator model), the weekly
curated match digest, Royal Concierge tier intake, profile photos with
a database-enforced blur-until-match, extended family/lifestyle/
cultural preferences (four of the eight now wired into Browse
filtering — see below), Jathagam/horoscope details capture and sharing
(honestly, with no fabricated compatibility score), re-surfacing
declined matches after a 30-day cooldown, an honest "why this match"
explanation card on Browse (no fabricated score), instant
new-interest/new-match email alerts, a founder analytics dashboard,
phone number verification as a second, honestly-mocked identity
signal, extended preferences wired into actual Browse filtering, a
compatibility breakdown on the match explanation card, a mutual-match
celebration moment, a self-only matchmaking journey stage tracker, a
collapsible/one-page account screen, a fixed edit-profile flow that no
longer forces a second onboarding trip, bigger candidate photos, wider
Browse/Matches/Admin screens on desktop, a dashboard activity
strip with a real "Today's introduction" preview match and an honest
weekly-digest cadence line, a PWA manifest with real brand artwork (the
founder's own logo, replacing the earlier rendered-text mark) as the
app icon set and full-screen launch on "Add to Home Screen" (short of
an actual native app), and a compact trust-profile summary on the
dashboard showing all three real verification signals (Identity,
Employment, Phone) at a glance instead of only Identity, and a
portrait-collage hero on the landing page (currently elegant
placeholder cards, ready for real photography — see above).
Still open: the other four extended-preference columns (family
involvement, drinking, smoking, religious practice), which need a
matching self-description field added to `profiles` before they can
filter anything the same honest way the first four now do; the
Family Collaborator model's full parent-creates-profile-first
identity-transfer flow (deliberately deferred as too high-risk for a
live app — see "Family Collaborator: relation context at onboarding"
above for what shipped instead and why), the employer-attestation
verification path's still-manual review (no Attestr/IDfy/EPFO vendor
wired in yet), and the vendor/business work: the real HyperVerge (or a
cheaper alternative like Deepvue/Sandbox) Aadhaar check once sandbox
access comes through, Razorpay live mode once business KYC is done,
the DPDP-Act legal review flagged throughout the Phase 8 section above
(naming a grievance officer and capturing signup consent are two
pieces of that review, now done — the rest, e.g. a full compliance
read-through covering data retention and breach notification, isn't),
and CSP graduation from Report-Only to enforcing — now a one-variable
`CSP_ENFORCE=true` toggle rather than a code change, but still
deliberately not flipped by default until a full manual click-through
(including both payment flows and push notifications) is confirmed
clean against the live deployment. Bring this repo and
`Agaram_Premium_PRD_v2.md` / the clickable prototype into your next
session for any of those.
