import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["student", "admin"]);
export const eventStatusEnum = pgEnum("event_status", ["scheduled", "cancelled"]);
export const categoryEnum = pgEnum("event_category", [
  "Tech",
  "Career",
  "Sports",
  "Arts",
  "Culture",
  "Academic",
  "Wellness",
]);

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("student"),
  department: varchar("department", { length: 120 }),
  level: integer("level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 140 }).notNull(),
    description: text("description").notNull(),
    category: categoryEnum("category").notNull(),
    venue: varchar("venue", { length: 160 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    bannerUrl: text("banner_url").notNull(),
    capacity: integer("capacity"),
    status: eventStatusEnum("status").notNull().default("scheduled"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_starts_at_idx").on(t.startsAt),
    check("events_time_order", sql`${t.endsAt} > ${t.startsAt}`),
    check("events_capacity_positive", sql`${t.capacity} IS NULL OR ${t.capacity} > 0`),
  ],
);

export const rsvps = pgTable(
  "rsvps",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("rsvps_event_user_unique").on(t.eventId, t.userId), index("rsvps_user_idx").on(t.userId)],
);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  mime: varchar("mime", { length: 60 }).notNull(),
  data: bytea("data").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Category = (typeof categoryEnum.enumValues)[number];
export const CATEGORIES = categoryEnum.enumValues;
