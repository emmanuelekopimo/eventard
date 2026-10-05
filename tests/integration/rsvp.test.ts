import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { Pool } from "pg";
import type { DB } from "@/db";
import { events, rsvps, users } from "@/db/schema";
import { adminOverview, attendees, createEvent, getEvent, listEvents, myEvents, rsvpCount, toggleRsvp } from "@/lib/queries";
import { DEMO_STUDENT, DEMO_ADMIN } from "@/db/seed-data";
import { freshDb, NOW } from "./setup";

let pool: Pool;
let database: DB;
let studentId: number;
let adminId: number;
const eventId = async (title: string) => (await database.select().from(events).where(eq(events.title, title)))[0].id;

beforeAll(async () => {
  ({ pool, database } = await freshDb());
  studentId = (await database.select().from(users).where(eq(users.email, DEMO_STUDENT.email)))[0].id;
  adminId = (await database.select().from(users).where(eq(users.email, DEMO_ADMIN.email)))[0].id;
});
afterAll(() => pool.end());

describe("seed", () => {
  it("creates a realistic data set", async () => {
    const [{ u }] = (await database.execute(sql`select count(*)::int as u from users`)).rows as { u: number }[];
    const [{ e }] = (await database.execute(sql`select count(*)::int as e from events`)).rows as { e: number }[];
    const [{ r }] = (await database.execute(sql`select count(*)::int as r from rsvps`)).rows as { r: number }[];
    expect(u).toBeGreaterThanOrEqual(40);
    expect(e).toBeGreaterThanOrEqual(30);
    expect(r).toBeGreaterThan(300);
  });
  it("includes full, cancelled, live and past events", async () => {
    const list = await listEvents(database, studentId, {}, NOW);
    expect(list.some((x) => x.capacity != null && x.going >= x.capacity)).toBe(true);
    expect(list.some((x) => x.status === "cancelled")).toBe(true);
    expect((await listEvents(database, studentId, { when: "past" }, NOW)).length).toBeGreaterThan(5);
  });
});

describe("toggleRsvp", () => {
  it("adds and removes the signed-in student's RSVP and keeps counts right", async () => {
    const id = await eventId("Code and Coffee: Build a Web App with Next.js");
    const before = await rsvpCount(database, id);
    const a = await toggleRsvp(database, studentId, id, NOW);
    expect(a).toEqual({ ok: true, going: before + 1, attending: true });
    expect((await getEvent(database, studentId, id))!.hasRsvp).toBe(true);
    const b = await toggleRsvp(database, studentId, id, NOW);
    expect(b).toEqual({ ok: true, going: before, attending: false });
    expect(await rsvpCount(database, id)).toBe(before);
  });

  it("refuses RSVPs for full, past and cancelled events", async () => {
    expect(await toggleRsvp(database, studentId, await eventId("Robotics Club Open Day"), NOW)).toEqual({ ok: false, error: "This event is full" });
    expect((await toggleRsvp(database, studentId, await eventId("Chess Open Tournament"), NOW)).ok).toBe(false);
    expect(await toggleRsvp(database, studentId, await eventId("Inter-Hall Quiz Competition"), NOW)).toEqual({ ok: false, error: "This event was cancelled" });
  });

  it("enforces one RSVP per student per event at the database level", async () => {
    const id = await eventId("Mental Health Awareness Talk");
    await database.insert(rsvps).values({ eventId: id, userId: studentId });
    await expect(database.insert(rsvps).values({ eventId: id, userId: studentId })).rejects.toThrow();
    await database.delete(rsvps).where(eq(rsvps.eventId, id));
  });

  it("never overbooks when students race for the last seats", async () => {
    const id = await createEvent(database, adminId, {
      title: "Tiny workshop",
      description: "Only three seats are available for this one.",
      category: "Tech",
      venue: "Lab 1",
      startsAt: new Date("2026-10-08T10:00:00Z"),
      endsAt: new Date("2026-10-08T12:00:00Z"),
      capacity: 3,
      bannerUrl: "/images/events/library.jpg",
    });
    const students = (await database.select({ id: users.id }).from(users).where(eq(users.role, "student"))).slice(0, 10);
    const results = await Promise.all(students.map((s) => toggleRsvp(database, s.id, id, NOW)));
    expect(results.filter((r) => r.ok).length).toBe(3);
    expect(await rsvpCount(database, id)).toBe(3);
  });
});

describe("scoping", () => {
  it("returns only the signed-in user's RSVPs", async () => {
    const mine = await myEvents(database, studentId);
    expect(mine.length).toBeGreaterThan(3);
    const ids = mine.map((m) => m.id);
    const rows = await database.select().from(rsvps).where(eq(rsvps.userId, studentId));
    expect(rows.map((r) => r.eventId).sort()).toEqual(ids.sort());
  });
  it("marks hasRsvp per user", async () => {
    const id = await eventId("Startup Pitch Night");
    expect((await getEvent(database, studentId, id))!.hasRsvp).toBe(true);
    expect((await getEvent(database, adminId, id))!.hasRsvp).toBe(false);
  });
});

describe("listEvents filters", () => {
  it("searches title, venue and description", async () => {
    const r = await listEvents(database, studentId, { q: "hackathon" }, NOW);
    expect(r.map((x) => x.title)).toContain("Hackathon: Solutions for Akwa Ibom");
    expect(r.every((x) => x.endsAt > NOW)).toBe(true);
  });
  it("filters by category", async () => {
    const r = await listEvents(database, studentId, { category: "Sports" }, NOW);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.category === "Sports")).toBe(true);
  });
});

describe("admin", () => {
  it("summarises upcoming events and lists attendees", async () => {
    const { stats, rows } = await adminOverview(database, NOW);
    expect(stats.upcoming).toBeGreaterThan(15);
    expect(stats.full).toBeGreaterThanOrEqual(1);
    const id = rows.find((r) => r.title === "Startup Pitch Night")!.id;
    const people = await attendees(database, id);
    expect(people.length).toBe(rows.find((r) => r.id === id)!.going);
  });
  it("rejects events that end before they start", async () => {
    await expect(
      createEvent(database, adminId, {
        title: "Bad",
        description: "Ends before it starts, should fail.",
        category: "Tech",
        venue: "Nowhere",
        startsAt: new Date("2026-10-08T12:00:00Z"),
        endsAt: new Date("2026-10-08T10:00:00Z"),
        capacity: null,
        bannerUrl: "/x.jpg",
      }),
    ).rejects.toThrow();
  });
});
