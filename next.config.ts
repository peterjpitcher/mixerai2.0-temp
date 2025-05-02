import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['api.dicebear.com'],
  },
  // For better API routes error handling
  typescript: {
    // Type checking is done in CI workflow
    ignoreBuildErrors: process.env.CI === 'true',
  },
  eslint: {
    // Linting is done in CI workflow
    ignoreDuringBuilds: process.env.CI === 'true',
  },
  // Protect the application with appropriate settings
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "mixerai2-0.vercel.app"]
    }
  }
};

export default nextConfig;
