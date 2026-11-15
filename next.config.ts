import type { NextConfig } from 'next';
import { securityHeaders } from './lib/security-headers';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders({ isDev: process.env.NODE_ENV === 'development' }),
      },
    ];
  },
};

export default nextConfig;
