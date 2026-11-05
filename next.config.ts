import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false, // hide the dev-only "N" badge; build and runtime errors still show
  // npm run dev (local Supabase) builds into its own folder, so it can run next to `npm run dev:prod`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
