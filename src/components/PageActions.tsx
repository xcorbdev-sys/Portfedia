import Link from "next/link";
import { Ellipsis, Flag, History, MessageSquareQuote, Pencil, PencilLine, Printer, UserCheck, UserPlus } from "lucide-react";
import { toggleFollowAction } from "@/lib/actions/pages";
import { PrintButton, ShareButton } from "./client";

export function PageActions({
  slug,
  title,
  base,
  following,
  followers,
  editHref,
  personLinks = false,
}: {
  slug: string;
  title: string;
  base: string;
  following: boolean;
  followers: number;
  editHref: string | null;
  /** Show "Suggest an edit" and "Write a recommendation" (person pages, not the owner) */
  personLinks?: boolean;
}) {
  return (
    <div className="p-actions no-print">
      <form action={toggleFollowAction}>
        <input type="hidden" name="slug" value={slug} />
        <button
          className={`btn${following ? " btn--active" : ""}`}
          type="submit"
          title={`${followers.toLocaleString("en-US")} follower${followers === 1 ? "" : "s"}`}
        >
          {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
          {following ? "Following" : "Follow"}
        </button>
      </form>
      <ShareButton title={title} />
      <details className="menu">
        <summary className="btn btn--icon" aria-label="More actions" style={{ listStyle: "none" }}>
          <Ellipsis size={18} />
        </summary>
        <div className="menu__panel">
          {editHref && (
            <Link href={editHref}>
              <Pencil size={16} /> Edit page
            </Link>
          )}
          {personLinks && (
            <>
              <Link href={`/${slug}/suggest`} rel="nofollow">
                <PencilLine size={16} /> Suggest an edit
              </Link>
              <Link href={`/${slug}/recommend`} rel="nofollow">
                <MessageSquareQuote size={16} /> Write a recommendation
              </Link>
            </>
          )}
          <Link href={`${base}/history`}>
            <History size={16} /> View history
          </Link>
          <PrintButton>
            <Printer size={16} /> Save as PDF
          </PrintButton>
          <Link href={`/report?page=${slug}`} rel="nofollow">
            <Flag size={16} /> Report
          </Link>
        </div>
      </details>
    </div>
  );
}
