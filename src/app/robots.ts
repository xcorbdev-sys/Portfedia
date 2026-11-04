import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/edit", "/create", "/account", "/login", "/signup", "/search", "/*/history"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
