import Link from "next/link";
import { Check, Clock, X } from "lucide-react";
import { approveApplicationAction, rejectApplicationAction } from "@/lib/actions/review";
import { formatDateTime } from "@/lib/site";
import type { PageDoc, SessionUser } from "@/lib/types";

/** Approve / reject controls for moderators. */
export function ReviewControls({
  slug,
  back,
  verified = false,
  published = false,
}: {
  slug: string;
  back: string;
  verified?: boolean;
  /** For live profiles only the "unpublish" (reject) form is shown. */
  published?: boolean;
}) {
  return (
    <div className="review-controls">
      {published ? (
        <p className="small muted" style={{ margin: 0 }}>This profile is live. Unpublishing hides it again and shows your reason to its owner.</p>
      ) : (
      <form action={approveApplicationAction} className="review-controls__approve">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="back" value={back} />
        <label className="check">
          <input type="checkbox" name="verified" defaultChecked={verified} /> Also mark identity as verified (blue badge)
        </label>
        <button className="btn btn--primary btn--sm" type="submit">
          <Check size={15} /> Approve &amp; publish
        </button>
      </form>
      )}
      <form action={rejectApplicationAction} className="review-controls__reject">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="back" value={back} />
        <label className="visually-hidden" htmlFor={`note-${slug}`}>Reason for rejection</label>
        <textarea
          id={`note-${slug}`}
          name="note"
          className="textarea textarea--plain"
          style={{ minHeight: 60 }}
          maxLength={1000}
          placeholder="Reason (shown to the applicant), e.g. Please add a photo and at least one source."
        />
        <button className="btn btn--sm" type="submit">
          <X size={15} /> {published ? "Unpublish" : "Reject"}
        </button>
      </form>
    </div>
  );
}

/** Banner on a profile that is not public yet: explains the status to its owner, gives moderators the controls. */
export function ReviewBanner({ page, user }: { page: PageDoc; user: SessionUser }) {
  const isOwner = user.id === page.ownerId;
  const isMod = user.role === "admin" || user.role === "moderator";
  const pending = page.status === "pending";
  return (
    <div className={`notice ${pending ? "notice--info" : "notice--error"} review-banner`} role="status">
      <div className="review-banner__text">
        {pending ? <Clock size={18} /> : <X size={18} />}
        <div>
          {pending && page.review.awaitingEmail ? (
            <>
              <b>{isOwner ? "Your profile is saved." : "Saved, but the owner hasn't confirmed their email yet."}</b>{" "}
              {isOwner
                ? "Confirm your email address with the link we sent you, and it goes to our team for review automatically. Until then only you can see this page."
                : "It will appear in the review queue once they confirm."}
            </>
          ) : pending ? (
            <>
              <b>{isOwner ? "Your profile is under review." : "This application is waiting for review."}</b>{" "}
              {isOwner
                ? "The Portfedia team checks every new profile before it is published. Until then only you can see this page."
                : `Submitted ${page.review.submittedAt ? formatDateTime(page.review.submittedAt) : ""}.`}
            </>
          ) : (
            <>
              <b>{isOwner ? "Your application was not approved." : "This application was rejected."}</b>
              {page.review.note && <> Reason: <i>{page.review.note}</i></>}
              {isOwner && (
                <>
                  {" "}
                  <Link href="/edit">Update your profile</Link> and save it to resubmit.
                </>
              )}
            </>
          )}
        </div>
      </div>
      {isMod && <ReviewControls slug={page.slug} back={`/${page.slug}`} verified={page.verified} />}
    </div>
  );
}
