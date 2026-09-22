import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchesNav } from "@/components/MatchesNav";
import { getDictionary } from "@/lib/i18n/server";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { getProfilePhotoUrl } from "@/lib/photo";

export default async function MatchesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { locale, t } = await getDictionary();

  // Same top-bar chrome as /dashboard (Sept 2026) — this section used
  // to draw its own ad hoc header (a bare back-link plus a locale
  // toggle and the brand mark on the right), so the logo visibly
  // jumped from the left edge on /dashboard to the right edge here.
  // Founder feedback: "make it consistency across page." Pulling in
  // the same full_name / has_photo / is_admin fields dashboard/page.tsx
  // already fetches (plus the collaborator-direction family-link
  // check) so DashboardTopBar renders identically everywhere.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, has_photo, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding/basic-info");

  const { data: preferences } = await supabase
    .from("preferences")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!preferences) redirect("/onboarding/preferences");

  const { data: verification } = await supabase
    .from("identity_verifications")
    .select("status")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (verification?.status !== "verified") redirect("/onboarding/verification");

  const ownPhoto = await getProfilePhotoUrl(supabase, user.id, profile.has_photo);

  const { data: familyLink } = await supabase
    .from("account_links")
    .select("id")
    .eq("collaborator_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const displayInitial = profile.full_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <DashboardTopBar
        t={t}
        locale={locale}
        name={profile.full_name ?? undefined}
        initial={displayInitial}
        photoUrl={ownPhoto?.url}
        isAdmin={Boolean(profile.is_admin)}
        hasFamilyLink={Boolean(familyLink)}
      />

      {/* lg:max-w-4xl — widened on desktop only (customer feedback,
          Sept 2026, on unused side space); mobile/tablet keep the
          original max-w-2xl column untouched. */}
      <div className="max-w-2xl lg:max-w-4xl mx-auto px-6 sm:px-8 pt-8 pb-16">
        <Link
          href="/dashboard"
          className="text-xs font-semibold inline-flex items-center gap-1.5 mb-6"
          style={{ color: "var(--text-soft)" }}
        >
          {t.common.backDashboard}
        </Link>

        <h1 className="text-3xl mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {t.matches.title}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
          {t.matches.subtitle}
        </p>

        <MatchesNav t={t} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
