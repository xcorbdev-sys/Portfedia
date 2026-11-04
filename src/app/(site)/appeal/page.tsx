import type { Metadata } from "next";
import { ReportForm } from "@/components/forms/ReportForm";

export const metadata: Metadata = { title: "Appeal a suspension", robots: { index: false } };

/** #34: suspended users can't log in, so the appeal form works without an account. */
export default function AppealPage() {
  return (
    <div className="narrow" style={{ maxWidth: 640 }}>
      <h1>Appeal a suspension</h1>
      <p className="muted">
        If your account was suspended and you think it was a mistake, tell us why. Use the email address of your Portfedia account. A
        moderator will review your appeal and reply by email.
      </p>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <ReportForm slug="" reasons={{}} signedIn={false} fixedReason="appeal" />
        </div>
      </div>
    </div>
  );
}
