import { parse } from 'url';

/**
 * Extracts URLs from a text string
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Scrapes content from a URL
 * This is a frontend-friendly implementation that will work in the browser
 */
export async function scrapeUrl(url: string): Promise<{ title: string; content: string }> {
  try {
    console.log(`Attempting to scrape content from: ${url}`);
    
    // Use a proxy to avoid CORS issues
    // In production, you should set up your own proxy service
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Get the title
    const title = doc.querySelector('title')?.textContent || '';
    
    // Get the main content - prioritize main content areas
    let content = '';
    const mainElement = doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('.content');
    
    if (mainElement) {
      content = mainElement.textContent || '';
    } else {
      // Fallback to body content, excluding scripts, styles, etc.
      const bodyText = doc.body.textContent || '';
      content = bodyText
        .replace(/(\r\n|\n|\r)/gm, ' ')  // Replace line breaks with spaces
        .replace(/\s+/g, ' ')           // Replace multiple spaces with a single space
        .trim();
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')            // Replace multiple spaces with a single space
      .slice(0, 5000);                // Limit content length
    
    console.log(`Successfully scraped content from ${url}: ${content.length} characters`);
    
    return { title, content };
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error);
    return { 
      title: url, 
      content: `Failed to scrape content from ${url}. Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Extract and scrape URLs from a text input
 */
export async function scrapeUrlsFromText(text: string): Promise<Array<{ url: string; title: string; content: string }>> {
  // Extract URLs from the text
  const urls = extractUrls(text);
  
  if (urls.length === 0) {
    return [];
  }
  
  console.log(`Found ${urls.length} URLs to scrape:`, urls);
  
  // Scrape each URL
  const scrapedContent = await Promise.all(
    urls.map(async (url) => {
      const { title, content } = await scrapeUrl(url);
      return { url, title, content };
    })
  );
  
  return scrapedContent;
} 