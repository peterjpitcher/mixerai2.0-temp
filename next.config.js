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
  
  // Add framework-level redirects
  async redirects() {
    return [
      // Redirect root content page to article content
      {
        source: '/content',
        destination: '/dashboard/content/article',
        permanent: false,
      },
      // Redirect dashboard content root to article content
      {
        source: '/dashboard/content',
        destination: '/dashboard/content/article',
        permanent: false,
      },
      // Legacy routes support
      {
        source: '/brands',
        destination: '/dashboard/brands',
        permanent: false,
      },
      {
        source: '/users',
        destination: '/dashboard/users',
        permanent: false,
      },
      {
        source: '/workflows',
        destination: '/dashboard/workflows',
        permanent: false,
      }
    ];
  },
};

module.exports = nextConfig; 