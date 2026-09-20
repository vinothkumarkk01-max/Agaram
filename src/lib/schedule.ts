/**
 * The ONE real, currently-scheduled cadence this app runs on: the
 * weekly match-summary email (`api/cron/weekly-digest`, README's
 * "Weekly curated match digest"), fired by the Vercel Cron entry in
 * `vercel.json` — "0 10 * * 5", i.e. every Friday at 10:00 UTC
 * (≈ 3:30pm IST). This is deliberately NOT a "your next 3
 * introductions unlock in..." countdown — Browse stays open and
 * hard-filtered all week (see `get_match_candidates()` in
 * `supabase/schema.sql`); nothing about candidates is withheld until
 * Friday. This only ever describes the real, literal next time the
 * summary EMAIL goes out, so the dashboard can reference it without
 * implying a gating mechanic that doesn't exist.
 */
export function nextWeeklyDigestRun(now: Date = new Date()): Date {
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0, 0)
  );
  let daysUntilFriday = (5 - target.getUTCDay() + 7) % 7;
  if (daysUntilFriday === 0 && target.getTime() <= now.getTime()) {
    daysUntilFriday = 7;
  }
  target.setUTCDate(target.getUTCDate() + daysUntilFriday);
  return target;
}
