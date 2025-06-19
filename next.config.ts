import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'earnest-swan-315.convex.cloud',
        port: '',
        pathname: '/api/storage/**',
      },
    ],
  },
};

export default nextConfig;
