"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { toggleRsvp } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { now } from "@/lib/today";

export type RsvpActionState = { error?: string; going?: number; attending?: boolean };

export async function rsvpAction(_: RsvpActionState, formData: FormData): Promise<RsvpActionState> {
  const s = await getSession();
  if (!s) return { error: "Please sign in again" };
  if (s.role !== "student") return { error: "Only students can RSVP" };
  const eventId = Number(formData.get("eventId"));
  if (!Number.isInteger(eventId)) return { error: "Unknown event" };
  const r = await toggleRsvp(db(), s.userId, eventId, now());
  revalidatePath("/", "layout");
  if (!r.ok) return { error: r.error };
  return { going: r.going, attending: r.attending };
}
