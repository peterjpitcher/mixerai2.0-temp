// API Fallback for Static Export
// This script provides client-side fallbacks for API routes in static exports

// Global API cache
window.apiCache = {
  brands: null,
  content: null,
  contentTypes: null
};

// Mock API data
const mockData = {
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
      content_count: 5
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
      content_count: 3
    }
  ],
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
  ],
  content: [
    {
      id: '1',
      title: 'Sample Content Article',
      body: 'This is sample content for when the database is unavailable.',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      brand_name: 'Sample Brand',
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
      content_type_name: 'Retailer PDP',
      created_by_name: 'System'
    }
  ]
};

// Mock fetch implementation
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Check if this is an API request
  if (typeof url === 'string' && url.startsWith('/api/')) {
    console.log('Intercepting API request:', url);
    
    // Handle different API endpoints
    if (url.startsWith('/api/brands')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          isFallback: true,
          brands: mockData.brands
        })
      });
    }
    
    if (url.startsWith('/api/content-types')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          isFallback: true,
          contentTypes: mockData.contentTypes
        })
      });
    }
    
    if (url.startsWith('/api/content')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          isFallback: true,
          content: mockData.content
        })
      });
    }
    
    // Default API response for unknown endpoints
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({
        success: false,
        error: 'API endpoint not found'
      })
    });
  }
  
  // For non-API requests, use the original fetch
  return originalFetch.apply(this, arguments);
};

console.log('API fallback initialized for static deployment'); 