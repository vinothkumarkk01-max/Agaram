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
- **One-time payment, no auto-renewal in this V0.** Elite lasts 182
  days (~6 months) from the payment date; there's no recurring billing
  or reminder yet — that's a deliberate scope cut from the build plan,
  not a bug.
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
- **No Supabase Realtime channel — the thread polls every 4
  seconds.** A deliberate V0 simplification: for a two-person chat at
  this scale, polling is one fewer moving part than wiring up a
  realtime subscription lifecycle, and the delay is barely
  noticeable. Worth upgrading to Realtime later if message volume
  grows or the delay starts to bother people.
- **No milestone tracking yet** — the PRD's fuller model (§8, §12)
  tags each message with a relationship milestone (getting-to-know,
  family-intro, video-call, planning-to-meet) for the family-sharing
  and journey-tracking features. That's deferred; V0 messages are
  just plain text, unlabeled.
- **No read receipts, typing indicators, or push notifications** —
  none of these are built. You'll see new messages within ~4 seconds
  of opening the thread, but there's no badge or alert telling you
  one arrived while you were elsewhere in the app.
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
  - **Admins can't read message content.** A report shows who
    reported whom and their stated reason, not the conversation
    itself. Giving admin access to private messages is a deliberate,
    separate decision with real privacy weight — not something to fold
    quietly into "admin basics."
  - **No member search, account suspension, or broader moderation
    tooling** — just enough to close the loop on reports and
    verification, per the build plan's own "basic admin dashboard,
    just enough to..." scope.
  - **No admin action audit log** — the PRD's data model (§12) has an
    `admin_actions` table for this; not built yet, so there's currently
    no record of *which* admin resolved a report or overrode a
    verification beyond the `resolved_by` column on `reports` itself
    (verification overrides aren't attributed to an admin at all yet).

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
  browser console. **Next step:** sign up, verify identity, run an
  Elite checkout, and send a message while watching the browser console
  for `[Report Only]` CSP warnings — once a full run-through is clean,
  change the header key in `next.config.ts` from
  `Content-Security-Policy-Report-Only` to `Content-Security-Policy` to
  actually enforce it.
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

## What's next

All 8 V0 build-plan phases are live, plus these first two V1 features.
Two of the four deferred V1 options from Section 3 are still open —
Family Collaborator accounts and messaging upgrades — alongside the
rest of the admin tooling (message-content access, member
search/suspension, an audit log), the DPDP-Act grievance-officer
contact, and the vendor/business work: the real HyperVerge (or
Signzy) Aadhaar check once sandbox access comes through, Razorpay live
mode once business KYC is done, the DPDP-Act legal review flagged
throughout the Phase 8 section above, and CSP graduation from
Report-Only to enforcing once a full manual click-through is confirmed
clean. Bring this repo and `Agaram_Premium_PRD_v2.md` / the clickable
prototype into your next session for any of those.
