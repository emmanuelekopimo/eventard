import { and, asc, desc, eq, gt, ilike, inArray, lte, or, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { events, rsvps, users, type Category, type EventRow } from "@/db/schema";
import { rsvpState } from "./events";

export type EventCard = EventRow & { going: number; hasRsvp: boolean; preview: { name: string }[] };

const goingCount = sql<number>`(select count(*)::int from rsvps r where r.event_id = "events"."id")`;
const mineSql = (userId: number) => sql<boolean>`exists(select 1 from rsvps r2 where r2.event_id = "events"."id" and r2.user_id = ${userId})`;

async function withPreview(database: DB, rows: (EventRow & { going: number; hasRsvp: boolean })[]): Promise<EventCard[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const people = await database
    .select({ eventId: rsvps.eventId, name: users.name })
    .from(rsvps)
    .innerJoin(users, eq(users.id, rsvps.userId))
    .where(inArray(rsvps.eventId, ids))
    .orderBy(desc(rsvps.createdAt));
  const map = new Map<number, { name: string }[]>();
  for (const p of people) {
    const list = map.get(p.eventId) ?? [];
    if (list.length < 4) list.push({ name: p.name });
    map.set(p.eventId, list);
  }
  return rows.map((r) => ({ ...r, preview: map.get(r.id) ?? [] }));
}

export type ListFilter = { q?: string; category?: Category | ""; when?: "upcoming" | "past" };

/** Events visible to a signed-in user, with their own RSVP state. */
export async function listEvents(database: DB, userId: number, f: ListFilter, now: Date): Promise<EventCard[]> {
  const conds = [];
  if (f.when === "past") conds.push(lte(events.endsAt, now));
  else conds.push(gt(events.endsAt, now));
  if (f.category) conds.push(eq(events.category, f.category));
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    conds.push(or(ilike(events.title, like), ilike(events.venue, like), ilike(events.description, like)));
  }
  const rows = await database
    .select({
      ...eventColumns(),
      going: goingCount,
      hasRsvp: mineSql(userId),
    })
    .from(events)
    .where(and(...conds))
    .orderBy(f.when === "past" ? desc(events.startsAt) : asc(events.startsAt));
  return withPreview(database, rows);
}

function eventColumns() {
  return {
    id: events.id,
    title: events.title,
    description: events.description,
    category: events.category,
    venue: events.venue,
    startsAt: events.startsAt,
    endsAt: events.endsAt,
    bannerUrl: events.bannerUrl,
    capacity: events.capacity,
    status: events.status,
    createdBy: events.createdBy,
    createdAt: events.createdAt,
  };
}

export async function getEvent(database: DB, userId: number, id: number): Promise<EventCard | null> {
  const rows = await database
    .select({
      ...eventColumns(),
      going: goingCount,
      hasRsvp: mineSql(userId),
    })
    .from(events)
    .where(eq(events.id, id));
  if (!rows[0]) return null;
  return (await withPreview(database, rows))[0];
}

export async function rsvpCount(database: DB, eventId: number): Promise<number> {
  const [r] = await database.select({ n: sql<number>`count(*)::int` }).from(rsvps).where(eq(rsvps.eventId, eventId));
  return r?.n ?? 0;
}

export type RsvpResult = { ok: true; going: number; attending: boolean } | { ok: false; error: string };

/**
 * Toggle the signed-in user's RSVP. Runs in a transaction that locks the event row so two
 * students cannot take the last seat at the same time.
 */
export async function toggleRsvp(database: DB, userId: number, eventId: number, now: Date): Promise<RsvpResult> {
  return database.transaction(async (tx) => {
    const locked = await tx.execute(sql`select id from events where id = ${eventId} for update`);
    if (!locked.rows.length) return { ok: false, error: "Event not found" } as const;
    const [e] = await tx.select().from(events).where(eq(events.id, eventId));
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(rsvps).where(eq(rsvps.eventId, eventId));
    const mine = await tx
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId)));
    const state = rsvpState(e, n, mine.length > 0, now);
    if (state.kind === "going") {
      await tx.delete(rsvps).where(eq(rsvps.id, mine[0].id));
      return { ok: true, going: n - 1, attending: false } as const;
    }
    if (state.kind === "open") {
      await tx.insert(rsvps).values({ eventId, userId }).onConflictDoNothing();
      return { ok: true, going: n + 1, attending: true } as const;
    }
    const msg = { full: "This event is full", ended: "RSVP has closed for this event", cancelled: "This event was cancelled" }[
      state.kind
    ];
    return { ok: false, error: msg } as const;
  });
}

/** The signed-in user's own RSVPs. */
export async function myEvents(database: DB, userId: number) {
  const rows = await database
    .select({ ...eventColumns(), going: goingCount, hasRsvp: sql<boolean>`true` })
    .from(rsvps)
    .innerJoin(events, eq(events.id, rsvps.eventId))
    .where(eq(rsvps.userId, userId))
    .orderBy(asc(events.startsAt));
  return withPreview(database, rows);
}

export async function adminOverview(database: DB, now: Date) {
  const rows = await database
    .select({ ...eventColumns(), going: goingCount, creator: users.name })
    .from(events)
    .innerJoin(users, eq(users.id, events.createdBy))
    .orderBy(desc(events.startsAt));
  const [{ students }] = await database
    .select({ students: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "student"));
  const upcoming = rows.filter((r) => r.endsAt > now && r.status === "scheduled");
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  return {
    rows,
    stats: {
      upcoming: upcoming.length,
      thisWeek: upcoming.filter((r) => r.startsAt <= weekAhead).length,
      totalRsvps: rows.reduce((s, r) => s + r.going, 0),
      upcomingRsvps: upcoming.reduce((s, r) => s + r.going, 0),
      full: upcoming.filter((r) => r.capacity != null && r.going >= r.capacity).length,
      students,
    },
  };
}

export async function attendees(database: DB, eventId: number) {
  return database
    .select({ id: users.id, name: users.name, email: users.email, department: users.department, level: users.level, at: rsvps.createdAt })
    .from(rsvps)
    .innerJoin(users, eq(users.id, rsvps.userId))
    .where(eq(rsvps.eventId, eventId))
    .orderBy(asc(rsvps.createdAt));
}

export type EventInput = {
  title: string;
  description: string;
  category: Category;
  venue: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  bannerUrl: string;
};

export async function createEvent(database: DB, adminId: number, input: EventInput) {
  const [row] = await database.insert(events).values({ ...input, createdBy: adminId }).returning({ id: events.id });
  return row.id;
}

export async function updateEvent(database: DB, id: number, input: EventInput) {
  await database.update(events).set(input).where(eq(events.id, id));
}

export async function setEventStatus(database: DB, id: number, status: "scheduled" | "cancelled") {
  await database.update(events).set({ status }).where(eq(events.id, id));
}

export async function deleteEvent(database: DB, id: number) {
  await database.delete(events).where(eq(events.id, id));
}

export async function findUserByEmail(database: DB, email: string) {
  const [u] = await database.select().from(users).where(eq(users.email, email));
  return u ?? null;
}
