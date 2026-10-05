import { sql } from "drizzle-orm";
import type { DB } from "./index";
import { events, rsvps, users, type Category } from "./schema";
import { atCampusTime, campusDay } from "@/lib/today";
import { hashPassword } from "@/lib/auth";

export const DEMO_STUDENT = { email: "student@uniuyo.edu.ng", password: "student123" };
export const DEMO_ADMIN = { email: "admin@uniuyo.edu.ng", password: "admin123" };

const DEPTS = [
  "Computer Science",
  "Electrical Engineering",
  "Mass Communication",
  "Economics",
  "Microbiology",
  "Law",
  "Accounting",
  "Theatre Arts",
  "Pharmacy",
  "Architecture",
  "Biochemistry",
  "Political Science",
];

const STUDENT_NAMES = [
  "Ekemini Bassey", "Aniekan Etim", "Uduak Akpan", "Ifiok Essien", "Mfon Okon", "Nsikak Inyang",
  "Idara Umoh", "Emem Ekanem", "Ubong Edet", "Eno Archibong", "Kufre Ekpo", "Itoro Akpabio",
  "Chiamaka Okafor", "Tunde Adeyemi", "Fatima Bello", "Emeka Nwosu", "Zainab Yusuf", "Chinedu Eze",
  "Ngozi Obi", "Seun Ogunleye", "Halima Abubakar", "Tobi Adebayo", "Amaka Nnaji", "Ibrahim Musa",
  "Blessing Ogbu", "Kelechi Uche", "Funmilayo Alade", "Yusuf Danjuma", "Adaeze Ibe", "Femi Oladipo",
  "Ruth Ekong", "Godswill Udoh", "Precious Etuk", "Samuel Akpanudo", "Grace Offiong", "Daniel Ebong",
  "Joy Nkanta", "Victor Ukpong", "Mercy Ekwere", "Emmanuel Asuquo", "Esther Udofia", "Patrick Obot",
  "Comfort Ikpe", "Michael Ekpenyong", "Favour Udo", "Joshua Akpan", "Deborah Ita",
];

type SeedEvent = {
  title: string;
  category: Category;
  venue: string;
  day: number;
  start: string;
  hours: number;
  banner: string;
  capacity?: number;
  cancelled?: boolean;
  /** Target RSVP count (clamped to capacity and number of students). */
  going: number;
  description: string;
};

export const SEED_EVENTS: SeedEvent[] = [
  // Past events
  { title: "Freshers Welcome Orientation", category: "Academic", venue: "Main Auditorium, Main Campus", day: -29, start: "09:00", hours: 4, banner: "auditorium", going: 44, description: "Orientation for new students: registration steps, hostel rules, library access and a walk through the student portal. Heads of departments will be present to answer questions." },
  { title: "Inter-Faculty Football: Science vs Engineering", category: "Sports", venue: "Sports Complex, Main Campus", day: -25, start: "16:00", hours: 2, banner: "football-match", going: 39, description: "Opening match of the inter-faculty league. Come out in your faculty colours and support your team. Water and first aid will be available at the pitch." },
  { title: "CV Clinic with Career Services", category: "Career", venue: "Students' Union Building, Room 4", day: -21, start: "11:00", hours: 3, banner: "career-booth", capacity: 40, going: 40, description: "Bring a printed copy of your CV. Career Services staff will review it with you one on one and show you how to tailor it for internships and graduate trainee roles." },
  { title: "Python for Data Analysis Bootcamp", category: "Tech", venue: "ICT Centre, Town Campus", day: -18, start: "10:00", hours: 5, banner: "hackathon-laptops", capacity: 50, going: 47, description: "A hands-on day covering pandas, cleaning messy spreadsheets and making simple charts. Bring a laptop with Python installed. Lunch is provided for registered participants." },
  { title: "Ibibio Cultural Day", category: "Culture", venue: "Faculty of Arts Amphitheatre", day: -15, start: "12:00", hours: 5, banner: "cultural-dance", going: 46, description: "A celebration of Ibibio heritage with traditional dance troupes, local food stands and a short talk on the history of Akwa Ibom crafts. Native attire is encouraged." },
  { title: "Public Lecture: Renewable Energy for Nigeria", category: "Academic", venue: "Faculty of Science Lecture Theatre", day: -12, start: "14:00", hours: 2, banner: "public-lecture", going: 31, description: "A visiting professor discusses solar mini-grids, the state of the national grid and what engineering graduates can build in the next ten years. Questions are welcome at the end." },
  { title: "Campus Blood Donation Drive", category: "Wellness", venue: "University Health Centre", day: -10, start: "09:00", hours: 6, banner: "blood-drive", going: 28, description: "Organised with the state blood bank. Eat a good breakfast and bring a valid ID. Every donor gets a free health check and a snack pack." },
  { title: "Chess Open Tournament", category: "Sports", venue: "Students' Union Building, Games Room", day: -8, start: "10:00", hours: 6, banner: "chess", capacity: 32, going: 32, description: "Swiss format, 7 rounds, 15 minutes per player. Beginners are welcome. Boards and clocks are provided by the Chess Club." },
  { title: "Theatre Arts Showcase: The Gods Are Not to Blame", category: "Arts", venue: "University Theatre, Town Campus", day: -6, start: "18:00", hours: 3, banner: "drama-stage", going: 45, description: "Final year Theatre Arts students stage Ola Rotimi's classic. Doors open 30 minutes before the performance. Seating is first come, first served." },
  { title: "Women in Tech Panel", category: "Tech", venue: "ICT Centre, Town Campus", day: -4, start: "15:00", hours: 2, banner: "tech-panel", going: 26, description: "Four engineers and founders share how they got their first jobs, what they wish they had learned in school and how to find mentors. Open to all students." },
  { title: "Gospel Night with the University Choir", category: "Culture", venue: "Chapel of Redemption, Main Campus", day: -3, start: "18:30", hours: 3, banner: "concert-glow", going: 41, description: "An evening of praise and worship led by the University Choir and guest ministers. Everyone is welcome." },
  { title: "Moot Court Competition: Preliminary Round", category: "Academic", venue: "Faculty of Law Moot Court", day: -2, start: "10:00", hours: 4, banner: "debate-chamber", going: 22, description: "Law students argue a constitutional rights case before a panel of lecturers. Spectators should arrive early and keep phones on silent." },
  { title: "Volleyball Friendly: Hall A vs Hall C", category: "Sports", venue: "Sports Complex Volleyball Court", day: -1, start: "16:30", hours: 2, banner: "volleyball", going: 18, description: "A friendly match between hostel teams before the inter-hall season starts. Spectators welcome." },

  // Today
  { title: "Morning Fitness Run", category: "Wellness", venue: "Main Gate to Sports Complex", day: 0, start: "06:30", hours: 1.5, banner: "fun-run", going: 24, description: "A relaxed 5 km run around Main Campus led by the Sports Council. All fitness levels are welcome. Meet at the main gate." },
  { title: "Library Research Skills Workshop", category: "Academic", venue: "University Library Seminar Room", day: 0, start: "09:00", hours: 3, banner: "library", capacity: 30, going: 26, description: "Learn to search journal databases, manage references and avoid plagiarism in your project. Recommended for final year students starting their research." },
  { title: "Startup Pitch Night", category: "Career", venue: "Entrepreneurship Centre Hall", day: 0, start: "17:00", hours: 3, banner: "pitch-podium", capacity: 120, going: 84, description: "Eight student teams pitch their business ideas to a panel of investors and alumni founders. The best pitch wins seed funding of N500,000 and six months of mentoring." },

  // Upcoming
  { title: "Code and Coffee: Build a Web App with Next.js", category: "Tech", venue: "ICT Centre, Lab 2, Town Campus", day: 1, start: "14:00", hours: 3, banner: "hackathon-code", capacity: 60, going: 37, description: "A practical session for beginners. We will build and deploy a small event board from scratch using Next.js and PostgreSQL. Bring your laptop and a charger. Coffee is on the Computer Science Society." },
  { title: "Career Fair 2026: Meet 30 Employers", category: "Career", venue: "Main Auditorium, Main Campus", day: 2, start: "09:00", hours: 7, banner: "career-network", going: 46, description: "Banks, telecoms, oil and gas firms and tech startups will be recruiting for internships and graduate roles. Dress formally and bring several copies of your CV." },
  { title: "Inter-Faculty Basketball Semi Final", category: "Sports", venue: "Indoor Sports Hall", day: 3, start: "16:00", hours: 2, banner: "basketball-game", capacity: 200, going: 33, description: "Faculty of Engineering faces Faculty of Social Sciences for a place in the final. Arrive early for good seats." },
  { title: "Robotics Club Open Day", category: "Tech", venue: "Faculty of Engineering Workshop", day: 4, start: "11:00", hours: 4, banner: "robotics-build", capacity: 45, going: 45, description: "See line-following robots, a solar-powered irrigation controller and drones built by club members. Try programming a robot yourself. Spaces are limited because of workshop safety rules." },
  { title: "Mental Health Awareness Talk", category: "Wellness", venue: "Faculty of Social Sciences Hall", day: 5, start: "13:00", hours: 2, banner: "symposium", going: 19, description: "Counsellors from the University Health Centre talk about exam stress, sleep and where to get confidential support on campus." },
  { title: "Afrobeats Live: Campus Concert", category: "Arts", venue: "Town Campus Field", day: 6, start: "18:00", hours: 5, banner: "concert-lights", going: 47, description: "Student artists and a guest DJ perform at the biggest concert of the semester. Gates open at 5pm. Bring your student ID for entry." },
  { title: "Design Thinking Workshop", category: "Career", venue: "Entrepreneurship Centre, Room 3", day: 7, start: "10:00", hours: 4, banner: "ideation", capacity: 35, going: 31, description: "Work in small teams to turn a campus problem into a product idea. Facilitated by alumni from a Lagos product studio. Materials are provided." },
  { title: "Photography Walk Around Campus", category: "Arts", venue: "Meet at Senate Building Foyer", day: 8, start: "07:00", hours: 3, banner: "art-gallery", capacity: 25, going: 12, description: "Bring any camera or a phone. We will cover composition, light and editing basics, then walk the campus to practise. Best shots will be printed for the faculty gallery." },
  { title: "Open Mic and Poetry Evening", category: "Arts", venue: "Students' Union Building Lounge", day: 9, start: "17:30", hours: 3, banner: "highlife-night", going: 21, description: "Spoken word, acoustic sets and stand-up comedy from students. Sign up at the door to perform. Light refreshments available." },
  { title: "Hackathon: Solutions for Akwa Ibom", category: "Tech", venue: "ICT Centre, Town Campus", day: 11, start: "09:00", hours: 30, banner: "hackathon-team", capacity: 80, going: 58, description: "A 30 hour hackathon on agriculture, transport and health challenges in Akwa Ibom. Teams of up to four. Meals, power and internet are provided. Prizes for the top three teams." },
  { title: "Debate: Should Nigerian Universities Go Fully Digital?", category: "Academic", venue: "Main Auditorium, Main Campus", day: 12, start: "15:00", hours: 2, banner: "debate-chamber", going: 27, description: "The Debating Society hosts a motion on online exams, e-libraries and digital records. The audience votes before and after." },
  { title: "Tree Planting Day", category: "Wellness", venue: "Main Campus, Faculty of Agriculture Farm", day: 13, start: "08:00", hours: 3, banner: "tree-planting", going: 16, description: "Help plant 500 seedlings along the new campus road. Gloves and tools provided. Wear clothes you do not mind getting muddy." },
  { title: "Fashion Show: Made in Uyo", category: "Culture", venue: "Main Auditorium, Main Campus", day: 14, start: "18:00", hours: 3, banner: "fashion-show", capacity: 400, going: 43, description: "Student designers present collections using local fabrics. Ticket proceeds support the Faculty of Arts design studio." },
  { title: "Cybersecurity Basics for Students", category: "Tech", venue: "Faculty of Science Lecture Theatre", day: 16, start: "12:00", hours: 2, banner: "tech-talk", going: 14, description: "How to spot phishing messages, secure your phone and keep your school portal account safe. Short, practical and open to all departments." },
  { title: "Inter-Faculty Football Final", category: "Sports", venue: "Sports Complex, Main Campus", day: 18, start: "16:00", hours: 2.5, banner: "stadium", going: 47, description: "The final of the inter-faculty league. The Vice-Chancellor will present the trophy after the match." },
  { title: "Movie Night Under the Stars", category: "Arts", venue: "Town Campus Field", day: 20, start: "19:00", hours: 3, banner: "movie-night", going: 9, description: "An outdoor screening of a classic Nollywood film. Bring a mat or a chair. Popcorn and drinks on sale." },
  { title: "Graduate School and Scholarships Info Session", category: "Career", venue: "Postgraduate School Hall", day: 22, start: "11:00", hours: 2, banner: "conference", going: 12, description: "Learn about master's programmes, funding options and how to write a strong statement of purpose. Alumni studying abroad will join online." },
  { title: "Women's Football Exhibition Match", category: "Sports", venue: "Sports Complex, Main Campus", day: 24, start: "16:00", hours: 2, banner: "football-women", going: 8, description: "The university women's team plays a visiting side from a neighbouring university. Come and support them." },
  { title: "Live Band Night: Highlife Classics", category: "Culture", venue: "Students' Union Building Lounge", day: 27, start: "18:30", hours: 3, banner: "live-band", going: 6, description: "The Music Society band plays highlife and juju classics. Dancing encouraged." },
  { title: "End of Semester Awards Gala", category: "Culture", venue: "Banquet Hall, Town Campus", day: 33, start: "18:00", hours: 4, banner: "gala-stage", capacity: 250, going: 4, description: "Awards for student leaders, sports teams and outstanding projects. Formal dress code. Dinner is served." },
  { title: "Convocation Rehearsal for Graduating Students", category: "Academic", venue: "Convocation Arena", day: 40, start: "09:00", hours: 3, banner: "convocation", going: 3, description: "Compulsory rehearsal for graduating students. Collect your gown from the Registry before attending." },

  // Cancelled
  { title: "Inter-Hall Quiz Competition", category: "Academic", venue: "Faculty of Arts Lecture Theatre", day: 10, start: "15:00", hours: 2, banner: "lecture-hall", cancelled: true, going: 7, description: "Cancelled because the venue is closed for repairs. A new date will be announced on this board." },
];

/** Small deterministic PRNG so seeds are repeatable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export async function isEmpty(database: DB) {
  const r = await database.execute(sql`select count(*)::int as n from users`);
  return Number((r.rows[0] as { n: number }).n) === 0;
}

export async function resetDb(database: DB) {
  await database.execute(sql`truncate table rsvps, uploads, events, users restart identity cascade`);
}

/** Insert demo data dated relative to `now`. */
export async function seed(database: DB, now: Date) {
  const today = campusDay(now);
  const studentHash = await hashPassword(DEMO_STUDENT.password);
  const adminHash = await hashPassword(DEMO_ADMIN.password);

  const admins = await database
    .insert(users)
    .values([
      { name: "Dr. Uwem Ekpenyong", email: DEMO_ADMIN.email, passwordHash: adminHash, role: "admin", department: "Student Affairs" },
      { name: "Mrs. Nkoyo Ita", email: "events@uniuyo.edu.ng", passwordHash: adminHash, role: "admin", department: "Student Affairs" },
    ])
    .returning({ id: users.id });

  const r = rng(42);
  const demo = { name: "Imaobong Udo", email: DEMO_STUDENT.email, passwordHash: studentHash, role: "student" as const, department: "Computer Science", level: 300 };
  const others = STUDENT_NAMES.map((name, i) => ({
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@student.uniuyo.edu.ng`,
    passwordHash: studentHash,
    role: "student" as const,
    department: DEPTS[i % DEPTS.length],
    level: [100, 200, 300, 400, 500][Math.floor(r() * 5)],
  }));
  const studentRows = await database.insert(users).values([demo, ...others]).returning({ id: users.id });
  const demoId = studentRows[0].id;
  const otherIds = studentRows.slice(1).map((s) => s.id);

  // The demo student is going to a handful of events but not the featured one, so the demo can RSVP live.
  const demoGoing = new Set([
    "Freshers Welcome Orientation",
    "Python for Data Analysis Bootcamp",
    "Ibibio Cultural Day",
    "Women in Tech Panel",
    "Startup Pitch Night",
    "Career Fair 2026: Meet 30 Employers",
    "Afrobeats Live: Campus Concert",
    "Hackathon: Solutions for Akwa Ibom",
  ]);

  let rsvpTotal = 0;
  for (const [i, e] of SEED_EVENTS.entries()) {
    const startsAt = atCampusTime(today, e.start, e.day);
    const endsAt = new Date(startsAt.getTime() + e.hours * 3_600_000);
    const [row] = await database
      .insert(events)
      .values({
        title: e.title,
        description: e.description,
        category: e.category,
        venue: e.venue,
        startsAt,
        endsAt,
        bannerUrl: `/images/events/${e.banner}.jpg`,
        capacity: e.capacity ?? null,
        status: e.cancelled ? "cancelled" : "scheduled",
        createdBy: admins[i % 2].id,
        createdAt: new Date(startsAt.getTime() - (10 + (i % 9)) * 86_400_000),
      })
      .returning({ id: events.id });

    const withDemo = demoGoing.has(e.title);
    const limit = Math.min(e.capacity ?? Infinity, e.going);
    const pool = [...otherIds].sort(() => r() - 0.5);
    const chosen = pool.slice(0, Math.max(0, limit - (withDemo ? 1 : 0)));
    if (withDemo) chosen.push(demoId);
    if (chosen.length) {
      await database.insert(rsvps).values(
        chosen.map((userId, k) => ({
          eventId: row.id,
          userId,
          createdAt: new Date(Math.min(now.getTime(), startsAt.getTime()) - (k + 1) * 3_600_000 * (1 + r() * 5)),
        })),
      );
      rsvpTotal += chosen.length;
    }
  }
  return { users: studentRows.length + admins.length, events: SEED_EVENTS.length, rsvps: rsvpTotal };
}
