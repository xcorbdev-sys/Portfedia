import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HELP_ARTICLES, helpArticle } from "@/lib/help";
import { renderArticle } from "@/lib/wikitext";
import { Breadcrumbs } from "@/components/ui";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = helpArticle((await params).slug);
  return a ? { title: `${a.title} · Help`, description: a.summary } : {};
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = helpArticle((await params).slug);
  if (!a) notFound();
  const html = renderArticle(a.body, new Map());
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 820 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Help", href: "/help" }, { label: a.title }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>{a.title}</h1>
      <article className="card" style={{ marginTop: 14 }}>
        <div className="card__body prose" dangerouslySetInnerHTML={{ __html: html.leadHtml + html.restHtml }} />
      </article>
      <p className="small muted" style={{ marginTop: 18 }}><Link href="/help">← All help articles</Link></p>
    </div>
  );
}
