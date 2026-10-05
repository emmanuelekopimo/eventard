import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, RotateCcw, Trash2 } from "lucide-react";
import { db } from "@/db";
import { requireAdmin } from "@/lib/session";
import { getEvent } from "@/lib/queries";
import { deleteEventAction, toggleCancelAction, updateEventAction } from "@/app/actions/events";
import { EventForm } from "@/components/EventForm";
import { TopBar, Footer } from "@/components/TopBar";
import { toLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage(props: PageProps<"/admin/events/[id]/edit">) {
  const user = await requireAdmin();
  const { id } = await props.params;
  const e = await getEvent(db(), user.id, Number(id));
  if (!e) notFound();
  return (
    <>
      <TopBar user={user} active="admin" />
      <main className="container" style={{ maxWidth: 820 }}>
        <div className="page-head">
          <div>
            <Link href={`/events/${e.id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}><ArrowLeft size={15} /> Back to event</Link>
            <h1>Edit event</h1>
            <p className="muted" style={{ marginTop: 6 }}>{e.going} students have RSVPed.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <form action={toggleCancelAction}>
              <input type="hidden" name="id" value={e.id} />
              <input type="hidden" name="cancel" value={e.status === "cancelled" ? "0" : "1"} />
              <button className="btn btn-ghost">
                {e.status === "cancelled" ? <><RotateCcw size={16} /> Restore</> : <><Ban size={16} /> Cancel event</>}
              </button>
            </form>
            <form action={deleteEventAction}>
              <input type="hidden" name="id" value={e.id} />
              <button className="btn btn-danger"><Trash2 size={16} /> Delete</button>
            </form>
          </div>
        </div>
        <div className="panel" style={{ padding: 24, marginBottom: 60 }}>
          <EventForm
            action={updateEventAction}
            id={e.id}
            currentBanner={e.bannerUrl}
            submitLabel="Save changes"
            defaults={{
              title: e.title,
              description: e.description,
              category: e.category,
              venue: e.venue,
              startsAt: toLocalInput(e.startsAt),
              endsAt: toLocalInput(e.endsAt),
              capacity: e.capacity ? String(e.capacity) : "",
            }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
