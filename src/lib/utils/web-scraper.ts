/**
 * Utility for fetching and extracting content from web pages
 */
import * as cheerio from 'cheerio';

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
 * Extracts text content from an HTML string using cheerio.
 * It attempts to remove common non-content elements and preserve some structure.
 * @param html The HTML string to parse
 * @returns The extracted text content
 */
function extractTextFromHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    console.warn('Invalid HTML content received for parsing.');
    return '';
  }

  try {
    const $ = cheerio.load(html);

    // Remove script and style elements, common navigation and footer elements
    $('script, style, nav, footer, aside, header, [role="navigation"], [role="banner"], [role="contentinfo"] ').remove();

    // Attempt to get text from common main content containers first
    let mainContentText = $('main, article, [role="main"], .content, #content, .main, #main').text();

    let extractedText = '';

    if (mainContentText && mainContentText.trim().length > 200) { // Heuristic: if main content is substantial
        extractedText = mainContentText;
    } else {
        // Fallback to body if main content selectors don't yield much, or don't exist
        // This is a simple text extraction, could be improved with more sophisticated selectors
        // or by iterating over block-level elements and adding newlines.
        $('body').find('p, h1, h2, h3, h4, h5, h6, li, div').each((i, elem) => {
            const elementText = $(elem).text().trim();
            if (elementText) {
                extractedText += elementText + '\n'; // Add newline for block-like elements
            }
        });
        if (!extractedText) { // If still no text, get all text from body
            extractedText = $('body').text();
        }
    }

    // Basic cleanup: replace multiple spaces/newlines with a single one
    return extractedText.replace(/\s\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  } catch (error) {
    console.error('Error extracting text from HTML with Cheerio:', error);
    // Fallback to returning a snippet of raw HTML if parsing fails catastrophically
    // This is less ideal than returning empty or a more processed version, but better than crashing.
    const snippet = html.substring(0, 2000).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return snippet ? snippet + "... (parsing error, showing snippet)" : "Error parsing content.";
  }
} 