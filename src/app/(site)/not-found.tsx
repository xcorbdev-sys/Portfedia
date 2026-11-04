import Link from "next/link";

export default function NotFound() {
  return (
    <div className="narrow" style={{ textAlign: "center", paddingTop: 72 }}>
      <h1>Page not found</h1>
      <p className="muted">There is no Portfedia page at this address yet.</p>
      <p style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Link className="btn" href="/search">Search Portfedia</Link>
        <Link className="btn btn--primary" href="/create">Create a page</Link>
      </p>
    </div>
  );
}
