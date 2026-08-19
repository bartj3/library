import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev mode blocks cross-origin requests to dev assets by default, which
  // silently breaks hydration when opening the dev server via the LAN IP
  // (e.g. from a phone). See https://github.com/vercel/next.js/issues/91908
  allowedDevOrigins: ["192.168.178.29"],
};

export default nextConfig;
