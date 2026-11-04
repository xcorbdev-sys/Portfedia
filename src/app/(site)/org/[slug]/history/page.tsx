import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPageBySlug } from "@/lib/pages";
import { HistoryPage } from "@/components/HistoryPage";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ restored?: string; error?: string; page?: string }> };
export const metadata: Metadata = { title: "Revision history", robots: { index: false } };

export default async function OrgHistory({ params, searchParams }: Props) {
  const page = await getPageBySlug((await params).slug);
  if (!page) notFound();
  if (page.type === "person") permanentRedirect(`/${page.slug}/history`);
  return <HistoryPage page={page} notice={await searchParams} />;
}
