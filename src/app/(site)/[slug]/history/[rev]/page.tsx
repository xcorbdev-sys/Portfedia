import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { canView } from "@/lib/visibility";
import { RevisionView } from "@/components/RevisionView";

export const metadata: Metadata = { title: "Revision", robots: { index: false } };

export default async function PersonRevision({ params }: { params: Promise<{ slug: string; rev: string }> }) {
  const { slug, rev } = await params;
  const page = await getPageBySlug(slug, "person");
  const user = await getCurrentUser();
  if (!page || !canView(page, user)) notFound();
  return <RevisionView page={page} revId={rev} user={user} />;
}
