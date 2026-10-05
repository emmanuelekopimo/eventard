import { campusDay, campusMidnight } from "./today";

export type EventLike = {
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  status: "scheduled" | "cancelled";
};

export type Phase = "upcoming" | "live" | "ended" | "cancelled";

export function eventPhase(e: Pick<EventLike, "startsAt" | "endsAt" | "status">, now: Date): Phase {
  if (e.status === "cancelled") return "cancelled";
  if (now < e.startsAt) return "upcoming";
  if (now < e.endsAt) return "live";
  return "ended";
}

export function spotsLeft(capacity: number | null, going: number): number | null {
  if (capacity == null) return null;
  return Math.max(0, capacity - going);
}

export type RsvpState =
  | { kind: "going" }
  | { kind: "open" }
  | { kind: "full" }
  | { kind: "ended" }
  | { kind: "cancelled" };

/** Whether a student can RSVP (or cancel) right now. Students can still cancel while an event is live. */
export function rsvpState(e: EventLike, going: number, hasRsvp: boolean, now: Date): RsvpState {
  const phase = eventPhase(e, now);
  if (phase === "cancelled") return { kind: "cancelled" };
  if (phase === "ended") return { kind: "ended" };
  if (hasRsvp) return { kind: "going" };
  if (phase === "live") return { kind: "ended" };
  const left = spotsLeft(e.capacity, going);
  if (left === 0) return { kind: "full" };
  return { kind: "open" };
}

export function canRsvp(e: EventLike, going: number, hasRsvp: boolean, now: Date): boolean {
  return rsvpState(e, going, hasRsvp, now).kind === "open";
}

/** Fill ratio from 0 to 1, or null when the event has no capacity limit. */
export function fillRatio(capacity: number | null, going: number): number | null {
  if (!capacity) return null;
  return Math.min(1, going / capacity);
}

export function isAlmostFull(capacity: number | null, going: number): boolean {
  const r = fillRatio(capacity, going);
  return r != null && r >= 0.85 && r < 1;
}

/** Human label relative to today in campus time: Today, Tomorrow, In 3 days, Yesterday, 4 days ago. */
export function relativeDayLabel(start: Date, now: Date): string {
  const diff = Math.round(
    (campusMidnight(campusDay(start)).getTime() - campusMidnight(campusDay(now)).getTime()) / 86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1) return `In ${diff} days`;
  return `${-diff} days ago`;
}

export type EventTimeInput = { startsAt: Date; endsAt: Date };

/** Validation rule for admin forms. Returns field errors (empty object when valid). */
export function checkEventTimes(t: EventTimeInput, now: Date, opts: { allowPast?: boolean } = {}) {
  const errors: Partial<Record<"startsAt" | "endsAt", string>> = {};
  if (Number.isNaN(t.startsAt.getTime())) errors.startsAt = "Enter a valid start date and time";
  if (Number.isNaN(t.endsAt.getTime())) errors.endsAt = "Enter a valid end date and time";
  if (Object.keys(errors).length) return errors;
  if (!opts.allowPast && t.startsAt < now) errors.startsAt = "Start time cannot be in the past";
  if (t.endsAt <= t.startsAt) errors.endsAt = "End time must be after the start time";
  else if (t.endsAt.getTime() - t.startsAt.getTime() > 3 * 86_400_000) errors.endsAt = "Events can last at most 3 days";
  return errors;
}

/** Split events into upcoming (including live) and past, sorted for display. */
export function splitByTime<T extends Pick<EventLike, "startsAt" | "endsAt">>(list: T[], now: Date) {
  const upcoming = list.filter((e) => e.endsAt > now).sort((a, b) => +a.startsAt - +b.startsAt);
  const past = list.filter((e) => e.endsAt <= now).sort((a, b) => +b.startsAt - +a.startsAt);
  return { upcoming, past };
}
