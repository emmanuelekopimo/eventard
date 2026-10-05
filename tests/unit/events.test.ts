import { describe, expect, it } from "vitest";
import { canRsvp, checkEventTimes, eventPhase, fillRatio, isAlmostFull, relativeDayLabel, rsvpState, splitByTime, spotsLeft } from "@/lib/events";

const now = new Date("2026-10-05T09:00:00Z");
const ev = (o: Partial<{ startsAt: Date; endsAt: Date; capacity: number | null; status: "scheduled" | "cancelled" }> = {}) => ({
  startsAt: new Date("2026-10-06T13:00:00Z"),
  endsAt: new Date("2026-10-06T16:00:00Z"),
  capacity: 60 as number | null,
  status: "scheduled" as const,
  ...o,
});

describe("eventPhase", () => {
  it("is upcoming before the start", () => expect(eventPhase(ev(), now)).toBe("upcoming"));
  it("is live between start and end", () =>
    expect(eventPhase(ev({ startsAt: new Date("2026-10-05T08:00:00Z"), endsAt: new Date("2026-10-05T10:00:00Z") }), now)).toBe("live"));
  it("is ended after the end", () =>
    expect(eventPhase(ev({ startsAt: new Date("2026-10-01T08:00:00Z"), endsAt: new Date("2026-10-01T10:00:00Z") }), now)).toBe("ended"));
  it("reports cancelled regardless of time", () => expect(eventPhase(ev({ status: "cancelled" }), now)).toBe("cancelled"));
});

describe("rsvpState", () => {
  it("is open when there is space", () => expect(rsvpState(ev(), 10, false, now).kind).toBe("open"));
  it("is full at capacity", () => expect(rsvpState(ev({ capacity: 10 }), 10, false, now).kind).toBe("full"));
  it("lets a student who is going cancel even when full", () => expect(rsvpState(ev({ capacity: 10 }), 10, true, now).kind).toBe("going"));
  it("has no limit when capacity is null", () => expect(canRsvp(ev({ capacity: null }), 5000, false, now)).toBe(true));
  it("closes once the event has ended", () =>
    expect(rsvpState(ev({ startsAt: new Date("2026-10-01T08:00:00Z"), endsAt: new Date("2026-10-01T10:00:00Z") }), 0, true, now).kind).toBe("ended"));
  it("blocks new RSVPs once the event is live", () =>
    expect(rsvpState(ev({ startsAt: new Date("2026-10-05T08:00:00Z"), endsAt: new Date("2026-10-05T10:00:00Z") }), 0, false, now).kind).toBe("ended"));
  it("blocks cancelled events", () => expect(rsvpState(ev({ status: "cancelled" }), 0, false, now).kind).toBe("cancelled"));
});

describe("capacity helpers", () => {
  it("never reports negative spots", () => expect(spotsLeft(10, 12)).toBe(0));
  it("returns null spots for unlimited events", () => expect(spotsLeft(null, 3)).toBeNull());
  it("computes fill ratio", () => expect(fillRatio(40, 10)).toBe(0.25));
  it("flags almost full at 85 percent", () => {
    expect(isAlmostFull(100, 85)).toBe(true);
    expect(isAlmostFull(100, 84)).toBe(false);
    expect(isAlmostFull(100, 100)).toBe(false);
  });
});

describe("relativeDayLabel (campus time)", () => {
  it("labels today, tomorrow and later days", () => {
    expect(relativeDayLabel(new Date("2026-10-05T18:00:00Z"), now)).toBe("Today");
    expect(relativeDayLabel(new Date("2026-10-06T13:00:00Z"), now)).toBe("Tomorrow");
    expect(relativeDayLabel(new Date("2026-10-10T13:00:00Z"), now)).toBe("In 5 days");
    expect(relativeDayLabel(new Date("2026-10-03T13:00:00Z"), now)).toBe("2 days ago");
  });
  it("uses Lagos midnight, not UTC midnight", () => {
    // 23:30 UTC on 5 Oct is 00:30 on 6 Oct in Lagos
    expect(relativeDayLabel(new Date("2026-10-05T23:30:00Z"), now)).toBe("Tomorrow");
  });
});

describe("checkEventTimes", () => {
  it("accepts a valid future slot", () => expect(checkEventTimes({ startsAt: new Date("2026-10-07T10:00:00Z"), endsAt: new Date("2026-10-07T12:00:00Z") }, now)).toEqual({}));
  it("rejects a start in the past", () =>
    expect(checkEventTimes({ startsAt: new Date("2026-10-04T10:00:00Z"), endsAt: new Date("2026-10-04T12:00:00Z") }, now).startsAt).toMatch(/past/));
  it("allows past starts when editing", () =>
    expect(checkEventTimes({ startsAt: new Date("2026-10-04T10:00:00Z"), endsAt: new Date("2026-10-04T12:00:00Z") }, now, { allowPast: true })).toEqual({}));
  it("rejects an end before the start", () =>
    expect(checkEventTimes({ startsAt: new Date("2026-10-07T10:00:00Z"), endsAt: new Date("2026-10-07T09:00:00Z") }, now).endsAt).toMatch(/after/));
  it("rejects events longer than 3 days", () =>
    expect(checkEventTimes({ startsAt: new Date("2026-10-07T10:00:00Z"), endsAt: new Date("2026-10-11T10:00:00Z") }, now).endsAt).toMatch(/3 days/));
  it("rejects invalid dates", () => expect(checkEventTimes({ startsAt: new Date(NaN), endsAt: new Date(NaN) }, now).startsAt).toBeDefined());
});

describe("splitByTime", () => {
  it("puts live events in upcoming and sorts both lists", () => {
    const a = ev({ startsAt: new Date("2026-10-05T08:00:00Z"), endsAt: new Date("2026-10-05T10:00:00Z") });
    const b = ev();
    const c = ev({ startsAt: new Date("2026-09-01T08:00:00Z"), endsAt: new Date("2026-09-01T10:00:00Z") });
    const d = ev({ startsAt: new Date("2026-09-20T08:00:00Z"), endsAt: new Date("2026-09-20T10:00:00Z") });
    const r = splitByTime([b, c, a, d], now);
    expect(r.upcoming).toEqual([a, b]);
    expect(r.past).toEqual([d, c]);
  });
});
