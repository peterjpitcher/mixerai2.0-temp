# Scrape URL API Implementation Guide

This document provides detailed specifications for implementing the `scrape-url` API endpoint that's currently missing from the MixerAI 2.0 application.

## API Endpoint Specification

### 1. Route Structure

```typescript
// src/app/api/scrape-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

/**
 * API route for scraping website content
 * Used by the brand identity generation feature
 */
export async function POST(request: NextRequest) {
  // Build-time detection implementation
  const isBuildTime = process.env.NODE_ENV === 'production' && 
                    typeof window === 'undefined' &&
                    (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || 
                     process.env.VERCEL_ENV === 'preview') &&
                    !request.headers.get('x-forwarded-for') && // No IP means it's likely build time
                    !process.env.VERCEL_URL?.includes('localhost');
  
  // During build time, return mock data
  if (isBuildTime) {
    console.log("Running in build environment, returning mock scrape data");
    
    return NextResponse.json({
      success: true,
      content: "This is mock content for a website. The website has a modern design with a blue color scheme. The main heading states 'Welcome to Our Website'. There are sections for 'About Us', 'Services', and 'Contact'. The logo is positioned in the top left corner."
    });
  }
  
  try {
    const body = await request.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }
    
    console.log(`Scraping content from: ${url}`);
    
    try {
      // Fetch the HTML content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Parse the HTML with jsdom
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Extract relevant content from the page
      const title = document.querySelector('title')?.textContent || '';
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      
      // Get the body text
      const bodyText = document.body.textContent?.trim() || '';
      
      // Extract headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => (h as HTMLHeadingElement).textContent?.trim())
        .filter(Boolean)
        .join('\n');
      
      // Format the extracted content
      const extractedContent = `
Title: ${title}
Description: ${metaDescription}
Headings:
${headings}

Content:
${bodyText.substring(0, 3000)}
`.trim();
      
      return NextResponse.json({
        success: true,
        content: extractedContent
      });
      
    } catch (error) {
      console.error(`Error scraping URL ${url}:`, error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to scrape URL: ${(error as Error).message}` 
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error processing scrape request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request' 
      },
      { status: 500 }
    );
  }
}
```

### 2. API Functionality

#### Request Format

- **Method**: POST
- **URL**: `/api/scrape-url`
- **Body**:
  ```json
  {
    "url": "https://example.com"
  }
  ```

#### Response Format (Success)

```json
{
  "success": true,
  "content": "Title: Example Domain\nDescription: Example website description\nHeadings:\nWelcome\nAbout Us\nServices\n\nContent:\nThis is the extracted content from the website limited to 3000 characters..."
}
```

#### Response Format (Error)

```json
{
  "success": false,
  "error": "Failed to scrape URL: Request timed out"
}
```

### 3. Features

1. **Build-Time Detection**:
   - Follows the pattern from OPENAI_FIXES.md to avoid API calls during builds
   - Returns mock data during build time to prevent failures
   
2. **Content Extraction**:
   - Uses JSDOM for reliable HTML parsing
   - Extracts key components: title, description, headings, body text
   - Formats content in a structured way for AI processing
   
3. **Error Handling**:
   - Handles network errors when fetching websites
   - Provides meaningful error messages for debugging
   - Returns appropriate HTTP status codes

## Integration with Brand Identity Generation

The `scrape-url` API endpoint is used by the brand identity generation feature, specifically in the `generateBrandIdentityFromUrls` function in `src/lib/azure/openai.ts`:

```typescript
// In src/lib/azure/openai.ts
async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    console.log(`Requesting content for URL: ${url}`);
    
    // Use local API for scraping to handle CORS issues
    const apiUrl = typeof window !== 'undefined' 
      ? '/api/scrape-url' 
      : 'http://localhost:3000/api/scrape-url';
    
    console.log(`Using API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Scraping error: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data.success ? data.content : '';
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    return '';
  }
}
```

## Dependencies

- **jsdom**: Required for HTML parsing
  - Already included in package.json
  - Used for extracting and parsing website content

## Testing Considerations

1. **URL Validation**:
   - Test with valid and invalid URLs
   - Ensure proper error handling for malformed URLs

2. **Content Extraction**:
   - Test with different types of websites
   - Verify handling of special characters and encodings

3. **Error Scenarios**:
   - Test behavior when websites are down
   - Verify timeout handling for slow responses
   - Check handling of CORS restrictions

4. **Mock Data Generation**:
   - Verify mock data is returned during build time
   - Ensure real scraping is performed in development and production runtime

## Security Considerations

1. **URL Validation**:
   - Sanitize and validate URLs before processing
   - Prevent scraping of internal/localhost URLs

2. **Rate Limiting**:
   - Consider implementing rate limiting for this endpoint
   - Prevent abuse through excessive scraping requests

3. **User-Agent Header**:
   - Use a standard User-Agent to identify as a legitimate scraper
   - Respect website robots.txt directives where possible 