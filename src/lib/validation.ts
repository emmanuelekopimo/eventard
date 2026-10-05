import { z } from "zod";
import { CATEGORIES } from "@/db/schema";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const eventSchema = z.object({
  title: z.string().trim().min(4, "Title must be at least 4 characters").max(140, "Title is too long"),
  description: z
    .string()
    .trim()
    .min(20, "Describe the event in at least 20 characters")
    .max(2000, "Description is too long"),
  category: z.enum(CATEGORIES, { error: "Pick a category" }),
  venue: z.string().trim().min(3, "Enter a venue").max(160, "Venue is too long"),
  startsAt: z.string().min(1, "Pick a start date and time"),
  endsAt: z.string().min(1, "Pick an end date and time"),
  capacity: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v <= 20000), "Capacity must be a whole number from 1 to 20000"),
  bannerPreset: z.string().optional(),
});

export type FieldErrors = Record<string, string | undefined>;

/** First error message per field, for inline display under inputs. */
export function fieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function checkImageFile(f: File | null): string | undefined {
  if (!f || f.size === 0) return undefined;
  if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return "Upload a JPG, PNG or WebP image";
  if (f.size > MAX_IMAGE_BYTES) return "Image must be 3 MB or smaller";
  return undefined;
}
