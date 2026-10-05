import { describe, expect, it } from "vitest";
import { googleCalendarUrl, toGoogleDate } from "@/lib/calendar";

describe("toGoogleDate", () => {
  it("formats in UTC basic format", () => expect(toGoogleDate(new Date("2026-10-15T14:00:00Z"))).toBe("20261015T140000Z"));
  it("converts Lagos time to UTC", () => expect(toGoogleDate(new Date("2026-10-15T15:00:00+01:00"))).toBe("20261015T140000Z"));
});

describe("googleCalendarUrl", () => {
  const e = {
    title: "Career Fair & Networking",
    description: "Bring your CV. 30 employers",
    venue: "Main Auditorium, Main Campus",
    startsAt: new Date("2026-10-15T09:00:00+01:00"),
    endsAt: new Date("2026-10-15T16:00:00+01:00"),
  };
  const url = new URL(googleCalendarUrl(e, "https://example.test/events/3"));
  it("points at the Google Calendar template endpoint", () => {
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
  });
  it("sends UTC start and end dates", () => expect(url.searchParams.get("dates")).toBe("20261015T080000Z/20261015T150000Z"));
  it("round-trips encoded text fields", () => {
    expect(url.searchParams.get("text")).toBe("Career Fair & Networking");
    expect(url.searchParams.get("location")).toBe("Main Auditorium, Main Campus");
    expect(url.searchParams.get("details")).toContain("https://example.test/events/3");
  });
  it("percent-encodes spaces and ampersands", () => {
    const raw = googleCalendarUrl(e);
    expect(raw).toContain("text=Career%20Fair%20%26%20Networking");
    expect(raw).not.toContain(" ");
  });
});
