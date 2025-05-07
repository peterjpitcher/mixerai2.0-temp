/**
 * Utility for fetching and extracting content from web pages
 */

/**
 * Fetches content from a web page URL
 * @param url The URL to fetch content from
 * @returns The extracted text content from the page
 */
export async function fetchWebPageContent(url: string): Promise<string> {
  try {
    // Perform a server-side fetch of the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MixerAI/1.0 Content Analysis Bot'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract the text content (simplified approach)
    // In a real application, you might use a proper HTML parser like jsdom or cheerio
    return extractTextFromHtml(html);
  } catch (error) {
    console.error('Error fetching web page content:', error);
    throw error;
  }
}

/**
 * Simple HTML text extraction (simplified for this example)
 * In production, consider using a proper HTML parser like jsdom or cheerio
 */
function extractTextFromHtml(html: string): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, ' ')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  
  return text;
} 