/**
 * Utility for fetching and extracting content from web pages
 */

/**
 * Fetches content from a web page URL
 * @param url The URL to fetch content from
 * @returns The extracted text content from the page
 */
export async function fetchWebPageContent(url: string, timeout = 5000): Promise<string> {
  try {
    console.log(`Fetching content from URL: ${url}`);
    
    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Perform a server-side fetch of the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MixerAI/1.0 Content Analysis Bot'
      },
      signal: controller.signal
    }).finally(() => {
      clearTimeout(timeoutId);
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`Successfully fetched HTML content from URL (${html.length} bytes)`);
    
    // Extract the text content
    const extractedText = extractTextFromHtml(html);
    console.log(`Extracted ${extractedText.length} characters of text content`);
    
    return extractedText;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`Fetching URL timed out after ${timeout}ms: ${url}`);
      throw new Error(`Fetching URL timed out after ${timeout}ms`);
    }
    
    console.error('Error fetching web page content:', error);
    throw error;
  }
}

/**
 * Simple HTML text extraction (simplified for this example)
 * In production, consider using a proper HTML parser like jsdom or cheerio
 */
function extractTextFromHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    console.warn('Invalid HTML content received');
    return '';
  }
  
  try {
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
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    return html.substring(0, 5000); // Return truncated raw HTML as fallback
  }
} 