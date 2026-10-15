import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: 4,
  },
  redirects: async () => [
    {
      source: '/dashboard/orders',
      destination: '/dashboard',
      permanent: true,
    },
    {
      source: '/apps/users',
      destination: '/apps/users/list',
      permanent: true,
    },
  ],
};

export default nextConfig;
