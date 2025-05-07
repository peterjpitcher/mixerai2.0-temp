/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: [
      'api.dicebear.com',
      'images.unsplash.com',
      'placehold.co',
      'placeholder.com'
    ],
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
  // Disable custom build process in Vercel
  skipTrailingSlashRedirect: true,
  // Ensure module resolution works correctly
  transpilePackages: [],
  
  // Define permanent (301) redirects from top-level routes to dashboard routes
  // Part of the June 2024 Route Cleanup project (see docs/ROUTE_CLEANUP_COMPLETION.md)
  // These redirects ensure a single canonical URL for each feature
  async redirects() {
    return [
      // Special case: Direct /content to /dashboard/content/article (put this first for higher priority)
      {
        source: '/content',
        destination: '/dashboard/content/article',
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
      
      // Special case: Redirect dashboard content root to article content
      {
        source: '/dashboard/content',
        destination: '/dashboard/content/article',
        permanent: true,
      }
    ];
  },
};

module.exports = nextConfig; 