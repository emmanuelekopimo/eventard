import Link from "next/link";
import { CalendarCheck, LayoutDashboard, LogOut, Sparkles } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { avatarUri } from "@/lib/avatar";
import type { User } from "@/db/schema";

export function TopBar({ user, active }: { user: User; active: "events" | "mine" | "admin" }) {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand" aria-label="Eventard home">
          <img src="/logo.svg" alt="" />
          <span>Eventard</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/" aria-current={active === "events" ? "page" : undefined}>
            <Sparkles size={17} /> <span>Events</span>
          </Link>
          {user.role === "student" ? (
            <Link href="/my" aria-current={active === "mine" ? "page" : undefined} data-testid="nav-my">
              <CalendarCheck size={17} /> <span>My RSVPs</span>
            </Link>
          ) : (
            <Link href="/admin" aria-current={active === "admin" ? "page" : undefined} data-testid="nav-admin">
              <LayoutDashboard size={17} /> <span>Dashboard</span>
            </Link>
          )}
        </nav>
        <div className="user-chip">
          <img src={avatarUri(user.email)} alt="" />
          <div className="who">
            <b>{user.name}</b>
            <span className="muted">{user.role === "admin" ? "Student Affairs" : `${user.department}, ${user.level}L`}</span>
          </div>
          <form action={logout}>
            <button className="icon-btn" title="Sign out" aria-label="Sign out" data-testid="logout">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">Eventard, University of Uyo. Event photos are Creative Commons licensed; see the credits file in the repository.</div>
    </footer>
  );
}
