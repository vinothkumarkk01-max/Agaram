import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { unblockMember } from "@/app/actions/blocks";
import { createFamilyInvite, revokeFamilyLink } from "@/app/actions/family";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { FamilyInviteLink } from "@/components/FamilyInviteLink";
import { getDictionary } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locale";
import { LocaleToggle } from "@/components/LocaleToggle";
import { getSiteOrigin } from "@/lib/site-url";

type BlockedMember = {
  blocked_id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
  blocked_at: string;
};

type FamilyLink = {
  status: "pending" | "active" | "revoked";
  invite_code: string;
  invite_expires_at: string;
  collaborator_name: string | null;
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { locale, t } = await getDictionary();

  const { data: blockedData } = await supabase.rpc("get_blocked_members");
  const blocked = (blockedData ?? []) as BlockedMember[];

  // Family sharing (inviting someone to help with YOUR search) only
  // applies to candidates — a pure Family Collaborator with no
  // profile of their own has no search to share, so this whole
  // section stays hidden for them.
  const { data: ownProfile } = user
    ? await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: familyLinkData } = ownProfile
    ? await supabase
        .from("account_links")
        .select("status, invite_code, invite_expires_at, collaborator_name")
        .eq("owner_id", user!.id)
        .in("status", ["pending", "active"])
        .maybeSingle()
    : { data: null };
  const familyLink = familyLinkData as FamilyLink | null;

  const siteOrigin = familyLink?.status === "pending" ? await getSiteOrigin() : null;
  const inviteUrl = siteOrigin
    ? `${siteOrigin}/family/join?code=${familyLink!.invite_code}`
    : null;

  return (
    <div
      className="min-h-screen w-full flex justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold"
            style={{ color: "var(--accent-strong)" }}
          >
            {t.common.backDashboard}
          </Link>
          <h1
            className="text-2xl mt-3"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {t.account.yourAccount}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
            {user?.email}
          </p>
        </div>

        <section
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-base font-bold mb-1.5">{t.account.downloadData}</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            {t.account.downloadDataDesc}
          </p>
          <a
            href="/api/account/export"
            className="inline-block rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
          >
            {t.account.downloadMyData}
          </a>
        </section>

        <section
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-base font-bold mb-1.5">{t.account.blockedMembers}</h2>
          {blocked.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              {t.account.noBlocked}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {blocked.map((b) => (
                <div
                  key={b.blocked_id}
                  className="rounded-xl p-3.5 flex items-center justify-between gap-3"
                  style={{ background: "var(--bg-sunken)" }}
                >
                  <div className="text-sm">
                    <span className="font-semibold">{b.initial}.</span>{" "}
                    <span style={{ color: "var(--text-soft)" }}>
                      {b.age} {t.dashboard.years}{b.location ? ` · ${b.location}` : ""}
                      {b.is_verified ? ` · ${t.dashboard.identityVerified}` : ""}
                    </span>
                  </div>
                  <form action={unblockMember.bind(null, b.blocked_id)}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: "var(--bg-raised)",
                        border: "1px solid var(--line)",
                        color: "var(--text-soft)",
                      }}
                    >
                      {t.account.unblock}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {ownProfile && (
        <section
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-base font-bold mb-1.5">{t.family.sharingHeading}</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            {t.family.sharingDesc}
          </p>

          {!familyLink && (
            <form action={createFamilyInvite}>
              <button
                type="submit"
                className="rounded-xl px-4 py-2.5 text-sm font-bold"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                }}
              >
                {t.family.generateInviteLink}
              </button>
            </form>
          )}

          {familyLink?.status === "pending" && inviteUrl && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold" style={{ color: "var(--text-soft)" }}>
                {t.family.inviteLinkHeading}
              </div>
              <FamilyInviteLink url={inviteUrl} t={t} />
              <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                {t.family.inviteLinkExpiresPrefix}
                {new Date(familyLink.invite_expires_at).toLocaleDateString(
                  intlLocale(locale)
                )}
                {t.family.inviteLinkExpiresSuffix}
              </p>
              <form action={revokeFamilyLink}>
                <button
                  type="submit"
                  className="text-xs font-semibold self-start"
                  style={{ color: "var(--accent-strong)" }}
                >
                  {t.family.cancelInvite}
                </button>
              </form>
            </div>
          )}

          {familyLink?.status === "active" && (
            <div className="flex items-center justify-between gap-3 rounded-xl p-3.5" style={{ background: "var(--bg-sunken)" }}>
              <p className="text-sm">
                {familyLink.collaborator_name ? (
                  <>
                    <span className="font-semibold">{familyLink.collaborator_name}</span>
                    {t.family.collaboratorHelpingSuffix}
                  </>
                ) : (
                  t.family.collaboratorHelpingFallback
                )}
              </p>
              <form action={revokeFamilyLink}>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: "var(--bg-raised)",
                    border: "1px solid var(--line)",
                    color: "var(--text-soft)",
                  }}
                >
                  {t.family.revokeAccess}
                </button>
              </form>
            </div>
          )}
        </section>
        )}

        <section
          className="rounded-2xl p-6"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-base font-bold mb-1.5" style={{ color: "var(--accent-strong)" }}>
            {t.account.deleteAccount}
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            {t.account.deleteAccountDesc}
          </p>
          <DeleteAccountForm email={user?.email ?? ""} t={t} />
        </section>

        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-soft)" }}>
            <Link href="/privacy" className="underline">
              {t.common.privacyPolicy}
            </Link>
          </p>
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </div>
  );
}
