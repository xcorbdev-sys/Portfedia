import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { findAndReplace } from "mdast-util-find-and-replace";
import { visit } from "unist-util-visit";
import type { Root as MdRoot } from "mdast";
import type { Element, Root as HastRoot, Text } from "hast";
import { slugify } from "./slug";
import type { OutLink, PageType } from "./types";

/** [[Target]] or [[Target|label]] */
const WIKI_LINK = /\[\[([^[\]|\n]{1,160})(?:\|([^[\]\n]{1,160}))?\]\]/g;
const WIKI_PREFIX = "/__wiki/";

export function extractWikiLinks(body: string): OutLink[] {
  const seen = new Map<string, OutLink>();
  for (const m of body.matchAll(WIKI_LINK)) {
    const title = m[1].trim();
    const slug = slugify(title);
    if (slug && !seen.has(slug)) seen.set(slug, { slug, title });
  }
  return [...seen.values()];
}

/** "[[Acme|the company]] and [[Ayşe Demir]]" → "the company and Ayşe Demir" (for plain-text fields such as summaries). */
export function stripWikiLinks(text: string): string {
  return text.replace(WIKI_LINK, (_m, target: string, label?: string) => (label ?? target).trim());
}

export function pageHref(type: PageType, slug: string): string {
  return type === "person" ? `/${slug}` : `/org/${slug}`;
}

export function createHref(title: string): string {
  return `/create?title=${encodeURIComponent(title)}`;
}

/** mdast: turns [[...]] text into link nodes (code is left untouched). */
function remarkWikiLinks() {
  return (tree: MdRoot) => {
    findAndReplace(tree, [
      [
        WIKI_LINK,
        (_all: string, target: string, label?: string) => {
          const title = target.trim();
          const slug = slugify(title);
          if (!slug) return false;
          return {
            type: "link",
            url: WIKI_PREFIX + slug + "?t=" + encodeURIComponent(title),
            children: [{ type: "text", value: (label ?? target).trim() }],
          };
        },
      ],
    ]);
  };
}

export interface TocEntry {
  id: string;
  title: string;
  level: 2 | 3;
}

const textOf = (node: Element): string => {
  let out = "";
  visit(node, "text", (t: Text) => {
    out += t.value;
  });
  return out;
};

/** Runs AFTER sanitize: resolves wiki links and assigns heading ids. */
function rehypeWiki(opts: { existing: Map<string, PageType>; toc: TocEntry[]; usedIds: Set<string> }) {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "h1") node.tagName = "h2"; // the page title is the only h1
      if (node.tagName === "a") {
        const href = String(node.properties?.href ?? "");
        if (href.startsWith(WIKI_PREFIX)) {
          const [slug, query] = href.slice(WIKI_PREFIX.length).split("?t=");
          const title = decodeURIComponent(query ?? slug);
          const type = opts.existing.get(slug);
          if (type) {
            node.properties = { href: pageHref(type, slug), title };
          } else {
            node.properties = {
              href: createHref(title),
              className: ["new"],
              title: `${title} (page does not exist yet)`,
              rel: ["nofollow"],
            };
          }
        } else if (/^https?:\/\//i.test(href)) {
          node.properties = { ...node.properties, className: ["external"], rel: ["nofollow", "ugc", "noopener"] };
        }
      }
      if (node.tagName === "h2" || node.tagName === "h3") {
        const title = textOf(node).trim();
        let id = slugify(title) || "section";
        let n = 2;
        while (opts.usedIds.has(id)) id = `${slugify(title) || "section"}-${n++}`;
        opts.usedIds.add(id);
        node.properties = { ...node.properties, id };
        opts.toc.push({ id, title, level: node.tagName === "h2" ? 2 : 3 });
      }
    });
  };
}

export interface RenderedArticle {
  /** Lead paragraphs before the first ## heading */
  leadHtml: string;
  /** Remaining sections */
  restHtml: string;
  toc: TocEntry[];
}

/**
 * Converts Markdown to safe HTML. Raw HTML is not supported (remark-rehype drops it)
 * and rehype-sanitize adds a second layer of protection.
 */
export function renderArticle(
  body: string,
  existing: Map<string, PageType>,
  reservedIds: string[] = [],
): RenderedArticle {
  const toc: TocEntry[] = [];
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLinks)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeWiki, { existing, toc, usedIds: new Set(reservedIds) });

  const tree = processor.runSync(processor.parse(body)) as HastRoot;
  const firstH2 = tree.children.findIndex((c) => c.type === "element" && c.tagName === "h2");
  const split = firstH2 === -1 ? tree.children.length : firstH2;
  const stringify = (children: HastRoot["children"]) =>
    unified().use(rehypeStringify).stringify({ type: "root", children });

  return {
    leadHtml: stringify(tree.children.slice(0, split)),
    restHtml: stringify(tree.children.slice(split)),
    toc,
  };
}
