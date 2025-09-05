/**
 * Script to clean stale cache directories before building
 * This helps resolve dependency resolution issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⚠️ Cleaning Next.js cache directories...');

// Array of directories to clean
const dirsToClean = [
  '.next',
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

console.log('🧹 Cache cleaning completed!'); 