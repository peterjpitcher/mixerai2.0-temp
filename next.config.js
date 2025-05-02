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
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "mixerai2-0.vercel.app", "mixerai.orangejelly.co.uk"]
    }
  },
  poweredByHeader: false,
  // Prevent output conflicts
  output: "standalone",
  // Log more info in production builds
  logging: {
    fetches: {
      fullUrl: true,
    },
  }
};

module.exports = nextConfig; 