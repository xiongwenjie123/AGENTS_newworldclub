import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['coze-coding-dev-sdk', '@electric-sql/pglite'],
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
