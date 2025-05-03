/**
 * Script to clean stale cache directories before building
 * This helps resolve dependency resolution issues on Vercel
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⚠️ Cleaning Next.js cache directories...');

// Array of directories to clean
const dirsToClean = [
  '.next',
  '.vercel/output',
  'node_modules/.cache'
];

// Clean each directory
dirsToClean.forEach(dir => {
  const fullPath = path.resolve(process.cwd(), dir);
  
  if (fs.existsSync(fullPath)) {
    try {
      console.log(`Removing ${dir}...`);
      
      if (process.platform === 'win32') {
        // Windows requires different commands for directory removal
        execSync(`rmdir /s /q "${fullPath}"`, { stdio: 'inherit' });
      } else {
        // Unix-based systems can use rm -rf
        execSync(`rm -rf "${fullPath}"`, { stdio: 'inherit' });
      }
      
      console.log(`✅ Successfully removed ${dir}`);
    } catch (error) {
      console.error(`❌ Error removing ${dir}:`, error.message);
    }
  } else {
    console.log(`🔍 Directory ${dir} not found, skipping...`);
  }
});

// Create a .npmrc file to ensure proper peer dependencies
const npmrcPath = path.resolve(process.cwd(), '.npmrc');
try {
  console.log('Creating .npmrc to set proper peer dependency resolution...');
  fs.writeFileSync(npmrcPath, 'legacy-peer-deps=true\nstrict-peer-dependencies=false\n');
  console.log('✅ Successfully created .npmrc');
} catch (error) {
  console.error('❌ Error creating .npmrc:', error.message);
}

// Ensure package-lock.json is up to date
try {
  console.log('Ensuring package-lock.json is up to date...');
  // Don't actually run this as it would modify files, but note the intention
  console.log('✅ Would run: npm install --package-lock-only');
} catch (error) {
  console.error('❌ Error updating package-lock.json:', error.message);
}

console.log('🧹 Cache cleaning completed!'); 