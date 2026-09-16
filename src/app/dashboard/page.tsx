import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { locale, t } = await getDictionary();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, profile_type, age, location, about_me, is_admin")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: preferences } = user
    ? await supabase
        .from("preferences")
        .select("age_min, age_max, preferred_locations, education_level")
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

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-sm"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            அ
          </div>
          <div>
            <div className="text-sm font-semibold">{user?.email}</div>
            <div className="text-xs" style={{ color: "var(--text-soft)" }}>
              {t.dashboard.signedIn}
            </div>
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
            <h1
              className="text-xl mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {profile.full_name}
            </h1>
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
              className="rounded-xl p-4 mb-4 text-sm flex items-center justify-between gap-3"
              style={
                verification?.status === "verified"
                  ? { background: "var(--ok-soft)", color: "var(--ok)" }
                  : { background: "var(--accent-soft)", color: "var(--accent-strong)" }
              }
            >
              <span className="font-semibold">
                {verification?.status === "verified"
                  ? t.dashboard.identityVerified
                  : verification?.status === "pending"
                  ? t.dashboard.identityPending
                  : t.dashboard.identityNotVerified}
              </span>
              {verification?.status !== "verified" && (
                <Link href="/onboarding/verification" className="underline font-semibold">
                  {verification?.status === "pending" ? t.dashboard.checkStatus : t.dashboard.verifyNow}
                </Link>
              )}
            </div>
            {verification?.status === "verified" ? (
              <Link
                href="/matches"
                className="block text-center rounded-xl py-3 font-bold text-white text-sm mb-3"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                }}
              >
                {t.dashboard.browseMatches}
              </Link>
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
  );
}
