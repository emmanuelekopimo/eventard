import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft, CalendarDays, CalendarPlus, Clock, MapPin, Pencil, Tag, Users } from "lucide-react";
import { db } from "@/db";
import { requireUser } from "@/lib/session";
import { attendees, getEvent } from "@/lib/queries";
import { now as getNow } from "@/lib/today";
import { rsvpState, eventPhase, relativeDayLabel } from "@/lib/events";
import { googleCalendarUrl } from "@/lib/calendar";
import { fmtLongDay, fmtRange } from "@/lib/format";
import { avatarUri } from "@/lib/avatar";
import { TopBar, Footer } from "@/components/TopBar";
import { StatusPill } from "@/components/EventCard";
import { RsvpPanel } from "@/components/RsvpPanel";
import { LiveRefresh } from "@/components/LiveRefresh";

export default async function EventPage(props: PageProps<"/events/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const e = await getEvent(db(), user.id, Number(id));
  if (!e) notFound();
  const now = getNow();
  const state = rsvpState(e, e.going, e.hasRsvp, now);
  const phase = eventPhase(e, now);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const calUrl = googleCalendarUrl(e, `${origin}/events/${e.id}`);
  const people = user.role === "admin" ? await attendees(db(), e.id) : [];

  return (
    <>
      <TopBar user={user} active={user.role === "admin" ? "admin" : "events"} />
      <LiveRefresh seconds={4} />
      <main className="container">
        <div className="detail">
          <article>
            <Link href="/" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}><ArrowLeft size={15} /> All events</Link>
            {sp.created && <div className="notice notice-green" style={{ marginBottom: 14 }}>Event published. Students can see it now.</div>}
            {sp.updated && <div className="notice notice-green" style={{ marginBottom: 14 }}>Changes saved.</div>}
            <div className="banner"><img src={e.bannerUrl} alt="" /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              <span className="pill pill-accent"><Tag size={12} /> {e.category}</span>
              <span className="pill">{relativeDayLabel(e.startsAt, now)}</span>
              <StatusPill e={e} now={now} />
            </div>
            <h1 data-testid="event-title">{e.title}</h1>
            <div className="facts">
              <div className="fact"><CalendarDays size={18} /><div><b>{fmtLongDay(e.startsAt)}</b><span className="muted">Date</span></div></div>
              <div className="fact"><Clock size={18} /><div><b>{fmtRange(e.startsAt, e.endsAt)}</b><span className="muted">West Africa Time</span></div></div>
              <div className="fact"><MapPin size={18} /><div><b>{e.venue}</b><span className="muted">Venue</span></div></div>
              <div className="fact"><Users size={18} /><div><b>{e.capacity ? `${e.capacity} seats` : "Open to all"}</b><span className="muted">Capacity</span></div></div>
            </div>
            <p className="prose">{e.description}</p>
          </article>
          <aside className="side">
            <RsvpPanel eventId={e.id} going={e.going} capacity={e.capacity} state={state.kind} isStudent={user.role === "student"} />
            {phase !== "ended" && phase !== "cancelled" && (
              <a className="btn btn-ghost btn-block" href={calUrl} target="_blank" rel="noopener noreferrer" data-testid="gcal">
                <CalendarPlus size={18} /> Add to Google Calendar
              </a>
            )}
            {user.role === "admin" && (
              <Link className="btn btn-dark btn-block" href={`/admin/events/${e.id}/edit`}><Pencil size={16} /> Edit event</Link>
            )}
            <div className="panel">
              <h3>{user.role === "admin" ? `Attendees (${people.length})` : "Who is going"}</h3>
              <div className="people">
                {(user.role === "admin" ? people.slice(0, 12).map((x) => ({ name: x.name, sub: `${x.department}, ${x.level}L` })) : e.preview.map((x) => ({ name: x.name, sub: "" }))).map((p) => (
                  <div className="person" key={p.name}>
                    <img src={avatarUri(p.name)} alt="" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.sub && <div className="muted" style={{ fontSize: 12.5 }}>{p.sub}</div>}
                    </div>
                  </div>
                ))}
                {e.going === 0 && <p className="muted">No RSVPs yet. Be the first.</p>}
                {user.role !== "admin" && e.going > e.preview.length && (
                  <p className="muted" style={{ fontSize: 13 }}>and {e.going - e.preview.length} others</p>
                )}
                {user.role === "admin" && people.length > 12 && (
                  <p className="muted" style={{ fontSize: 13 }}>and {people.length - 12} more</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
