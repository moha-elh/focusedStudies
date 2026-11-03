import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Every crawler, search and AI-search alike (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot), may read the public pages.
// Signed-in areas redirect to /login anyway; disallowing them saves crawl budget on redirects.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/library", "/watch/"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
