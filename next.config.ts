import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev mode blocks cross-origin requests to dev assets by default, which
  // silently breaks hydration when opening the dev server via the LAN IP
  // (e.g. from a phone). See https://github.com/vercel/next.js/issues/91908
  // A bare "*" is rejected by Next, so allow the private 192.168.0.0/16
  // range; adjust if your LAN uses 10.x or 172.16-31.x addresses.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
