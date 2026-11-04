import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false, // hide the dev-only "N" badge; build and runtime errors still show
  // npm run dev:local builds into its own folder, so it can run next to a normal `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
