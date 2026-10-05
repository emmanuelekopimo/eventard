import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <main className="auth">
      <section className="auth-form">
        <div className="inner">
          <div className="brand" style={{ marginBottom: 34 }}>
            <img src="/logo.svg" alt="" />
            Eventard
          </div>
          <h1 style={{ fontSize: 36 }}>Welcome back</h1>
          <p className="muted" style={{ margin: "8px 0 26px" }}>
            Sign in to see what is on around campus, save your seat and add events to your calendar.
          </p>
          <LoginForm />
        </div>
      </section>
      <aside className="auth-art">
        <img src="/images/events/concert-lights.jpg" alt="Students at a campus concert" />
        <div className="quote">
          <p className="serif" style={{ fontSize: 19, lineHeight: 1.45 }}>
            Every talk, match, concert and workshop at the University of Uyo in one place, with live RSVP counts.
          </p>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Student Affairs Division</p>
        </div>
      </aside>
    </main>
  );
}
