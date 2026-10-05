import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { requireAdmin } from "@/lib/session";
import { adminOverview } from "@/lib/queries";
import { now as getNow } from "@/lib/today";
import { eventPhase } from "@/lib/events";
import { fmtDay, fmtTime } from "@/lib/format";
import { TopBar, Footer } from "@/components/TopBar";
import { LiveRefresh } from "@/components/LiveRefresh";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminPage(props: PageProps<"/admin">) {
  const user = await requireAdmin();
  const sp = await props.searchParams;
  const now = getNow();
  const { rows, stats } = await adminOverview(db(), now);
  const show = sp.show === "past" ? "past" : "upcoming";
  const visible = rows
    .filter((r) => (show === "past" ? r.endsAt <= now : r.endsAt > now))
    .sort((a, b) => (show === "past" ? +b.startsAt - +a.startsAt : +a.startsAt - +b.startsAt));
  return (
    <>
      <TopBar user={user} active="admin" />
      <LiveRefresh seconds={6} />
      <main className="container">
        <div className="page-head">
          <div>
            <h1>Events dashboard</h1>
            <p className="muted" style={{ marginTop: 6 }}>Publish events and watch RSVPs come in.</p>
          </div>
          <Link href="/admin/events/new" className="btn btn-primary" data-testid="new-event"><Plus size={18} /> New event</Link>
        </div>
        {sp.deleted && <div className="notice notice-green" style={{ marginBottom: 16 }}>Event deleted.</div>}
        <div className="stats">
          <div className="stat"><div className="n">{stats.upcoming}</div><div className="l">Upcoming events</div></div>
          <div className="stat"><div className="n">{stats.thisWeek}</div><div className="l">In the next 7 days</div></div>
          <div className="stat"><div className="n">{stats.upcomingRsvps}</div><div className="l">RSVPs for upcoming events</div></div>
          <div className="stat"><div className="n">{stats.full}</div><div className="l">Upcoming events at capacity</div></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
          <h2 style={{ fontSize: 22 }}>{show === "past" ? "Past events" : "Upcoming events"}</h2>
          <nav className="tabs">
            <Link href="/admin" aria-current={show === "upcoming" ? "page" : undefined}>Upcoming</Link>
            <Link href="/admin?show=past" aria-current={show === "past" ? "page" : undefined}>Past</Link>
          </nav>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Event</th><th>When</th><th>RSVPs</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const phase = eventPhase(r, now);
                const pct = r.capacity ? Math.min(100, Math.round((r.going / r.capacity) * 100)) : null;
                return (
                  <tr key={r.id} data-testid="admin-row">
                    <td>
                      <div className="ev-cell">
                        <img src={r.bannerUrl} alt="" />
                        <div><b>{r.title}</b><span className="muted" style={{ fontSize: 12.5 }}>{r.venue}</span></div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDay(r.startsAt)}<br /><span className="muted">{fmtTime(r.startsAt)}</span></td>
                    <td>
                      <b>{r.going}</b>{r.capacity ? <span className="muted"> / {r.capacity}</span> : null}
                      {pct != null && <div className={`bar mini-bar ${pct >= 100 ? "full" : ""}`} style={{ marginTop: 5 }}><i style={{ width: `${pct}%` }} /></div>}
                    </td>
                    <td>
                      {phase === "cancelled" ? <span className="pill pill-red">Cancelled</span>
                        : phase === "live" ? <span className="pill pill-green">Live</span>
                        : phase === "ended" ? <span className="pill">Ended</span>
                        : r.capacity && r.going >= r.capacity ? <span className="pill pill-red">Full</span>
                        : <span className="pill pill-accent">Open</span>}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <Link className="btn btn-ghost btn-sm" href={`/events/${r.id}`}>View</Link>{" "}
                      <Link className="btn btn-ghost btn-sm" href={`/admin/events/${r.id}/edit`}>Edit</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </>
  );
}
