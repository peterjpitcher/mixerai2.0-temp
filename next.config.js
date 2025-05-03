/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com'],
  },
  // Skip type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Security settings
  poweredByHeader: false,
  // Ensure Next.js can find files for tracing
  experimental: {
    outputFileTracingRoot: process.cwd(),
  }
};

module.exports = nextConfig; 