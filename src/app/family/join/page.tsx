import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locale";
import { BrandMark } from "@/components/BrandMark";
import { LocaleToggle } from "@/components/LocaleToggle";
import { acceptFamilyInvite } from "@/app/actions/family";

type InvitePreview = {
  owner_first_name: string;
  is_valid: boolean;
  is_self: boolean;
};

function Shell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-8">
          <BrandMark size={56} alt="Agaramiya" />
        </div>
        <div
          className="rounded-2xl p-8 shadow-sm text-center"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          {children}
        </div>
        <div className="flex justify-center mt-6">
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </div>
  );
}

export default async function FamilyJoinPage({
  searchParams,
}: PageProps<"/family/join">) {
  const { code: rawCode } = await searchParams;
  const code = typeof rawCode === "string" ? rawCode : "";
  const { locale, t } = await getDictionary();

  if (!code) {
    return (
      <Shell locale={locale}>
        <h1 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {t.family.invalidInviteTitle}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          {t.family.invalidInviteDesc}
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/family/join?code=${code}`;
    return (
      <Shell locale={locale}>
        <h1 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {t.family.invitedTitle}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-soft)" }}>
          {t.family.invitedDesc}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="rounded-xl py-3 font-bold text-white text-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            {t.family.signUpToAccept}
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="rounded-xl py-3 font-semibold text-sm"
            style={{
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
          >
            {t.family.logInToAccept}
          </Link>
        </div>
      </Shell>
    );
  }

  const { data: previewData } = await supabase.rpc("get_family_invite_preview", {
    p_code: code,
  });
  const preview = (previewData?.[0] ?? null) as InvitePreview | null;

  if (!preview || !preview.is_valid) {
    return (
      <Shell locale={locale}>
        <h1 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {t.family.invalidInviteTitle}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          {t.family.invalidInviteDesc}
        </p>
      </Shell>
    );
  }

  // The invite is genuinely valid — it's just the owner's own link,
  // opened while signed in as themselves (e.g. while testing it).
  // Distinct from the generic "invalid" message above, since nothing
  // is actually wrong with the invite.
  if (preview.is_self) {
    return (
      <Shell locale={locale}>
        <h1 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {t.family.ownInviteTitle}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          {t.family.ownInviteDesc}
        </p>
      </Shell>
    );
  }

  return (
    <Shell locale={locale}>
      <h1 className="text-xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
        <span className="font-bold">{preview.owner_first_name}</span>
        {t.family.confirmTitleSuffix}
      </h1>

      <form
        action={acceptFamilyInvite.bind(null, code)}
        className="flex flex-col gap-4 text-left"
      >
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold mb-1.5"
            style={{ color: "var(--text-soft)" }}
          >
            {t.family.yourNameLabel}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
            style={{
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
            placeholder={t.family.yourNamePlaceholder}
          />
          <p className="text-xs mt-1.5" style={{ color: "var(--text-soft)" }}>
            {t.family.yourNameHelp}
          </p>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl py-3 font-bold text-white text-sm"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          {t.family.acceptInvite}
        </button>
      </form>
    </Shell>
  );
}
