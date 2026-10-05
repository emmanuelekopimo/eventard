"use client";

import { useActionState, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { EventFormState } from "@/app/actions/events";
import { CATEGORIES } from "@/db/schema";
import { BANNER_PRESETS } from "@/lib/banners";

type Defaults = Partial<Record<"title" | "description" | "category" | "venue" | "startsAt" | "endsAt" | "capacity" | "bannerPreset", string>>;

export function EventForm({
  action,
  defaults = {},
  id,
  currentBanner,
  submitLabel,
}: {
  action: (s: EventFormState, f: FormData) => Promise<EventFormState>;
  defaults?: Defaults;
  id?: number;
  currentBanner?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [fileName, setFileName] = useState("");
  const v = { ...defaults, ...(state.values ?? {}) } as Defaults;
  const err = state.errors ?? {};
  // A changing key remounts inputs so values the server echoed back survive React's form reset.
  const k = JSON.stringify(state.values ?? {});
  return (
    <form action={formAction} className="form" noValidate key={k} data-testid="event-form">
      {id && <input type="hidden" name="id" value={id} />}
      {currentBanner && <input type="hidden" name="currentBanner" value={currentBanner} />}
      {Object.keys(err).length > 0 && <div className="form-error" role="alert">Please fix the highlighted fields.</div>}
      <div className="field" data-invalid={!!err.title}>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" className="input" defaultValue={v.title} placeholder="e.g. Career Fair 2026" />
        {err.title && <span className="error">{err.title}</span>}
      </div>
      <div className="form-row">
        <div className="field" data-invalid={!!err.category}>
          <label htmlFor="category">Category</label>
          <select id="category" name="category" className="select" defaultValue={v.category ?? ""}>
            <option value="" disabled>Choose a category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {err.category && <span className="error">{err.category}</span>}
        </div>
        <div className="field" data-invalid={!!err.venue}>
          <label htmlFor="venue">Venue</label>
          <input id="venue" name="venue" className="input" defaultValue={v.venue} placeholder="e.g. Main Auditorium, Main Campus" />
          {err.venue && <span className="error">{err.venue}</span>}
        </div>
      </div>
      <div className="form-row">
        <div className="field" data-invalid={!!err.startsAt}>
          <label htmlFor="startsAt">Starts</label>
          <input id="startsAt" name="startsAt" type="datetime-local" className="input" defaultValue={v.startsAt} />
          {err.startsAt && <span className="error">{err.startsAt}</span>}
        </div>
        <div className="field" data-invalid={!!err.endsAt}>
          <label htmlFor="endsAt">Ends</label>
          <input id="endsAt" name="endsAt" type="datetime-local" className="input" defaultValue={v.endsAt} />
          {err.endsAt && <span className="error">{err.endsAt}</span>}
        </div>
      </div>
      <div className="field" data-invalid={!!err.capacity} style={{ maxWidth: 260 }}>
        <label htmlFor="capacity">Capacity</label>
        <input id="capacity" name="capacity" type="number" min={1} inputMode="numeric" className="input" defaultValue={v.capacity} placeholder="Leave empty for no limit" />
        {err.capacity && <span className="error">{err.capacity}</span>}
      </div>
      <div className="field" data-invalid={!!err.description}>
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" className="textarea" defaultValue={v.description} placeholder="What will happen, who it is for and what to bring" />
        {err.description && <span className="error">{err.description}</span>}
      </div>
      <div className="field" data-invalid={!!err.banner}>
        <label>Banner</label>
        <span className="hint">Upload a photo (JPG, PNG or WebP, up to 3 MB) or pick one from the library.</span>
        <label className="btn btn-ghost" style={{ alignSelf: "flex-start" }}>
          <Upload size={16} /> Upload image
          <input type="file" name="banner" accept="image/jpeg,image/png,image/webp" className="sr-only" data-testid="banner-file" onChange={(ev) => setFileName(ev.target.files?.[0]?.name ?? "")} />
        </label>
        {fileName && <span className="hint">Selected: {fileName}. The upload is used instead of a library photo.</span>}
        <div className="presets" role="radiogroup" aria-label="Banner library">
          {BANNER_PRESETS.map((p) => (
            <label key={p} className="preset" title={p.replace(/-/g, " ")}>
              <input type="radio" name="bannerPreset" value={p} defaultChecked={v.bannerPreset === p} />
              <img src={`/images/events/${p}.jpg`} alt={p.replace(/-/g, " ")} />
            </label>
          ))}
        </div>
        {currentBanner && <span className="hint">Leave both empty to keep the current banner.</span>}
        {err.banner && <span className="error">{err.banner}</span>}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-primary" disabled={pending} data-testid="save-event">
          {pending && <Loader2 size={16} />} {submitLabel}
        </button>
      </div>
    </form>
  );
}
