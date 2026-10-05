import Link from "next/link";
import { CalendarDays, MapPin, Search } from "lucide-react";
import { db } from "@/db";
import { CATEGORIES, type Category } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { listEvents } from "@/lib/queries";
import { campusDay, now as getNow } from "@/lib/today";
import { eventPhase } from "@/lib/events";
import { fmtLongDay, fmtTime } from "@/lib/format";
import { TopBar, Footer } from "@/components/TopBar";
import { EventCard, StatusPill } from "@/components/EventCard";
import { Avatars } from "@/components/Avatars";
import { LiveRefresh } from "@/components/LiveRefresh";

function greeting(d: Date) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(d));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Home(props: PageProps<"/">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const cat = typeof sp.category === "string" && (CATEGORIES as readonly string[]).includes(sp.category) ? (sp.category as Category) : "";
  const when = sp.when === "past" ? "past" : "upcoming";
  const now = getNow();
  const list = await listEvents(db(), user.id, { q, category: cat, when }, now);
  const filtering = !!q || !!cat || when === "past";
  const today = campusDay(now);
  const todays = filtering ? [] : list.filter((e) => campusDay(e.startsAt) === today && e.status === "scheduled");
  const rest = filtering ? list : list.filter((e) => !todays.includes(e));
  const featured = filtering ? null : rest.find((e) => e.status === "scheduled" && eventPhase(e, now) === "upcoming");
  const grid = featured ? rest.filter((e) => e.id !== featured.id) : rest;
  const link = (o: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(cat ? { category: cat } : {}), ...(when === "past" ? { when } : {}), ...o });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      <TopBar user={user} active="events" />
      <LiveRefresh seconds={5} />
      <main className="container">
        <section className="greet">
          <img className="spark" src="/logo.svg" alt="" />
          <h1>
            {greeting(now)}, {user.name.split(" ")[user.role === "admin" ? 1 : 0]}
          </h1>
          <p>{fmtLongDay(now)}. Here is what is happening on campus.</p>
          <form className="composer" action="/" role="search">
            <Search size={19} className="muted" />
            <input name="q" defaultValue={q} placeholder="Search events, venues or topics" aria-label="Search events" />
            {cat && <input type="hidden" name="category" value={cat} />}
            {when === "past" && <input type="hidden" name="when" value="past" />}
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
          <div className="chips" role="group" aria-label="Filter by category">
            <Link className="chip" href={link({ category: "" })} aria-pressed={!cat}>All</Link>
            {CATEGORIES.map((c) => (
              <Link key={c} className="chip" href={link({ category: c })} aria-pressed={cat === c}>{c}</Link>
            ))}
          </div>
        </section>

        {todays.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Today</h2></div>
            <div className="today-list">
              {todays.map((e) => (
                <Link href={`/events/${e.id}`} key={e.id} className="today-item" data-testid="today-item">
                  <img src={e.bannerUrl} alt="" />
                  <div style={{ minWidth: 0 }}>
                    <b>{e.title}</b>
                    <span className="muted" style={{ fontSize: 13 }}>{fmtTime(e.startsAt)} · {e.going} going</span>
                    <div style={{ marginTop: 4 }}><StatusPill e={e} now={now} /></div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {featured && (
          <section className="section">
            <div className="section-head"><h2>Up next</h2></div>
            <Link href={`/events/${featured.id}`} className="featured" data-testid="featured">
              <div className="media"><img src={featured.bannerUrl} alt="" /></div>
              <div className="body">
                <span className="pill pill-accent" style={{ alignSelf: "flex-start" }}>{featured.category}</span>
                <h3>{featured.title}</h3>
                <p className="muted">{featured.description.slice(0, 180)}{featured.description.length > 180 ? "..." : ""}</p>
                <div className="meta"><CalendarDays size={15} /><span>{fmtLongDay(featured.startsAt)}, {fmtTime(featured.startsAt)}</span></div>
                <div className="meta"><MapPin size={15} /><span>{featured.venue}</span></div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Avatars people={featured.preview} total={featured.going} />
                  <span className="btn btn-dark btn-sm">View event</span>
                </div>
              </div>
            </Link>
          </section>
        )}

        <section className="section">
          <div className="section-head">
            <h2>{q ? `Results for "${q}"` : when === "past" ? "Past events" : cat ? `${cat} events` : "Coming up"}</h2>
            <nav className="tabs" aria-label="Time">
              <Link href={link({ when: "" })} aria-current={when === "upcoming" ? "page" : undefined}>Upcoming</Link>
              <Link href={link({ when: "past" })} aria-current={when === "past" ? "page" : undefined}>Past</Link>
            </nav>
          </div>
          {grid.length ? (
            <div className="grid">
              {grid.map((e) => <EventCard key={e.id} e={e} now={now} />)}
            </div>
          ) : (
            <div className="empty">
              <img src="/logo.svg" alt="" style={{ width: 40, margin: "0 auto" }} />
              <h3>No events found</h3>
              <p className="muted">Try another search or category.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
