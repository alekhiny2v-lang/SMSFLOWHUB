import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve the logo (and any future imagery) as modern formats instead of the
  // original 220 KB PNG on every page load.
  images: {
    formats: ["image/avif", "image/webp"],
  },
  compiler: {
    // Strip client-side console noise from production bundles.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    optimizePackageImports: ["react", "react-dom"],
  },
};

export default nextConfig;
