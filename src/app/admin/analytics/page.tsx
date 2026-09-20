import { createClient } from "@/lib/supabase/server";

const SIGNUP_CHART_DAYS = 14;

/**
 * Read-only founder analytics — signups over time, the identity
 * verification funnel, the match funnel (sent/mutual/declined), the
 * active Elite subscriber count, and total collected revenue. Every
 * query below runs through the signed-in admin's own RLS-scoped
 * session (this page sits under the /admin layout, which already
 * redirects anyone whose profiles.is_admin isn't true) — the same
 * "Admins can view all X" policies every other /admin page already
 * relies on (supabase/schema.sql, Phase 7 for profiles/verifications,
 * Phase 28 for the two this page newly needed: matches and payments).
 * No service-role client, and nothing here writes anything.
 *
 * Deliberately no charting library — this is a handful of counts for
 * one founder to glance at, not a BI product; a plain object with
 * numbers in it plus one dependency-free CSS bar strip for the
 * signup trend is the honest amount of engineering for that.
 */
export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const chartStart = new Date(
    now.getTime() - (SIGNUP_CHART_DAYS - 1) * 24 * 60 * 60 * 1000
  );
  chartStart.setUTCHours(0, 0, 0, 0);

  const [
    { count: totalMembers },
    { count: signups7d },
    { count: signups30d },
    { data: recentSignupRows },
    { count: verificationsPending },
    { count: verificationsVerified },
    { count: verificationsFailed },
    { count: matchesSent },
    { count: matchesMutual },
    { count: matchesDeclined },
    { count: eliteActive },
    { data: paidPayments },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("created_at", sevenDaysAgo),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("created_at", thirtyDaysAgo),
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", chartStart.toISOString()),
    supabase
      .from("identity_verifications")
      .select("profile_id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("identity_verifications")
      .select("profile_id", { count: "exact", head: true })
      .eq("status", "verified"),
    supabase
      .from("identity_verifications")
      .select("profile_id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "interest_sent"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "mutual"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "declined"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("subscription_tier", "elite")
      .or(`subscription_expires_at.is.null,subscription_expires_at.gt.${nowIso}`),
    supabase.from("payments").select("amount").eq("status", "paid"),
  ]);

  const notStarted = Math.max(
    0,
    (totalMembers ?? 0) -
      ((verificationsPending ?? 0) + (verificationsVerified ?? 0) + (verificationsFailed ?? 0))
  );

  const revenuePaise = (paidPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const revenueInr = revenuePaise / 100;
  const paidCount = (paidPayments ?? []).length;

  // Bucket the fetched signup rows into a UTC-day histogram for the
  // last SIGNUP_CHART_DAYS days — done in JS rather than a DB group-by
  // since the Supabase JS client has no aggregate/group-by, and at a
  // solo-founder's current volume fetching the raw rows for two weeks
  // is cheap.
  const dayBuckets = new Map<string, number>();
  for (let i = 0; i < SIGNUP_CHART_DAYS; i++) {
    const d = new Date(chartStart.getTime() + i * 24 * 60 * 60 * 1000);
    dayBuckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of recentSignupRows ?? []) {
    const key = String(row.created_at).slice(0, 10);
    if (dayBuckets.has(key)) {
      dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
    }
  }
  const chartData = Array.from(dayBuckets.entries());
  const maxDay = Math.max(1, ...chartData.map(([, n]) => n));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total members" value={totalMembers ?? 0} />
        <StatCard label="Signups (7d)" value={signups7d ?? 0} />
        <StatCard label="Signups (30d)" value={signups30d ?? 0} />
        <StatCard label="Active Elite" value={eliteActive ?? 0} />
      </div>

      <Section title="Signups — last 14 days">
        <div className="flex items-end gap-1.5 h-24 px-1">
          {chartData.map(([day, count]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1" title={`${day}: ${count}`}>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(4, (count / maxDay) * 80)}px`,
                  background: "linear-gradient(180deg, var(--accent), var(--accent-strong))",
                }}
              />
              <div className="text-[9px]" style={{ color: "var(--text-soft)" }}>
                {day.slice(5)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Identity verification funnel">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Not started" value={notStarted} muted />
          <StatCard label="Pending" value={verificationsPending ?? 0} muted />
          <StatCard label="Verified" value={verificationsVerified ?? 0} />
          <StatCard label="Failed" value={verificationsFailed ?? 0} muted />
        </div>
      </Section>

      <Section title="Matches made">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Interest sent" value={matchesSent ?? 0} muted />
          <StatCard label="Mutual" value={matchesMutual ?? 0} />
          <StatCard label="Declined" value={matchesDeclined ?? 0} muted />
        </div>
      </Section>

      <Section title="Revenue">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total collected" value={`₹${revenueInr.toLocaleString("en-IN")}`} />
          <StatCard label="Paid orders" value={paidCount} muted />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
    >
      <h2 className="text-sm font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: number | string;
  muted?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
    >
      <div
        className="text-lg font-bold"
        style={{ color: muted ? "var(--text-soft)" : "var(--accent-strong)" }}
      >
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--text-soft)" }}>
        {label}
      </div>
    </div>
  );
}
