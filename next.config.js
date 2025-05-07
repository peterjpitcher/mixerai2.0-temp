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
      // Catch-all redirects for top-level routes
      { 
        source: '/brands/:path*', 
        destination: '/dashboard/brands/:path*', 
        permanent: false 
      },
      { 
        source: '/workflows/:path*', 
        destination: '/dashboard/workflows/:path*', 
        permanent: false 
      },
      { 
        source: '/content/:path*', 
        destination: '/dashboard/content/:path*', 
        permanent: false 
      },
      { 
        source: '/users/:path*', 
        destination: '/dashboard/users/:path*', 
        permanent: false 
      },
      
      // Special case: Redirect dashboard content root to article content
      {
        source: '/dashboard/content',
        destination: '/dashboard/content/article',
        permanent: false,
      }
    ];
  },
};

module.exports = nextConfig; 