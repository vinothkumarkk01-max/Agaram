import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConciergeApplyForm } from "@/components/ConciergeApplyForm";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Royal Concierge intake (PRD §11) — deliberately just a form that
 * files a request, not a checkout. See actions/concierge.ts and the
 * Phase 21 schema comment for why there's no Razorpay flow here: this
 * tier is a founder-run manual service (a phone call, negotiated
 * pricing), so the "purchase" is a conversation, not a payment.
 */
export default async function ConciergeApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { t } = await getDictionary();

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
          href="/upgrade"
          className="text-xs font-semibold inline-flex items-center gap-1.5 mb-6"
          style={{ color: "var(--text-soft)" }}
        >
          {t.common.back}
        </Link>

        <div
          className="text-xs uppercase tracking-wider font-semibold mb-2.5"
          style={{ color: "var(--accent-strong)" }}
        >
          {t.concierge.label}
        </div>
        <h1 className="text-2xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {t.concierge.applyTitle}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
          {t.concierge.applyDesc}
        </p>

        <ConciergeApplyForm t={t} />
      </div>
    </div>
  );
}
