"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { checkEventTimes } from "@/lib/events";
import { fromLocalInput } from "@/lib/format";
import { createEvent, deleteEvent, setEventStatus, updateEvent } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { now } from "@/lib/today";
import { BANNER_PRESETS } from "@/lib/banners";
import { checkImageFile, eventSchema, fieldErrors, type FieldErrors } from "@/lib/validation";

export type EventFormState = { errors?: FieldErrors; values?: Record<string, string> };

async function parseEventForm(formData: FormData, adminId: number, opts: { allowPast: boolean; currentBanner?: string }) {
  const raw = Object.fromEntries(
    ["title", "description", "category", "venue", "startsAt", "endsAt", "capacity", "bannerPreset"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = eventSchema.safeParse(raw);
  const errors: FieldErrors = parsed.success ? {} : fieldErrors(parsed.error);
  const startsAt = fromLocalInput(raw.startsAt);
  const endsAt = fromLocalInput(raw.endsAt);
  if (!errors.startsAt && !errors.endsAt) Object.assign(errors, checkEventTimes({ startsAt, endsAt }, now(), { allowPast: opts.allowPast }));
  const file = formData.get("banner") as File | null;
  const fileErr = checkImageFile(file);
  if (fileErr) errors.banner = fileErr;
  const preset = raw.bannerPreset && BANNER_PRESETS.includes(raw.bannerPreset) ? raw.bannerPreset : "";
  const hasFile = !!file && file.size > 0;
  if (!hasFile && !preset && !opts.currentBanner) errors.banner = "Upload a banner or pick one from the library";
  if (Object.keys(errors).length || !parsed.success) return { errors, values: raw } as const;

  let bannerUrl = opts.currentBanner ?? "";
  if (hasFile) {
    const [u] = await db()
      .insert(uploads)
      .values({ mime: file!.type, data: Buffer.from(await file!.arrayBuffer()), uploadedBy: adminId })
      .returning({ id: uploads.id });
    bannerUrl = `/api/images/${u.id}`;
  } else if (preset) {
    bannerUrl = `/images/events/${preset}.jpg`;
  }
  return {
    input: {
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      venue: parsed.data.venue,
      capacity: parsed.data.capacity,
      startsAt,
      endsAt,
      bannerUrl,
    },
  } as const;
}

export async function createEventAction(_: EventFormState, formData: FormData): Promise<EventFormState> {
  const admin = await requireAdmin();
  const r = await parseEventForm(formData, admin.id, { allowPast: false });
  if ("errors" in r) return { errors: r.errors, values: r.values };
  const id = await createEvent(db(), admin.id, r.input);
  revalidatePath("/", "layout");
  redirect(`/events/${id}?created=1`);
}

export async function updateEventAction(_: EventFormState, formData: FormData): Promise<EventFormState> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const current = String(formData.get("currentBanner") ?? "");
  const r = await parseEventForm(formData, admin.id, { allowPast: true, currentBanner: current || undefined });
  if ("errors" in r) return { errors: r.errors, values: r.values };
  await updateEvent(db(), id, r.input);
  revalidatePath("/", "layout");
  redirect(`/events/${id}?updated=1`);
}

export async function toggleCancelAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const cancel = formData.get("cancel") === "1";
  await setEventStatus(db(), id, cancel ? "cancelled" : "scheduled");
  revalidatePath("/", "layout");
}

export async function deleteEventAction(formData: FormData) {
  await requireAdmin();
  await deleteEvent(db(), Number(formData.get("id")));
  revalidatePath("/", "layout");
  redirect("/admin?deleted=1");
}
