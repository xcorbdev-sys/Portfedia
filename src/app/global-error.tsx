"use client";

/** #62: last-resort error page when even the root layout fails. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f6f8fc", color: "#0f172a" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28 }}>Portfedia is having trouble</h1>
          <p style={{ color: "#6b7588" }}>Please try again in a moment.</p>
          <button type="button" onClick={() => reset()} style={{ padding: "10px 18px", borderRadius: 9, border: 0, background: "#1f5af2", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
          {error.digest && <p style={{ color: "#6b7588", fontSize: 13 }}>Error reference: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
