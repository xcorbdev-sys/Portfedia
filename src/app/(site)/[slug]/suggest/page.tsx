import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { isPublic } from "@/lib/visibility";
import { SuggestForm } from "@/components/forms/FeedbackForms";

export const metadata: Metadata = { title: "Suggest an edit", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/${slug}/suggest`);
  const page = await getPageBySlug(slug, "person");
  if (!page || !isPublic(page)) notFound();
  if (page.ownerId === user.id) redirect("/edit");
  return (
    <div className="narrow" style={{ maxWidth: 680 }}>
      <h1>Suggest an edit</h1>
      <p className="muted">
        Found something outdated or wrong? Tell {page.title} what should change. Your name is shown to them. <Link href={`/${page.slug}`}>Back to profile</Link>
      </p>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          {user.emailVerified ? <SuggestForm slug={page.slug} body={page.body} /> : <p style={{ margin: 0 }}>Please confirm your email address first.</p>}
        </div>
      </div>
    </div>
  );
}
