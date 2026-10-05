/**
 * Rebuilds docs/Eventard-Documentation.pdf.
 *   npm run build && npm run test:e2e && npm run docs:pdf
 * Uses the test database (reseeded with EVENTARD_TODAY=2026-10-05) so screenshots are repeatable.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Page } from "@playwright/test";
import { createPool, makeDb } from "../src/db";
import { resetDb, seed } from "../src/db/seed-data";
import { resolveNow } from "../src/lib/today";
import { baseCss, capture, figure, fontFace, printPdf, type Shot } from "./pdf-engine";

const require = createRequire(import.meta.url);
const TODAY = "2026-10-05";
const PORT = 3310;
const BASE = `http://localhost:${PORT}`;
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/eventard_test";
const C = { accent: "#c15f3c" };

async function reseed() {
  const pool = createPool(DB_URL);
  const d = makeDb(pool);
  await migrate(d, { migrationsFolder: "drizzle" });
  await resetDb(d);
  const r = await seed(d, resolveNow(TODAY));
  await pool.end();
  return r;
}

async function waitHealthy() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start");
}

function testCounts() {
  execSync("npx vitest run --reporter=json --outputFile=test-results/vitest.json", { stdio: "ignore" });
  const v = JSON.parse(readFileSync("test-results/vitest.json", "utf8"));
  const files = v.testResults as { name: string; assertionResults: { status: string }[] }[];
  const count = (dir: string) => files.filter((f) => f.name.includes(`/tests/${dir}/`)).reduce((s, f) => s + f.assertionResults.filter((a) => a.status === "passed").length, 0);
  let e2e = { passed: 0, total: 0, mobile: 0 };
  if (existsSync("test-results/e2e.json")) {
    const p = JSON.parse(readFileSync("test-results/e2e.json", "utf8"));
    e2e = { passed: p.stats.expected, total: p.stats.expected + p.stats.unexpected + p.stats.flaky, mobile: 0 };
    const walk = (s: { specs?: { tests: { projectName: string }[] }[]; suites?: unknown[] }): void => {
      for (const sp of s.specs ?? []) for (const t of sp.tests) if (t.projectName === "mobile") e2e.mobile++;
      for (const c of (s.suites ?? []) as typeof s[]) walk(c);
    };
    for (const s of p.suites) walk(s);
  }
  return { unit: count("unit"), integration: count("integration"), vitestFailed: v.numFailedTests as number, e2e };
}

const login = async (page: Page, as: string) => {
  await page.goto(`${BASE}/login`);
  if (as === "admin") await page.getByTestId("use-admin").click();
  await page.getByTestId("sign-in").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
};

async function main() {
  // Run the test suites first: integration tests reuse and change the test database.
  const counts = testCounts();
  const seeded = await reseed();
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    env: { ...process.env, DATABASE_URL: DB_URL, EVENTARD_TODAY: TODAY, SESSION_SECRET: "docs-secret-eventard-0123456789", NODE_ENV: "production" },
    stdio: "ignore",
  });
  try {
    await waitHealthy();
    const featured = async (page: Page) => {
      await page.goto(`${BASE}/`);
      return page.getByTestId("featured").getAttribute("href");
    };
    const shots: Shot[] = [
      {
        key: "login", path: "/login", callouts: [
          { selector: "#email", text: "Email field, prefilled with the demo student account so the presenter can sign in with one click." },
          { selector: ".demo-box", text: "Demo accounts panel. The Use admin button swaps the fields to the Student Affairs admin login." },
          { selector: "[data-testid=sign-in]", text: "Sign in posts to a Server Action that checks the bcrypt hash and sets a signed JWT in an HTTP-only cookie." },
          { selector: ".auth-art .quote", text: "Brand panel with a real campus concert photo (Creative Commons, stored locally)." },
        ],
      },
      {
        key: "home", path: "/", as: "student", callouts: [
          { selector: ".greet h1", text: "Personal greeting using the student's first name and the campus time of day (Africa/Lagos)." },
          { selector: ".composer", text: "Search box. Matches event titles, venues and descriptions with a case-insensitive query." },
          { selector: ".chips", text: "Category filter chips. The active chip is dark; the filter is kept in the URL so it can be shared." },
          { selector: "[data-testid=today-item]", text: "Today strip: events on the current campus day with their start time and live RSVP count." },
          { selector: "[data-testid=featured]", text: "Up next: the nearest upcoming event, shown large so the demo starts from it." },
        ],
      },
      {
        key: "grid", path: "/", as: "student", scrollTo: ".section-head h2:text('Coming up')", callouts: [
          { selector: ".tabs", text: "Upcoming and Past tabs. Past events keep their RSVP history but cannot be booked." },
          { selector: "[data-testid=event-card] .date-badge", text: "Date badge in campus time." },
          { selector: "[data-testid=event-card] .card-flag .pill", text: "Status flag computed by eventPhase and isAlmostFull: Full, a few spots left, Happening now or Cancelled." },
          { selector: "[data-testid=event-card] .avatars", text: "Avatar stack of the latest attendees with the total going. Avatars are generated locally with DiceBear." },
        ],
      },
      {
        key: "detail", path: "/events/17", as: "student", prepare: async (p) => { const h = await featured(p); await p.goto(`${BASE}${h}`); }, callouts: [
          { selector: ".banner", text: "Event banner." },
          { selector: ".facts", text: "Date, time range (West Africa Time), venue and capacity." },
          { selector: "[data-testid=rsvp-count]", text: "Live count. The page calls router.refresh() every 4 seconds so other students' RSVPs show up without a reload." },
          { selector: "[data-testid=rsvp-button]", text: "RSVP button. It runs a Server Action that locks the event row, re-checks capacity and inserts the RSVP." },
          { selector: "[data-testid=gcal]", text: "Add to Google Calendar. A plain link with the title, UTC dates, description and venue URL-encoded. No Google API key is needed." },
        ],
      },
      {
        key: "going", path: "/", as: "student", prepare: async (p) => { const h = await featured(p); await p.goto(`${BASE}${h}`); await p.getByTestId("rsvp-button").click(); await p.getByText("You are going").waitFor(); }, callouts: [
          { selector: "[data-testid=rsvp-count]", text: "The count went from 37 to 38 straight after the click." },
          { selector: "[data-testid=rsvp-button]", text: "The button turns green. Tapping it again cancels the RSVP and frees the seat." },
          { selector: ".bar", text: "Capacity bar: 38 of 60 seats taken." },
        ],
      },
      {
        key: "my", path: "/my", as: "student", callouts: [
          { selector: ".page-head h1", text: "My RSVPs only ever queries rows where user_id is the signed-in student." },
          { selector: ".grid .btn-ghost", text: "A calendar button under each upcoming booking." },
          { selector: "[data-testid=event-card] .pill-green", text: "Going badge." },
        ],
      },
      {
        key: "admin", path: "/admin", as: "admin", callouts: [
          { selector: ".stats", text: "Dashboard numbers: upcoming events, events in the next 7 days, RSVPs for upcoming events and events at capacity." },
          { selector: "[data-testid=new-event]", text: "New event button." },
          { selector: "[data-testid=admin-row] .bar", text: "Fill bar for events with a capacity. It turns red at 100 percent." },
          { selector: ".pill-red", text: "Full and Cancelled states are easy to spot." },
          { selector: ".tabs", text: "Switch between upcoming and past events." },
        ],
      },
      {
        key: "form", path: "/admin/events/new", as: "admin", height: 1200, prepare: async (p) => { await p.getByTestId("save-event").click(); await p.getByText("Title must be at least 4 characters").waitFor(); }, callouts: [
          { selector: ".form-error", text: "Summary message when the form has problems." },
          { selector: ".field[data-invalid=true] .error", text: "Inline field errors from the Zod schema, shown under each input." },
          { selector: "#startsAt", text: "Start and end use datetime-local inputs in campus time. Business rules reject past starts, ends before starts and events longer than 3 days." },
          { selector: ".presets", text: "Banner library of real photos. Admins can also upload a JPG, PNG or WebP up to 3 MB, which is stored in Postgres." },
        ],
      },
      {
        key: "mhome", path: "/", as: "student", mobile: true, callouts: [
          { selector: ".nav", text: "On phones the navigation collapses to icons." },
          { selector: ".composer", text: "Search stays full width." },
          { selector: "[data-testid=today-item]", text: "Cards stack into one column; no sideways scrolling (checked in the mobile e2e test)." },
        ],
      },
      {
        key: "mdetail", path: "/", as: "student", mobile: true, scrollTo: "[data-testid=rsvp-panel]", prepare: async (p) => { const h = await featured(p); await p.goto(`${BASE}${h}`); }, callouts: [
          { selector: "[data-testid=rsvp-panel]", text: "On mobile the RSVP panel follows the event details." },
          { selector: "[data-testid=gcal]", text: "Calendar button, full width for easy tapping." },
        ],
      },
    ];
    const caps = await capture(BASE, shots, login);
    const nodeFont = (p: string) => require.resolve(p);
    const fonts =
      fontFace("Serif", nodeFont("@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2")) +
      fontFace("Sans", nodeFont("@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2"));
    const css = baseCss({ bg: "#faf9f5", ink: "#141413", muted: "#73726c", line: "#e2dfd3", accent: C.accent, head: '"Serif", Georgia, serif', body: '"Sans", sans-serif' });
    const fig = (k: string, cap: string) => figure(caps[k], cap, C.accent);
    const logo = readFileSync("public/logo.svg", "utf8");
    const e2eLine = counts.e2e.total
      ? `${counts.e2e.passed} of ${counts.e2e.total} passed (${counts.e2e.total - counts.e2e.mobile} desktop, ${counts.e2e.mobile} mobile)`
      : "run npm run test:e2e first";

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}${css}
      .cover h1{font-size:40pt;margin-top:30mm} .logo svg{width:64px;height:64px}</style></head><body>
<section class="cover">
  <div>
    <div class="logo">${logo}</div>
    <h1>Eventard</h1>
    <p style="font-size:15pt" class="muted">Campus event board with live RSVPs and Add to Google Calendar</p>
    <p style="margin-top:14mm">A 300-level project for the University of Uyo. Students browse events, RSVP and save them to their calendar.
    Student Affairs publishes events that appear on every open board within seconds.</p>
    <div class="kpis">
      <div class="kpi"><b>${seeded.events}</b>seeded events</div>
      <div class="kpi"><b>${seeded.users}</b>users (2 admins)</div>
      <div class="kpi"><b>${seeded.rsvps}</b>RSVPs</div>
    </div>
    <h3>Contents</h3>
    <ol class="toc"><li>Overview</li><li>How the core logic works</li><li>Architecture and data model</li><li>Screen walkthrough</li><li>Mobile view</li><li>Running locally</li><li>Testing</li><li>Deployment</li><li>Five minute presentation script</li></ol>
  </div>
  <p class="muted">Demo logins: student@uniuyo.edu.ng / student123 and admin@uniuyo.edu.ng / admin123. Screens captured with the clock frozen at ${TODAY}.</p>
</section>

<section class="section"><h2>1. Overview</h2>
<p>Students miss campus events because announcements are scattered across WhatsApp groups and notice boards. Eventard puts them on one board.</p>
<table><tr><th>Who</th><th>What they can do</th></tr>
<tr><td>Student</td><td>Browse upcoming and past events, search and filter by category, RSVP or cancel, see the live count and who is going, add an event to Google Calendar, see their own RSVPs.</td></tr>
<tr><td>Admin (Student Affairs)</td><td>See dashboard numbers, publish events with a banner (upload or library), edit, cancel, restore or delete events, and see the full attendee list.</td></tr></table>
<h3>Features</h3>
<ul><li>Live RSVP count without a page reload (server re-render every 4 to 6 seconds).</li>
<li>Capacity limits that cannot be overbooked, even when students click at the same moment.</li>
<li>Add to Google Calendar with no API key.</li>
<li>Full, almost full, live, ended and cancelled states.</li>
<li>Inline form validation with Zod.</li>
<li>Works on phones.</li></ul>
<h3>Design</h3><p>The interface follows the visual style of Claude: warm ivory background, serif headings (Source Serif 4), a clean sans body (Instrument Sans), soft borders and a terracotta accent. It is a normal web app, not a chatbot.</p>
</section>

<section class="section"><h2>2. How the core logic works</h2>
<p>All business rules are pure functions in <code>src/lib/</code>. They take "now" as an argument, so the tests and the demo can freeze the clock with <code>EVENTARD_TODAY=YYYY-MM-DD</code> (the clock is then 10:00 Lagos time on that day).</p>
<h3>Event phase</h3>
<pre>eventPhase(event, now)
  cancelled  if status is cancelled
  upcoming   if now &lt; starts_at
  live       if starts_at &lt;= now &lt; ends_at
  ended      otherwise</pre>
<h3>Can this student RSVP?</h3>
<pre>rsvpState(event, goingCount, hasRsvp, now)
  cancelled or ended  -&gt; closed
  hasRsvp             -&gt; "going" (button cancels)
  live                -&gt; closed for new RSVPs
  capacity reached    -&gt; "full"
  otherwise           -&gt; "open"</pre>
<h3>No overbooking</h3>
<p><code>toggleRsvp</code> runs in a database transaction. It first runs <code>SELECT ... FOR UPDATE</code> on the event row, so two requests for the same event wait for each other. It then counts RSVPs, applies <code>rsvpState</code> and inserts or deletes. A unique constraint on (event_id, user_id) stops duplicates. The integration test fires 10 RSVPs at a 3 seat event at once and checks exactly 3 succeed.</p>
<h3>Add to Google Calendar</h3>
<pre>https://calendar.google.com/calendar/render?action=TEMPLATE
  &amp;text=Code%20and%20Coffee%3A%20Build%20a%20Web%20App%20with%20Next.js
  &amp;dates=20261006T130000Z/20261006T160000Z
  &amp;details=...&amp;location=ICT%20Centre%2C%20Lab%202%2C%20Town%20Campus</pre>
<p>Times are stored as timestamptz. <code>toGoogleDate</code> converts to UTC and strips punctuation, so 2:00 pm Lagos becomes 130000Z. Every text field goes through <code>encodeURIComponent</code>.</p>
<h3>Live updates</h3>
<p>A tiny client component, <code>LiveRefresh</code>, calls <code>router.refresh()</code> on a timer while the tab is visible. Next.js re-renders the Server Components and sends only the changed parts, so the count and new events appear without a reload. Server Actions also call <code>revalidatePath</code> so the person who clicked sees the change at once.</p>
<h3>Sessions</h3>
<p>Passwords are hashed with bcryptjs. On sign in the server sets a JWT signed with HS256 (jose) in an HTTP-only, SameSite=Lax cookie. <code>src/proxy.ts</code> redirects visitors without a valid token, and every page and Server Action checks the session again on the server.</p>
</section>

<section class="section"><h2>3. Architecture and data model</h2>
<div class="diagram">
<div class="node"><b>Browser</b>Server-rendered pages, small client components for forms, RSVP and live refresh.</div>
<div class="node"><b>Next.js 16 (App Router)</b>Server Components read data. Server Actions change it. proxy.ts guards routes. /api/health pings the database.</div>
<div class="node"><b>PostgreSQL</b>Drizzle ORM with versioned SQL migrations from drizzle-kit.</div>
</div>
<table><tr><th>Folder</th><th>Contents</th></tr>
<tr><td>src/app</td><td>Routes: /login, / (board), /events/[id], /my, /admin, /admin/events/new, /admin/events/[id]/edit, /api/health, /api/images/[id]</td></tr>
<tr><td>src/app/actions</td><td>Server Actions: login, logout, RSVP, create, update, cancel, delete</td></tr>
<tr><td>src/lib</td><td>Pure rules (events.ts, calendar.ts, today.ts, format.ts), validation, auth, queries</td></tr>
<tr><td>src/db</td><td>Drizzle schema, connection pool, seed data</td></tr>
<tr><td>drizzle/</td><td>Generated SQL migrations</td></tr>
<tr><td>tests/, e2e/</td><td>Vitest unit and integration tests, Playwright end-to-end tests</td></tr></table>
<h3>Tables</h3>
<table><tr><th>Table</th><th>Columns</th><th>Rules</th></tr>
<tr><td>users</td><td>id, name, email, password_hash, role (student or admin), department, level, created_at</td><td>email unique</td></tr>
<tr><td>events</td><td>id, title, description, category, venue, starts_at, ends_at, banner_url, capacity, status, created_by, created_at</td><td>ends_at &gt; starts_at, capacity null or positive, created_by references users</td></tr>
<tr><td>rsvps</td><td>id, event_id, user_id, created_at</td><td>unique (event_id, user_id), cascades on delete</td></tr>
<tr><td>uploads</td><td>id (uuid), mime, data (bytea), uploaded_by, created_at</td><td>Banners uploaded by admins, served by /api/images/[id]</td></tr></table>
<p>Uploaded banners are kept in Postgres rather than on disk because Railway containers have no persistent file system.</p>
</section>

<section class="section"><h2>4. Screen walkthrough</h2>
<h3>Sign in</h3>${fig("login", "Sign-in page with the demo login prefilled.")}
</section>
<section class="section"><h3>Event board</h3>${fig("home", "The board as the demo student sees it.")}</section>
<section class="section"><h3>Upcoming events grid</h3>${fig("grid", "Event cards with status flags and attendee avatars.")}</section>
<section class="section"><h3>Event page</h3>${fig("detail", "Event page before the student RSVPs.")}</section>
<section class="section"><h3>After RSVP</h3>${fig("going", "The same page right after clicking RSVP.")}</section>
<section class="section"><h3>My RSVPs</h3>${fig("my", "The student's own bookings.")}</section>
<section class="section"><h3>Admin dashboard</h3>${fig("admin", "Student Affairs dashboard.")}</section>
<section class="section"><h3>Publish an event</h3>${fig("form", "New event form after submitting it empty.")}</section>

<section class="section"><h2>5. Mobile view</h2>
<p>Layouts use CSS grid with <code>minmax(0, 1fr)</code> columns so long titles and tables never push the page wider than the screen. The mobile e2e test runs on a Pixel 7 profile and fails if the page scrolls sideways.</p>
${fig("mhome", "Board on a phone.")}
</section>
<section class="section">${fig("mdetail", "RSVP panel and calendar button on a phone.")}</section>

<section class="section"><h2>6. Running locally</h2>
<pre>service postgresql start
sudo -u postgres createdb eventard
sudo -u postgres createdb eventard_test
cp .env.example .env        # set DATABASE_URL and SESSION_SECRET
npm install
npm run db:migrate
npm run db:seed             # resets and seeds demo data relative to today
npm run dev                 # http://localhost:3000</pre>
<table><tr><th>Script</th><th>What it does</th></tr>
<tr><td>npm run dev / build / start</td><td>Next.js development server, production build, production server</td></tr>
<tr><td>npm run start:prod</td><td>Migrate, seed only if the database is empty, then next start on 0.0.0.0 (used by Railway)</td></tr>
<tr><td>npm run db:generate</td><td>Create a new SQL migration after editing src/db/schema.ts</td></tr>
<tr><td>npm run db:migrate / db:seed</td><td>Apply migrations / reset and seed</td></tr>
<tr><td>npm test, test:unit, test:integration, test:e2e</td><td>Run the test suites</td></tr>
<tr><td>npm run docs:pdf</td><td>Rebuild this PDF</td></tr></table>
<p>Set <code>EVENTARD_TODAY=2026-10-05</code> to freeze the clock for a rehearsal.</p>
</section>

<section class="section"><h2>7. Testing</h2>
<div class="kpis">
<div class="kpi"><b>${counts.unit}</b>unit tests passed</div>
<div class="kpi"><b>${counts.integration}</b>integration tests passed</div>
<div class="kpi"><b>${counts.e2e.passed}</b>e2e tests passed</div></div>
<table><tr><th>Suite</th><th>Tool</th><th>What it covers</th></tr>
<tr><td>Unit</td><td>Vitest</td><td>Event phases, RSVP rules, capacity helpers, campus day labels across UTC midnight, time validation, Google Calendar URL format and encoding, datetime-local conversion, Zod schemas, image checks, JWT signing and tampering.</td></tr>
<tr><td>Integration</td><td>Vitest + real Postgres (eventard_test)</td><td>Migrations and seed, RSVP toggle, full/past/cancelled refusals, unique constraint, 10 concurrent RSVPs for 3 seats, per-user scoping, search and category filters, admin stats and attendees, the end-after-start check constraint.</td></tr>
<tr><td>End to end</td><td>Playwright (desktop Chrome and Pixel 7)</td><td>Login redirect and prefill, wrong password, RSVP and live count, calendar link parameters, full event, inline form errors, admin publishes and a student's open board picks it up, mobile RSVP with no sideways scroll.</td></tr></table>
<p>Latest run: unit ${counts.unit}, integration ${counts.integration}, ${counts.vitestFailed} failed; e2e ${e2eLine}.</p>
<pre>npm run test:unit
npm run test:integration   # needs eventard_test
npm run test:e2e           # builds the app, seeds eventard_test with EVENTARD_TODAY=2026-10-05</pre>
</section>

<section class="section"><h2>8. Deployment</h2>
<p>Eventard runs on Railway in the <b>school-projects</b> project as its own service with its own PostgreSQL database (<b>eventard-postgres</b>). The GitHub repository is connected to the service, so every push to <code>main</code> deploys.</p>
<table><tr><th>Setting</th><th>Value</th></tr>
<tr><td>Build</td><td>npm run build</td></tr>
<tr><td>Start</td><td>npm run start:prod (migrate, seed if empty, next start -H 0.0.0.0)</td></tr>
<tr><td>Health check</td><td>/api/health (returns 503 if the database cannot be reached)</td></tr>
<tr><td>DATABASE_URL</td><td>\${{eventard-postgres.DATABASE_URL}}</td></tr>
<tr><td>SESSION_SECRET</td><td>random 48 byte value</td></tr>
<tr><td>NODE_ENV</td><td>production</td></tr></table>
<p>These settings live in <code>railway.json</code> in the repository.</p>
</section>

<section class="section"><h2>9. Five minute presentation script</h2>
<table class="script">
<tr><th>Time</th><th>What to do and say</th></tr>
<tr><td>0:00</td><td>Problem: event news is scattered across WhatsApp groups and notice boards, so students miss talks and fairs. Eventard is one board with RSVPs and calendar reminders.</td></tr>
<tr><td>0:30</td><td>Open the sign-in page. Point out the prefilled demo login. Sign in as the student. Show the greeting, the Today strip and the Up next card.</td></tr>
<tr><td>1:15</td><td>Search for "hackathon", then click the Tech chip. Clear the filter. Point out Full and spots-left flags on cards.</td></tr>
<tr><td>1:45</td><td>Open "Code and Coffee". Say the count is 37. Click RSVP: it jumps to 38 and the button turns green. Explain the row lock that stops overbooking.</td></tr>
<tr><td>2:30</td><td>Click Add to Google Calendar. Google opens with title, time, venue and description filled in. Explain the link is built from the event data, dates in UTC, no API key.</td></tr>
<tr><td>3:00</td><td>Open My RSVPs to show only this student's bookings.</td></tr>
<tr><td>3:20</td><td>In a second window sign in as admin. Show the dashboard numbers and the red Full bar for Robotics Club Open Day.</td></tr>
<tr><td>3:45</td><td>Click New event, submit empty to show inline errors, then fill it in, pick a banner and publish. Switch to the student window: the new event appears within a few seconds without reloading.</td></tr>
<tr><td>4:30</td><td>Architecture in one sentence each: Next.js Server Components and Server Actions, Drizzle with PostgreSQL, JWT cookie sessions, tests (quote the counts), deployed on Railway with a health check.</td></tr>
<tr><td>4:50</td><td>Close: what we would add next (email reminders, QR check-in at the door). Take questions.</td></tr></table>
</section>
<section style="page-break-before:always"><h3>Image credits</h3><p class="muted">All event photos are Creative Commons licensed images found through Openverse, resized and stored in public/images/events. Full credits with authors, licences and source links are in public/images/events/credits.json.</p></section>
</body></html>`;
    await printPdf(html, "docs/Eventard-Documentation.pdf", "Eventard documentation");
    console.log("wrote docs/Eventard-Documentation.pdf");
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
