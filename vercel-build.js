/**
 * Simplified build script that relies on standard Next.js build
 * We're moving away from custom build processes in favor of Vercel's built-in capabilities
 */

const { execSync } = require('child_process');

console.log('Starting Next.js build process...');

try {
  // Run the standard Next.js build
  execSync('next build', { stdio: 'inherit' });
  console.log('✅ Next.js build completed successfully!');
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
} 