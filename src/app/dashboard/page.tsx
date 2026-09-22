import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { getProfilePhotoUrl, getProfilePhotoUrls } from "@/lib/photo";
import { stageLabel, type IntentStage } from "@/components/JourneyStageTracker";
import { TrustProfileSummary } from "@/components/TrustProfileSummary";
import type { MaskedCandidate } from "@/components/CandidateCard";
import { pickTodaysIntroduction } from "@/lib/dashboardIntro";
import { buildMatchReasons } from "@/lib/matchReasons";
import { nextWeeklyDigestRun } from "@/lib/schedule";
import { greetingKeyFor } from "@/lib/greeting";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { FeaturedIntroduction } from "@/components/dashboard/FeaturedIntroduction";
import { IntroductionEmptyState } from "@/components/dashboard/IntroductionEmptyState";
import { SecondaryIntroductions, type SecondaryCandidate } from "@/components/dashboard/SecondaryIntroductions";
import { ProfileProgress } from "@/components/dashboard/ProfileProgress";
import { WeeklyActivity } from "@/components/dashboard/WeeklyActivity";
import { MembershipPanel } from "@/components/dashboard/MembershipPanel";
import { FamilyPanel } from "@/components/dashboard/FamilyPanel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { locale, t } = await getDictionary();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, profile_type, age, location, about_me, is_admin, has_photo, intent_stage")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const ownPhoto =
    user && profile ? await getProfilePhotoUrl(supabase, user.id, profile.has_photo) : null;

  // A pure Family Collaborator (no candidate profile of their own)
  // never goes through onboarding -- send them straight to their own
  // read-only dashboard instead of showing the "let's set up your
  // profile" nudge below, which doesn't apply to them at all.
  const { data: familyLink } = user
    ? await supabase
        .from("account_links")
        .select("id")
        .eq("collaborator_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (user && !profile && familyLink) {
    redirect("/family");
  }

  const { data: preferences } = user
    ? await supabase
        .from("preferences")
        .select(
          "age_min, age_max, preferred_locations, education_level, family_type_preference, diet_preference, native_district_preference, community_preference"
        )
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: verification } = user
    ? await supabase
        .from("identity_verifications")
        .select("status")
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  // Trust profile summary (Sept 2026) — the dashboard previously only
  // ever surfaced Identity. Employment and Phone verification have
  // existed on /account since earlier rounds, but a member's own
  // dashboard never reflected them — flagged independently by both
  // the competitor-analysis doc and an external product review. See
  // TrustProfileSummary for the full reasoning.
  const { data: employmentVerification } = user
    ? await supabase
        .from("employment_verifications")
        .select("status")
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: phoneVerification } = user
    ? await supabase
        .from("phone_verifications")
        .select("status")
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: subscription } = user
    ? await supabase
        .from("profiles")
        .select("subscription_tier, subscription_expires_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  // "Complete your story" (Sept 2026 redesign) — the same real,
  // already-computed-elsewhere signals /account uses for its own
  // hasBackground / hasJathagam badges, fetched here too so the
  // dashboard's completeness panel is never a guess. See
  // ProfileProgress / computeStoryCompleteness for how these combine.
  const { data: extendedBackground } = user
    ? await supabase
        .from("profiles")
        .select("family_type, diet, native_district, community")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: jathagamData } = user
    ? await supabase
        .from("jathagam_details")
        .select("birth_date, birth_star, birth_place, rasi")
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  const hasBackground = Boolean(
    extendedBackground?.family_type ||
      extendedBackground?.diet ||
      extendedBackground?.native_district ||
      extendedBackground?.community
  );
  const hasJathagam = Boolean(
    jathagamData?.birth_date || jathagamData?.birth_star || jathagamData?.birth_place || jathagamData?.rasi
  );

  // "Your family" (Sept 2026 redesign) — the OWNER's side of family
  // sharing (do I have a collaborator helping ME), the mirror image of
  // the familyLink query above (am I helping someone else). Same
  // account_links table, same query account/page.tsx already runs.
  const { data: ownFamilyLink } = user
    ? await supabase
        .from("account_links")
        .select("status, collaborator_name")
        .eq("owner_id", user.id)
        .in("status", ["pending", "active"])
        .maybeSingle()
    : { data: null };

  const isElite =
    subscription?.subscription_tier === "elite" &&
    (!subscription.subscription_expires_at ||
      new Date(subscription.subscription_expires_at) > new Date());

  // Activity strip + "Today's introduction" (Sept 2026) — real counts
  // and a real candidate, not fabricated urgency. Only meaningful once
  // a member can actually act on them, same gate as the Browse Matches
  // link below.
  const isVerified = verification?.status === "verified";
  const [{ data: receivedInterests }, { data: mutualMatches }, { data: introCandidates }] =
    isVerified
      ? await Promise.all([
          supabase.rpc("get_received_interests"),
          supabase.rpc("get_mutual_matches"),
          supabase.rpc("get_match_candidates"),
        ])
      : [{ data: null }, { data: null }, { data: null }];

  const pendingReceivedCount = receivedInterests?.length ?? 0;
  const mutualCount = mutualMatches?.length ?? 0;

  const todaysIntro =
    isVerified && preferences && introCandidates?.length
      ? pickTodaysIntroduction(t, introCandidates as MaskedCandidate[], preferences)
      : null;

  // "More people to consider" (Sept 2026 redesign) — up to 2 more
  // candidates from the SAME already-fetched, already-hard-filtered
  // get_match_candidates() list, never a second query. Reasons/
  // compatibility use the exact same honest builders as the featured
  // card and Browse itself.
  const secondaryCandidatesRaw =
    isVerified && preferences && introCandidates?.length && todaysIntro
      ? (introCandidates as MaskedCandidate[])
          .filter((c) => c.id !== todaysIntro.candidate.id)
          .slice(0, 2)
      : [];

  const allPhotoTargets = [
    ...(todaysIntro ? [{ id: todaysIntro.candidate.id, hasPhoto: todaysIntro.candidate.has_photo }] : []),
    ...secondaryCandidatesRaw.map((c) => ({ id: c.id, hasPhoto: c.has_photo })),
  ];
  const introPhotos = allPhotoTargets.length
    ? await getProfilePhotoUrls(supabase, allPhotoTargets)
    : new Map<string, { url: string; isOriginal: boolean }>();

  const introPhoto = todaysIntro ? introPhotos.get(todaysIntro.candidate.id) : null;

  const secondaryCandidates: SecondaryCandidate[] = preferences
    ? secondaryCandidatesRaw.map((candidate) => {
        const reasons = buildMatchReasons(t, candidate, preferences);
        return {
          candidate,
          photoUrl: introPhotos.get(candidate.id)?.url,
          photoIsOriginal: introPhotos.get(candidate.id)?.isOriginal,
          topReason: reasons[0],
        };
      })
    : [];

  const nextDigestLabel = isVerified
    ? nextWeeklyDigestRun().toLocaleString(intlLocale(locale), {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : null;

  const displayName = profile?.full_name;
  const displayInitial = profile?.full_name?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "?";
  const firstName = profile?.full_name?.split(" ")[0] ?? t.dashboard.greetingFallback;
  const greetingKey = greetingKeyFor();

  return (
    <>
      {/* Top-bar chrome — shown on mobile and desktop alike (see
          DashboardTopBar's own comment for why it started
          desktop-only and why it now covers both). Shown in every
          dashboard state (including the two onboarding-prompt states
          further down), since brand/sign-out should be reachable
          everywhere, not just once a profile is complete. */}
      <DashboardTopBar
        t={t}
        locale={locale}
        name={displayName}
        initial={displayInitial}
        photoUrl={ownPhoto?.url}
        isAdmin={Boolean(profile?.is_admin)}
        hasFamilyLink={Boolean(familyLink)}
      />

      {/* Mobile (and the desktop breakpoint's fallback until md:).
          Founder feedback (Sept 2026, referencing the same
          competitor's actual mobile app): the profile photo here read
          small next to the top bar's new avatar — bumped from 48px to
          64px below. Everything else in this block is unchanged from
          before the desktop redesign. */}
      <div
        className="md:hidden min-h-screen w-full flex items-center justify-center px-4 py-10"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
        }}
      >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-sm"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
      >
        {/* Just the email/"Signed in" line — no icon here. The generic
            brand-mark circle that used to sit next to this (an "அ"
            in a wine gradient) wasn't tied to the member's own
            profile at all, and sitting directly above the REAL
            profile-photo avatar below (same size, same shape, same
            gradient-when-no-photo look) it just read as a duplicate
            avatar — customer feedback, Sept 2026. */}
        <div className="mb-6">
          <div className="text-sm font-semibold">{user?.email}</div>
          <div className="text-xs" style={{ color: "var(--text-soft)" }}>
            {t.dashboard.signedIn}
          </div>
        </div>

        {!profile ? (
          <>
            <h1
              className="text-xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t.dashboard.setupTitle}
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
              {t.dashboard.setupSubtitle}
            </p>
            <Link
              href="/onboarding/basic-info"
              className="block text-center rounded-xl py-3 font-bold text-white text-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              {t.dashboard.completeProfile}
            </Link>
          </>
        ) : !preferences ? (
          <>
            <h1
              className="text-xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t.dashboard.almostDonePrefix}
              {profile.full_name.split(" ")[0]}
              {t.dashboard.almostDoneSuffix}
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
              {t.dashboard.almostDoneSubtitle}
            </p>
            <Link
              href="/onboarding/preferences"
              className="block text-center rounded-xl py-3 font-bold text-white text-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              {t.dashboard.setPreferences}
            </Link>
          </>
        ) : (
          <>
            <WelcomeHeader t={t} greetingKey={greetingKey} firstName={firstName} ready={isVerified} />

            <div className="mt-6 mb-5">
              <TrustProfileSummary
                t={t}
                identityStatus={verification?.status}
                employmentStatus={employmentVerification?.status}
                phoneStatus={phoneVerification?.status}
              />
            </div>

            {verification?.status !== "verified" && (
              <div
                className="rounded-xl p-4 mb-5 text-sm flex items-center justify-between gap-3"
                style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
              >
                <span className="font-semibold">
                  {verification?.status === "pending"
                    ? t.dashboard.identityPending
                    : t.dashboard.identityNotVerified}
                </span>
                <Link href="/onboarding/verification" className="underline font-semibold">
                  {verification?.status === "pending" ? t.dashboard.checkStatus : t.dashboard.verifyNow}
                </Link>
              </div>
            )}

            {isVerified && (
              <div className="mb-5">
                {todaysIntro ? (
                  <FeaturedIntroduction
                    candidate={todaysIntro.candidate}
                    photoUrl={introPhoto?.url}
                    photoIsOriginal={introPhoto?.isOriginal}
                    compatibility={todaysIntro.compatibility}
                    t={t}
                  />
                ) : (
                  <IntroductionEmptyState t={t} />
                )}
              </div>
            )}

            {secondaryCandidates.length > 0 && (
              <div className="mb-5">
                <SecondaryIntroductions items={secondaryCandidates} t={t} />
              </div>
            )}

            <div className="flex flex-col gap-3 mb-5">
              <ProfileProgress
                t={t}
                hasPhoto={Boolean(profile.has_photo)}
                hasAboutMe={Boolean(profile.about_me)}
                employmentVerified={employmentVerification?.status === "verified"}
                hasBackground={hasBackground}
                hasJathagam={hasJathagam}
              />
              {isVerified && (
                <WeeklyActivity
                  t={t}
                  pendingReceivedCount={pendingReceivedCount}
                  mutualCount={mutualCount}
                  nextDigestLabel={nextDigestLabel}
                />
              )}
              <MembershipPanel
                t={t}
                locale={locale}
                isElite={isElite}
                expiresAt={subscription?.subscription_expires_at ?? null}
              />
              <FamilyPanel
                t={t}
                status={(ownFamilyLink?.status as "pending" | "active" | undefined) ?? "none"}
                collaboratorName={ownFamilyLink?.collaborator_name ?? null}
              />
            </div>

            <div
              className="rounded-xl p-3.5 mb-5 text-sm flex items-center justify-between gap-3"
              style={{ background: "var(--bg-sunken)" }}
            >
              <span style={{ color: "var(--text-soft)" }}>
                {t.dashboard.statusLabel}:{" "}
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {stageLabel(t, (profile.intent_stage as IntentStage) ?? "actively_looking")}
                </span>
              </span>
              <Link href="/account" className="underline font-semibold shrink-0" style={{ color: "var(--accent-strong)" }}>
                {t.dashboard.statusChange}
              </Link>
            </div>

            <Link
              href="/onboarding/basic-info"
              className="block text-center rounded-xl py-2.5 text-sm font-semibold mb-3"
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                color: "var(--text)",
              }}
            >
              {t.dashboard.editProfile}
            </Link>
            <Link
              href="/account"
              className="block text-center rounded-xl py-2.5 text-sm font-semibold mb-3"
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                color: "var(--text)",
              }}
            >
              {t.dashboard.accountPrivacy}
            </Link>
            {familyLink && (
              <Link
                href="/family"
                className="block text-center rounded-xl py-2.5 text-sm font-semibold mb-3"
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
              >
                {t.family.title}
              </Link>
            )}
            {profile.is_admin && (
              <Link
                href="/admin"
                className="block text-center rounded-xl py-2.5 text-sm font-semibold mb-3"
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
              >
                {t.dashboard.adminDashboard}
              </Link>
            )}
          </>
        )}

        <form action={logout} className="mt-2">
          <button
            type="submit"
            className="w-full text-center rounded-xl py-2.5 text-sm font-semibold"
            style={{ color: "var(--text-soft)" }}
          >
            {t.dashboard.signOut}
          </button>
        </form>
        <div className="flex items-center justify-between mt-5">
          <p className="text-xs" style={{ color: "var(--text-soft)" }}>
            <Link href="/privacy" className="underline">
              {t.common.privacyPolicy}
            </Link>
          </p>
          <LocaleToggle locale={locale} />
        </div>
      </div>
      </div>

      {/* Desktop (md: and up) — a purpose-built layout, not the mobile
          card stretched wide. Sept 2026 redesign: the featured
          introduction is the visual hero (≈70% column); the right
          rail (≈30%) is compact status — trust, story completeness,
          this week, membership, family — never a wall of cards. Same
          data as the mobile block above — no new fetches, no new
          features, just a different arrangement of what's already
          there. */}
      <div
        className="hidden md:block min-h-screen w-full px-6 py-10"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          {!profile ? (
            <div
              className="max-w-md mx-auto rounded-2xl p-8 shadow-sm"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
            >
              <h1 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                {t.dashboard.setupTitle}
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
                {t.dashboard.setupSubtitle}
              </p>
              <Link
                href="/onboarding/basic-info"
                className="block text-center rounded-xl py-3 font-bold text-white text-sm"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
              >
                {t.dashboard.completeProfile}
              </Link>
            </div>
          ) : !preferences ? (
            <div
              className="max-w-md mx-auto rounded-2xl p-8 shadow-sm"
              style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
            >
              <h1 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                {t.dashboard.almostDonePrefix}
                {profile.full_name.split(" ")[0]}
                {t.dashboard.almostDoneSuffix}
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
                {t.dashboard.almostDoneSubtitle}
              </p>
              <Link
                href="/onboarding/preferences"
                className="block text-center rounded-xl py-3 font-bold text-white text-sm"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
              >
                {t.dashboard.setPreferences}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <WelcomeHeader t={t} greetingKey={greetingKey} firstName={firstName} ready={isVerified} />
              </div>

              <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 flex flex-col gap-6">
                  {verification?.status !== "verified" && (
                    <div
                      className="rounded-xl p-4 text-sm flex items-center justify-between gap-3"
                      style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                    >
                      <span className="font-semibold">
                        {verification?.status === "pending"
                          ? t.dashboard.identityPending
                          : t.dashboard.identityNotVerified}
                      </span>
                      <Link href="/onboarding/verification" className="underline font-semibold">
                        {verification?.status === "pending" ? t.dashboard.checkStatus : t.dashboard.verifyNow}
                      </Link>
                    </div>
                  )}

                  {isVerified &&
                    (todaysIntro ? (
                      <FeaturedIntroduction
                        candidate={todaysIntro.candidate}
                        photoUrl={introPhoto?.url}
                        photoIsOriginal={introPhoto?.isOriginal}
                        compatibility={todaysIntro.compatibility}
                        t={t}
                      />
                    ) : (
                      <IntroductionEmptyState t={t} />
                    ))}

                  {secondaryCandidates.length > 0 && (
                    <SecondaryIntroductions items={secondaryCandidates} t={t} />
                  )}

                  <div
                    className="rounded-xl p-4 text-sm flex items-center justify-between gap-3"
                    style={{ background: "var(--bg-sunken)" }}
                  >
                    <span style={{ color: "var(--text-soft)" }}>
                      {t.dashboard.statusLabel}:{" "}
                      <span className="font-semibold" style={{ color: "var(--text)" }}>
                        {stageLabel(t, (profile.intent_stage as IntentStage) ?? "actively_looking")}
                      </span>
                    </span>
                    <Link href="/account" className="underline font-semibold shrink-0" style={{ color: "var(--accent-strong)" }}>
                      {t.dashboard.statusChange}
                    </Link>
                  </div>
                </div>

                {/* Right rail — trust, story completeness, this
                    week's activity, membership, family. Compact and
                    consistent (same var(--bg-sunken) treatment, same
                    padding) rather than five differently-styled
                    widgets. */}
                <div className="col-span-1 flex flex-col gap-4">
                  <TrustProfileSummary
                    t={t}
                    identityStatus={verification?.status}
                    employmentStatus={employmentVerification?.status}
                    phoneStatus={phoneVerification?.status}
                  />
                  <ProfileProgress
                    t={t}
                    hasPhoto={Boolean(profile.has_photo)}
                    hasAboutMe={Boolean(profile.about_me)}
                    employmentVerified={employmentVerification?.status === "verified"}
                    hasBackground={hasBackground}
                    hasJathagam={hasJathagam}
                  />
                  {isVerified && (
                    <WeeklyActivity
                      t={t}
                      pendingReceivedCount={pendingReceivedCount}
                      mutualCount={mutualCount}
                      nextDigestLabel={nextDigestLabel}
                    />
                  )}
                  <MembershipPanel
                    t={t}
                    locale={locale}
                    isElite={isElite}
                    expiresAt={subscription?.subscription_expires_at ?? null}
                  />
                  <FamilyPanel
                    t={t}
                    status={(ownFamilyLink?.status as "pending" | "active" | undefined) ?? "none"}
                    collaboratorName={ownFamilyLink?.collaborator_name ?? null}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
