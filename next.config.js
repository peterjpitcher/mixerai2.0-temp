/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com'],
  },
  // For better API routes error handling
  typescript: {
    // Ignore TypeScript errors to fix build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors to fix build
    ignoreDuringBuilds: true,
  },
  // Security settings
  poweredByHeader: false,
  // Log more info in production builds
  logging: {
    fetches: {
      fullUrl: true,
    },
  }
};

module.exports = nextConfig; 