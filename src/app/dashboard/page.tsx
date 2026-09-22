import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { getProfilePhotoUrl, getProfilePhotoUrls } from "@/lib/photo";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";
import { stageLabel, type IntentStage } from "@/components/JourneyStageTracker";
import { TodaysIntroCard } from "@/components/TodaysIntroCard";
import { TrustProfileSummary } from "@/components/TrustProfileSummary";
import type { MaskedCandidate } from "@/components/CandidateCard";
import { pickTodaysIntroduction } from "@/lib/dashboardIntro";
import { nextWeeklyDigestRun } from "@/lib/schedule";

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

  const introPhoto = todaysIntro
    ? (
        await getProfilePhotoUrls(supabase, [
          { id: todaysIntro.candidate.id, hasPhoto: todaysIntro.candidate.has_photo },
        ])
      ).get(todaysIntro.candidate.id)
    : null;

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
            <div className="flex items-center gap-3 mb-1">
              <ProfilePhotoAvatar url={ownPhoto?.url} initial={profile.full_name[0] ?? ""} size={64} />
              <h1
                className="text-xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {profile.full_name}
              </h1>
            </div>
            <p className="text-xs mb-5" style={{ color: "var(--text-soft)" }}>
              {profile.profile_type === "groom" ? t.dashboard.groom : t.dashboard.bride} ·{" "}
              {profile.age} {t.dashboard.years}
            </p>
            {profile.about_me && (
              <p
                className="text-sm mb-5 italic"
                style={{ color: "var(--text-soft)" }}
              >
                &ldquo;{profile.about_me}&rdquo;
              </p>
            )}
            <div
              className="rounded-xl p-4 mb-6 text-sm"
              style={{ background: "var(--bg-sunken)" }}
            >
              <div className="font-semibold mb-1">{t.dashboard.lookingFor}</div>
              <div style={{ color: "var(--text-soft)" }}>
                {preferences.age_min}–{preferences.age_max} {t.dashboard.years}
                {preferences.preferred_locations?.length
                  ? ` · ${preferences.preferred_locations.join(", ")}`
                  : ""}
                {" · "}
                {preferences.education_level === "bachelors_plus"
                  ? t.dashboard.bachelorsPlus
                  : t.dashboard.anyEducation}
              </div>
            </div>
            <div
              className="rounded-xl p-3.5 mb-4 text-sm flex items-center justify-between gap-3"
              style={{ background: "var(--bg-sunken)" }}
            >
              <span style={{ color: "var(--text-soft)" }}>
                {t.dashboard.journeyPrefix}
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {stageLabel(t, (profile.intent_stage as IntentStage) ?? "actively_looking")}
                </span>
              </span>
              <Link href="/account" className="underline font-semibold shrink-0" style={{ color: "var(--accent-strong)" }}>
                {t.dashboard.journeyUpdate}
              </Link>
            </div>
            <TrustProfileSummary
              t={t}
              identityStatus={verification?.status}
              employmentStatus={employmentVerification?.status}
              phoneStatus={phoneVerification?.status}
            />
            {verification?.status !== "verified" && (
              <div
                className="rounded-xl p-4 mb-4 text-sm flex items-center justify-between gap-3"
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
            {isVerified ? (
              <>
                {/* Activity strip — real, current counts (not a
                    "since your last visit" delta, which would need
                    new tracking this round doesn't add) linking
                    straight to the two lists they summarize.
                    Customer question (Sept 2026): "how will the
                    customer get attracted, will it be interesting to
                    him" — this and the two blocks below are the
                    direct answer: outward-facing activity ahead of
                    the member's own profile summary above. */}
                <span
                  className="text-xs uppercase tracking-wider font-semibold mb-2 block"
                  style={{ color: "var(--accent-strong)" }}
                >
                  {t.dashboard.introductionsHeading}
                </span>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Link
                    href="/matches/received"
                    className="rounded-xl p-3.5 text-center"
                    style={{ background: "var(--bg-sunken)" }}
                  >
                    <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                      {pendingReceivedCount}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                      {t.dashboard.waitingForResponse}
                    </div>
                  </Link>
                  <Link
                    href="/matches/mutual"
                    className="rounded-xl p-3.5 text-center"
                    style={{ background: "var(--bg-sunken)" }}
                  >
                    <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                      {mutualCount}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                      {t.dashboard.mutualMatchesLabel}
                    </div>
                  </Link>
                </div>

                {todaysIntro ? (
                  <TodaysIntroCard
                    candidate={todaysIntro.candidate}
                    photoUrl={introPhoto?.url}
                    reasons={todaysIntro.reasons}
                    t={t}
                  />
                ) : (
                  <p className="text-xs mb-4" style={{ color: "var(--text-soft)" }}>
                    {t.dashboard.noIntroToday}
                  </p>
                )}

                <Link
                  href="/matches"
                  className="block text-center rounded-xl py-3 font-bold text-white text-sm mb-1.5"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                  }}
                >
                  {t.dashboard.browseMatches}
                </Link>
                {nextDigestLabel && (
                  <p className="text-xs text-center mb-6" style={{ color: "var(--text-soft)" }}>
                    {t.dashboard.digestNextPrefix}
                    {nextDigestLabel}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs mb-6" style={{ color: "var(--text-soft)" }}>
                {t.dashboard.verifyToUnlock}
              </p>
            )}
            <div
              className="rounded-xl p-4 mb-4 text-sm flex items-center justify-between gap-3"
              style={
                isElite
                  ? { background: "var(--ok-soft)", color: "var(--ok)" }
                  : { background: "var(--bg-sunken)", color: "var(--text-soft)" }
              }
            >
              <span className="font-semibold">
                {isElite
                  ? `${t.dashboard.eliteUntilPrefix}${new Date(
                      subscription!.subscription_expires_at!
                    ).toLocaleDateString(intlLocale(locale))}${t.dashboard.eliteUntilSuffix}`
                  : t.dashboard.freePlan}
              </span>
              {!isElite && (
                <Link href="/upgrade" className="underline font-semibold">
                  {t.dashboard.upgradeToElite}
                </Link>
              )}
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
          card stretched wide. Founder feedback (Sept 2026), comparing
          a competitor's app: a large profile photo, the brand name, a
          notification icon and a menu should all read clearly, and
          the extra width should hold a real two-column layout rather
          than a lot of empty margin either side of a narrow card.
          Same data as the mobile block above — no new fetches, no new
          features, just a different arrangement of what's already
          there. */}
      <div
        className="hidden md:block min-h-screen w-full px-6 py-10"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
        }}
      >
        <div className="max-w-5xl mx-auto">
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
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 flex flex-col gap-5">
                {/* Hero — the large profile photo the founder's
                    feedback specifically called out (competitor
                    screenshots show it as the dominant element of the
                    home screen; the mobile view's 48px avatar was
                    sized for a narrow card, not a wide desktop hero). */}
                <div
                  className="rounded-2xl p-6 shadow-sm"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
                >
                  <div className="flex items-center gap-4">
                    <ProfilePhotoAvatar url={ownPhoto?.url} initial={profile.full_name[0] ?? ""} size={88} />
                    <div>
                      <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                        {profile.full_name}
                      </h1>
                      <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                        {profile.profile_type === "groom" ? t.dashboard.groom : t.dashboard.bride} ·{" "}
                        {profile.age} {t.dashboard.years}
                      </p>
                    </div>
                  </div>
                  {profile.about_me && (
                    <p className="text-sm mt-4 italic" style={{ color: "var(--text-soft)" }}>
                      &ldquo;{profile.about_me}&rdquo;
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg-sunken)" }}>
                    <div className="font-semibold mb-1">{t.dashboard.lookingFor}</div>
                    <div style={{ color: "var(--text-soft)" }}>
                      {preferences.age_min}–{preferences.age_max} {t.dashboard.years}
                      {preferences.preferred_locations?.length
                        ? ` · ${preferences.preferred_locations.join(", ")}`
                        : ""}
                      {" · "}
                      {preferences.education_level === "bachelors_plus"
                        ? t.dashboard.bachelorsPlus
                        : t.dashboard.anyEducation}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-4 text-sm flex items-center justify-between gap-3"
                    style={{ background: "var(--bg-sunken)" }}
                  >
                    <span style={{ color: "var(--text-soft)" }}>
                      {t.dashboard.journeyPrefix}
                      <span className="font-semibold" style={{ color: "var(--text)" }}>
                        {stageLabel(t, (profile.intent_stage as IntentStage) ?? "actively_looking")}
                      </span>
                    </span>
                    <Link href="/account" className="underline font-semibold shrink-0" style={{ color: "var(--accent-strong)" }}>
                      {t.dashboard.journeyUpdate}
                    </Link>
                  </div>
                </div>

                {isVerified ? (
                  <>
                    <span
                      className="text-xs uppercase tracking-wider font-semibold block"
                      style={{ color: "var(--accent-strong)" }}
                    >
                      {t.dashboard.introductionsHeading}
                    </span>
                    <div className="grid grid-cols-2 gap-5">
                      <Link
                        href="/matches/received"
                        className="rounded-xl p-4 text-center"
                        style={{ background: "var(--bg-sunken)" }}
                      >
                        <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                          {pendingReceivedCount}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                          {t.dashboard.waitingForResponse}
                        </div>
                      </Link>
                      <Link
                        href="/matches/mutual"
                        className="rounded-xl p-4 text-center"
                        style={{ background: "var(--bg-sunken)" }}
                      >
                        <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                          {mutualCount}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
                          {t.dashboard.mutualMatchesLabel}
                        </div>
                      </Link>
                    </div>

                    {todaysIntro ? (
                      <TodaysIntroCard
                        candidate={todaysIntro.candidate}
                        photoUrl={introPhoto?.url}
                        reasons={todaysIntro.reasons}
                        t={t}
                      />
                    ) : (
                      <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                        {t.dashboard.noIntroToday}
                      </p>
                    )}

                    <div>
                      <Link
                        href="/matches"
                        className="inline-block text-center rounded-xl px-8 py-3 font-bold text-white text-sm"
                        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-strong))" }}
                      >
                        {t.dashboard.browseMatches}
                      </Link>
                      {nextDigestLabel && (
                        <p className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>
                          {t.dashboard.digestNextPrefix}
                          {nextDigestLabel}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                    {t.dashboard.verifyToUnlock}
                  </p>
                )}
              </div>

              {/* Sidebar — trust, identity nudge, plan status, grouped
                  together the way a desktop dashboard's status rail
                  usually reads, rather than stacked one after another
                  in a single narrow column. */}
              <div className="col-span-1 flex flex-col gap-4">
                <TrustProfileSummary
                  t={t}
                  identityStatus={verification?.status}
                  employmentStatus={employmentVerification?.status}
                  phoneStatus={phoneVerification?.status}
                />
                {verification?.status !== "verified" && (
                  <div
                    className="rounded-xl p-4 text-sm flex flex-col gap-2"
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
                <div
                  className="rounded-xl p-4 text-sm flex items-center justify-between gap-3"
                  style={
                    isElite
                      ? { background: "var(--ok-soft)", color: "var(--ok)" }
                      : { background: "var(--bg-sunken)", color: "var(--text-soft)" }
                  }
                >
                  <span className="font-semibold">
                    {isElite
                      ? `${t.dashboard.eliteUntilPrefix}${new Date(
                          subscription!.subscription_expires_at!
                        ).toLocaleDateString(intlLocale(locale))}${t.dashboard.eliteUntilSuffix}`
                      : t.dashboard.freePlan}
                  </span>
                  {!isElite && (
                    <Link href="/upgrade" className="underline font-semibold">
                      {t.dashboard.upgradeToElite}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
