import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="text-center max-w-sm">
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
          className="text-2xl mb-2"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          Page not found.
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-soft)" }}>
          That page doesn&rsquo;t exist, or has moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
