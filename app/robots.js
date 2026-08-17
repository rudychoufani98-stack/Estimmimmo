const BASE = "https://estimmimmo.rudychoufani98.workers.dev";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
