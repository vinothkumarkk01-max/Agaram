import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-sm text-center"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
      >
        <div
          className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          அ
        </div>
        <h1
          className="text-2xl mb-2"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          You&rsquo;re signed in
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
          {user?.email}
        </p>
        <p className="text-xs mb-6" style={{ color: "var(--text-soft)" }}>
          This confirms the auth pipes work end-to-end — signup, session,
          and this protected route. Profile onboarding, the matching feed,
          and everything else in the build plan gets layered in from here.
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
