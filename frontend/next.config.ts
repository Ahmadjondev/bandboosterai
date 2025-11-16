import type { NextConfig } from "next";

// Read API base from env (set this in your deployment environment)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Allow images from Django backend (development + production host)
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8001',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8001',
        pathname: '/media/**',
      },
      // production API host (no port expected)
      {
        protocol: 'https',
        hostname: 'api.bandbooster.uz',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'api.bandbooster.uz',
        pathname: '/media/**',
      },
    ],
  },

  // Proxy API requests to the API_URL (set via NEXT_PUBLIC_API_URL)
  async rewrites() {
    const base = API_URL.replace(/\/$/, '');
    return [
      {
        source: '/accounts/api/:path*',
        destination: `${base}/accounts/api/:path*`,
      },
      {
        source: '/manager/api/:path*',
        destination: `${base}/manager/api/:path*`,
      },
      {
        source: '/exams/api/:path*',
        destination: `${base}/exams/api/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${base}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
