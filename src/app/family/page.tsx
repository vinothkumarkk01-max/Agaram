import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locale";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { logout } from "@/app/actions/auth";
import { getProfilePhotoUrl } from "@/lib/photo";
import { milestoneLabel, type MessageMilestone } from "@/lib/milestones";

type FamilyLink = {
  link_id: string;
  owner_id: string;
  owner_full_name: string;
  owner_profile_type: "groom" | "bride";
  owner_age: number;
  owner_location: string | null;
  owner_about_me: string | null;
  linked_since: string;
};

type SharedMatch = {
  match_id: string;
  status: string;
  matched_at: string;
  current_milestone: MessageMilestone | null;
};

export default async function FamilyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // middleware already redirects signed-out users
  const { locale, t } = await getDictionary();

  const { data: linksData } = await supabase.rpc(
    "get_family_links_for_collaborator"
  );
  const links = (linksData ?? []) as FamilyLink[];

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("id, full_name, has_photo, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const ownPhoto = ownProfile
    ? await getProfilePhotoUrl(supabase, user.id, ownProfile.has_photo)
    : null;
  const displayInitial = ownProfile?.full_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?";

  const sharedByOwner = new Map<string, SharedMatch[]>();
  await Promise.all(
    links.map(async (link) => {
      const { data } = await supabase.rpc("get_family_shared_matches", {
        p_owner_id: link.owner_id,
      });
      sharedByOwner.set(link.owner_id, (data ?? []) as SharedMatch[]);
    })
  );

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      {/* Same top-bar chrome as /dashboard, /matches, /account and
          /admin (Sept 2026 consistency pass) — this page previously
          drew its own ad hoc header (brand mark + wordmark on the
          left here, oddly, unlike the others' right-aligned mark —
          "logo one place in right and another place in left"). A pure
          Family Collaborator often has no profiles row at all
          (ownProfile can be null here, unlike every other
          authenticated page), so name/photo/admin all gracefully fall
          back the same way DashboardTopBar already handles a member
          with no photo or display name. */}
      <DashboardTopBar
        t={t}
        locale={locale}
        name={ownProfile?.full_name ?? undefined}
        initial={displayInitial}
        photoUrl={ownPhoto?.url}
        isAdmin={Boolean(ownProfile?.is_admin)}
        hasFamilyLink={links.length > 0}
      />

      <div className="w-full flex justify-center px-4 py-12">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <h1
          className="text-2xl"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
        >
          {t.family.title}
        </h1>

        {links.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center text-sm"
            style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
          >
            {t.family.noLinks}
          </div>
        ) : (
          links.map((link) => {
            const shared = sharedByOwner.get(link.owner_id) ?? [];
            return (
              <section
                key={link.link_id}
                className="rounded-2xl p-6"
                style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
              >
                <p className="text-sm mb-4">
                  {t.family.helpingWithPrefix}
                  <span className="font-semibold">{link.owner_full_name}</span>
                  {t.family.helpingWithSuffix}
                </p>

                <div
                  className="rounded-xl p-4 mb-4 text-sm"
                  style={{ background: "var(--bg-sunken)" }}
                >
                  <div className="font-semibold mb-1">{link.owner_full_name}</div>
                  <div style={{ color: "var(--text-soft)" }}>
                    {link.owner_profile_type === "groom"
                      ? t.dashboard.groom
                      : t.dashboard.bride}{" "}
                    · {link.owner_age} {t.dashboard.years}
                    {link.owner_location ? ` · ${link.owner_location}` : ""}
                  </div>
                  {link.owner_about_me && (
                    <p className="italic mt-2" style={{ color: "var(--text)" }}>
                      &ldquo;{link.owner_about_me}&rdquo;
                    </p>
                  )}
                  <div className="text-xs mt-2" style={{ color: "var(--text-soft)" }}>
                    {t.family.linkedSincePrefix}
                    {new Date(link.linked_since).toLocaleDateString(intlLocale(locale))}
                    {t.family.linkedSinceSuffix}
                  </div>
                </div>

                <div className="text-xs mb-4" style={{ color: "var(--text-soft)" }}>
                  <p className="mb-1">{t.family.whatYouCanSee}</p>
                  <p>{t.family.whatYouCannotSee}</p>
                </div>

                <h2 className="text-sm font-bold mb-2">{t.family.sharedMatchesHeading}</h2>
                {shared.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-soft)" }}>
                    {t.family.noSharedMatches}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {shared.map((s) => (
                      <div
                        key={s.match_id}
                        className="rounded-xl p-3 text-sm"
                        style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
                      >
                        <span className="font-semibold">{t.family.matchShared}</span>{" "}
                        · {new Date(s.matched_at).toLocaleDateString(intlLocale(locale))}
                        {s.current_milestone && (
                          <div className="text-xs mt-1 font-semibold">
                            {t.matches.milestoneCurrentPrefix}
                            {milestoneLabel(t, s.current_milestone)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}

        <div className="flex items-center justify-between">
          {ownProfile ? (
            <Link
              href="/dashboard"
              className="text-xs font-semibold"
              style={{ color: "var(--accent-strong)" }}
            >
              {t.common.backDashboard}
            </Link>
          ) : (
            <form action={logout}>
              <button
                type="submit"
                className="text-xs font-semibold"
                style={{ color: "var(--text-soft)" }}
              >
                {t.dashboard.signOut}
              </button>
            </form>
          )}
          <div className="flex items-center gap-3">
            <Link href="/account" className="text-xs underline" style={{ color: "var(--text-soft)" }}>
              {t.account.yourAccount}
            </Link>
            <Link href="/privacy" className="text-xs underline" style={{ color: "var(--text-soft)" }}>
              {t.common.privacyPolicy}
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
