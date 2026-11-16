import type { NextConfig } from "next";

const apiTarget = process.env.SMARTPLANNER_API_TARGET ?? "http://127.0.0.1:8080";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiTarget}/api/:path*` }];
  },
};

export default nextConfig;
