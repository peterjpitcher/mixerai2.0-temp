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
      
      // Special case: Redirect dashboard content root to itself (or remove if /dashboard/content is now the direct page)
      // Assuming /dashboard/content is now the main listing page, this redirect can be removed or point to itself (which is redundant).
      // For clarity and to ensure it lands on the correct page, let's keep it pointing to /dashboard/content.
      // If /dashboard/content were a layout and /dashboard/content/some-default-child was desired, this would be different.
      {
        source: '/dashboard/content',
        destination: '/dashboard/content',
        permanent: true,
      }
    ];
  },
};

module.exports = nextConfig; 