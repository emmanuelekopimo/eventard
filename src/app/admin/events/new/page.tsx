import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { createEventAction } from "@/app/actions/events";
import { EventForm } from "@/components/EventForm";
import { TopBar, Footer } from "@/components/TopBar";
import { toLocalInput } from "@/lib/format";
import { atCampusTime, campusDay, now as getNow } from "@/lib/today";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  const user = await requireAdmin();
  const day = campusDay(getNow());
  return (
    <>
      <TopBar user={user} active="admin" />
      <main className="container" style={{ maxWidth: 820 }}>
        <div className="page-head">
          <div>
            <Link href="/admin" className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}><ArrowLeft size={15} /> Dashboard</Link>
            <h1>Publish an event</h1>
            <p className="muted" style={{ marginTop: 6 }}>It appears on every student&apos;s board as soon as you save.</p>
          </div>
        </div>
        <div className="panel" style={{ padding: 24, marginBottom: 60 }}>
          <EventForm
            action={createEventAction}
            submitLabel="Publish event"
            defaults={{ startsAt: toLocalInput(atCampusTime(day, "14:00", 3)), endsAt: toLocalInput(atCampusTime(day, "16:00", 3)) }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
