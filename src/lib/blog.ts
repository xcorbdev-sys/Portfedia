import "server-only";
import { unstable_cache } from "next/cache";
import { connectDB } from "./db";
import { BlogPost } from "./models";

export interface BlogPostView {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  authorName: string;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function view(d: any): BlogPostView {
  return {
    id: String(d._id),
    slug: d.slug,
    title: d.title,
    summary: d.summary ?? "",
    body: d.body ?? "",
    authorName: d.authorName ?? "",
    published: Boolean(d.published),
    publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
    updatedAt: new Date(d.updatedAt ?? Date.now()).toISOString(),
  };
}

async function publishedPosts(limit = 200): Promise<BlogPostView[]> {
  await connectDB();
  return (await BlogPost.find({ published: true }).sort({ publishedAt: -1 }).limit(limit).lean()).map(view);
}
export const cachedBlogPosts = unstable_cache(() => publishedPosts(), ["blog-posts"], { revalidate: 300, tags: ["blog"] });

export async function getBlogPost(slug: string, includeDrafts = false): Promise<BlogPostView | null> {
  await connectDB();
  const d = await BlogPost.findOne({ slug, ...(includeDrafts ? {} : { published: true }) }).lean();
  return d ? view(d) : null;
}

export async function getBlogPostById(id: string): Promise<BlogPostView | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await connectDB();
  const d = await BlogPost.findById(id).lean();
  return d ? view(d) : null;
}

export async function allBlogPosts(): Promise<BlogPostView[]> {
  await connectDB();
  return (await BlogPost.find({}).sort({ createdAt: -1 }).limit(500).lean()).map(view);
}
