import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Agaram Premium",
};

// A plain-language first draft, written to describe what this app's
// code actually does today (see PRD §14 and the build plan's Section
// 7) — not a substitute for the DPDP-Act legal review the build plan
// already calls for before real Aadhaar numbers or payments from real
// members flow through it. The bracketed placeholders need a real
// answer before this goes in front of real users.
export default function PrivacyPage() {
  return (
    <div
      className="min-h-screen w-full flex justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            அ
          </div>
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: "var(--text-soft)" }}
          >
            Agaram Premium
          </span>
        </div>

        <div
          className="rounded-2xl p-8 sm:p-10 shadow-sm"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <h1
            className="text-3xl mb-2"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Privacy Policy
          </h1>
          <p className="text-sm mb-2" style={{ color: "var(--text-soft)" }}>
            Last updated: [DATE] · Draft — not yet reviewed by a lawyer
          </p>
          <p
            className="text-sm mb-8 rounded-xl p-4"
            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
          >
            This is a first draft, written to plainly describe what
            Agaram&rsquo;s code actually collects and does today — it is{" "}
            <strong>not</strong> a substitute for a proper legal review
            against India&rsquo;s Digital Personal Data Protection Act, 2023
            (DPDP Act), which should happen before this app handles real
            members&rsquo; Aadhaar numbers or payments. Anything in{" "}
            <code>[brackets]</code> below still needs a real answer.
          </p>

          <div className="flex flex-col gap-7 text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            <section>
              <h2 className="text-base font-bold mb-2">1. Who this covers</h2>
              <p>
                This policy covers Agaram Premium (&ldquo;Agaram&rdquo;, &ldquo;we&rdquo;), a
                matrimonial platform for the Tamil community, at{" "}
                <span className="font-mono text-xs">agaram-ten.vercel.app</span>{" "}
                (a placeholder domain — this changes once a permanent one is
                registered). It applies to anyone who creates an account.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold mb-2">
                2. What we collect, and why
              </h2>
              <p className="mb-3">
                Only what each feature actually needs to work — nothing is
                collected &ldquo;just in case&rdquo;:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li>
                  <strong>Account:</strong> your email address and password
                  (password is hashed by our authentication provider,
                  Supabase Auth — we never see or store it in plain text).
                </li>
                <li>
                  <strong>Profile:</strong> full name, whether you&rsquo;re
                  registering as a groom or bride, age, city, and an optional
                  about-me note — used to build your profile and find
                  matches.
                </li>
                <li>
                  <strong>Match preferences:</strong> your preferred age
                  range, locations, education level, and similar — used only
                  to filter your own matching feed.
                </li>
                <li>
                  <strong>Identity verification:</strong> with your explicit
                  consent, we run an identity check against your Aadhaar
                  number. We store only the{" "}
                  <strong>last 4 digits</strong> plus a pending/verified/
                  failed status — never the full number, and never the raw
                  result from the verification vendor. (Today this check
                  runs against a placeholder mock, clearly labeled as such
                  in the product — see the &ldquo;Identity verification&rdquo;
                  section of the project README — while a real vendor
                  integration is being set up.)
                </li>
                <li>
                  <strong>Payments:</strong> if you subscribe to Elite, our
                  payment processor, Razorpay, handles your card/UPI/
                  netbanking details directly — we never see or store them.
                  We keep only the order ID, payment ID, amount, currency,
                  and status, to know your subscription is active.
                </li>
                <li>
                  <strong>Matches and messages:</strong> who you&rsquo;ve
                  expressed interest in, and the content of messages you
                  send once a match is mutual. Messages are only ever
                  readable by the two people in that conversation.
                </li>
                <li>
                  <strong>Reports:</strong> if you report another member,
                  we keep the reason you give, tied to that specific
                  conversation, so it can be reviewed.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold mb-2">
                3. Who can see what
              </h2>
              <p>
                By default, every table in our database is locked down so a
                member can only ever read or write their own row — this is
                enforced by the database itself (Postgres row-level
                security), not just by the app&rsquo;s screens. Other
                members only ever see a deliberately narrow, purpose-built
                slice of your profile: a masked card (first initial, age,
                location, verification badge) while browsing, and your full
                name and about-me only after a match becomes mutual — and
                only if they&rsquo;ve subscribed to Elite. The one person
                who runs Agaram can see member profiles, verification
                status, and filed reports for moderation purposes — never
                private message content, and never gated behind the Elite
                subscription (that gate exists between members, not between
                a member and the person operating the platform).
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold mb-2">
                4. Who we share data with
              </h2>
              <p className="mb-3">
                We don&rsquo;t sell your data. It passes through a small
                number of service providers, each doing one specific job:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li>
                  <strong>Supabase</strong> — our database, authentication,
                  and hosting for all the data above.
                </li>
                <li>
                  <strong>Razorpay</strong> — payment processing for Elite
                  subscriptions; they handle your actual card/UPI details,
                  we don&rsquo;t.
                </li>
                <li>
                  <strong>Vercel</strong> — hosts the application itself.
                </li>
                <li>
                  <strong>Sentry</strong> — error monitoring, so we find out
                  when something breaks. This can incidentally capture
                  technical details (like the page you were on) alongside an
                  error, but is not used to build a profile of you.
                </li>
                <li>
                  [When live] <strong>HyperVerge or Signzy</strong> — the
                  vendor that will run real Aadhaar identity checks, once
                  connected. Only the minimum data needed for that one check
                  is sent to them, and per Section 2 above we only keep the
                  result, not their raw response.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold mb-2">
                5. How long we keep it
              </h2>
              <p>
                Today, data is kept for as long as your account exists — we
                don&rsquo;t yet have an automated retention/deletion
                schedule. Building one (and a self-serve export/delete
                flow) before real members&rsquo; data is at stake is an
                explicit, tracked next step — see &ldquo;What&rsquo;s next&rdquo;
                in the project README. Until it exists, you can request
                deletion or an export of your data by emailing us (Section
                8), and we&rsquo;ll handle it by hand.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold mb-2">6. Your rights</h2>
              <p>
                Under the DPDP Act, you (as a &ldquo;Data Principal&rdquo;) have the
                right to access what we hold about you, ask us to correct
                it, ask us to erase it, and withdraw consent you&rsquo;ve
                previously given (for example, for identity verification) —
                withdrawing consent doesn&rsquo;t affect anything done
                before the withdrawal. To exercise any of these, contact us
                using Section 8 below.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold mb-2">7. Consent</h2>
              <p>
                Creating an account means you&rsquo;ve read and agreed to
                this policy. Identity verification asks for a separate,
                explicit consent (a checkbox naming the DPDP Act directly)
                before your Aadhaar number is ever used, exactly as
                described in Section 2.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold mb-2">
                8. Grievances &amp; contact
              </h2>
              <p>
                For any question about this policy, to exercise a right
                under Section 6, or to raise a grievance about how your
                data has been handled: [GRIEVANCE OFFICER NAME AND EMAIL —
                the DPDP Act requires naming a real contact for this; not
                yet filled in].
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold mb-2">9. Changes</h2>
              <p>
                If this policy changes in a way that matters, we&rsquo;ll
                update the date at the top and, once Agaram has a way to
                message all members at once, let you know directly.
              </p>
            </section>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-soft)" }}>
          <Link href="/dashboard" className="font-semibold" style={{ color: "var(--accent-strong)" }}>
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
