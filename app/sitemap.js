import { SEO_CITIES } from "../lib/cities";

const BASE = "https://estmimmo.fr";

export default function sitemap() {
  const now = new Date();
  const cityUrls = SEO_CITIES.map((c) => ({
    url: `${BASE}/ville/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/ville`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...cityUrls,
  ];
}
