import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { getDictionary } from "@/lib/i18n/server";
import { getProfilePhotoUrl } from "@/lib/photo";

export default async function AdminLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, has_photo, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  // Bounced straight to the dashboard, not a "forbidden" page — no
  // reason to confirm to a non-admin that /admin exists at all.
  if (!profile?.is_admin) redirect("/dashboard");

  const ownPhoto = await getProfilePhotoUrl(supabase, user.id, profile.has_photo);
  const displayInitial = profile.full_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?";

  // Same top-bar chrome as /dashboard, /matches and /account (Sept
  // 2026 consistency pass) — this section previously drew its own
  // ad hoc header (a bare back-link plus the brand mark alone on the
  // right, no nav/notifications/avatar). An admin's own account is
  // never itself a family collaborator in practice, but this query
  // mirrors the same collaborator-direction check every other
  // authenticated shell runs, rather than hardcoding false as a
  // special case.
  const { data: collaboratorLink } = await supabase
    .from("account_links")
    .select("id")
    .eq("collaborator_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

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
        hasFamilyLink={Boolean(collaboratorLink)}
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
          &larr; Dashboard
        </Link>

        <h1 className="text-3xl mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Admin
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
          Member reports (with a read-only view of the conversation
          being reported), manual verification review, member search
          &amp; suspension, and an audit log of everything done here.
          Visible to your account because it&rsquo;s marked as admin in
          the database.
        </p>

        <AdminNav />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
