/** Campus timezone. Lagos is UTC+1 all year (no daylight saving). */
export const CAMPUS_TZ = "Africa/Lagos";
export const CAMPUS_OFFSET = "+01:00";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolve "now" for business rules. When EVENTARD_TODAY=YYYY-MM-DD is set, the clock is
 * frozen at 10:00 campus time on that day so demos and tests are deterministic.
 */
export function resolveNow(override: string | undefined = process.env.EVENTARD_TODAY, real: Date = new Date()): Date {
  if (override && DAY_RE.test(override)) return new Date(`${override}T10:00:00${CAMPUS_OFFSET}`);
  return real;
}

export function now(): Date {
  return resolveNow();
}

/** YYYY-MM-DD of a date in campus time. */
export function campusDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAMPUS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Midnight (campus time) of the given campus day plus an offset in days. */
export function campusMidnight(day: string, addDays = 0): Date {
  const base = new Date(`${day}T00:00:00${CAMPUS_OFFSET}`);
  return new Date(base.getTime() + addDays * 86_400_000);
}

/** Build a Date from a campus-time day and HH:MM. */
export function atCampusTime(day: string, hhmm: string, addDays = 0): Date {
  const d = campusMidnight(day, addDays);
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(d.getTime() + (h * 60 + m) * 60_000);
}
