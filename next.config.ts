import type { NextConfig } from "next";

// The backend runs on plain HTTP at a raw IP. Vercel serves this app over
// HTTPS, so the browser blocks any direct call to the HTTP backend
// (mixed content). To work around that, the browser only ever calls this app's
// own HTTPS origin under `/proxy-api/*`, and Next.js rewrites those requests
// server-side to the real backend. Override the target with BACKEND_API_URL.
const BACKEND_API_URL =
  process.env.BACKEND_API_URL || "http://187.77.10.158:5002/api/v1";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/proxy-api/:path*",
        destination: `${BACKEND_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
