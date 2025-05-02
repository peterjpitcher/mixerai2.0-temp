// This script runs after the Next.js build on Vercel
const fs = require('fs');
const path = require('path');

console.log('Running Vercel post-build script...');

// Create .net directory if it doesn't exist
if (!fs.existsSync('.net')) {
  fs.mkdirSync('.net', { recursive: true });
  console.log('Created .net directory');
}

// Create empty routes-manifest.json in .net directory
const routesManifest = {
  version: 3,
  basePath: '',
  redirects: [],
  rewrites: [],
  headers: [],
  dynamicRoutes: []
};

fs.writeFileSync(
  '.net/routes-manifest.json',
  JSON.stringify(routesManifest, null, 2)
);

console.log('Created routes-manifest.json in .net directory');

// Create the .vercel/output directory if it doesn't exist
const outputDir = path.join(process.cwd(), '.vercel', 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('Created .vercel/output directory');
}

// Create a basic config.json
const config = {
  version: 3,
  routes: [
    {
      src: '^/api/(.*)$',
      dest: '/api/$1'
    },
    {
      handle: 'filesystem'
    },
    {
      src: '/(.*)',
      dest: '/$1'
    }
  ]
};

// Write the config file
fs.writeFileSync(
  path.join(outputDir, 'config.json'),
  JSON.stringify(config, null, 2)
);

console.log('Created Vercel output config.json');
console.log('Post-build tasks completed successfully.'); 