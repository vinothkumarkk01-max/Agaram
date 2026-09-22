import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { BrandMark } from "@/components/BrandMark";

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 w-fit">
          <BrandMark size={56} alt={t.common.brand} />
        </div>
        <h1
          className="text-2xl mb-2"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          {t.errors.pageNotFound}
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-soft)" }}>
          {t.errors.pageNotFoundDesc}
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          {t.common.backToDashboard}
        </Link>
      </div>
    </div>
  );
}
