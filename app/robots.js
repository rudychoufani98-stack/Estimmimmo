const BASE = "https://estmimmo.fr";

export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
