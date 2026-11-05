import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["mongoose", "sharp"],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  async redirects() {
    // Short profile links: portfedia.com/@ayse-demir → /ayse-demir
    return [{ source: "/@:slug", destination: "/:slug", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // HSTS: browsers only honour it over HTTPS, so it is harmless on http://localhost
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      // Other sites may not show Portfedia in a frame, except the careers widget (#69) under /embed
      { source: "/((?!embed/).*)", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
