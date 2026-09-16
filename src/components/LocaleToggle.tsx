import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Two submit buttons, not a client-side toggle — flipping the language
 * is a cookie write (`setLocale`, a Server Function), so this stays a
 * plain Server Component. The button labels are the destination
 * language's own name for itself, so they're the same in either
 * language — nothing here needs translating.
 */
export function LocaleToggle({ locale }: { locale: Locale }) {
  return (
    <div
      className="inline-flex rounded-full p-0.5"
      style={{ background: "var(--bg-sunken)" }}
    >
      <form action={setLocale.bind(null, "en")}>
        <button
          type="submit"
          disabled={locale === "en"}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={
            locale === "en"
              ? { background: "var(--bg-raised)", color: "var(--text)" }
              : { color: "var(--text-soft)" }
          }
        >
          English
        </button>
      </form>
      <form action={setLocale.bind(null, "ta")}>
        <button
          type="submit"
          disabled={locale === "ta"}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={
            locale === "ta"
              ? { background: "var(--bg-raised)", color: "var(--text)" }
              : { color: "var(--text-soft)" }
          }
        >
          தமிழ்
        </button>
      </form>
    </div>
  );
}
