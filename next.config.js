/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com'],
    unoptimized: true,
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
  // Build configuration for Vercel 
  output: 'export',
  // Disable output link display
  distDir: '.next',
  // Enable static export for API routes
  experimental: {
    outputFileTracingRoot: process.cwd(),
  }
};

module.exports = nextConfig; 