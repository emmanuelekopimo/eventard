import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container" style={{ padding: "100px 20px", textAlign: "center" }}>
      <img src="/logo.svg" alt="" style={{ width: 48, margin: "0 auto 16px" }} />
      <h1 style={{ fontSize: 34 }}>We could not find that page</h1>
      <p className="muted" style={{ margin: "10px 0 22px" }}>The event may have been removed.</p>
      <Link href="/" className="btn btn-dark">Back to events</Link>
    </main>
  );
}
