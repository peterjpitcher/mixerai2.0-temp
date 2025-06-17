import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { z } from 'zod';

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
  } catch (e) {
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
export const POST = withAuth(async (req: NextRequest, _user: User) => {
  try {
    const body = await req.json();
    const validatedData = scrapeRecipeSchema.parse(body);
    
    // Fetch the recipe page
    const response = await fetch(validatedData.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch recipe: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    
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
        .filter(([_, value]) => value)
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