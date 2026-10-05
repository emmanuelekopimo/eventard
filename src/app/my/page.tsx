import Link from "next/link";
import type { Metadata } from "next";
import { CalendarPlus } from "lucide-react";
import { db } from "@/db";
import { requireUser } from "@/lib/session";
import { myEvents } from "@/lib/queries";
import { now as getNow } from "@/lib/today";
import { splitByTime } from "@/lib/events";
import { googleCalendarUrl } from "@/lib/calendar";
import { TopBar, Footer } from "@/components/TopBar";
import { EventCard } from "@/components/EventCard";

export const metadata: Metadata = { title: "My RSVPs" };

export default async function MyPage() {
  const user = await requireUser();
  const now = getNow();
  const mine = await myEvents(db(), user.id);
  const { upcoming, past } = splitByTime(mine, now);
  return (
    <>
      <TopBar user={user} active="mine" />
      <main className="container">
        <div className="page-head">
          <div>
            <h1>My RSVPs</h1>
            <p className="muted" style={{ marginTop: 6 }}>
              {upcoming.length} upcoming, {past.length} attended. Only you can see this list.
            </p>
          </div>
          <Link href="/" className="btn btn-primary">Find more events</Link>
        </div>
        <section className="section">
          <div className="section-head"><h2>Upcoming</h2></div>
          {upcoming.length ? (
            <div className="grid">
              {upcoming.map((e) => (
                <div key={e.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <EventCard e={e} now={now} />
                  {e.status === "scheduled" && (
                    <a className="btn btn-ghost btn-sm" href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer">
                      <CalendarPlus size={15} /> Add to Google Calendar
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty"><h3>Nothing booked yet</h3><p className="muted">RSVP to an event and it will show here.</p></div>
          )}
        </section>
        {past.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Past</h2></div>
            <div className="grid">{past.map((e) => <EventCard key={e.id} e={e} now={now} />)}</div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
