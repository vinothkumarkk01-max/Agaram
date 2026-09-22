import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/AdminNav";
import { BrandMark } from "@/components/BrandMark";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  // Bounced straight to the dashboard, not a "forbidden" page — no
  // reason to confirm to a non-admin that /admin exists at all.
  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      {/* lg:max-w-4xl — widened on desktop only (customer feedback,
          Sept 2026, on unused side space); mobile/tablet keep the
          original max-w-2xl column untouched. */}
      <div className="max-w-2xl lg:max-w-4xl mx-auto px-6 sm:px-8 pt-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="text-xs font-semibold inline-flex items-center gap-1.5"
            style={{ color: "var(--text-soft)" }}
          >
            &larr; Dashboard
          </Link>
          <BrandMark size={32} alt="Agaramiya" />
        </div>

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
