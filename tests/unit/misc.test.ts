import { describe, expect, it } from "vitest";
import { resolveNow, campusDay, atCampusTime } from "@/lib/today";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import { eventSchema, loginSchema, checkImageFile, fieldErrors } from "@/lib/validation";
import { signSession, verifySession } from "@/lib/auth";

describe("today override", () => {
  it("freezes now at 10:00 Lagos on the given day", () => expect(resolveNow("2026-10-05").toISOString()).toBe("2026-10-05T09:00:00.000Z"));
  it("ignores malformed overrides", () => {
    const real = new Date("2026-01-01T00:00:00Z");
    expect(resolveNow("tomorrow", real)).toBe(real);
  });
  it("computes the campus day across UTC midnight", () => expect(campusDay(new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06"));
  it("builds campus times", () => expect(atCampusTime("2026-10-05", "14:00", 1).toISOString()).toBe("2026-10-06T13:00:00.000Z"));
});

describe("datetime-local helpers", () => {
  it("round-trips campus time", () => {
    const d = new Date("2026-10-06T13:00:00Z");
    expect(toLocalInput(d)).toBe("2026-10-06T14:00");
    expect(fromLocalInput("2026-10-06T14:00").toISOString()).toBe(d.toISOString());
  });
  it("rejects malformed input", () => expect(Number.isNaN(fromLocalInput("06/10/2026").getTime())).toBe(true));
});

describe("validation", () => {
  it("normalises login email", () => expect(loginSchema.parse({ email: " Student@UniUyo.edu.ng ", password: "x" }).email).toBe("student@uniuyo.edu.ng"));
  it("reports inline field errors", () => {
    const r = eventSchema.safeParse({ title: "Hi", description: "short", category: "Nope", venue: "", startsAt: "", endsAt: "", capacity: "-3" });
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(Object.keys(errs).sort()).toEqual(["capacity", "category", "description", "endsAt", "startsAt", "title", "venue"]);
  });
  it("treats empty capacity as unlimited and accepts normal numbers", () => {
    const base = { title: "Career Fair", description: "A long enough description for the event.", category: "Career", venue: "Main Hall", startsAt: "x", endsAt: "y" };
    expect(eventSchema.parse({ ...base, capacity: "" }).capacity).toBeNull();
    expect(eventSchema.parse({ ...base, capacity: "250" }).capacity).toBe(250);
  });
  it("checks uploaded image type and size", () => {
    expect(checkImageFile(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/JPG/);
    expect(checkImageFile(new File([new Uint8Array(4 * 1024 * 1024)], "a.jpg", { type: "image/jpeg" }))).toMatch(/3 MB/);
    expect(checkImageFile(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBeUndefined();
    expect(checkImageFile(null)).toBeUndefined();
  });
});

describe("session tokens", () => {
  it("signs and verifies", async () => {
    const t = await signSession({ userId: 7, role: "student", name: "Ada" });
    expect(await verifySession(t)).toEqual({ userId: 7, role: "student", name: "Ada" });
  });
  it("rejects tampered or foreign tokens", async () => {
    const t = await signSession({ userId: 7, role: "admin", name: "Ada" }, "another-secret-0123456789");
    expect(await verifySession(t)).toBeNull();
    expect(await verifySession("garbage")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
});
