import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchesNav } from "@/components/MatchesNav";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
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

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="max-w-2xl mx-auto px-6 sm:px-8 pt-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="text-xs font-semibold inline-flex items-center gap-1.5"
            style={{ color: "var(--text-soft)" }}
          >
            &larr; Dashboard
          </Link>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            அ
          </div>
        </div>

        <h1 className="text-3xl mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Matches
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
          Simple, rules-based introductions for this V0 — matched on age
          range and location. Names stay masked until you both say yes.
        </p>

        <MatchesNav />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
