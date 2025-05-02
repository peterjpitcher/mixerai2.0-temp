const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run Next.js build
console.log('Running Next.js build...');
execSync('next build', { stdio: 'inherit' });

// Create necessary directories for Vercel
console.log('Copying routes-manifest.json for Vercel...');

// Make sure the .vcl directory exists
if (!fs.existsSync('.vcl')) {
  fs.mkdirSync('.vcl', { recursive: true });
}

// Check if .next/routes-manifest.json exists
if (fs.existsSync('.next/routes-manifest.json')) {
  // Copy the file to .vcl/routes-manifest.json
  fs.copyFileSync(
    '.next/routes-manifest.json',
    '.vcl/routes-manifest.json'
  );
  console.log('Successfully copied routes-manifest.json to .vcl/');
} else {
  console.error('Could not find .next/routes-manifest.json');
  process.exit(1);
}

// Make sure the .net directory exists
if (!fs.existsSync('.net')) {
  fs.mkdirSync('.net', { recursive: true });
}

// Copy the file to .net/routes-manifest.json
fs.copyFileSync(
  '.next/routes-manifest.json',
  '.net/routes-manifest.json'
);
console.log('Successfully copied routes-manifest.json to .net/');

console.log('Build completed successfully!'); 