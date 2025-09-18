import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns';
import ipaddr from 'ipaddr.js';
import { z } from 'zod';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { env } from '@/lib/env';

const MAX_HTML_BYTES = 1024 * 1024; // 1MB cap

const rawAllowlist = (env.PROXY_ALLOWED_HOSTS || '')
  .split(',')
  .map(entry => entry.trim().toLowerCase())
  .filter(Boolean);

const allowlistedHosts = new Set(rawAllowlist);

function isHostAllowlisted(hostname: string): boolean {
  if (!allowlistedHosts.size) {
    return false;
  }

  const host = hostname.toLowerCase();

  for (const entry of allowlistedHosts) {
    if (entry.startsWith('*.')) {
      const bare = entry.slice(2);
      if (host === bare || host.endsWith(`.${bare}`)) {
        return true;
      }
      continue;
    }

    if (host === entry) {
      return true;
    }
  }

  return false;
}

// Schema for the request
const scrapeRecipeSchema = z.object({
  url: z.string().url('Invalid URL format')
});

// Recipe data structure
interface RecipeData {
  title?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  nutrition?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    [key: string]: string | undefined;
  };
  imageUrl?: string;
  author?: string;
  source?: string;
}

// Helper function to extract JSON-LD data
function extractJsonLdData(html: string): RecipeData | null {
  try {
    // Find all script tags with type="application/ld+json"
    const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    const matches = Array.from(html.matchAll(jsonLdRegex));
    
    for (const match of matches) {
      try {
        const jsonData = JSON.parse(match[1]);
        
        // Check if it's a Recipe schema
        if (jsonData['@type'] === 'Recipe' || 
            (Array.isArray(jsonData['@type']) && jsonData['@type'].includes('Recipe'))) {
          
          const recipe: RecipeData = {
            title: jsonData.name,
            description: jsonData.description,
            imageUrl: typeof jsonData.image === 'string' ? jsonData.image : jsonData.image?.[0],
            author: typeof jsonData.author === 'string' ? jsonData.author : jsonData.author?.name,
            source: jsonData.url
          };

          // Extract ingredients
          if (jsonData.recipeIngredient) {
            recipe.ingredients = Array.isArray(jsonData.recipeIngredient) 
              ? jsonData.recipeIngredient 
              : [jsonData.recipeIngredient];
          }

          // Extract instructions
          if (jsonData.recipeInstructions) {
            recipe.instructions = [];
            const instructions = Array.isArray(jsonData.recipeInstructions) 
              ? jsonData.recipeInstructions 
              : [jsonData.recipeInstructions];
            
            for (const instruction of instructions) {
              if (typeof instruction === 'string') {
                recipe.instructions.push(instruction);
              } else if (instruction.text) {
                recipe.instructions.push(instruction.text);
              } else if (instruction.name) {
                recipe.instructions.push(instruction.name);
              }
            }
          }

          // Extract times
          recipe.prepTime = parseDuration(jsonData.prepTime);
          recipe.cookTime = parseDuration(jsonData.cookTime);
          recipe.totalTime = parseDuration(jsonData.totalTime);

          // Extract yield/servings
          if (jsonData.recipeYield) {
            recipe.servings = Array.isArray(jsonData.recipeYield) 
              ? jsonData.recipeYield[0]?.toString() 
              : jsonData.recipeYield.toString();
          }

          // Extract nutrition
          if (jsonData.nutrition) {
            recipe.nutrition = {
              calories: jsonData.nutrition.calories,
              protein: jsonData.nutrition.proteinContent,
              carbs: jsonData.nutrition.carbohydrateContent,
              fat: jsonData.nutrition.fatContent,
              fiber: jsonData.nutrition.fiberContent,
              sugar: jsonData.nutrition.sugarContent,
              sodium: jsonData.nutrition.sodiumContent
            };
          }

          return recipe;
        }
      } catch (e) {
        // Continue to next JSON-LD block if this one fails
        console.warn('Failed to parse JSON-LD block:', e);
      }
    }
  } catch (error) {
    console.error('Error extracting JSON-LD data:', error);
  }
  
  return null;
}

// Helper function to parse ISO 8601 duration to human-readable format
function parseDuration(duration?: string): string | undefined {
  if (!duration || !duration.startsWith('PT')) return duration;
  
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      
      if (hours && minutes) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else if (hours) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else if (minutes) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    }
  } catch {
    console.warn('Failed to parse duration:', duration);
  }
  
  return duration;
}

// Fallback HTML parsing for common recipe sites
function parseRecipeFromHtml(html: string, url: string): RecipeData | null {
  // This is a simplified fallback parser
  // In a production system, you'd want site-specific parsers
  const recipe: RecipeData = {
    source: url
  };

  // Try to extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    recipe.title = titleMatch[1]
      .replace(/\s*[-|]\s*.*$/, '') // Remove site name
      .trim();
  }

  // Try to extract description from meta tags
  const descMatch = html.match(/<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["'](.*?)["']/i);
  if (descMatch) {
    recipe.description = descMatch[1];
  }

  // Try to extract image from meta tags
  const imageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["'](.*?)["']/i);
  if (imageMatch) {
    recipe.imageUrl = imageMatch[1];
  }

  return recipe;
}

// POST /api/content/scrape-recipe
export const POST = withAuthAndCSRF(async (req: NextRequest): Promise<Response> => {
  try {
    const body = await req.json();
    const validatedData = scrapeRecipeSchema.parse(body);
    
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(validatedData.url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { success: false, error: 'Only HTTP and HTTPS URLs are permitted.' },
        { status: 400 }
      );
    }

    if (!isHostAllowlisted(parsedUrl.hostname)) {
      return NextResponse.json(
        {
          success: false,
          error: 'This host is not allowed. Ask an administrator to add it to the allowlist if needed.'
        },
        { status: 403 }
      );
    }

    try {
      const lookupResults = await dns.promises.lookup(parsedUrl.hostname, { all: true });
      if (!lookupResults.length) {
        return NextResponse.json(
          { success: false, error: `Could not resolve hostname: ${parsedUrl.hostname}` },
          { status: 502 }
        );
      }

      for (const result of lookupResults) {
        const addr = ipaddr.parse(result.address);
        const range = addr.range();
        if (range === 'private' || range === 'loopback' || range === 'reserved' || range === 'linkLocal' || range === 'uniqueLocal') {
          return NextResponse.json(
            { success: false, error: 'Requests to internal or reserved IP addresses are not allowed.' },
            { status: 403 }
          );
        }
      }
    } catch (ipError) {
      console.error('[scrape-recipe] Failed to validate DNS resolution:', ipError);
      return NextResponse.json(
        { success: false, error: 'Failed to validate destination host.' },
        { status: 400 }
      );
    }

    // Try to fetch the recipe page
    let response;
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Fetch the recipe page with more comprehensive headers
      response = await fetch(validatedData.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        }
      });
      
      clearTimeout(timeout);
    } catch (fetchError) {
      console.error('Network error fetching recipe:', fetchError);
      
      // Handle specific error types
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Request timed out. The recipe website took too long to respond.' 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to connect to the recipe website. Please check the URL and try again.' 
        },
        { status: 400 }
      );
    }

    if (!response.ok) {
      console.error(`Failed to fetch recipe from ${validatedData.url}: ${response.status} ${response.statusText}`);
      
      // Provide more helpful error messages
      let errorMessage = `Failed to fetch recipe: ${response.status} ${response.statusText}`;
      if (response.status === 403) {
        errorMessage = 'The website has blocked automated access. Please try copying the recipe manually or try a different website.';
      } else if (response.status === 404) {
        errorMessage = 'Recipe page not found. Please check the URL is correct.';
      } else if (response.status >= 500) {
        errorMessage = 'The recipe website is currently unavailable. Please try again later.';
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { success: false, error: 'Failed to read response body.' },
        { status: 502 }
      );
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_HTML_BYTES) {
        reader.cancel();
        return NextResponse.json(
          { success: false, error: 'Recipe page is too large to process.' },
          { status: 413 }
        );
      }
      chunks.push(value);
    }

    const html = new TextDecoder('utf-8').decode(concatenateUint8Arrays(chunks, total));
    
    // Try to extract structured data first
    let recipeData = extractJsonLdData(html);
    
    // If no structured data, fall back to HTML parsing
    if (!recipeData || !recipeData.title) {
      recipeData = parseRecipeFromHtml(html, validatedData.url);
    }

    if (!recipeData || !recipeData.title) {
      return NextResponse.json(
        { success: false, error: 'Could not extract recipe data from the provided URL' },
        { status: 400 }
      );
    }

    // Format the response
    const formattedRecipe = {
      title: recipeData.title || '',
      description: recipeData.description || '',
      ingredients: recipeData.ingredients?.join('\n') || '',
      instructions: recipeData.instructions?.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n') || '',
      prepTime: recipeData.prepTime || '',
      cookTime: recipeData.cookTime || '',
      totalTime: recipeData.totalTime || '',
      servings: recipeData.servings || '',
      nutrition: recipeData.nutrition ? Object.entries(recipeData.nutrition)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ') : '',
      imageUrl: recipeData.imageUrl || '',
      author: recipeData.author || '',
      source: recipeData.source || validatedData.url
    };

    return NextResponse.json({
      success: true,
      data: formattedRecipe
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error scraping recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to scrape recipe' },
      { status: 500 }
    );
  }
});

function concatenateUint8Arrays(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
