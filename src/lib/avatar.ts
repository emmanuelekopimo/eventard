import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";

const cache = new Map<string, string>();

/** Locally generated avatar as a data URI (no network). */
export function avatarUri(seed: string): string {
  let v = cache.get(seed);
  if (!v) {
    v = createAvatar(notionists, { seed, backgroundColor: ["f0e6d8", "e8dccb", "f3ece2", "e6d5c3"], radius: 50 }).toDataUri();
    cache.set(seed, v);
  }
  return v;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
