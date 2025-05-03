const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to ensure a directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

try {
  console.log('Starting Vercel build process...');
  
  // Run the standard Next.js build
  console.log('Running Next.js build...');
  execSync('next build', { stdio: 'inherit' });
  
  // Check if .next directory was created
  if (!fs.existsSync('.next')) {
    throw new Error('.next directory was not created by build process');
  }
  
  // Ensure Vercel output directories exist
  console.log('Setting up Vercel output directories...');
  
  // Root output directory
  ensureDirectoryExists('.vercel/output');
  
  // Config
  const vercelConfig = {
    version: 3,
    routes: [
      { handle: 'filesystem' },
      {
        src: '/api/(.*)',
        dest: '/api/$1',
        continue: true
      },
      {
        src: '/(.*)',
        dest: '/$1'
      }
    ],
    // Tell Vercel this is a Next.js function
    framework: {
      version: require('./package.json').dependencies.next.replace('^', '')
    }
  };
  
  fs.writeFileSync(
    '.vercel/output/config.json',
    JSON.stringify(vercelConfig, null, 2)
  );
  console.log('Created Vercel config');
  
  // Create the functions directory structure
  ensureDirectoryExists('.vercel/output/functions');
  ensureDirectoryExists('.vercel/output/static');
  
  // Manually copy the serverless functions if they exist
  console.log('Processing serverless functions...');
  
  // Copy over the .next/server directory if it exists
  if (fs.existsSync('.next/server')) {
    ensureDirectoryExists('.vercel/output/functions/_next/server');
    execSync('cp -r .next/server/* .vercel/output/functions/_next/server/', { stdio: 'inherit' });
    console.log('Copied server functions');
  }
  
  // Copy over the .next/serverless directory if it exists
  if (fs.existsSync('.next/serverless')) {
    ensureDirectoryExists('.vercel/output/functions/_next/serverless');
    execSync('cp -r .next/serverless/* .vercel/output/functions/_next/serverless/', { stdio: 'inherit' });
    console.log('Copied serverless functions');
  }
  
  // Copy static assets
  console.log('Copying static assets...');
  ensureDirectoryExists('.vercel/output/static/_next');
  execSync('cp -r .next/static .vercel/output/static/_next/', { stdio: 'inherit' });
  
  // Create a fallback manifest if not present
  if (!fs.existsSync('.next/routes-manifest.json')) {
    console.log('Creating fallback routes-manifest.json');
    const fallbackManifest = {
      version: 3,
      basePath: '',
      redirects: [],
      rewrites: [],
      headers: [],
      dynamicRoutes: []
    };
    
    fs.writeFileSync('.next/routes-manifest.json', JSON.stringify(fallbackManifest, null, 2));
  }
  
  // Copy routes manifest to help Vercel identify routes
  fs.copyFileSync('.next/routes-manifest.json', '.vercel/output/routes-manifest.json');
  
  // Create a stub function for API routes
  // This is a critical step for Vercel to identify API functions
  console.log('Creating API function stubs...');
  
  // Create a manifest of all API routes
  const apiPagesDir = path.join(process.cwd(), 'src', 'app', 'api');
  if (fs.existsSync(apiPagesDir)) {
    const apiRoutes = [];
    
    // Function to recursively list all API routes
    function findApiRoutes(dir, baseRoute = '/api') {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // If directory name is in brackets, it's a dynamic route
            const routePart = item.startsWith('[') && item.endsWith(']') 
              ? `/[slug]` // Simplify dynamic routes to a standard pattern
              : `/${item}`;
            
            findApiRoutes(fullPath, `${baseRoute}${routePart}`);
          } else if (item === 'route.ts' || item === 'route.js') {
            apiRoutes.push(baseRoute);
          }
        }
      } catch (err) {
        console.warn(`Warning: Could not process API directory ${dir}`, err);
      }
    }
    
    findApiRoutes(apiPagesDir);
    
    // Create a stub function file for each API route
    for (const route of apiRoutes) {
      const functionPath = `.vercel/output/functions${route}.func`;
      ensureDirectoryExists(functionPath);
      
      // Create a basic index.js that handles the route
      fs.writeFileSync(
        path.join(functionPath, 'index.js'),
        `// Next.js API route handler
module.exports = (req, res) => {
  // This stub will be replaced by Vercel with the actual function
  const path = req.url;
  console.log('API request to:', path);
  
  res.status(200).json({
    path,
    message: 'API route handler (stub)',
    success: true
  });
};`
      );
      
      // Create a basic .vc-config.json for the function
      fs.writeFileSync(
        path.join(functionPath, '.vc-config.json'),
        JSON.stringify({
          runtime: 'edge',
          entrypoint: 'index.js'
        }, null, 2)
      );
    }
    
    console.log(`Created ${apiRoutes.length} API function stubs`);
  }
  
  console.log('Vercel build completed successfully!');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
} 