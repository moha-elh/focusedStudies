import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Only the indexable public pages. /login is noindex, so it stays out.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE }, { url: `${SITE}/privacy` }];
}
