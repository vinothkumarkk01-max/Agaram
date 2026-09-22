
# Agaramiya — Product Requirement Document (v6.5, consolidated)

**Brand:** Agaramiya — `agaramiya.com` (per the Sept 2026 naming/trademark research, this domain appeared unregistered when last checked; the founder confirmed the rename and register-today status still needs a final check before purchase — see `Agaram_Naming_Trademark_Research.md`)
**Target Market:** Tamil-speaking community — Tamil Nadu, Puducherry, and diaspora (Sri Lanka, Singapore, Malaysia, Tamil communities in the US/UK/Canada/Gulf), from launch
**Status:** Consolidated working draft — this version restates every section in full so nothing from earlier rounds is silently lost in a "carried forward unchanged" note again
**Supersedes:** v5.0 (and folds forward v2.0–v4.1, which are no longer separately maintained)

---

## 1. Executive Summary

Agaramiya is a highly vetted, privacy-first matrimonial platform for Tamil Nadu's professional elite — IIT/IIM alumni, IAS/IPS officers, doctors, CAs, senior tech executives — and the Tamil-speaking diaspora beyond it, plus the families who are often co-decision-makers in the match. Every profile is identity-verified, photos stay blurred until mutual interest, and the platform deliberately limits how many matches a member sees (three a week), trading infinite choice for curated quality.

**The four product pillars, in order of importance:**

1. **Verified** — every member is confirmed by independent signals (phone, government ID, liveness, employer, education), never by one generic badge.
2. **Curated** — a bounded weekly introduction, not an open directory. "We do the searching for you."
3. **Private** — blurred until mutual, in-app messaging only, no phone numbers ever, granular visibility controls.
4. **Family-aware** — families participate with the candidate's explicit permission, never by default and never with full account access.

**The signature mechanic:** *3 meaningful introductions every Friday.* This is the product's core promise and should anchor onboarding copy, the weekly feed, and the pricing narrative alike — positioned as "quality over quantity," never as "we have fewer profiles."

The named benchmark competitor is **EliteMatrimony.com** (Matrimony.com group). Agaramiya's differentiation against them: tech-based, multi-signal identity verification (not just an RM's word and a financial audit), a credential-based eligibility gate (not a net-worth gate), and native depth in Tamil culture and diaspora needs rather than a bolted-on regional vertical. See §10 for the full comparison.

**Build sequencing:** Phase 0 (a marketing/waitlist site) is live now. Phase 1 (the real MVP) and Phase 2 (full platform) follow once waitlist signal justifies the engineering investment — see §4.

---

## 2. Personas

**The Candidate (the professional), 24–35.** Tech-savvy, career-driven, protective of professional privacy. Wants autonomy in partner selection; heavy parental involvement in the app itself is a dealbreaker even if parents are involved in the real-world decision later.

**The Parent, 50–65.** Values family background and academic pedigree; needs a low-friction interface (large fonts, simple linear flows). Treats Jathagam (horoscope) compatibility as close to mandatory.

These two need different information densities and defaults, and a way to link a parent's and candidate's accounts without one overriding the other's autonomy — resolved in §5.

There is no separate "Match Candidate" persona — the person a Candidate is introduced to is simply another Candidate, on the other side of a proposed match. §3 makes this symmetry explicit.

---

## 3. Product Architecture — Actors & Relationships

*(New in v6.0 — added in response to founder-commissioned product review, Sept 2026.)*

Every real matrimonial decision on Agaramiya involves three roles, not one:

```
                   AGARAMIYA
                       │
            ┌──────────┴──────────┐
            │                     │
         Candidate              Family
     (the person marrying)   (a collaborator,
            │                 invited by the
            │                  candidate)
            └──────────┬──────────┘
                       │
                  Matchmaking
                       │
            ┌──────────┴──────────┐
            │                     │
        Candidate A           Candidate B
      (+ their Family)      (+ their Family)
            │                     │
            └────── Mutual ───────┘
                       │
                  Conversation
                       │
             Family involvement
              (only if shared)
                       │
                Video / Meeting
                       │
                    Marriage
```

**The key structural point:** Candidate A and Candidate B are symmetric — each is a Candidate with an optional Family Collaborator. There is no special "match candidate" role; the same account model and the same privacy rules apply to both sides of every introduction. This symmetry is what makes the platform's privacy guarantees credible: what Candidate A's family can see about Candidate B is exactly what Candidate B's family can see about Candidate A, governed by the same sharing rules (§5, §7).

This diagram is the canonical product model. Every onboarding, matching, and messaging flow described below is a walk along this diagram, and any new feature should be placed on it explicitly rather than bolted on ad hoc.

---

## 4. Phased Roadmap

| Phase | Scope | Status |
|---|---|---|
| Phase 0 — Landing & Waitlist | Positioning site, persona-specific messaging, onboarding preview, waitlist capture | **Live** |
| Phase 1 — MVP | Dual onboarding, multi-signal identity verification (India + diaspora), blurred profiles, weekly curation feed with match explanations, free-browse/paid-unlock, in-app messaging post-match with milestone tracking, family sharing workflow, reporting & blocking, admin moderation dashboard, Tamil-language UI toggle | Not started |
| Phase 2 — Full Platform | Automated Jathagam matching via astrology API, Royal Concierge human-matchmaker workflow (full application → curated-introduction cycle), richer analytics, subscription lifecycle management (renewal/failed-payment/cancellation) | Not started |

---

## 5. Account & Profile Model

**Core model:** one profile per marriageable person, not two competing accounts. Two roles can attach to that single profile, each with its own login (so each generation gets an interface suited to them — simple for parents, modern for candidates):

| Role | Who | Can do |
|---|---|---|
| **Owner** | The candidate | Full control: edit profile, browse curated matches, express interest, accept/decline, message, unlock, manage subscription, decide what to share with Family |
| **Family Collaborator** | A linked parent | Edit family/qualification/Jathagam fields, view weekly matches and compatibility scores **read-only**, see whether a match is pending/mutual (status only), review matches the candidate has explicitly shared (§7). **Cannot** read any message, see who else the candidate passed on, see private photos, or unlock/accept/decline on the candidate's behalf |

**Who can create a profile on someone's behalf.** EliteMatrimony's own onboarding form (their "Elite Alliance for" field) confirmed this is a real, expected pattern in this category — it lists Self, Son, Daughter, Brother, Sister, Friend, Relative. Agaramiya adopts the same relation list, with access handled differently depending on who the creator is:

- **Self** → creator is the candidate, becomes Owner immediately.
- **Son / Daughter** (a parent creating the profile for their child) → this is the Parent Track described above; once the child claims/verifies the profile, the parent becomes a **persistent** Family Collaborator.
- **Brother / Sister / Friend / Relative** (a proxy creator who isn't a parent) → **one-time setup access only, by default.** Once the actual candidate claims and verifies the profile, the proxy creator's access expires automatically — they were doing a favor, not taking on an ongoing role. The candidate can optionally re-invite that person later with Family-Collaborator-equivalent access, but it's opt-in, never automatic.

A Family account must always be created attached to a specific Candidate profile — the Family login should never feel like a standalone account. Every Family-facing screen states plainly whose search it is helping with (e.g. "You're helping Priya with her matrimonial search"), because a role this permission-sensitive should never leave any ambiguity about context.

This keeps "who can see what" simple: at steady state, only the Owner and (optionally) one persistent parent Family Collaborator have ongoing access — everyone else who helped set things up loses access once the real person takes over, unless explicitly re-invited.

*(Data model implication: `profiles` needs a `created_by_relation` field — self/son/daughter/brother/sister/friend/relative — and proxy-creator sessions need an access-expiry tied to the claim event. See §12.)*

---

## 6. Member Lifecycle — State Machine

*(New in v6.0. Diagram corrected in v6.5 — see the changelog note at the end of this document.)*

Every member moves through the same lifecycle, whether Candidate or Family. This is the canonical state machine — the prototype's navigation should be a faithful implementation of it, not the other way around.

```
Landing
  │
  ▼
Who is looking for a match? ──────────────┐
  │ Myself                                │ Family (on behalf of someone)
  ▼                                       ▼
Phone verification                  Phone verification
  │                                       │
  ▼                                       ▼
Government ID + liveness           Candidate connection
  │                                       │
  ▼                                       ▼
Basic profile                        Family preferences
  │                                       │
  └──────────────┬────────────────────────┘
                  ▼
       Must-have preferences
   (§7's minimal hard-filter tier only —
    the fuller tiers are progressive)
                  │
                  ▼
     Profile = "Under review"
     (mandatory identity checks running —
      phone + government ID + liveness;
      nothing is visible to other
      members yet)
                  │
                  ▼
        Identity verification approved
              (by a person)
                  │
                  ▼
            Profile goes live
                  │
                  ▼
  ┌───────────────────────────────────────┐
  │   Build trust, progressively           │
  │   (all optional — can be completed      │
  │    any time after going live, §7)       │
  │                                         │
  │   • Employment & Professional           │
  │     verification (candidate picks       │
  │     EPFO / work email / employer —      │
  │     never LinkedIn alone)               │
  │   • Education verification              │
  │   • Roots / Jathagam / Lifestyle        │
  │   • Fuller preference tiers             │
  │     (family / lifestyle / cultural)     │
  └───────────────────┬─────────────────────┘
                  │
                  ▼
     ┌───────────────────────┐
     │   Friday 4:00 PM       │
     │   Your 3 introductions │
     └───────────┬───────────┘
                  │
                  ▼
         Match explanation
        ("why we introduced you")
                  │
        ┌────────┴────────┐
        ▼                 ▼
      Pass            Interested
                          │
                          ▼
                   Interest sent
              (rich waiting state — see
               §18's InterestSent update:
               profile-momentum framing,
               a "why this can take a
               few days" explainer, and
               a way to keep browsing
               rather than a bare spinner)
                          │
                  other person responds
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
              Pass               Accept
                                    │
                                    ▼
                          🎉 Mutual match
                       (full profile unlocked
                        on both sides)
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                              ▼
               Full profile                     Jathagam
              (photo, name,                   compatibility
               full detail)                    (if shared)
                     │                              │
                     └──────────────┬───────────────┘
                                    ▼
                                  Chat
                        (milestone-tracked — §8)
                                    │
                                    ▼
                         Share with family
                       (candidate-initiated,
                        never automatic)
                                    │
                                    ▼
                           Family reviews
                    (status + shared details only —
                     see §18's explicit Family Mode
                     status card)
                                    │
                                    ▼
                              Video call
                                    │
                                    ▼
                                  Meet
                                    │
                                    ▼
                             Relationship
                                    │
                       ┌────────────┴────────────┐
                       ▼                          ▼
                    Paused                     Success
              (see intent/stage,             (marriage —
                 below)                      member exits
                                            active matching)
```

**Mandatory vs. optional steps, made explicit:**

- **Mandatory before a profile can go live:** phone verification, government ID + liveness, basic profile (name/age/location/profession/education), at least a minimal set of match preferences (§7's "must-have" tier only).
- **Optional, encouraged, can be completed after first matches arrive:** Employment verification (EPFO/UAN, work email, or employer contact — §7.1.1), Professional verification, education-document verification, Jathagam/horoscope details, diaspora native-roots detail, the fuller preference tiers (family/lifestyle/cultural). A profile missing these is still live, but shows a "profile completeness" nudge (already partially built — see `EditProfileMediaManager`) rather than being blocked.

**Onboarding is now sequenced by trust-value, not just by data type.** *(Sept 2026, this round — see §18.)* Verification steps that require an external check-in (employment, education) are separated from steps the candidate fully controls (basic profile, preferences) so the two never compete for attention in the same screen or moment — see §18's progressive-trust onboarding reflow for the concrete reordering, and the diagram above (corrected in v6.5) for how that reflow now reads end to end.

**Intent / stage state.** A member's matchmaking intent is tracked as its own state, independent of profile-live/paused:

`Just exploring → Actively looking → Talking to someone → Family discussions → Meeting someone → Paused → Married`

This solves a concrete problem: the platform should not keep recommending — or being recommended as — a fresh weekly introduction to someone who is already deep in a conversation, in family discussions, or has paused. `AccountStatusPause` is the natural home for this control, extended from a binary hide/delete choice into this full stage selector.

---

## 7. Verification, Profile & Preferences — Three Separate Concepts

*(New in v6.0 — previously conflated under "onboarding.")*

These three answer different questions and should never be visually or logically merged:

### 7.1 Verification — *"Can I trust this person?"*

Independent signals, each shown as its own badge — never collapsed into one generic "Verified" checkmark, and never gated on a single provider:

- **Identity Verified** — phone + government ID (Aadhaar/DigiLocker for India, passport + liveness for diaspora)
- **Employment Verified** — a documented work-history confirmation, primarily via EPFO/UAN government payroll records; see the vendor-backed waterfall below
- **Professional Verified** — *(new, Sept 2026 — split out from Employment per founder review of a proposed verification architecture)* a live, present-tense confirmation of current role and professional identity via an official work-email domain or a direct employer-portal/HR check; see §7.1.1
- **Education Verified** — see the vendor-backed waterfall below
- **Diaspora Verified** — passport/visa + liveness, for members living outside India (§13)

A profile can be partially verified and still visible (e.g. Identity + Employment verified, Education pending) — the badges communicate exactly which signals are confirmed rather than an all-or-nothing gate. Employment and Professional are allowed to diverge in status (e.g. Employment verified from a prior job while Professional reflects a title change at a new one) — see §7.1.1 for why they're tracked separately rather than merged.

**Badge detail copy names its source, never a generic checkmark.** *(New, Sept 2026.)* Whatever a member sees when they open a badge's detail (their own, or on someone else's profile after mutual match) states the specific method used — never a single undifferentiated "Verified" — because *how* a claim was confirmed carries real trust information a flat badge would flatten away:

- `EPFO_VERIFICATION` → "Verified using employment records"
- `WORK_EMAIL_VERIFICATION` → "Work email verified"
- `EMPLOYER_ATTESTATION` → "Verified using employer confirmation"

The same principle extends to Education (`NAD_VERIFICATION` → "Verified using academic records"; `REGISTRAR_VERIFICATION` → "Verified with the university registrar") and Identity/Diaspora's source-specific copy. This is a small UI habit with an outsized brand payoff (§7.1.1's closing note) — it is what lets Agaramiya say "here is what we verified, where, and when" instead of "trust us."

#### 7.1.1 Employment, Professional & Education Verification — the real architecture

*(v6.1, Sept 2026: until that round, "Employment Verified" and "Education Verified" were named as concepts with no defined mechanism behind them — the prototype showed a LinkedIn-connect button and a bare document-upload button, with no specification of who checks anything or against what. v6.2, Sept 2026: a founder review of a proposed verification architecture confirmed the vendor stack below and added two refinements. First, Employment now leads with an explicit, candidate-facing choice of verification method, with EPFO/UAN as the recommended default, rather than a single LinkedIn-connect button with EPFO buried behind it as a background cross-check. Second, a fifth badge — Professional Verified — is split out from Employment: Employment confirms a documented work *history*; Professional confirms the candidate's *current* role and identity via a live work-email or employer-portal check. v6.3, Sept 2026: a further founder review, focused specifically on the third employment-verification path, confirmed it should be built as a hybrid workflow — automated end-to-end from Agaramiya's side, with the one genuinely human step being the employer's own confirmation — and specified the consent, request, response, discrepancy, and non-response handling in full; see §7.1.3. None of this requires Agaramiya to build its own verification network — it uses existing, live, API-integrable infrastructure throughout.)*

**Employment — the candidate chooses how to verify, EPFO first.** Coverage varies across the target persona in a way a single button can't capture — IAS/IPS officers and salaried tech/finance professionals are reliably EPFO-covered; doctors and CAs in private practice frequently are not. So instead of one button, the candidate sees three explicit options, each with its own technical method name so the verification engine and admin dashboard can reason about them independently:

| User sees | Technical method | Mechanism | Cost & turnaround |
|---|---|---|---|
| **Verify through EPFO** (Recommended) | `EPFO_VERIFICATION` | Candidate enters their UAN (Universal Account Number); the same India BGV vendors named below (AuthBridge/IDfy/SpringVerify — a private platform cannot query EPFO directly and must go through a licensed intermediary) pull employment history from EPFO government payroll records on consent | Near-free, 1–2 days |
| **Verify with work email** | `WORK_EMAIL_VERIFICATION` | A verification link is sent to the candidate's official work-email domain; confirms current employer and, where the employer's mail system supports it, role/title. This step most often also satisfies Professional Verified in the same pass | Instant-to-same-day |
| **Ask your employer to verify** | `EMPLOYER_ATTESTATION` | For companies outside EPFO coverage (self-employed professionals, small partnerships, some private practices): a hybrid automated workflow contacts the employer directly for a structured confirmation — see §7.1.3 for the full mechanism | 1–4 days, up to 7 before falling back |

LinkedIn is retained only as an optional profile-enrichment convenience — auto-filling employer/title text for display — and explicitly does **not** drive the Employment or Professional badge on its own (`linkedin_only` remains a valid-but-weak `verified_via` value, never surfaced as equivalent to a vendor-backed or employer-confirmed check). A LinkedIn-only profile, with none of the three paths above completed, is never shown as Employment or Professional Verified.

**Professional — a separate, present-tense signal.** Verified the same way as `WORK_EMAIL_VERIFICATION` or `EMPLOYER_ATTESTATION` above, but tracked as its own badge with its own expiry, since a title or department can change without the underlying EPFO employment-history record changing. Most candidates confirm Employment and Professional in the same flow — the same work-email or employer-attestation step satisfies both — but they stay logically and visibly separate so a job change updates one badge without silently invalidating the other.

**Education** is unchanged from the prior round:

| Signal | Step 1 (free/near-free, instant-to-2-days) | Step 2 (paid fallback, when Step 1 has no record) | Cost & turnaround (Step 2) |
|---|---|---|---|
| **Education — India** | UGC recognized-university list + UGC-DEB approved-programs list (and AICTE for technical programs) as an instant self-hosted lookup, *then* National Academic Depository (NAD, via DigiLocker at `nad.digilocker.gov.in`) — candidate-consented digital record check, 1–2 days, effectively free | **AuthBridge / IDfy / SpringVerify** — contacts the registrar directly when NAD has no record (common for pre-2010 degrees, or institutions that haven't onboarded to NAD) | ₹500–800 digital database check; ₹800–1,500 if the registrar must be reached directly; 1–10 days |
| **Employment & Professional — India** | EPFO/UAN lookup (via AuthBridge/IDfy/SpringVerify) *or* work-email verification — candidate's choice, per above | `EMPLOYER_ATTESTATION` via the same category of vendors, for companies outside EPFO coverage — see §7.1.3 for the workflow this triggers | ₹500–800 EPFO/digital check; ₹800–1,200 for employer attestation; 1–7 days |
| **Education — diaspora** | — | **MeasureOne** — direct-integration coverage of US/Canada/UK/India institutions; verification in seconds when a direct school-system connection exists, document-based fallback when it doesn't | Not publicly disclosed; positioned as lower-cost than NSC |
| **Employment & Professional — diaspora** | Work-email verification | **The Work Number (Equifax)** or **Truework** — the two dominant US instant-employment-verification networks, drawing directly from employer payroll systems | Per-check, enterprise-negotiated; both are high-volume, proven providers |

**Why these specific vendors.** AuthBridge, IDfy, and SpringVerify are the three established leaders in Indian background verification — IDfy alone runs 60M+ verifications a month, is profitable, and already sells its own DPDP-Act compliance tooling ("Privy"), which is directly relevant to §14's compliance requirements. All three support API integration (not just a manual dashboard), so a check can be triggered programmatically the moment a candidate consents, with the result flipping the badge from "pending" to "verified" automatically. For the `EMPLOYER_ATTESTATION` workflow specifically (§7.1.3), **Attestr** and **VerifyAll** are worth evaluating alongside them — both already run the exact consent-first, employer-coordinated, asynchronous-API-with-webhook-result pattern Agaramiya needs, rather than a generic BGV dashboard bolted onto an employment-attestation use case; **NSDC Trust** is a further option, positioned around customizable, API-based verification workflows and a digitally-verifiable-credential ecosystem. On the diaspora side, MeasureOne, The Work Number, and Truework are the equivalent scaled, API-first providers — this is not a build-vs-buy question, since equivalents to Agaramiya's own Aadhaar/DigiLocker + HyperVerge/Signzy identity stack already exist for these signals too.

**Unit economics.** A full Education + Employment + Professional check costs roughly ₹1,000–4,000 per member all-in (most of it in the India employment/education fallback tier; the free NAD/UGC layer, and the fact that one work-email or employer-attestation step typically clears both Employment and Professional at once, both absorb a meaningful share of the cost). Against the ₹15,000/6-month Elite tier and ₹1,00,000–2,50,000/6-month Concierge tier already set in §11, this is trivially affordable — it should be run on every profile attempting these signals, not gated to a premium tier.

**What stays manual, and why that's fine.** A small residual of cases will have no digital record and no clean fallback (a very old degree from an institution that has since closed, an employer that no longer exists) — these route to the same admin moderation dashboard named in the Phase 1 scope (§4) for a human reviewer to make a judgment call, exactly as the lifecycle diagram in §6 already states ("verification approved... by a person, per signal"). The waterfall above exists to make that the rare path, not the default one.

**Prototype implication:** `CandidateProfessionalCheck` leads to an explicit `EmploymentVerificationMethod` choice screen (EPFO recommended / work email / ask employer) rather than a single connect button; a confirmation screen shows the result with a "last verified" date; and `IdentityVerificationStatus` links out to a full `VerificationReport` screen listing every signal's method and date — see §7.1.2 for the state model behind all of this, and §7.1.3 for the `EMPLOYER_ATTESTATION` path's own consent/status/outcome screens.

#### 7.1.2 Verification State Machine & Confidence Level

*(New, Sept 2026.)* Each of the five signals (Identity, Employment, Professional, Education, Diaspora) moves independently through the same eleven-state lifecycle. This is the canonical backend/admin model — members only ever see the simplified badge language in §7.1 (Verified / Pending / Partially Verified / Not started), never these raw state names.

```
NOT_STARTED       — not yet initiated
CONSENT_REQUIRED  — waiting on the candidate's consent to query a source
IN_PROGRESS       — a check is running
SOURCE_FOUND      — the vendor or government source returned a record
MATCHING          — the returned record is being matched against the candidate's claimed details
VERIFIED          — successfully confirmed
PARTIALLY_VERIFIED — some but not all claimed details could be confirmed (e.g. employer confirmed, exact title could not be)
UNABLE_TO_VERIFY  — no source record found and no fallback available
EXPIRED           — a prior VERIFIED result has passed its validity window and needs re-checking
REVOKED           — the candidate withdrew consent for this signal
MANUAL_REVIEW     — routed to the admin moderation dashboard (§4) for a human judgment call
```

**Confidence level.** Each `VERIFIED`/`PARTIALLY_VERIFIED` result also carries an internal confidence level (High/Medium/Low) reflecting the strength of its source — a government EPFO/NAD record is High; a work-email domain match is Medium; an employer-attestation confirmation with no documentary trail is Medium-Low. This score is never shown to other members as a number, for the same reason Jathagam compatibility is never led with a single score (§8): it drives internal routing (a Low-confidence result on a sensitive signal routes to `MANUAL_REVIEW` rather than auto-approving) rather than being member-facing.

**Expiry & re-verification.** Employment and Professional carry a 12-month validity window from the verification date (jobs and titles change); Education, Identity, and Diaspora don't expire on a timer (a degree or a passport doesn't lapse) but can still move to `REVOKED` if consent is withdrawn. When a signal moves to `EXPIRED`, the profile keeps its existing badge visible with a "last verified" date rather than silently reverting to unverified, and the candidate is prompted to re-confirm — a graceful, dated trust signal beats an abrupt badge removal.

**How `EMPLOYER_ATTESTATION` maps onto this state machine.** Because it is the one verification path that waits on another party's action, it is worth stating explicitly that `EMPLOYER_ATTESTATION` does not get its own parallel state machine — it walks the same eleven states as every other method, just with a longer, richer `IN_PROGRESS` phase (see §7.1.3's sub-status trail) before landing on `VERIFIED`, `PARTIALLY_VERIFIED`, or `UNABLE_TO_VERIFY`. This keeps the admin dashboard, the badge-derivation logic in §12, and the confidence-scoring rule above uniform across all five signals and all verification methods, rather than special-casing the employer path.

#### 7.1.3 Employer Attestation (`EMPLOYER_ATTESTATION`) — the automated hybrid workflow

*(New, Sept 2026 — a founder-commissioned review of the third employment-verification path, informed by how Indian verification platforms such as Attestr and VerifyAll already run this exact pattern.)*

**The core design decision: hybrid, not manual.** "Ask your employer to verify" must not mean an Agaramiya staffer manually phoning HR. Everything up to and including delivering the result to the candidate's badge is automated; the one genuinely human action in the entire flow is the employer's own staff confirming the facts. This is what makes the path viable at scale without Agaramiya building or staffing its own verification operation.

**1. Candidate consent, recorded as its own event.** Before any request leaves Agaramiya, the candidate sees exactly what will be asked and of whom (mirroring the `EmployerAttestationConsent` prototype screen): the employer's name, a plain-language list of what will and won't be requested, and an explicit "I agree & send request" action. This consent is timestamped and stored (`consent_id`, linked to the `verifications` row — see §12), and the candidate can revoke it later from their verification report, moving that signal to `REVOKED`.

**What Agaramiya asks the employer to confirm — deliberately minimal:**

| Asked | Never asked |
|---|---|
| Identity — does this person work/have they worked there | Salary or compensation |
| Employer name | Performance rating |
| Designation — does it match the claim | Direct manager's name |
| Employment period — does it match the claim | Reason for leaving |
| | Internal employee ID or other confidential HR data |

This is the complete question set the badge needs — anything beyond it is a privacy liability with no verification value.

**2. Secure request generation and delivery.** Agaramiya creates a verification case (e.g. `AG-72831`) and routes it to the employer through whichever channel is available:

- **Employer already onboarded (future state, §7.1.3's "Phase 2" below):** the request appears directly in an Agaramiya Employer Portal — no email chasing, no account needed on either side.
- **Employer not onboarded (the Phase 1 default):** a secure, single-use, expiring, authenticated link is emailed to an employer contact — the HR recipient never needs an Agaramiya account, mirroring the "one-time link, no account" pattern used by VerifyAll and similar platforms.

Whichever path fires, the interaction visible to HR is a short structured form (candidate's claim shown as a table, then three questions — Yes/No/Unable-to-verify each — for identity, designation match, and period match), never a phone call or an open-ended request. This HR-facing surface is intentionally out of scope for the Agaramiya candidate app itself (it is a separate, unbranded, non-member-facing surface reached only via the secure link or portal) — it is specified here so engineering has the full picture, not because it appears anywhere in the candidate prototype.

**3. Reminder and expiry schedule — automated, with a critical wording distinction.**

```
Day 0 — request sent
Day 2 — automated reminder to employer, if no response
Day 5 — second automated reminder, if still no response
Day 7 — request expires
```

If day 7 arrives with no response, the signal moves to `UNABLE_TO_VERIFY` — explicitly **not** a rejection, and the candidate-facing copy must never imply the claim is false. The prototype's `EmployerAttestationUnableToVerify` screen states this directly ("this doesn't mean your employment claim is false") and offers to try `EPFO_VERIFICATION` or `WORK_EMAIL_VERIFICATION` instead, both of which are typically faster.

**4. Discrepancy handling — a difference is not a failure.** When the employer's response only partially matches the candidate's claim (a common, benign case — e.g. a designation or start date that has since changed in the candidate's memory or was never updated on their profile), the result is `PARTIALLY_VERIFIED`, not `UNABLE_TO_VERIFY` and never a flat rejection. The candidate sees a side-by-side comparison (their profile's value vs. the employer's confirmed value, per field) via the `EmploymentDiscrepancyReview` prototype screen, with a single clear action: update the profile to match, or leave it as-is. This is materially more trustworthy than a binary pass/fail, and keeps the badge system honest about what was actually confirmed.

**5. What the candidate sees on success — source-specific, never generic.** Per §7.1's badge-copy rule, a successful `EMPLOYER_ATTESTATION` result reads "Verified using employer confirmation" (the `EmployerAttestationVerified` prototype screen), distinct from "Verified using employment records" (EPFO) or "Work email verified" — because the strength and nature of the underlying confirmation genuinely differs, and Agaramiya's trust story depends on being honest about that difference rather than treating every source as interchangeable.

**6. What Agaramiya's Trust Layer stores internally — richer than the public badge, and never the raw correspondence.** Extending the `verifications` row (§12) for this method: the verification case ID, the candidate's claim as submitted, the consent event (id + timestamp), the employer contact/channel used, the structured result (per-field match/no-match/unable-to-verify), and the standard `state`/`confidence_level`/`verified_at`/`expires_at` fields every signal already carries. The underlying email thread or portal interaction with HR is never itself stored as part of the matrimonial profile — only the structured, minimal outcome is retained, consistent with §14's data-minimization principle.

**7. Phasing — do not build the employer portal first.** For launch, `EMPLOYER_ATTESTATION` should run entirely through an existing verification-provider's API (Attestr-style asynchronous workflow, or an equivalent from IDfy/AuthBridge/SpringVerify/VerifyAll — see the vendor note in §7.1.1) with the request delivered as a one-time email link. This validates the feature without Agaramiya building or operating any employer-facing infrastructure of its own. Only once volume justifies it does it make sense to build a first-party **Agaramiya Employer Network**: a company that has responded to enough requests is invited to become an "Agaramiya Verified Employer" with its own portal, at which point the workflow becomes a genuine network effect (a company onboarded once serves every future Agaramiya candidate who lists it) rather than a per-case API call. This mirrors the Royal Concierge sequencing logic in §11 — earn the right to build the heavier, more defensible version once the lighter one has proven the demand.

**Prototype implication:** the candidate-facing side of this workflow is five new screens reached from `EmploymentVerificationMethod`'s "Ask your employer to verify" option — `EmployerAttestationConsent` → `EmployerAttestationStatus` (the day 0/2/5/7 timeline) → one of three outcomes: `EmployerAttestationVerified`, `EmploymentDiscrepancyReview`, or `EmployerAttestationUnableToVerify`. The HR-side form described above is intentionally not built into this prototype — it is a separate, non-Agaramiya-branded surface with no candidate-facing equivalent.

### 7.2 Profile — *"Who is this person?"*

**Profile type — Bride or Groom.** *(New — founder decision, Sept 2026: a simple binary, matching how the category is understood by the families using it, not a decoupled gender/seeking-preference model.)* Captured once, during basic-profile capture (`CandidateOnboardingStep2` / the equivalent Family-track field), and treated as core profile data, not a preference — it is never blank on a live profile. Matching is opposite-binary by default: a Groom profile is shown Bride profiles and vice versa, with no separate "who are you looking for" gender toggle for the member to set (see §7.3). This single field replaces what was, until this review, an unstated assumption running through onboarding, matching, and preferences — profile type must render on every screen where it's structurally relevant (basic-profile capture, the must-have preferences confirmation, and the Family-track detail field), not just implied by pronouns in surrounding copy.

Age, location, profession, education, family background, lifestyle, native place, horoscope, photos, about-me. This is self-described content, distinct from the verification signals above (a profile can state an employer; verification is what confirms it independently).

### 7.3 Preferences — *"Who are they looking for?"*

Collected progressively, never all at once during signup:

```
Signup → Minimum viable profile → First matches → Improve match quality → Additional preferences
```

**Who you're matched with is derived, not a preference.** Because profile type (§7.2) is a strict Bride/Groom binary, "who are you looking for" on the gender axis is automatic — a Groom profile's must-have screen states plainly "Matching you with Brides" as a confirmation, not a choice. The must-have preferences below are the *additional* filters layered on top of that automatic match direction.

**Must-have (collected at signup, hard filters):** age range, location, marital status, children/future children, education, profession, relocation willingness, language.

**Family preferences (collected before or shortly after first matches):** family type (nuclear/joint), native place, parents' expectations, family involvement level, living arrangement after marriage.

**Lifestyle (progressive, prompted after engagement builds):** vegetarian/non-vegetarian, alcohol, smoking, fitness, travel, working after marriage.

**Cultural (progressive, always optional where sensitive):** Tamil dialect/region, native district, Jathagam, community/caste (optional, profile field — see §5's caste handling), religious practices (optional).

**Community/caste handling stays exactly as already decided:** a candidate's own community is a *profile* field ("my background"); whether to filter matches by community is a completely separate *preference* field, defaulting to "No preference," never inferred from the profile field. The UI keeps these as two visibly distinct fields, never one.

---

## 8. Weekly Curation — Rule-Based v1 Matching

Rule-based scoring for v1 (not ML). Starting factors:

| Factor | Weight | Notes |
|---|---|---|
| Jathagam compatibility (Porutham score, Dosham flags) | High | Hard filter on severe Dosham mismatches if marked non-negotiable by the family collaborator; otherwise a score contributor |
| Education/professional tier | High | Alma mater tier, employer tier — matches the vetted-pedigree positioning |
| Age range preference | Medium (hard filter) | Filter, not a score |
| Location / diaspora region | Medium | Same-city/region preference, or willingness to relocate; diaspora matching also considers native-place overlap (Singapore ↔ Thanjavur, Toronto ↔ Madurai) as its own signal — see §13 |
| Self-declared values/lifestyle answers | Medium | Short onboarding questionnaire (career vs. family priorities, joint vs. nuclear family, etc.) |
| Mutual-interest signal decay | Low | Slightly deprioritize resurfacing someone who already passed on this candidate |

A weighted-sum filter-then-score model — reasoning about it, debugging it, and explaining "why was I matched with this person" to a member all stay tractable, which matters for a trust-first platform.

**Match Explanation — a Phase 1 must-have, not a nice-to-have.** Every introduction must show *why* it was made, in plain language, not just a single Jathagam number:

```
Why we introduced you

5 strong connections
✓ Both based in Chennai
✓ Similar career stage
✓ Both IIT alumni
✓ Both value family involvement
✓ Both open to relocation

1 thing to discuss
△ Different preferred living locations

Jathagam        8/10 — strong
```

**Jathagam is one compatibility signal, never the headline number.** The weekly feed and profile screens must not lead with "Porutham 8/10" as if it were an overall verdict. Instead, show a compatibility breakdown:

```
Compatibility            Strong overall match
  Profile compatibility     Strong
  Lifestyle compatibility   Strong
  Location compatibility    Good
  Family preferences        Strong
  Jathagam                  8/10
```

with an explicit line: *"Jathagam is one compatibility signal, not a decision or recommendation."* This is both a cultural-responsibility point and a product-differentiation point — it makes the platform feel intelligent rather than arbitrary.

**First-value moment, ahead of the Friday cadence.** *(Sept 2026, this round — see §18.)* A new member who finishes verification and setup mid-week previously had nothing to see until the next Friday batch. A preview-introduction moment now shows a first, lightly-teased match as soon as setup completes, making the weekly cadence feel like an accelerating rhythm rather than a cold, dateless wait for the first proof the product works.

---

## 9. Jathagam API Vendors (Phase 2 decision — not yet chosen)

- **Prokerala Astrology API** — runs a dedicated [Tamil Jathagam Porutham tool](https://www.prokerala.com/astrology/jathagam-porutham-tamil.php) as a consumer product, suggesting the API may support Tamil-style Porutham specifically (not just North Indian Ashtakoot) — confirm directly. [Pricing](https://api.prokerala.com/api-credits).
- **AstrologyAPI.com** — dedicated [Vedic Kundli/matchmaking API](https://astrologyapi.com/vedic-astrology), [pricing](https://astrologyapi.com/pricing).
- **VedicAstroAPI.com**, **KundliAPI.com** — additional credit-based options, lower priority (less evidence of Tamil-specific support).

Recommendation: trial Prokerala first; validate against a few known horoscope pairs with a traditional Tamil astrologer's manual reading before trusting it for real matches. Not yet tested for accuracy or current pricing.

---

## 10. Competitive Analysis — vs. EliteMatrimony.com

| Dimension | EliteMatrimony | Agaramiya | Implication |
|---|---|---|---|
| Service model | Fully offline, RM-mediated. Profiles never appear on any app | App-based self-serve browsing + weekly algorithmic curation, optional human concierge | Matches what the Candidate persona already wants (autonomy) — lean into it, don't imitate their offline model |
| Onboarding/login UX (observed directly) | Hero doubles as a lead-capture form; an auto-popup live chat pushes a phone call within seconds of landing; login is a bare, unstyled OTP modal with no visual continuity to the brand | Self-serve, no forced human contact; onboarding shown visually on the site itself, styled consistently with the rest of the page; scroll-reveal polish and a working mobile nav | Deliberately do **not** copy their lead-gen/live-chat pattern — it contradicts "no phone tag," which is core to the pitch |
| Identity/trust verification | RM's personal vetting + a chartered-accountant financial audit (RGN Price & Co.) for net-worth claims. No visible document/biometric tech verification | Independent Identity/Employment/Professional/Education/Diaspora badges (§7.1) — phone + Aadhaar/DigiLocker (India) or passport + liveness (diaspora), employment history and current professional identity shown as two separate signals, each naming its verification source (§7.1) | Genuine, defensible differentiator — make "tech-verified across multiple independent signals, not just vouched-for" an explicit trust-messaging pillar |
| Eligibility gate | Net worth ≥ ₹5 Cr OR income ≥ ₹50 L/year, OR elite education/senior role — any one qualifies | Pedigree/professional only — no wealth criterion | State as a values choice: vetted by credential, not net worth |
| Niche depth | Pan-India generic "elite," bolts on community verticals after the fact (e.g. "Jain EliteMatrimony") | Tamil-speaking community + diaspora as the foundation; native Jathagam/Porutham matching; native-roots diaspora matching (§13) | A real, currently unserved gap inside "elite matrimony" — worth owning before a sibling brand does |
| Trust signals/scale | 18+ years, 100,000+ members, 100+ RMs, celebrity endorsement, 12+ published success stories, publicly listed parent | None yet — pre-launch | Cannot be replicated honestly at launch. Substitute verifiable trust (tech badge, honest public roadmap) for scale-based trust — never fabricate testimonials or counts |
| Pricing (comparable tier) | ₹85,000/6mo "Elite Professional," up to ₹10,00,000/6mo "Elite Aristocrat" | See §11 | — |

---

## 11. Monetization

| Plan | Price | Positioning | Includes |
|---|---|---|---|
| Free | ₹0 | Verification + limited discovery | Verified signup, browsing blurred/anonymised profiles, expressing interest, Jathagam data collection |
| **Elite** | ₹15,000 / 6 months | *Self-service curated matchmaking. "A serious search, without the endless scrolling."* | Verified members only · 3 curated introductions every Friday · full profile after mutual interest · private in-app messaging · Jathagam compatibility report · family collaboration |
| **Royal Concierge** | ₹1,00,000 – ₹2,50,000 / 6 months (optional "Until Matched" flat fee) | *Human-assisted matchmaking.* A legitimate premium service, not just a more expensive subscription. | Everything in Elite, plus a dedicated founder-led matchmaker running the process below |

**Pricing copy principle:** never lead with feature lists ("full profile & photo"). Lead with what the tier removes from the member's life — noise, endless scrolling, phone-tag with relationship managers — and only then list the mechanics. The ₹15,000 price is not the problem; an unexplained feature list is.

**Royal Concierge flow** (this is the tier the product architecture should be built around from day one, per the Sept 2026 product review — it is directly comparable to EliteMatrimony's entire offering, at a comparable or higher price):

```
Application
  ↓
15–30 min qualification call
  ↓
Matchmaker assigned
  ↓
Private preferences interview
  ↓
Family discussion
  ↓
Curated introductions
  ↓
Matchmaker feedback
  ↓
Follow-up
```

**Royal Concierge capacity plan** (solo-founder constraint): cap concurrent clients explicitly and track it on the admin dashboard; gate entry with the qualifying call above rather than instant checkout; make the automated Elite-tier engine the concierge's own tool (review top-scored candidates + personal outreach, not sourcing from scratch); time-box engagement to a fixed weekly/biweekly cadence; once capacity is full, queue new clients against a deposit or a small non-refundable priority fee rather than turning revenue away outright; a part-time associate matchmaker is the natural next hire once revenue supports it (Phase 2+, not now).

**Subscription lifecycle.** *(Sept 2026, this round — see §18.)* A `SubscriptionLifecycleStates` reference screen now documents renewal (auto/manual), cancellation with a retained-access-until-period-end model, plan change (upgrade/downgrade between Free/Elite/Concierge), and an invoice history view, alongside the existing checkout flow — closing the gap flagged in the prior round, where only a successful first purchase had been designed. Failed-payment and refund handling remain open for a future round (§18's P1 list).

---

## 12. Data Model

Extends the original `profiles` table concept:

- `profiles` — `profile_type` (bride/groom — required, non-nullable; drives default opposite-binary matching, see §7.2/§7.3), `subscription_tier` (free/elite/concierge), `subscription_expires_at`, `created_by_relation` (self/son/daughter/brother/sister/friend/relative), `photo_privacy_status`, `jathagam_data` (jsonb), `intent_stage` (exploring/actively_looking/talking/family_discussions/meeting/paused/married — see §6), `profile_status` (under_review/live/hidden). *(Per-signal verification status has moved off `profiles` and into the `verifications` table below — see §7.1.2's revision note.)*
- `verifications` — *(v6.2, Sept 2026, replacing the four `is_*_verified` booleans plus the `*_verified_via` fields this table previously carried directly on `profiles`; extended in v6.3, Sept 2026 for the `EMPLOYER_ATTESTATION` method — see §7.1.3)* one row per `(profile_id, signal_type)`, where `signal_type` is `identity` / `employment` / `professional` / `education` / `diaspora`. Columns: `state` (the eleven-value enum from §7.1.2: not_started/consent_required/in_progress/source_found/matching/verified/partially_verified/unable_to_verify/expired/revoked/manual_review), `confidence_level` (high/medium/low — nullable until `verified`/`partially_verified`), `verified_via` (signal-appropriate: aadhaar/passport for identity; `EPFO_VERIFICATION`/`WORK_EMAIL_VERIFICATION`/`EMPLOYER_ATTESTATION` for employment & professional; nad/registrar for education; authbridge/idfy/springverify/attestr/verifyall/nsdc_trust/measureone/work_number/truework/manual_review as the executing vendor across all of them; `linkedin_only` remains a valid-but-weak value for employment, never surfaced as equivalent to a vendor-backed or employer-confirmed check), `verified_at`, `expires_at` (nullable — only set for employment/professional, per the 12-month window in §7.1.2), `evidence_ref` (a pointer to the vendor's verification case ID — never the raw document or, for `EMPLOYER_ATTESTATION`, the raw HR correspondence itself, per §14), `claim_snapshot` (jsonb — the candidate's claimed employer/designation/period at the time of request, so a later discrepancy has something concrete to compare against), `consent_id` (links to the consent event — timestamp, and revocable, per §7.1.3), `request_id` (the vendor/case reference, e.g. `AG-72831`, `EMPLOYER_ATTESTATION` only), `requested_at`, `reminder_log` (jsonb array of reminder timestamps — day-2/day-5 per §7.1.3), `responded_at` (nullable until the employer or vendor returns a result), `discrepancy_fields` (jsonb, nullable — populated only when `state = partially_verified`, one entry per field that didn't match: claimed value vs. confirmed value). A profile's badge display (§7.1) is derived by reading this table, never duplicated back onto `profiles`.
- `account_links` — links a Family Collaborator (parent) to an Owner (candidate) profile, with a `role` and `expires_at` (used for the proxy-creator expiry rule in §5).
- `matches` — profile-pair, `status` (proposed/interest_sent/mutual_interest/unlocked), `shared_with_family` (boolean, candidate-controlled per match — see §5, §7), created_at.
- `messages` — sender/recipient, match_id, body, sent_at, `milestone` (getting_to_know/family_intro/video_call/planning_to_meet — see §8) — writable only once match status = unlocked.
- `reports` — reporter_id, reported_id, reason, status, resolved_by, resolved_at.
- `blocks` — blocker_id, blocked_id.
- `admin_actions` — audit log of moderation decisions.

---

## 13. Geographic Scope & Verification

Tamil-speaking diaspora is in scope from day one (not Tamil Nadu only), which breaks the assumption that Aadhaar alone can verify every member:

- **Dual verification path:** Aadhaar/DigiLocker for India-based members; passport/national-ID + liveness check (via the same KYC vendors — HyperVerge/Signzy both support this beyond Aadhaar) for diaspora members. Both write to the same `verifications` row (`signal_type = identity`, §7.1, §12). The same India-vs-diaspora split applies to Employment, Professional and Education Verified — `EPFO_VERIFICATION`, `WORK_EMAIL_VERIFICATION`, or `EMPLOYER_ATTESTATION` (via AuthBridge/IDfy/SpringVerify/Attestr/VerifyAll) plus NAD for India, work-email verification plus MeasureOne/The Work Number/Truework for diaspora — see §7.1.1 for the full vendor-backed waterfall, §7.1.2 for the shared state model, and §7.1.3 for the employer-attestation mechanism specifically.
- **Native-roots matching:** diaspora members provide both their current location and their family's native Tamil Nadu town/district. This is treated as a first-class matching signal (§8), not just profile decoration — e.g. Singapore ↔ Thanjavur, Toronto ↔ Madurai, London ↔ Coimbatore. Residency status itself is never a search filter, per earlier founder decision — it's profile context only.
- **Multi-currency payments:** an India-first gateway (Razorpay) for INR, plus Stripe or PayPal for diaspora currencies (USD/SGD/MYR/GBP/CAD).
- **Data residency/compliance:** worth a light-touch legal check on Sri Lankan/Singaporean/Malaysian data protection rules in addition to India's DPDP Act, before verification goes live for non-India members.
- **Open, not yet decided:** whether to build the India/Aadhaar path first and add the international path shortly after in the same Phase 1 window, or build both from the same starting line. Flagged for a founder decision when Phase 1 planning starts.

---

## 14. Compliance & Privacy

- **DPDP Act, 2023 (India):** Aadhaar and identity data are sensitive personal data — consent capture, purpose limitation, and a retention/deletion policy need designing in from Phase 1, not retrofitted later.
- **Aadhaar data handling:** consider storing only a verification boolean plus minimum matching fields rather than the full API response, unless there's a specific reason to retain more.
- **Employer-attestation data handling:** *(new, Sept 2026, §7.1.3)* the same data-minimization principle applies to `EMPLOYER_ATTESTATION` — Agaramiya stores the structured result (claim, confirmation per field, consent event) and never the underlying email thread or HR portal interaction itself. The question set an employer is asked (§7.1.3) is deliberately capped to what the badge needs, excluding salary, performance, manager identity, and reason for leaving.
- **Data deletion:** a deletion/export flow should exist before public launch, given the sensitivity of matrimonial data.
- **Still open, never explicitly decided:** business registration/legal entity status. This matters before a real payment gateway or KYC vendor account can be opened — worth resolving early in Phase 1 planning, not blocking right now.

---

## 15. Phase 0 Success Metrics

Waitlist signups (total, and split by self-identified track: candidate vs. family), signup-to-traffic conversion once there's real traffic, qualitative signal from early access questions/requests.

---

## 16. Naming — Resolved

**Agaramiya**, confirmed (Sept 2026) — superseding the earlier "Agaram Premium" name recorded in prior drafts of this section. The rename followed directly from the trademark research in `Agaram_Naming_Trademark_Research.md`, which flagged real conflicts around "Agaram" on its own (an "Agaram Matrimoniyal" business, Agaram as a real Chennai locality, "Agaram Vellan Chettiar" as a caste subgroup name, an "Agaram Foundation" NGO, and the "Agaram Matrimony" YouTube channel noted in earlier drafts of this section) — none of which turned up for "Agaramiya" in the same research pass. `agaramiya.com` appeared unregistered as of that research; register it and the obvious near-variants (`.in`, possibly `.co`) promptly, since "unregistered" isn't "reserved," and re-confirm current availability before purchase. The founder has since supplied real brand-mark artwork for Agaramiya — see `Agaram_Visual_Design_System_v1.md`'s "Brand mark" section.

---

## 17. Visual Design System

**Theme direction — locked, updated Sept 2026 to Agaramiya Design System v1:** the product moved from the original clean-neutral wine/grey theme to a warm-ivory palette — soft ivory/parchment background, white surface cards, and a single deep-wine accent carrying all emphasis (brand mark, primary buttons, verified badges, scores, "unlocked" moments), paired with serif display type (Newsreader for Latin headings, Noto Serif Tamil for Tamil headings) and Catamaran for body/UI. IBM Plex Mono has been removed from the flagship screens in favor of this warmer, more editorial type system; legacy screens not yet migrated still carry the older `--bg:#F5F5F7` / IBM Plex Mono tokens (see the per-screen token note below) pending a full pass.

**Color tokens (Agaramiya Design System v1):**
- `--bg: #FAF7F2` — page background (warm ivory)
- `--bg-raised: #FFFFFF` — cards, surfaces
- `--bg-sunken: #F2EFED` — recessed/inset areas
- `--text: #252225` — primary text
- `--text-soft: #716B70` — secondary/meta text
- `--accent: #8E2346` — the single accent color (deep wine/berry) — used deliberately sparingly as the one pop of color
- `--accent-strong: #64182F` — darker wine, gradient end / pressed states
- `--accent-soft: #F4E6EA` — pale wine tint for chip/pill backgrounds
- `--line: #E8E2E3` — hairline borders
- `--ok: #3F8552` / `--ok-soft: #DCEEE0` — success/verified states
- `--warn: #9A7B2F` / `--warn-soft: #F1E9D3` — the same warm gold already used for the Royal Concierge tier, reused for "partially verified"/discrepancy states so amber consistently means "needs a look," never a hard failure (red is reserved for destructive/danger actions, e.g. report/block, cancel subscription)

*(The prior "clean neutral" palette — `--bg:#F5F5F7`, `--accent:#9B2247`, IBM Plex Mono labels — remains in place on legacy screens not yet migrated to v1; do not mix the two token sets on a single screen. See the migration note below.)*

**Typography:** Newsreader (display serif, italic for taglines/pull-quotes), Noto Serif Tamil (Tamil-script display headings, v1), Catamaran (body/UI — supports Tamil + Latin). IBM Plex Mono is retained only on legacy, not-yet-migrated screens — new and flagship screens under v1 do not introduce it.

**Style language:** soft layered shadows instead of hard 1px borders; generous rounded corners (12–20px); primary actions use the accent color (flat or a soft accent→accent-strong gradient) with a warm glow shadow; verified/status badges use soft rounded pill shapes; placeholder photo tiles use a neutral grey gradient (not warm gold) so the wine accent reads as the one deliberate color moment on the page.

**Where this applies today:** the flagship screens (weekly match feed, profile reveal, interest-sent, mutual-match, family status, subscription lifecycle, and the onboarding reflow — see §18) plus the Request-B set are fully migrated to Agaramiya Design System v1 as of the Sept 2026 design pass (Version 7 of the clickable prototype). The remaining legacy screens — most of the verification sub-flows, messaging, search/browse, and settings — still carry the older clean-neutral tokens and IBM Plex Mono; migrating them in full is tracked as an open item, not yet scheduled. **The Phase 0 marketing/waitlist landing page (`agarampremium.com` artifact) predates both palettes** and has not been migrated to either — flagged as a separate open item; ask the founder before migrating it, since that's a visible change to a live public page, not assumed from this rule alone.

---

## 18. UX Workflow Audit (Sept 2026) — Findings & Response

*(New, Sept 2026 — this round. A founder-commissioned UX workflow audit reviewed the clickable prototype end-to-end across both personas (Candidate and Parent/Family Collaborator) and produced an intuitiveness assessment, a set of findings, and a prioritized P0/P1 list. This section records what the audit found, what shipped in direct response this round, and what remains open.)*

**What the audit covered.** A full walkthrough of the member lifecycle (§6) from landing through onboarding, verification, the weekly match cycle, messaging, family collaboration, and subscription — scored separately for the Candidate persona and the Parent/Family persona, since the two have materially different tolerance for friction, density, and unexplained waiting.

**Where the audit found the most friction, and this round's response:**

- **Onboarding front-loaded verification burden ahead of any visible value.** The prior flow asked for identity, employment, and education signals back-to-back before a candidate had seen anything the platform could actually do for them. *Response:* the onboarding sequence was reflowed around trust-value rather than data type — steps the candidate fully controls are separated from steps waiting on an external check-in, so the two no longer compete for attention in the same screen or moment (§6, §7's onboarding note).
- **No visible payoff between finishing setup and the first Friday batch.** A candidate who completed verification mid-week had nothing to look at until the next scheduled cycle, which reads as dead air rather than momentum. *Response:* a new first-value preview-introduction moment now shows a lightly-teased match as soon as setup completes, ahead of the Friday cadence (§8).
- **The post-interest waiting state was a bare, uninformative holding screen.** Sending interest and then seeing only a generic spinner-style "waiting" screen undersold what's actually a meaningful, private moment in the flow. *Response:* `InterestSent` was rebuilt as a richer waiting-state screen — profile-momentum framing, a plain-language explainer for why a response can take a few days, and a path to keep browsing rather than a dead end (§6).
- **Family Mode had no explicit, persistent status indicator.** A parent/Family Collaborator using the app had no single, always-visible confirmation of whose search they were helping with or what "Family Mode" currently meant for their access — status was implied rather than stated. *Response:* an explicit Family Mode status card was added, stating plainly whose search is being supported and what the collaborator can and cannot see, reinforcing the existing rule in §5 that this context should never be ambiguous.
- **Subscription lifecycle stopped at first purchase.** As flagged in the prior round (§11), the prototype only demonstrated a successful checkout — renewal, cancellation, downgrade, and billing history had no designed screens at all, leaving a member with no way to see what happens after their first six months. *Response:* a new `SubscriptionLifecycleStates` reference screen documents renewal, cancellation (with retained access until period end), plan upgrade/downgrade, and invoice history (§11).

**Overlap with the Sept 2026 Design System v1 pass.** Two of the audit's findings on visual clarity and trust presentation — the perceived coldness of the prior clean-neutral palette, and inconsistent typographic hierarchy across verification and match screens — were already substantially addressed by the Design System v1 migration (Version 7 of the prototype, §17), which shipped ahead of this round's workflow-specific fixes. The flagship screens now carry the warm-ivory palette and serif/Tamil-serif type system described in §17; the P0 items above were built directly on top of that same system rather than the legacy tokens.

**P1 — identified, deliberately deferred to a future round:**

- A dedicated **mutual-match celebration moment** — the audit noted that `MutualMatchMoment` reads as a simple state change rather than the emotionally significant beat it should be; a fuller celebratory treatment (equivalent in spirit to the interest-sent rework above) is scoped for later, not this round.
- **Further simplification of verification presentation** — the five-badge model (§7.1) is more legible than the pre-audit LinkedIn-button era, but the audit flagged that a first-time candidate can still find the badge/method/state distinctions (§7.1.2) more granular than they need before it matters to them; a lighter-weight first-pass presentation is open for a future round.
- **Further Jathagam discoverability work** — beyond the existing gated/approved-viewer split (`HoroscopeGatedView`, `HoroscopeApprovedViewer`), the audit suggested Jathagam compatibility could be surfaced earlier and more legibly in the weekly feed itself, not only after a match is opened.
- **Onboarding progress indicators** — a persistent sense of "how much is left" across the multi-step onboarding sequence (§6) was flagged as missing; the trust-value reflow shipped this round reorders the steps but does not yet add a progress affordance.
- **A "matchmaking journey" stage tracker** — a member-facing visualization of the `intent_stage` state already tracked in the data model (§6, §12) — surfacing "Actively looking → Talking to someone → Family discussions" etc. as a visible journey rather than a private settings field — was proposed as a way to make the platform's pacing legible to the member, not just useful for backend recommendation logic.

These P1 items are recorded here so they aren't re-discovered from scratch in a future audit; none are scheduled yet.

---

*Consolidated by Claude from PRD v5.0 plus a founder-commissioned product review (Sept 2026) covering product architecture, the member lifecycle state machine, verification/profile/preference separation, match explanation, family sharing, and monetization narrative. v6.1 (Sept 2026) added the vendor-backed Employment & Education verification architecture (§7.1.1). v6.2 (Sept 2026) restructured that architecture around a founder-reviewed verification diagram: Employment now leads with an explicit EPFO-first candidate choice (§7.1.1), a fifth badge — Professional Verified — was split out from Employment, and a formal eleven-state verification lifecycle with confidence scoring and expiry/re-verification was added (§7.1.2), with the data model updated to match (§12). v6.3 (Sept 2026) fully specified the `EMPLOYER_ATTESTATION` method as an automated hybrid workflow — consent, secure request delivery, a deliberately minimal employer question set, a day 0/2/5/7 reminder-and-expiry schedule with an explicit "unable to verify ≠ false" distinction, discrepancy handling as its own `PARTIALLY_VERIFIED` outcome, source-specific badge copy (§7.1), and a phased build plan (existing verification-provider API first, an Agaramiya Employer Network later) — added as new §7.1.3, with the technical method-naming table folded into §7.1.1, the `verifications` table extended in §12, and five new candidate-facing prototype screens. v6.4 (Sept 2026, this round) records the Design System v1 visual migration (§17, Version 7 of the prototype) and a founder-commissioned UX workflow audit's findings and response (new §18): five P0 prototype changes — progressive-trust onboarding reflow, a first-value preview-introduction moment ahead of the Friday cadence, a richer interest-sent waiting state, an explicit Family Mode status card, and a new subscription-lifecycle reference screen (§6, §8, §11) — shipped as Version 8 of the clickable prototype, with a recorded P1 backlog (mutual-match celebration, further verification-presentation simplification, further Jathagam discoverability, onboarding progress indicators, and a matchmaking-journey stage tracker) deferred to a future round. v6.5 (Sept 2026, this round) fixes a documentation-only inconsistency flagged by a post-launch reconciliation review of Version 8: the §6 lifecycle diagram previously sequenced Employment & Professional verification and Education verification *before* "Basic profile" and "Profile goes live," which contradicted this document's own "Mandatory vs. optional steps" text (immediately below the diagram, unchanged) stating those signals are optional and progressive. The diagram now reads Phone verification → Government ID + liveness → Basic profile → Must-have preferences → Profile goes live → Build trust, progressively (Employment & Professional verification, Education verification, Jathagam/roots, fuller preference tiers) — matching the mandatory/optional text exactly. Nothing in the prototype, the verification architecture (§7.1–§7.1.3), or the actual mandatory/optional rules changed; this was a diagram-only correction. This is now the single source of truth — future updates should edit sections in place rather than referring back to earlier version numbers.*
