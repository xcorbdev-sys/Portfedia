import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost } from "@/lib/blog";
import { existingPages } from "@/lib/pages";
import { extractWikiLinks, renderArticle } from "@/lib/wikitext";
import { Breadcrumbs } from "@/components/ui";
import { featureOn, requireFeature } from "@/lib/features";
import { formatDate, siteUrl } from "@/lib/site";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  if (!(await featureOn("blog"))) return {};
  const post = await getBlogPost((await params).slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.summary || undefined,
    alternates: { canonical: `/blog/${post.slug}`, types: { "application/rss+xml": "/feeds/blog.xml" } },
    openGraph: { type: "article", title: post.title, description: post.summary || undefined, publishedTime: post.publishedAt ?? undefined },
  };
}

export default async function BlogPostPage({ params }: P) {
  await requireFeature("blog");
  await connection();
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  const existing = await existingPages(extractWikiLinks(post.body).map((l) => l.slug));
  const html = renderArticle(post.body, existing);
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary || undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "Portfedia" },
    publisher: { "@type": "Organization", name: "Portfedia", url: siteUrl() },
    mainEntityOfPage: `${siteUrl()}/blog/${post.slug}`,
  };
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 820 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>{post.title}</h1>
      <p className="small muted">{formatDate(post.publishedAt!)}{post.authorName ? ` · ${post.authorName}` : ""}</p>
      <article className="card" style={{ marginTop: 14 }}>
        <div className="card__body prose" dangerouslySetInnerHTML={{ __html: html.leadHtml + html.restHtml }} />
      </article>
      <p className="small muted" style={{ marginTop: 18 }}><Link href="/blog">← All posts</Link></p>
    </div>
  );
}
