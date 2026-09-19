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

A minimal `/admin` area for the one person running Agaram (you) to
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
even if Agaram isn't open in a tab.

- **One-time setup:** generate a VAPID keypair (`npx web-push
  generate-vapid-keys` — pure crypto, no account needed) and add
  three environment variables, locally and in Vercel:
  ```
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=<the public key>
  VAPID_PUBLIC_KEY=<the same public key>
  VAPID_PRIVATE_KEY=<the private key — keep this one secret>
  VAPID_SUBJECT=mailto:you@example.com
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

**A related but separate DPDP gap, also closed this round: consent
was never actually captured at account creation.** Section 7 of
`/privacy` has always described "explicit consent (a checkbox naming
the DPDP Act directly)" as how Agaram gets consent, and the Aadhaar
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
password (`AgaramTest#2026` — change it in the route file if you'd
rather use your own). Log in at `/login` with any of them. Visiting
the URL again is safe — it updates these same seven accounts in place
rather than creating duplicates.

**This is a testing convenience, not something to leave reachable
once real members are signing up.** Keep `DEV_SEED_SECRET` private —
anyone who has it can (re)create or reset these fake profiles on your
live database at any time. When you're done testing for good, either
remove the environment variable (the route goes back to always
404ing) or delete `src/app/api/dev/seed-test-data/route.ts` outright.

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
  company email address, consent to Agaram contacting your employer's
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

## What's next

All 8 V0 build-plan phases are live, plus twenty V1 features now:
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
cultural preferences (captured but not yet wired into matching),
Jathagam/horoscope details capture and sharing (honestly, with no
fabricated compatibility score), and re-surfacing declined matches
after a 30-day cooldown. Still open: the
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
