const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Run Next.js build
  console.log('Running Next.js build...');
  execSync('next build', { stdio: 'inherit' });

  // Create necessary directories for Vercel
  console.log('Copying routes-manifest.json for Vercel...');

  // Make sure the .vcl directory exists
  if (!fs.existsSync('.vcl')) {
    fs.mkdirSync('.vcl', { recursive: true });
  }

  // Make sure the .net directory exists
  if (!fs.existsSync('.net')) {
    fs.mkdirSync('.net', { recursive: true });
  }

  let manifestExists = false;

  // Check if .next/routes-manifest.json exists
  if (fs.existsSync('.next/routes-manifest.json')) {
    // Copy the file to .vcl/routes-manifest.json
    fs.copyFileSync(
      '.next/routes-manifest.json',
      '.vcl/routes-manifest.json'
    );
    // Copy to .net as well
    fs.copyFileSync(
      '.next/routes-manifest.json',
      '.net/routes-manifest.json'
    );
    console.log('Successfully copied routes-manifest.json to .vcl/ and .net/');
    manifestExists = true;
  } 
  
  if (!manifestExists) {
    console.warn('Could not find .next/routes-manifest.json, creating fallback file');
    
    // Create a fallback empty manifest
    const fallbackManifest = {
      version: 3,
      basePath: '',
      redirects: [],
      rewrites: [],
      headers: [],
      dynamicRoutes: []
    };
    
    // Write the fallback manifest to both locations
    fs.writeFileSync('.vcl/routes-manifest.json', JSON.stringify(fallbackManifest, null, 2));
    fs.writeFileSync('.net/routes-manifest.json', JSON.stringify(fallbackManifest, null, 2));
    console.log('Created fallback routes-manifest.json in .vcl/ and .net/');
  }

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 