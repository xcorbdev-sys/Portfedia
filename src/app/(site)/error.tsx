"use client";

import Link from "next/link";
import { useEffect } from "react";

/** #62: friendly error page for unexpected server errors (details go to the server log). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="narrow" style={{ textAlign: "center", paddingTop: 72 }}>
      <h1>Something went wrong</h1>
      <p className="muted">An unexpected error happened on our side. Please try again in a moment.</p>
      <p style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button className="btn btn--primary" type="button" onClick={() => reset()}>Try again</button>
        <Link className="btn" href="/">Go to the home page</Link>
      </p>
      {error.digest && <p className="small muted">Error reference: {error.digest}</p>}
    </div>
  );
}
