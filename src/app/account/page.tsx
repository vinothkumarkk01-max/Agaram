import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { unblockMember } from "@/app/actions/blocks";
import { createFamilyInvite, revokeFamilyLink } from "@/app/actions/family";
import { toggleWeeklyDigest, toggleInstantAlerts } from "@/app/actions/account";
import { CancelSubscriptionButton } from "@/components/CancelSubscriptionButton";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { NotificationsToggle } from "@/components/NotificationsToggle";
import { EmploymentVerification } from "@/components/EmploymentVerification";
import { PhoneVerificationForm } from "@/components/PhoneVerificationForm";
import { FamilyInviteLink } from "@/components/FamilyInviteLink";
import { ProfilePhotoUpload } from "@/components/ProfilePhotoUpload";
import { ExtendedPreferencesForm } from "@/components/ExtendedPreferencesForm";
import { JathagamForm } from "@/components/JathagamForm";
import { JourneyStageTracker, type IntentStage, stageLabel } from "@/components/JourneyStageTracker";
import { AccountSection } from "@/components/AccountSection";
import { getDictionary } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";
import { getSiteOrigin } from "@/lib/site-url";
import { getProfilePhotoUrl } from "@/lib/photo";

type BlockedMember = {
  blocked_id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
  blocked_at: string;
};

type FamilyLink = {
  status: "pending" | "active" | "revoked";
  invite_code: string;
  invite_expires_at: string;
  collaborator_name: string | null;
};

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed";
  created_at: string;
};

function formatRupees(amountInPaise: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100);
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { locale, t } = await getDictionary();

  const { data: blockedData } = await supabase.rpc("get_blocked_members");
  const blocked = (blockedData ?? []) as BlockedMember[];

  // Family sharing (inviting someone to help with YOUR search) only
  // applies to candidates — a pure Family Collaborator with no
  // profile of their own has no search to share, so this whole
  // section stays hidden for them.
  const { data: ownProfile } = user
    ? await supabase
        .from("profiles")
        .select(
          "id, subscription_tier, subscription_expires_at, razorpay_subscription_id, subscription_status, created_by_relation, weekly_digest_opt_out, instant_alerts_opt_out, has_photo, intent_stage"
        )
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const ownPhoto = ownProfile
    ? await getProfilePhotoUrl(supabase, ownProfile.id, ownProfile.has_photo)
    : null;

  const { data: extendedBackground } = ownProfile
    ? await supabase
        .from("profiles")
        .select("family_type, diet, native_district, community")
        .eq("id", user!.id)
        .maybeSingle()
    : { data: null };

  // Extended preferences (Phase 25) live on the SAME preferences row
  // the must-have onboarding step creates — a candidate who hasn't
  // finished that step yet has no row here, so the section below is
  // skipped rather than trying to update zero rows.
  const { data: extendedPreferences } = ownProfile
    ? await supabase
        .from("preferences")
        .select(
          "family_type_preference, family_involvement_preference, diet_preference, drinking_preference, smoking_preference, native_district_preference, community_preference, religious_practice_preference"
        )
        .eq("profile_id", user!.id)
        .maybeSingle()
    : { data: null };

  const { data: jathagamData } = ownProfile
    ? await supabase
        .from("jathagam_details")
        .select("birth_date, birth_time, birth_place, birth_star, rasi, visibility")
        .eq("profile_id", user!.id)
        .maybeSingle()
    : { data: null };

  const { data: employmentData } = ownProfile
    ? await supabase
        .from("employment_verifications")
        .select("status, method, work_email")
        .eq("profile_id", user!.id)
        .maybeSingle()
    : { data: null };

  const { data: phoneVerificationData } = ownProfile
    ? await supabase
        .from("phone_verifications")
        .select("status, phone_number")
        .eq("profile_id", user!.id)
        .maybeSingle()
    : { data: null };

  const { data: paymentsData } = ownProfile
    ? await supabase
        .from("payments")
        .select("id, amount, currency, status, created_at")
        .eq("profile_id", user!.id)
        .order("created_at", { ascending: false })
    : { data: null };
  const payments = (paymentsData ?? []) as Payment[];

  const billingExpiresAt = ownProfile?.subscription_expires_at
    ? new Date(ownProfile.subscription_expires_at)
    : null;
  const isBillingElite =
    ownProfile?.subscription_tier === "elite" &&
    (!billingExpiresAt || billingExpiresAt > new Date());
  const hasAutoRenew = !!ownProfile?.razorpay_subscription_id;
  const subscriptionStatus = ownProfile?.subscription_status ?? null;

  const { data: familyLinkData } = ownProfile
    ? await supabase
        .from("account_links")
        .select("status, invite_code, invite_expires_at, collaborator_name")
        .eq("owner_id", user!.id)
        .in("status", ["pending", "active"])
        .maybeSingle()
    : { data: null };
  const familyLink = familyLinkData as FamilyLink | null;

  const siteOrigin = familyLink?.status === "pending" ? await getSiteOrigin() : null;
  const inviteUrl = siteOrigin
    ? `${siteOrigin}/family/join?code=${familyLink!.invite_code}`
    : null;

  // Every section below is now a collapsed-by-default <details> (see
  // AccountSection) — customer feedback (Sept 2026) was that the old
  // fully-expanded stack was too much scrolling. These short badges
  // are what let a member see most of what matters at a glance
  // WITHOUT opening anything.
  const hasBackground = Boolean(
    extendedBackground?.family_type ||
      extendedBackground?.diet ||
      extendedBackground?.native_district ||
      extendedBackground?.community
  );
  const hasJathagam = Boolean(
    jathagamData?.birth_date || jathagamData?.birth_star || jathagamData?.birth_place || jathagamData?.rasi
  );
  const employmentBadge =
    employmentData?.status === "verified"
      ? { text: t.account.badgeVerified, tone: "ok" as const }
      : employmentData?.status === "pending"
        ? { text: t.account.badgePending, tone: "warn" as const }
        : { text: t.account.badgeNotVerified, tone: "neutral" as const };
  const phoneBadge =
    phoneVerificationData?.status === "verified"
      ? { text: t.account.badgeVerified, tone: "ok" as const }
      : phoneVerificationData?.status === "pending"
        ? { text: t.account.badgePending, tone: "warn" as const }
        : { text: t.account.badgeNotVerified, tone: "neutral" as const };
  const familyBadge =
    familyLink?.status === "active"
      ? { text: t.account.badgeActive, tone: "ok" as const }
      : familyLink?.status === "pending"
        ? { text: t.account.badgePending, tone: "warn" as const }
        : { text: t.account.badgeNone, tone: "neutral" as const };

  return (
    <div
      className="min-h-screen w-full flex justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold"
            style={{ color: "var(--accent-strong)" }}
          >
            {t.common.backDashboard}
          </Link>
          <h1
            className="text-2xl mt-3"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {t.account.yourAccount}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
            {user?.email}
          </p>
        </div>

        <section
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-base font-bold mb-1.5">{t.account.downloadData}</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            {t.account.downloadDataDesc}
          </p>
          <a
            href="/api/account/export"
            className="inline-block rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
          >
            {t.account.downloadMyData}
          </a>
        </section>

        {ownProfile && (
          <AccountSection
            title={t.account.photoHeading}
            badge={ownProfile.has_photo ? t.account.badgeAdded : t.account.badgeNotAdded}
            badgeTone={ownProfile.has_photo ? "ok" : "neutral"}
          >
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.account.photoDesc}
            </p>
            <ProfilePhotoUpload
              t={t}
              hasPhoto={!!ownProfile.has_photo}
              previewUrl={ownPhoto?.url ?? null}
            />
          </AccountSection>
        )}

        {ownProfile && (
          <AccountSection
            title={t.account.journeyHeading}
            badge={stageLabel(t, (ownProfile.intent_stage as IntentStage) ?? "actively_looking")}
          >
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.account.journeyDesc}
            </p>
            <JourneyStageTracker
              t={t}
              currentStage={(ownProfile.intent_stage as IntentStage) ?? "actively_looking"}
            />
          </AccountSection>
        )}

        {ownProfile && extendedBackground && extendedPreferences && (
          <AccountSection
            title={t.account.extendedHeading}
            badge={hasBackground ? t.account.badgeAdded : t.account.badgeNotAdded}
            badgeTone={hasBackground ? "ok" : "neutral"}
          >
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.account.extendedDesc}
            </p>
            <ExtendedPreferencesForm
              t={t}
              background={extendedBackground}
              preferences={extendedPreferences}
            />
          </AccountSection>
        )}

        {ownProfile && (
          <AccountSection
            title={t.account.jathagamHeading}
            badge={hasJathagam ? t.account.badgeAdded : t.account.badgeNotAdded}
            badgeTone={hasJathagam ? "ok" : "neutral"}
          >
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.account.jathagamDesc}
            </p>
            <JathagamForm
              t={t}
              details={
                jathagamData as {
                  birth_date: string | null;
                  birth_time: string | null;
                  birth_place: string | null;
                  birth_star: string | null;
                  rasi: string | null;
                  visibility: "private" | "mutual_match";
                } | null
              }
            />
          </AccountSection>
        )}

        {ownProfile && (
          <AccountSection
            title={t.account.billingHeading}
            badge={isBillingElite ? t.account.billingBadgeElite : t.account.billingBadgeFree}
            badgeTone={isBillingElite ? "ok" : "neutral"}
          >
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            {isBillingElite ? (
              <>
                {t.account.billingPlanElitePrefix}
                {billingExpiresAt
                  ? billingExpiresAt.toLocaleDateString(intlLocale(locale))
                  : "—"}
                {t.account.billingPlanEliteSuffix}
              </>
            ) : ownProfile.subscription_tier === "elite" && billingExpiresAt ? (
              <>
                {t.account.billingPlanExpiredPrefix}
                {billingExpiresAt.toLocaleDateString(intlLocale(locale))}
                {t.account.billingPlanExpiredSuffix}
              </>
            ) : (
              t.account.billingPlanFree
            )}
          </p>
          {hasAutoRenew && (
            <p className="text-xs mb-4" style={{ color: "var(--text-soft)" }}>
              {subscriptionStatus === "halted"
                ? t.account.autoRenewHalted
                : subscriptionStatus === "cancel_requested" ||
                    subscriptionStatus === "cancelled"
                  ? t.account.autoRenewCancelRequested
                  : t.account.autoRenewOn}
            </p>
          )}

          <Link
            href="/upgrade"
            className="inline-block rounded-xl px-4 py-2.5 text-sm font-bold mb-5"
            style={{
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
          >
            {t.account.manageBilling}
          </Link>

          {hasAutoRenew &&
            (subscriptionStatus === "created" || subscriptionStatus === "active") && (
              <div className="mb-5">
                <CancelSubscriptionButton t={t} />
              </div>
            )}

          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-2.5"
            style={{ color: "var(--text-soft)" }}
          >
            {t.account.paymentHistoryHeading}
          </h3>
          {payments.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              {t.account.noPayments}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl p-3.5 flex items-center justify-between gap-3"
                  style={{ background: "var(--bg-sunken)" }}
                >
                  <div className="text-sm">
                    <div className="font-semibold">{t.account.paymentEliteSixMonths}</div>
                    <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                      {new Date(p.created_at).toLocaleDateString(intlLocale(locale))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold">
                      {formatRupees(p.amount, intlLocale(locale))}
                    </div>
                    <div
                      className="text-xs font-semibold"
                      style={{
                        color:
                          p.status === "paid"
                            ? "var(--ok)"
                            : p.status === "failed"
                              ? "var(--accent-strong)"
                              : "var(--text-soft)",
                      }}
                    >
                      {p.status === "paid"
                        ? t.account.paymentStatusPaid
                        : p.status === "failed"
                          ? t.account.paymentStatusFailed
                          : t.account.paymentStatusCreated}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </AccountSection>
        )}

        <AccountSection title={t.account.notificationsHeading}>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            {t.account.notificationsDesc}
          </p>
          <NotificationsToggle t={t} />
        </AccountSection>

        {ownProfile && (
          <AccountSection
            id="employment"
            title={t.account.employmentHeading}
            badge={employmentBadge.text}
            badgeTone={employmentBadge.tone}
          >
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.account.employmentDesc}
            </p>
            <EmploymentVerification
              t={t}
              status={(employmentData?.status as "pending" | "verified" | "unable_to_verify" | undefined) ?? null}
              method={(employmentData?.method as "work_email" | "employer_attestation" | undefined) ?? null}
              workEmail={employmentData?.work_email ?? null}
            />
          </AccountSection>
        )}

        {ownProfile && (
          <AccountSection id="phone" title={t.account.phoneHeading} badge={phoneBadge.text} badgeTone={phoneBadge.tone}>
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.account.phoneDesc}
            </p>
            <PhoneVerificationForm
              t={t}
              status={(phoneVerificationData?.status as "pending" | "verified" | "failed" | undefined) ?? null}
              phoneNumber={phoneVerificationData?.phone_number ?? null}
            />
          </AccountSection>
        )}

        {ownProfile && (
          <AccountSection
            title={t.account.digestHeading}
            badge={ownProfile.weekly_digest_opt_out ? t.account.badgeOff : t.account.badgeOn}
            badgeTone={ownProfile.weekly_digest_opt_out ? "neutral" : "ok"}
          >
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.account.digestDesc}
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                {ownProfile.weekly_digest_opt_out ? t.account.digestOff : t.account.digestOn}
              </p>
              <form action={toggleWeeklyDigest.bind(null, !!ownProfile.weekly_digest_opt_out)}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line)",
                    color: "var(--text)",
                  }}
                >
                  {ownProfile.weekly_digest_opt_out ? t.account.digestTurnOn : t.account.digestTurnOff}
                </button>
              </form>
            </div>
          </AccountSection>
        )}

        {ownProfile && (
          <AccountSection
            title={t.account.instantAlertsHeading}
            badge={ownProfile.instant_alerts_opt_out ? t.account.badgeOff : t.account.badgeOn}
            badgeTone={ownProfile.instant_alerts_opt_out ? "neutral" : "ok"}
          >
            <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
              {t.account.instantAlertsDesc}
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                {ownProfile.instant_alerts_opt_out ? t.account.digestOff : t.account.digestOn}
              </p>
              <form action={toggleInstantAlerts.bind(null, !!ownProfile.instant_alerts_opt_out)}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line)",
                    color: "var(--text)",
                  }}
                >
                  {ownProfile.instant_alerts_opt_out ? t.account.digestTurnOn : t.account.digestTurnOff}
                </button>
              </form>
            </div>
          </AccountSection>
        )}

        <AccountSection
          title={t.account.blockedMembers}
          badge={blocked.length > 0 ? String(blocked.length) : t.account.badgeNone}
        >
          {blocked.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              {t.account.noBlocked}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {blocked.map((b) => (
                <div
                  key={b.blocked_id}
                  className="rounded-xl p-3.5 flex items-center justify-between gap-3"
                  style={{ background: "var(--bg-sunken)" }}
                >
                  <div className="text-sm">
                    <span className="font-semibold">{b.initial}.</span>{" "}
                    <span style={{ color: "var(--text-soft)" }}>
                      {b.age} {t.dashboard.years}{b.location ? ` · ${b.location}` : ""}
                      {b.is_verified ? ` · ${t.dashboard.identityVerified}` : ""}
                    </span>
                  </div>
                  <form action={unblockMember.bind(null, b.blocked_id)}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: "var(--bg-raised)",
                        border: "1px solid var(--line)",
                        color: "var(--text-soft)",
                      }}
                    >
                      {t.account.unblock}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </AccountSection>

        {ownProfile && (
          <AccountSection title={t.family.sharingHeading} badge={familyBadge.text} badgeTone={familyBadge.tone}>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            {t.family.sharingDesc}
          </p>

          {!familyLink &&
            (ownProfile?.created_by_relation === "son" ||
              ownProfile?.created_by_relation === "daughter") && (
              <p
                className="text-xs mb-4 rounded-xl p-3"
                style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
              >
                {t.family.parentTrackNudge}
              </p>
            )}
          {!familyLink &&
            ownProfile?.created_by_relation &&
            !["self", "son", "daughter"].includes(ownProfile.created_by_relation) && (
              <p
                className="text-xs mb-4 rounded-xl p-3"
                style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
              >
                {t.family.proxyCreatorNudge}
              </p>
            )}

          {!familyLink && (
            <form action={createFamilyInvite}>
              <button
                type="submit"
                className="rounded-xl px-4 py-2.5 text-sm font-bold"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
              >
                {t.family.generateInviteLink}
              </button>
            </form>
          )}

          {familyLink?.status === "pending" && inviteUrl && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold" style={{ color: "var(--text-soft)" }}>
                {t.family.inviteLinkHeading}
              </div>
              <FamilyInviteLink url={inviteUrl} t={t} />
              <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                {t.family.inviteLinkExpiresPrefix}
                {new Date(familyLink.invite_expires_at).toLocaleDateString(
                  intlLocale(locale)
                )}
                {t.family.inviteLinkExpiresSuffix}
              </p>
              <form action={revokeFamilyLink}>
                <button
                  type="submit"
                  className="text-xs font-semibold self-start"
                  style={{ color: "var(--accent-strong)" }}
                >
                  {t.family.cancelInvite}
                </button>
              </form>
            </div>
          )}

          {familyLink?.status === "active" && (
            <div className="flex items-center justify-between gap-3 rounded-xl p-3.5" style={{ background: "var(--bg-sunken)" }}>
              <p className="text-sm">
                {familyLink.collaborator_name ? (
                  <>
                    <span className="font-semibold">{familyLink.collaborator_name}</span>
                    {t.family.collaboratorHelpingSuffix}
                  </>
                ) : (
                  t.family.collaboratorHelpingFallback
                )}
              </p>
              <form action={revokeFamilyLink}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: "var(--bg-raised)",
                    border: "1px solid var(--line)",
                    color: "var(--text-soft)",
                  }}
                >
                  {t.family.revokeAccess}
                </button>
              </form>
            </div>
          )}
        </AccountSection>
        )}

        <AccountSection danger title={t.account.deleteAccount}>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            {t.account.deleteAccountDesc}
          </p>
          <DeleteAccountForm email={user?.email ?? ""} t={t} />
        </AccountSection>

        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-soft)" }}>
            <Link href="/privacy" className="underline">
              {t.common.privacyPolicy}
            </Link>
          </p>
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </div>
  );
}
