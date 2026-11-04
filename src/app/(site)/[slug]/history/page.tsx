import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPageBySlug } from "@/lib/pages";
import { getCurrentUser } from "@/lib/auth";
import { findRenamedPage } from "@/lib/account";
import { canView } from "@/lib/visibility";
import { HistoryPage } from "@/components/HistoryPage";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ restored?: string; error?: string }> };
export const metadata: Metadata = { title: "Revision history", robots: { index: false } };

export default async function PersonHistory({ params, searchParams }: Props) {
  const page = await getPageBySlug((await params).slug);
  if (!page) {
    const moved = await findRenamedPage((await params).slug);
    if (moved && moved.type === "person") permanentRedirect(`/${moved.slug}/history`);
    notFound();
  }
  if (page.type !== "person") permanentRedirect(`/org/${page.slug}/history`);
  if (!canView(page, await getCurrentUser())) notFound();
  return <HistoryPage page={page} notice={await searchParams} />;
}
