import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Allow images from Django backend
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
    ],
  },

  // Proxy API requests to Django backend
  async rewrites() {
    return [
      {
        source: '/accounts/api/:path*',
        destination: 'http://127.0.0.1:8001/accounts/api/:path*',
      },
      {
        source: '/manager/api/:path*',
        destination: 'http://127.0.0.1:8001/manager/api/:path*',
      },
      {
        source: '/exams/api/:path*',
        destination: 'http://127.0.0.1:8001/exams/api/:path*',
      },
      {
        source: '/media/:path*',
        destination: 'http://127.0.0.1:8001/media/:path*',
      },
    ];
  },
};

export default nextConfig;
