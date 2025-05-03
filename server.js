const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

// Determine if we're in development or production
const dev = process.env.NODE_ENV !== 'production';
// If in maintenance mode, don't use Next.js
const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';

// If in maintenance mode, create a simple server
if (maintenanceMode) {
  console.log('Running in maintenance mode');
  
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;
    
    // Add security headers to all responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    
    // Serve API tester HTML page
    if (pathname === '/api-tester') {
      try {
        const htmlPath = path.join(__dirname, 'public', 'api-tester.html');
        if (fs.existsSync(htmlPath)) {
          const content = fs.readFileSync(htmlPath, 'utf8');
          res.setHeader('Content-Type', 'text/html');
          res.statusCode = 200;
          res.end(content);
          return;
        }
      } catch (error) {
        console.error('Error serving API tester:', error);
      }
    }
    
    // Handle API routes directly with fallback data
    if (pathname.startsWith('/api/')) {
      // Set JSON content type
      res.setHeader('Content-Type', 'application/json');
      
      const apiPath = pathname.substring(5); // Remove '/api/'
      
      if (apiPath.startsWith('brands')) {
        // Fallback for brands API
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          isFallback: true,
          brands: [
            {
              id: '1',
              name: 'Sample Brand',
              website_url: 'https://example.com',
              country: 'United States',
              language: 'English',
              brand_identity: 'Modern and innovative',
              tone_of_voice: 'Professional but friendly',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              content_count: 5,
              brand_color: '#3498db'
            },
            {
              id: '2',
              name: 'Another Brand',
              website_url: 'https://another-example.com',
              country: 'United Kingdom',
              language: 'English',
              brand_identity: 'Traditional and trusted',
              tone_of_voice: 'Formal and authoritative',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              content_count: 3,
              brand_color: '#e74c3c'
            }
          ]
        }));
        return;
      }
      
      if (apiPath.startsWith('content-types')) {
        // Fallback for content types API
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          isFallback: true,
          contentTypes: [
            {
              id: '1',
              name: 'Article',
              description: 'Long-form content pieces like blog posts and articles',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '2',
              name: 'Retailer PDP',
              description: 'Product description pages for retailer websites',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '3',
              name: 'Owned PDP',
              description: 'Product description pages for brand-owned websites',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        }));
        return;
      }
      
      if (apiPath.startsWith('content')) {
        // Fallback for content API
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          isFallback: true,
          content: [
            {
              id: '1',
              title: 'Sample Content Article',
              body: 'This is sample content for when the database is unavailable.',
              status: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              brand_name: 'Sample Brand',
              brand_color: '#3498db',
              content_type_name: 'Article',
              created_by_name: 'System'
            },
            {
              id: '2',
              title: 'Another Sample Content',
              body: 'Second sample content for when the database is unavailable.',
              status: 'published',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              brand_name: 'Another Brand',
              brand_color: '#e74c3c',
              content_type_name: 'Retailer PDP',
              created_by_name: 'System'
            }
          ]
        }));
        return;
      }
      
      // Default API response for unknown endpoints
      res.statusCode = 404;
      res.end(JSON.stringify({
        success: false,
        error: 'API endpoint not found'
      }));
      return;
    }
    
    // For non-API routes, display a simple HTML page
    // This avoids the need for Next.js on the server
    res.setHeader('Content-Type', 'text/html');
    res.statusCode = 200;
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MixerAI 2.0 - Maintenance Mode</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              max-width: 650px;
              margin: 40px auto;
              padding: 0 20px;
              line-height: 1.6;
              color: #333;
              background-color: #f9f9f9;
            }
            h1 {
              color: #2563eb;
              margin-top: 60px;
            }
            .card {
              background: white;
              border-radius: 8px;
              padding: 20px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              margin: 20px 0;
            }
            .badge {
              display: inline-block;
              background: #ffedd5;
              color: #c2410c;
              padding: 4px 10px;
              border-radius: 9999px;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <h1>MixerAI 2.0</h1>
          <span class="badge">Maintenance Mode</span>
          <div class="card">
            <h2>API Services Available</h2>
            <p>The application is currently in maintenance mode, but API services are available.</p>
            <p>You can access the following API endpoints:</p>
            <ul>
              <li>/api/brands - Get all brands</li>
              <li>/api/content - Get all content</li>
              <li>/api/content-types - Get all content types</li>
            </ul>
            <p><a href="/api-tester" style="color: #2563eb; text-decoration: none; font-weight: bold;">Use the API Tester</a></p>
          </div>
          <p>The full application will be back soon. Thank you for your patience.</p>
        </body>
      </html>
    `);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Maintenance server running on port ${port}`);
  });
} else {
  // Normal operation with Next.js
  const app = next({ dev });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer((req, res) => {
      // Add security headers to all responses
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(process.env.PORT || 3000, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${process.env.PORT || 3000}`);
    });
  });
} 