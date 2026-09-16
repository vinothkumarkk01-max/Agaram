import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpgradeButton } from "@/components/UpgradeButton";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  const isElite =
    profile?.subscription_tier === "elite" &&
    (!profile.subscription_expires_at ||
      new Date(profile.subscription_expires_at) > new Date());

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
        <Link
          href="/dashboard"
          className="text-xs font-semibold inline-flex items-center gap-1.5 mb-6"
          style={{ color: "var(--text-soft)" }}
        >
          &larr; Dashboard
        </Link>

        {isElite ? (
          <>
            <h1
              className="text-2xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              You&rsquo;re on Elite.
            </h1>
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              Active until{" "}
              {profile?.subscription_expires_at
                ? new Date(profile.subscription_expires_at).toLocaleDateString()
                : "—"}
              . Mutual matches unlock automatically, and you&rsquo;ll be able
              to message once messaging ships.
            </p>
          </>
        ) : (
          <>
            <div
              className="text-xs uppercase tracking-wider font-semibold mb-2.5"
              style={{ color: "var(--accent-strong)" }}
            >
              Elite
            </div>
            <h1
              className="text-2xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              A serious search, without the endless scrolling.
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
              ₹15,000 for 6 months.
            </p>
            <ul
              className="text-sm mb-8 flex flex-col gap-2.5"
              style={{ color: "var(--text)" }}
            >
              <li>
                ✓ Full profile — name and about-me — once you&rsquo;re a
                mutual match
              </li>
              <li>✓ In-app messaging, once it ships</li>
              <li>
                ✓ Everything in Free: browsing, verification, expressing
                interest
              </li>
            </ul>
            <UpgradeButton userEmail={user.email ?? undefined} />
            <p
              className="text-xs text-center mt-4"
              style={{ color: "var(--text-soft)" }}
            >
              6 months from purchase, one-time payment — no auto-renewal in
              this V0.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
