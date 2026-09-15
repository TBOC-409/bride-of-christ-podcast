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
};

export default nextConfig;
