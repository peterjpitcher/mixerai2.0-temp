/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
       {
        protocol: 'https',
        hostname: 'placeholder.com',
      },
    ],
  },
  // Skip type checking during build
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  // Skip ESLint during build
  eslint: {
    // Warning: Dangerously allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  // Security settings
  poweredByHeader: false,
  // Disable custom build process in Vercel
  skipTrailingSlashRedirect: true,
  // Ensure module resolution works correctly
  transpilePackages: [],
  
  // Define permanent (301) redirects from top-level routes to dashboard routes
  // Part of the June 2024 Route Cleanup project (see docs/ROUTE_CLEANUP_COMPLETION.md)
  // These redirects ensure a single canonical URL for each feature
  async redirects() {
    return [
      // Special case: Direct /content to /dashboard/content (updated from /article)
      {
        source: '/content',
        destination: '/dashboard/content',
        permanent: true,
      },
      
      // Special case: Handle path traversal attempts
      {
        source: '/brands/../:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
      {
        source: '/workflows/../:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
      {
        source: '/content/../:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
      {
        source: '/users/../:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
      
      // Catch-all redirects for top-level routes
      { 
        source: '/brands/:path*', 
        destination: '/dashboard/brands/:path*', 
        permanent: true 
      },
      { 
        source: '/workflows/:path*', 
        destination: '/dashboard/workflows/:path*', 
        permanent: true 
      },
      { 
        source: '/content/:path*', 
        destination: '/dashboard/content/:path*', 
        permanent: true 
      },
      { 
        source: '/users/:path*', 
        destination: '/dashboard/users/:path*', 
        permanent: true 
      },
      
      // Redirect account page to dashboard
      {
        source: '/account',
        destination: '/dashboard/account',
        permanent: true,
      },
      
      // Redirect legacy marketing pages to dashboard
      {
        source: '/contact',
        destination: '/dashboard/help',
        permanent: true,
      },
      {
        source: '/overview',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/specifics',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/deep-dive/:path*',
        destination: '/dashboard',
        permanent: true,
      },
      
      // Redirect test pages to dashboard (these shouldn't exist in production)
      {
        source: '/test-page',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/openai-test',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/test-brand-identity',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/test-template/:path*',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/ui-showcase',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig; 