import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-14 h-14 rounded-full mx-auto mb-6 flex items-center justify-center text-white font-bold text-2xl shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          அ
        </div>
        <h1
          className="text-3xl mb-3"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          Agaram Premium
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-soft)" }}>
          Project scaffold — auth pipes are live. Sign up to try it end to
          end.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/signup"
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-xl px-5 py-2.5 text-sm font-bold"
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
          >
            Sign in
          </Link>
        </div>
        <p className="text-xs mt-8" style={{ color: "var(--text-soft)" }}>
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
