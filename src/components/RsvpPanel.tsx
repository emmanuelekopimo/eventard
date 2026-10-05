"use client";

import { useActionState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { rsvpAction, type RsvpActionState } from "@/app/actions/rsvp";
import type { RsvpState } from "@/lib/events";

type Props = {
  eventId: number;
  going: number;
  capacity: number | null;
  state: RsvpState["kind"];
  isStudent: boolean;
};

export function RsvpPanel({ eventId, going, capacity, state, isStudent }: Props) {
  const [result, action, pending] = useActionState<RsvpActionState, FormData>(rsvpAction, {});
  const pct = capacity ? Math.min(100, Math.round((going / capacity) * 100)) : null;
  return (
    <div className="panel" data-testid="rsvp-panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="muted" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span className="live-dot" /> Live count
        </span>
        {capacity && <span className="muted" style={{ fontSize: 13 }}>{capacity} seats</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "8px 0 12px" }}>
        <span className="big-count" data-testid="rsvp-count">{going}</span>
        <span className="muted">{going === 1 ? "student going" : "students going"}</span>
      </div>
      {pct != null && (
        <div className={`bar ${pct >= 100 ? "full" : ""}`} style={{ marginBottom: 14 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
      )}
      {isStudent && (state === "open" || state === "going") && (
        <form action={action}>
          <input type="hidden" name="eventId" value={eventId} />
          {state === "going" ? (
            <button className="btn btn-going btn-block" disabled={pending} data-testid="rsvp-button">
              {pending ? <Loader2 size={18} className="spin" /> : <Check size={18} />} You are going. Tap to cancel
            </button>
          ) : (
            <button className="btn btn-primary btn-block" disabled={pending} data-testid="rsvp-button">
              {pending ? <Loader2 size={18} /> : <Plus size={18} />} RSVP to this event
            </button>
          )}
        </form>
      )}
      {state === "full" && (
        <div className="notice notice-red"><X size={16} /> This event is full. Check back in case someone cancels.</div>
      )}
      {state === "ended" && <div className="notice notice-amber">RSVP is closed for this event.</div>}
      {state === "cancelled" && <div className="notice notice-red">This event was cancelled by the organisers.</div>}
      {!isStudent && state !== "cancelled" && state !== "ended" && (
        <div className="notice notice-amber">You are signed in as an admin. Students RSVP from this page.</div>
      )}
      {result.error && <p className="error" role="alert" style={{ marginTop: 10 }}>{result.error}</p>}
    </div>
  );
}
