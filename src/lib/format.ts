import { CAMPUS_TZ } from "./today";

const opts = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NG", { timeZone: CAMPUS_TZ, ...o });

export const fmtDay = (d: Date) => opts({ weekday: "short", day: "numeric", month: "short" }).format(d);
export const fmtLongDay = (d: Date) => opts({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
export const fmtTime = (d: Date) => opts({ hour: "numeric", minute: "2-digit", hour12: true }).format(d).toLowerCase();
export const fmtMonth = (d: Date) => opts({ month: "short" }).format(d).toUpperCase();
export const fmtDate = (d: Date) => opts({ day: "numeric" }).format(d);

export function fmtRange(start: Date, end: Date) {
  const sameDay = fmtLongDay(start) === fmtLongDay(end);
  return sameDay
    ? `${fmtTime(start)} to ${fmtTime(end)}`
    : `${fmtDay(start)} ${fmtTime(start)} to ${fmtDay(end)} ${fmtTime(end)}`;
}

/** Value for <input type="datetime-local"> in campus time. */
export function toLocalInput(d: Date) {
  const p = Object.fromEntries(
    opts({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
}

/** Parse a datetime-local value as campus time. */
export function fromLocalInput(v: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return new Date(NaN);
  return new Date(`${v}:00+01:00`);
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
