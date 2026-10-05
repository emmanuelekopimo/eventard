import Link from "next/link";
import { Check, Clock, MapPin } from "lucide-react";
import type { EventCard as EventCardData } from "@/lib/queries";
import { eventPhase, isAlmostFull, spotsLeft } from "@/lib/events";
import { fmtDate, fmtDay, fmtMonth, fmtTime } from "@/lib/format";
import { Avatars } from "./Avatars";

export function StatusPill({ e, now }: { e: EventCardData; now: Date }) {
  const phase = eventPhase(e, now);
  if (phase === "cancelled") return <span className="pill pill-red">Cancelled</span>;
  if (phase === "live") return <span className="pill pill-green"><span className="live-dot" /> Happening now</span>;
  if (phase === "ended") return <span className="pill">Ended</span>;
  const left = spotsLeft(e.capacity, e.going);
  if (left === 0) return <span className="pill pill-red">Full</span>;
  if (isAlmostFull(e.capacity, e.going)) return <span className="pill pill-amber">{left} spots left</span>;
  return null;
}

export function EventCard({ e, now }: { e: EventCardData; now: Date }) {
  return (
    <Link href={`/events/${e.id}`} className="card" data-testid="event-card">
      <div className="card-media">
        <img src={e.bannerUrl} alt="" loading="lazy" />
        <div className="date-badge">
          <div className="m">{fmtMonth(e.startsAt)}</div>
          <div className="d">{fmtDate(e.startsAt)}</div>
        </div>
        <div className="card-flag">
          <StatusPill e={e} now={now} />
        </div>
      </div>
      <div className="card-body">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="pill pill-accent">{e.category}</span>
          {e.hasRsvp && (
            <span className="pill pill-green">
              <Check size={12} /> Going
            </span>
          )}
        </div>
        <h3>{e.title}</h3>
        <div className="meta">
          <Clock size={14} />
          <span>
            {fmtDay(e.startsAt)}, {fmtTime(e.startsAt)}
          </span>
        </div>
        <div className="meta">
          <MapPin size={14} />
          <span>{e.venue}</span>
        </div>
        <div className="card-foot">
          <Avatars people={e.preview} total={e.going} />
          {e.capacity && <span className="muted" style={{ fontSize: 12.5 }}>of {e.capacity}</span>}
        </div>
      </div>
    </Link>
  );
}
