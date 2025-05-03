/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com'],
    // Required for Vercel deployment with images
    unoptimized: process.env.NODE_ENV === 'production',
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
  // Vercel-specific settings
  // No 'output' setting to ensure serverless functions are generated
  // Configure tracing for serverless functions
  experimental: {
    serverComponentsExternalPackages: ['next'],
    outputFileTracingRoot: process.cwd(),
  },
  // Allow serverless functions to be generated
  // This is critical for Vercel deployment
  swcMinify: true
};

module.exports = nextConfig; 