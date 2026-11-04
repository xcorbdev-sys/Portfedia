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
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
