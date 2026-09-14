import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name, profile_type, age, about_me")
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
              Signed in
            </div>
          </div>
        </div>

        {!profile ? (
          <>
            <h1
              className="text-xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Let&rsquo;s set up your profile.
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
              Two short steps — your basic details, then your match
              preferences.
            </p>
            <Link
              href="/onboarding/basic-info"
              className="block text-center rounded-xl py-3 font-bold text-white text-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              Complete your profile
            </Link>
          </>
        ) : !preferences ? (
          <>
            <h1
              className="text-xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Almost done, {profile.full_name.split(" ")[0]}.
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
              One more step: tell us who you&rsquo;re looking for.
            </p>
            <Link
              href="/onboarding/preferences"
              className="block text-center rounded-xl py-3 font-bold text-white text-sm"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              Set your preferences
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
              {profile.profile_type === "groom" ? "Groom" : "Bride"} ·{" "}
              {profile.age} years
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
              <div className="font-semibold mb-1">Looking for</div>
              <div style={{ color: "var(--text-soft)" }}>
                Ages {preferences.age_min}–{preferences.age_max}
                {preferences.preferred_locations?.length
                  ? ` · ${preferences.preferred_locations.join(", ")}`
                  : ""}
                {" · "}
                {preferences.education_level === "bachelors_plus"
                  ? "Bachelor's+"
                  : "Any education"}
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
                  ? "✓ Identity verified"
                  : verification?.status === "pending"
                  ? "Identity check pending"
                  : "Identity not verified yet"}
              </span>
              {verification?.status !== "verified" && (
                <Link href="/onboarding/verification" className="underline font-semibold">
                  {verification?.status === "pending" ? "Check status" : "Verify now"}
                </Link>
              )}
            </div>
            <p className="text-xs mb-6" style={{ color: "var(--text-soft)" }}>
              The matching feed comes next — not built yet in this V0.
            </p>
            <Link
              href="/onboarding/basic-info"
              className="block text-center rounded-xl py-2.5 text-sm font-semibold mb-3"
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                color: "var(--text)",
              }}
            >
              Edit profile
            </Link>
          </>
        )}

        <form action={logout} className="mt-2">
          <button
            type="submit"
            className="w-full text-center rounded-xl py-2.5 text-sm font-semibold"
            style={{ color: "var(--text-soft)" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
