import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the project root. Left to guess, Turbopack can pick a parent folder,
  // or even this project's own app/ folder, then fail to find Next.js and stop
  // the dev server partway through a session.
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        // Never cache the service worker itself, so a new version reaches
        // installed apps on their next visit instead of being stuck on an old one.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
