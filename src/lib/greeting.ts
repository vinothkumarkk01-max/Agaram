/**
 * Dashboard hero greeting ("Good evening, Priya.") — time-of-day only,
 * computed in IST (Asia/Kolkata) since Agaramiya is an India-first
 * product (same timezone convention as nextWeeklyDigestRun() in
 * schedule.ts). Deliberately just three plain bands, not a clever
 * sunrise/sunset calculation — nobody notices the boundary, everybody
 * notices if it's wrong.
 */
export type GreetingKey = "morning" | "afternoon" | "evening";

export function greetingKeyFor(now: Date = new Date()): GreetingKey {
  const istHour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(now)
  );

  if (istHour < 12) return "morning";
  if (istHour < 17) return "afternoon";
  return "evening";
}
