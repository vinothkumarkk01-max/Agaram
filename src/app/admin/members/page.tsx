import { createClient } from "@/lib/supabase/server";
import { unsuspendMember } from "@/app/actions/admin";
import { SuspendMemberForm } from "@/components/SuspendMemberForm";

type MemberRow = {
  id: string;
  full_name: string;
  profile_type: "bride" | "groom";
  age: number;
  location: string | null;
  subscription_tier: "free" | "elite";
  subscription_expires_at: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminMembersPage({
  searchParams,
}: PageProps<"/admin/members">) {
  const params = await searchParams;
  const raw = params.q;
  const query = (typeof raw === "string" ? raw : "").trim();

  const supabase = await createClient();
  let rows: MemberRow[] = [];
  let queryError: string | null = null;

  if (query) {
    const base = supabase
      .from("profiles")
      .select(
        "id, full_name, profile_type, age, location, subscription_tier, subscription_expires_at, is_admin, is_suspended, suspended_at, suspended_reason"
      )
      .order("full_name", { ascending: true })
      .limit(25);

    // An exact profile ID (from a link elsewhere in /admin, or a
    // report) always searches by id; anything else searches by name.
    const { data, error } = UUID_RE.test(query)
      ? await base.eq("id", query)
      : await base.ilike("full_name", `%${query}%`);

    if (error) queryError = error.message;
    rows = (data ?? []) as MemberRow[];
  }

  return (
    <div className="flex flex-col gap-3">
      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by full name or profile ID…"
          autoFocus
          className="flex-1 rounded-xl px-4 py-2.5 text-sm"
          style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
        />
        <button
          type="submit"
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-white"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          Search
        </button>
      </form>

      {queryError && (
        <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
          {queryError}
        </p>
      )}

      {!query && (
        <div
          className="rounded-2xl p-8 text-center text-sm"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          Search by a member&rsquo;s full name, or paste an exact profile ID
          from elsewhere in /admin.
        </div>
      )}

      {query && !queryError && rows.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center text-sm"
          style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
        >
          No members match &ldquo;{query}&rdquo;.
        </div>
      )}

      {rows.map((m) => {
        const expiresAt = m.subscription_expires_at
          ? new Date(m.subscription_expires_at)
          : null;
        const isElite =
          m.subscription_tier === "elite" && (!expiresAt || expiresAt > new Date());
        const planLabel =
          m.subscription_tier === "elite"
            ? isElite
              ? `Elite · until ${expiresAt?.toLocaleDateString()}`
              : `Elite · expired ${expiresAt?.toLocaleDateString()}`
            : "Free";

        return (
          <div
            key={m.id}
            className="rounded-2xl p-5"
            style={{
              background: m.is_suspended ? "var(--accent-soft)" : "var(--bg-sunken)",
              border: "1px solid var(--line)",
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="text-sm font-semibold">
                {m.full_name}{" "}
                <span className="font-normal" style={{ color: "var(--text-soft)" }}>
                  · {m.profile_type} · {m.age}
                  {m.location ? ` · ${m.location}` : ""}
                </span>
              </div>
              {m.is_admin && (
                <span
                  className="text-xs font-semibold uppercase tracking-wide shrink-0"
                  style={{ color: "var(--accent-strong)" }}
                >
                  Admin
                </span>
              )}
            </div>
            <div className="text-xs mb-3" style={{ color: "var(--text-soft)" }}>
              {planLabel} · <span className="font-mono">{m.id}</span>
            </div>

            {m.is_suspended ? (
              <div
                className="flex items-center justify-between gap-3 rounded-xl p-3.5"
                style={{ background: "var(--bg-raised)" }}
              >
                <div className="text-xs" style={{ color: "var(--text-soft)" }}>
                  <div className="font-semibold" style={{ color: "var(--accent-strong)" }}>
                    Suspended
                    {m.suspended_at && ` · ${new Date(m.suspended_at).toLocaleString()}`}
                  </div>
                  {m.suspended_reason && <div className="mt-0.5">{m.suspended_reason}</div>}
                </div>
                <form action={unsuspendMember.bind(null, m.id)}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: "var(--bg-sunken)",
                      border: "1px solid var(--line)",
                      color: "var(--text-soft)",
                    }}
                  >
                    Unsuspend
                  </button>
                </form>
              </div>
            ) : (
              <SuspendMemberForm profileId={m.id} />
            )}
          </div>
        );
      })}
    </div>
  );
}
