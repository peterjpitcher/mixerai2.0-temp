import { NextRequest, NextResponse } from 'next/server';
import { generateAltText } from '@/lib/azure/openai';
import { withAuthMonitoringAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { Json } from '@/types/supabase';

// In-memory rate limiting
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 60; // Allow 60 requests per minute per IP (relaxed)

interface AltTextGenerationRequest {
  imageUrls: string[];
  language?: string; // Add language field from request
  processBatch?: boolean; // Add batch processing flag
}

interface AltTextResultItem {
  imageUrl: string;
  altText?: string;
  error?: string;
  detectedLanguage?: string; // Add detected language to result
}

const tldToLangCountry: { [key: string]: { language: string; country: string } } = {
  '.fr': { language: 'fr', country: 'FR' },
  '.de': { language: 'de', country: 'DE' },
  '.es': { language: 'es', country: 'ES' },
  '.it': { language: 'it', country: 'IT' },
  '.co.uk': { language: 'en', country: 'GB' },
  '.com.au': { language: 'en', country: 'AU' },
  '.ca': { language: 'en', country: 'CA' }, // Could also be 'fr'
  '.jp': { language: 'ja', country: 'JP' },
  '.cn': { language: 'zh', country: 'CN' },
  '.nl': { language: 'nl', country: 'NL' },
  '.br': { language: 'pt', country: 'BR' },
  '.ru': { language: 'ru', country: 'RU' },
  '.in': { language: 'en', country: 'IN' },
  // Add more mappings as needed
};

const getDefaultLangCountry = () => ({ language: 'en', country: 'US' });

function getLangCountryFromUrl(imageUrl: string): { language: string; country: string } {
  try {
    // Do not attempt to parse TLD from data URLs
    if (imageUrl.startsWith('data:')) {
      return getDefaultLangCountry();
    }
    const parsedUrl = new URL(imageUrl);
    const hostname = parsedUrl.hostname;

    // Check for multi-part TLDs first (e.g., .co.uk, .com.au)
    for (const tld of Object.keys(tldToLangCountry)) {
      if (hostname.endsWith(tld)) {
        // Check if the part before the TLD is not empty (to avoid matching just .uk from .co.uk on a domain like example.uk)
        const domainPart = hostname.substring(0, hostname.length - tld.length);
        if (domainPart && domainPart.includes('.')) { // Ensure it's a valid subdomain or domain part
            return tldToLangCountry[tld];
        }
      }
    }
    
    // Check for single-part TLDs (e.g., .fr, .de)
    const parts = hostname.split('.');
    if (parts.length > 1) {
      const singleTld = '.' + parts[parts.length - 1];
      if (tldToLangCountry[singleTld]) {
        return tldToLangCountry[singleTld];
      }
    }

  } catch (e) {
    console.warn(`[AltTextLang] Could not parse URL or determine TLD for ${imageUrl}:`, e);
  }
  return getDefaultLangCountry();
}

export const POST = withAuthMonitoringAndCSRF(async (request: NextRequest, user) => {
  const supabaseAdmin = createSupabaseAdminClient();
  let historyEntryStatus: 'success' | 'failure' = 'success';
  let historyErrorMessage: string | undefined = undefined;
  // const requestStartTime = Date.now(); // For logging overall request time if needed
  let apiInputs: AltTextGenerationRequest | null = null;
  let apiOutputs: { results: AltTextResultItem[] } | null = null;

  // Role check: Only Global Admins or Editors can access this tool
  const userRole = user.user_metadata?.role;
  if (!(userRole === 'admin' || userRole === 'editor')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You do not have permission to access this tool.' },
      { status: 403 }
    );
  }

  // Rate limiting logic
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  const now = Date.now();

  if (rateLimit.has(ip)) {
    const userRateLimit = rateLimit.get(ip)!;
    if (now - userRateLimit.timestamp > RATE_LIMIT_PERIOD) {
      // Reset count if period has passed
      userRateLimit.count = 1;
      userRateLimit.timestamp = now;
    } else if (userRateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
      console.warn(`[RateLimit] Blocked ${ip} for alt-text-generator. Count: ${userRateLimit.count}`);
      historyEntryStatus = 'failure';
      historyErrorMessage = 'Rate limit exceeded.';
      // Log history before returning
      try {
        await supabaseAdmin.from('tool_run_history').insert({
            user_id: user.id,
            tool_name: 'alt_text_generator',
            inputs: { error: 'Rate limit exceeded for initial request' }, // Or apiInputs if available
            outputs: { error: 'Rate limit exceeded' },
            status: historyEntryStatus,
            error_message: historyErrorMessage,
            brand_id: null // Alt text gen currently has no brand context
        });
      } catch (logError) {
        console.error('[HistoryLoggingError] Failed to log rate limit error for alt-text-generator:', logError);
      }
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      );
    } else {
      userRateLimit.count += 1;
    }
  } else {
    rateLimit.set(ip, { count: 1, timestamp: now });
  }

  try {
    const data: AltTextGenerationRequest = await request.json();
    apiInputs = data; // Capture inputs for logging
    
    if (!data.imageUrls || !Array.isArray(data.imageUrls) || data.imageUrls.length === 0) {
      historyEntryStatus = 'failure';
      historyErrorMessage = 'An array of image URLs is required';
      return NextResponse.json(
        { success: false, error: historyErrorMessage },
        { status: 400 }
      );
    }

    const results: AltTextResultItem[] = [];

    for (const imageUrl of data.imageUrls) {
      const requestedLanguage = data.language; // Get language from request if provided
      let language = 'en';
      let country = 'US';
      let processingError: string | undefined = undefined;

      try {
        // Validate URL structure and safety
        if (imageUrl.startsWith('data:')) {
          // Validate data URL format and check for SVG
          if (imageUrl.startsWith('data:image/svg')) {
            throw new Error('SVG images are not supported. Please use PNG, JPG, WEBP, or other raster image formats.');
          }
          const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/;
          if (!dataUrlRegex.test(imageUrl)) {
            throw new Error('Invalid data URL format. Only image data URLs (PNG, JPG, WEBP, GIF) are allowed.');
          }
          // Check data URL size (rough estimate - base64 is ~33% larger than binary)
          const base64Data = imageUrl.split(',')[1];
          const estimatedSize = (base64Data.length * 3) / 4;
          if (estimatedSize > 15 * 1024 * 1024) { // 15MB limit for images
            throw new Error('Data URL image is too large (max 15MB)');
          }
        } else {
          // Validate regular URL
          const url = new URL(imageUrl);
          
          // Block potentially dangerous protocols
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error(`Invalid protocol: ${url.protocol}. Only HTTP(S) URLs are allowed.`);
          }
          
          // Block localhost and internal IPs
          const hostname = url.hostname.toLowerCase();
          if (hostname === 'localhost' || 
              hostname === '127.0.0.1' || 
              hostname.startsWith('192.168.') ||
              hostname.startsWith('10.') ||
              hostname.startsWith('172.')) {
            throw new Error('Internal or localhost URLs are not allowed');
          }
          
          // Validate image file extension if present in URL
          const pathname = url.pathname.toLowerCase();
          const supportedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
          const unsupportedExtensions = ['.svg', '.ico', '.tiff', '.tif'];
          
          // Check if URL contains SVG or other unsupported formats
          const hasUnsupportedExtension = unsupportedExtensions.some(ext => pathname.endsWith(ext));
          if (hasUnsupportedExtension) {
            throw new Error('SVG and other vector/unsupported image formats cannot be processed. Please use PNG, JPG, WEBP, or other raster image formats.');
          }
          
          // Check query parameters for potential SVG content type hints
          if (url.search.toLowerCase().includes('format=svg') || 
              url.search.toLowerCase().includes('type=svg')) {
            throw new Error('SVG images are not supported. Please use PNG, JPG, WEBP, or other raster image formats.');
          }
          
          const hasImageExtension = supportedExtensions.some(ext => pathname.endsWith(ext));
          
          // Warn if no image extension (but don't block - some image URLs don't have extensions)
          if (!hasImageExtension && !pathname.includes('/')) {
            console.warn(`[AltTextGen] URL may not be an image: ${imageUrl}`);
          }
        }
        
        if (requestedLanguage) {
          language = requestedLanguage;
          // Attempt to map language to a default country, or keep default US
          const langMap = Object.values(tldToLangCountry).find(lc => lc.language === language);
          country = langMap ? langMap.country : 'US'; 
        } else if (!imageUrl.startsWith('data:')) {
          // Fallback to TLD detection if no language explicitly passed and not a data URL
          const langCountry = getLangCountryFromUrl(imageUrl);
          language = langCountry.language;
          country = langCountry.country;
        } else {
          // For data URLs with no language passed, use default
          const defaultLangCountry = getDefaultLangCountry();
          language = defaultLangCountry.language;
          country = defaultLangCountry.country;
        }

      } catch (e: unknown) {
        console.error(`[AltTextGen] Invalid image URL format for TLD processing: ${imageUrl}:`, e);
        processingError = `Invalid image URL format.`;
        const defaultLangCountry = getDefaultLangCountry();
        language = requestedLanguage || defaultLangCountry.language; // Still prioritize requested lang if URL is bad
        country = defaultLangCountry.country;
      }

      if (processingError) {
        results.push({
          imageUrl,
          error: processingError,
        });
        historyEntryStatus = 'failure'; // Mark overall run as failure if any image fails
        if (!historyErrorMessage) historyErrorMessage = 'One or more images failed processing.'; 
        continue; // Skip to the next URL if the current one is invalid
      }
      
      try {
        // Brand context is currently empty, but kept for potential future use
        const brandContext = {
          brandIdentity: '',
          toneOfVoice: '',
          guardrails: ''
        };
        
        // Add delay between image processing to avoid rate limiting (except for the first image)
        if (results.length > 0) {
          console.log(`[Delay] Alt-Text Gen: Waiting 2 seconds before processing next image...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // console.log(`[AltTextGen] Generating for ${imageUrl} with lang: ${language}, country: ${country}`);
        const generatedAltTextResult = await generateAltText(
          imageUrl,
          language,
          brandContext
        );
        
        results.push({
          imageUrl,
          altText: generatedAltTextResult.altText,
          detectedLanguage: generatedAltTextResult.detectedLanguage || language, // Use detected language if available, otherwise use the requested/TLD language
          // error: generatedAltTextResult.error, // If your generateAltText can return partial errors
        });

      } catch (error: unknown) {
        console.error(`[AltTextGen] Error calling generateAltText for ${imageUrl} (lang: ${language}, country: ${country}):`, error);
        results.push({
          imageUrl,
          error: error instanceof Error ? error.message : 'Failed to generate alt text for this image.',
        });
        historyEntryStatus = 'failure'; // Mark overall run as failure if any image fails
        if (!historyErrorMessage) historyErrorMessage = 'One or more images failed AI generation.'; 
      }
    }
    
    apiOutputs = { results }; // Capture outputs for logging

    // Determine final history status based on individual image results
    if (results.some(r => r.error)) {
        historyEntryStatus = 'failure';
        if (!historyErrorMessage) historyErrorMessage = 'One or more images failed to generate alt text.';
    } else {
        historyEntryStatus = 'success';
    }

    return NextResponse.json({
      success: historyEntryStatus === 'success', // Reflect overall success
      userId: user.id,
      results,
      // Add overall error message if the entire operation is considered a failure
      ...(historyEntryStatus === 'failure' && historyErrorMessage && { error: historyErrorMessage })
    });

  } catch (error: unknown) {
    console.error('[AltTextGen] Global error in POST handler:', error);
    historyEntryStatus = 'failure';
    historyErrorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    // Ensure apiInputs is at least an empty object if error happened before parsing request body
    if (!apiInputs) apiInputs = {imageUrls: [], language: 'unknown'}; 
    apiOutputs = { results: [{ imageUrl: 'unknown', error: historyErrorMessage }] };
    return handleApiError(new Error(historyErrorMessage), 'Alt Text Generation Error', 500);
  } finally {
    // Log to tool_run_history in all cases (success or failure)
    try {
      if (apiInputs) { // Only log if inputs were parsed or an attempt was made
        // Generate a batch_id if processBatch is true and there are multiple image URLs
        const batchId = (apiInputs.processBatch && apiInputs.imageUrls.length > 1) 
          ? crypto.randomUUID() 
          : null;

        // For batch processing, create a single history entry with all image URLs
        await supabaseAdmin.from('tool_run_history').insert({
            user_id: user.id,
            tool_name: 'alt_text_generator',
            inputs: apiInputs as unknown as Json,
            outputs: (apiOutputs || { error: historyErrorMessage || 'Unknown error before output generation' }) as unknown as Json,
            status: historyEntryStatus,
            error_message: historyErrorMessage,
            brand_id: null, // Alt text generator is not brand-specific for history
            batch_id: batchId,
            batch_sequence: batchId ? 1 : null
        });
      } else {
        // This case might happen if request.json() itself fails catastrophically before apiInputs is set
        // Or if a rate limit error occurred very early before apiInputs could be determined
        if (historyEntryStatus === 'failure' && historyErrorMessage) { // Only log if we have a specific error to log
             await supabaseAdmin.from('tool_run_history').insert({
                user_id: user.id,
                tool_name: 'alt_text_generator',
                inputs: { error: 'Failed to parse request or early error' } as Json,
                outputs: { error: historyErrorMessage } as Json,
                status: 'failure',
                error_message: historyErrorMessage,
                brand_id: null
            });
        }
      }
    } catch (logError) {
      console.error('[HistoryLoggingError] Failed to log run for alt-text-generator:', logError);
      // Do not let logging failure prevent the actual response from being sent
    }
  }
}); 
