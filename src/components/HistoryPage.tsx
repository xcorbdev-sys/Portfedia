import Link from "next/link";
import type { PageDoc } from "@/lib/types";
import { listRevisions } from "@/lib/pages";
import { pageHref } from "@/lib/wikitext";
import { Breadcrumbs } from "./ui";
import { HistoryList } from "./HistoryList";

export async function HistoryPage({ page }: { page: PageDoc }) {
  const revisions = await listRevisions(page._id);
  const href = pageHref(page.type, page.slug);
  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          page.type === "person" ? { label: "People", href: "/people" } : { label: "Companies", href: "/companies" },
          { label: page.title, href },
          { label: "History" },
        ]}
      />
      <div className="narrow" style={{ margin: 0, paddingLeft: 0 }}>
        <h1>Revision history</h1>
        <p className="muted">
          <Link href={href}>{page.title}</Link> · Every save is kept as a revision and revisions are never deleted.
        </p>
        <HistoryList revisions={revisions} />
      </div>
    </div>
  );
}
