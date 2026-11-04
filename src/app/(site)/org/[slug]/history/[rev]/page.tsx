import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { RevisionView } from "@/components/RevisionView";

export const metadata: Metadata = { title: "Revision", robots: { index: false } };

export default async function OrgRevision({ params }: { params: Promise<{ slug: string; rev: string }> }) {
  const { slug, rev } = await params;
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) notFound();
  return <RevisionView page={page} revId={rev} user={await getCurrentUser()} />;
}
