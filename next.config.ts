import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false, // hide the dev-only "N" badge; build and runtime errors still show
};

export default nextConfig;
