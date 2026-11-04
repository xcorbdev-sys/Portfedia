import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { isPublic } from "@/lib/visibility";
import { RecommendForm } from "@/components/forms/FeedbackForms";

export const metadata: Metadata = { title: "Write a recommendation", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/${slug}/recommend`);
  const page = await getPageBySlug(slug, "person");
  if (!page || !isPublic(page)) notFound();
  if (page.ownerId === user.id) redirect("/edit");
  return (
    <div className="narrow" style={{ maxWidth: 680 }}>
      <h1>Write a recommendation</h1>
      <p className="muted">
        Share what it is like to work with {page.title}. <Link href={`/${page.slug}`}>Back to profile</Link>
      </p>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          {user.emailVerified ? <RecommendForm slug={page.slug} name={page.title} /> : <p style={{ margin: 0 }}>Please confirm your email address first.</p>}
        </div>
      </div>
    </div>
  );
}
