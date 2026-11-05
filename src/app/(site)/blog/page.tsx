import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { cachedBlogPosts } from "@/lib/blog";
import { Breadcrumbs } from "@/components/ui";
import { requireFeature } from "@/lib/features";
import { formatDate } from "@/lib/site";
import { paginate, Pagination } from "@/components/Pagination";

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, guides and news about the business world from the Portfedia team.",
  alternates: { types: { "application/rss+xml": "/feeds/blog.xml" } },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireFeature("blog"); // the section can be switched off in Admin → Sections
  await connection();
  const posts = await cachedBlogPosts();
  const { items, page, pages } = paginate(posts, Number((await searchParams).page) || 1);
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 820 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Blog</h1>
      <p className="muted">Stories, guides and news from the Portfedia team.</p>
      {items.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No posts yet.</div>
      ) : (
        <ul className="blog-list">
          {items.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`}>
                <h2>{p.title}</h2>
                {p.summary && <p>{p.summary}</p>}
                <span className="small muted">{formatDate(p.publishedAt!)}{p.authorName ? ` · ${p.authorName}` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pages={pages} baseHref="/blog" />
    </div>
  );
}
