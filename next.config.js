/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async headers() {
    return [
      {
        // La page (SPA) ne doit jamais rester cachee : elle doit toujours
        // pointer vers les derniers chunks JS (eux immuables/haches).
        source: "/",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

module.exports = nextConfig;
