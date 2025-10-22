import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import dns from 'dns';
import ipaddr from 'ipaddr.js';
import { z } from 'zod';
import { Readable } from 'stream';

import { COUNTRIES } from '@/lib/constants';
import { recommendVettingAgencies } from '@/lib/vetting-agencies/recommendations';
import { withAdminAuthAndCSRF } from '@/lib/auth/api-auth';
import { handleApiError } from '@/lib/api-utils';
import { getServerEnv } from '@/lib/env';
import { truncateGraphemeSafe } from '@/lib/text/enforce-limit';
import { fetchWebPageContent } from '@/lib/utils/web-scraper';

export const runtime = 'nodejs';

// Rate limiting is now handled globally in middleware

const { PROXY_ALLOWED_HOSTS } = getServerEnv();

const rawAllowlist = (PROXY_ALLOWED_HOSTS || '')
  .split(',')
  .map(entry => entry.trim().toLowerCase())
  .filter(Boolean);

const allowlistedHosts = new Set(rawAllowlist);

const MAX_URLS = 3;
const MAX_CHARACTERS_PER_URL = 3500;
const MAX_COMBINED_CHARACTERS = 9000;
const requestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  urls: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .refine((arr) => arr.length > 0, 'At least one URL is required')
    .transform((arr) => arr.slice(0, MAX_URLS)),
  country: z.string().trim().min(1).max(5).optional().default('GB'),
  language: z.string().trim().min(1).max(10).optional().default('en-GB'),
});

function isHostAllowlisted(hostname: string): boolean {
  if (!allowlistedHosts.size) {
    return true;
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

// Simplified OpenAI client initialization: Prioritizes Azure, falls back to standard OpenAI if configured, else error.
const getOpenAIClientOrThrow = () => {
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT) {
    try {
      return new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
        defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION || '2023-05-15' },
        defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
      });
    } catch {
      // Log actual azureError to a secure server-side logging system in production
      // Fall through to check standard OpenAI if Azure init fails but standard one is configured
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch {
      // Log actual openAIError to a secure server-side logging system in production
      throw new Error('Standard OpenAI client initialization failed. Check API key.');
    }
  }
  throw new Error('OpenAI service is not configured on the server. Please set Azure or standard OpenAI API keys and endpoints.');
};

// Validate URL function
function normalizeUrlCandidate(input: string): { normalized?: string; error?: string } {
  if (!input) {
    return { error: 'URL is empty.' };
  }

  const trimmed = input.trim();

  const attempt = (candidate: string) => {
    try {
      const parsed = new URL(candidate);
      if (!parsed.protocol || !parsed.hostname) {
        throw new Error('URL must include a valid protocol and hostname.');
      }
      return parsed.toString();
    } catch (error) {
      return error instanceof Error ? { error: error.message } : { error: 'Invalid URL.' };
    }
  };

  const directAttempt = attempt(trimmed);
  if (typeof directAttempt === 'string') {
    return { normalized: directAttempt };
  }

  const prefixedAttempt = attempt(`https://${trimmed}`);
  if (typeof prefixedAttempt === 'string') {
    return { normalized: prefixedAttempt };
  }

  const reason = prefixedAttempt.error || directAttempt.error || 'Invalid URL.';
  return { error: reason };
}

// Get language name from language code
function getLanguageName(languageCode: string): string {
  const languageMap: Record<string, string> = {
    'en-GB': 'British English',
    'en-US': 'American English',
    'en-AU': 'Australian English',
    'en-CA': 'Canadian English',
    'fr-FR': 'French',
    'de-DE': 'German',
    'es-ES': 'Spanish',
    'it-IT': 'Italian',
    'nl-NL': 'Dutch',
    'pt-PT': 'Portuguese',
    'ja-JP': 'Japanese',
    'zh-CN': 'Chinese (Simplified)',
    'ar-SA': 'Arabic',
    'ru-RU': 'Russian'
  };
  
  return languageMap[languageCode] || languageCode;
}

// Function to extract website content from a URL
const MAX_DOWNLOAD_BYTES = MAX_CHARACTERS_PER_URL * 160; // cap raw payload before sanitisation

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  textFilter(text: string) {
    return text.replace(/\s+/g, ' ').trim();
  },
};

interface CleanContentResult {
  text: string;
  truncated: boolean;
  originalLength: number;
  finalLength: number;
}

const truncateNotice = (url: string, original: number, final: number) =>
  `Content from ${url} was truncated to ${final} characters (original length ${original}) to stay within AI limits.`;

function cleanScrapedContent(rawContent: string): CleanContentResult {
  if (!rawContent || !rawContent.trim()) {
    throw new Error('The page did not return readable content.');
  }

  const textContent = sanitizeHtml(rawContent, SANITIZE_OPTIONS);

  if (!textContent.trim()) {
    throw new Error('The page did not contain any readable text after sanitization.');
  }

  const { text, truncated, originalLength, finalLength } = truncateGraphemeSafe(textContent, MAX_CHARACTERS_PER_URL);
  if (!text.trim()) {
    throw new Error('The page did not contain any readable text after sanitization.');
  }

  return { text, truncated, originalLength, finalLength };
}

function getErrorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const reason = error.response?.statusText;
    if (status) {
      return `HTTP ${status}${reason ? ` ${reason}` : ''}`;
    }
    if (error.code) {
      return error.code;
    }
    if (typeof error.message === 'string') {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

async function scrapeWithAxios(url: string): Promise<CleanContentResult> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.5',
      'Accept-Encoding': 'identity',
    },
    timeout: 10000,
    responseType: 'stream',
    decompress: true,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const stream = response.data as Readable;
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(typeof chunk === 'string' ? chunk : new Uint8Array(chunk as ArrayBuffer));
      totalBytes += buffer.length;
      if (totalBytes > MAX_DOWNLOAD_BYTES) {
        if (typeof stream.destroy === 'function') {
          stream.destroy();
        } else if (
          typeof (stream as unknown as { cancel?: () => Promise<void> | void }).cancel === 'function'
        ) {
          await (stream as unknown as { cancel: () => Promise<void> | void }).cancel();
        }
        throw new Error(`Page content exceeded the ${Math.round(MAX_DOWNLOAD_BYTES / 1024)}KB limit.`);
      }
      chunks.push(buffer);
    }
  } catch (streamError) {
    throw streamError;
  }

  const rawContent = Buffer.concat(chunks).toString('utf-8');
  return cleanScrapedContent(rawContent);
}

async function scrapeWebsiteContent(url: string): Promise<{ content: string; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    const parsed = new URL(url);

    if (!isHostAllowlisted(parsed.hostname)) {
      throw new Error(`The host "${parsed.hostname}" is not allowlisted. Update PROXY_ALLOWED_HOSTS or use an approved domain.`);
    }

    let resolvedIp: string;
    try {
      const lookupResult = await dns.promises.lookup(parsed.hostname);
      resolvedIp = lookupResult.address;
    } catch (dnsError) {
      const details = dnsError instanceof Error ? ` ${dnsError.message}` : '';
      throw new Error(`Could not resolve hostname: ${parsed.hostname}.${details}`);
    }

    const addr = ipaddr.parse(resolvedIp);
    const range = addr.range();
    if (range === 'private' || range === 'loopback' || range === 'reserved') {
      throw new Error('Requests to internal or reserved IP addresses are not allowed');
    }

    const axiosResult = await scrapeWithAxios(url);
    if (axiosResult.truncated) {
      warnings.push(truncateNotice(url, axiosResult.originalLength, axiosResult.finalLength));
    }
    return { content: axiosResult.text, warnings };
  } catch (primaryError) {
    warnings.push(`Primary fetch failed for ${url}: ${getErrorMessage(primaryError)}`);
  }

  try {
    const fallbackRaw = await fetchWebPageContent(url, 10000);
    const cleaned = cleanScrapedContent(fallbackRaw);
    if (cleaned.truncated) {
      warnings.push(truncateNotice(url, cleaned.originalLength, cleaned.finalLength));
    }
    return { content: cleaned.text, warnings };
  } catch (fallbackError) {
    warnings.push(`Fallback fetch failed for ${url}: ${getErrorMessage(fallbackError)}`);
  }

  throw new Error(warnings.join(' | '));
}

function enforceCombinedCharacterLimit(
  scrapes: { url: string; content: string }[],
  warnings: string[]
): { url: string; content: string }[] {
  if (!scrapes.length) {
    return scrapes;
  }

  const totalChars = scrapes.reduce((sum, item) => sum + item.content.length, 0);
  if (totalChars <= MAX_COMBINED_CHARACTERS) {
    return scrapes;
  }

  const ratio = MAX_COMBINED_CHARACTERS / totalChars;

  return scrapes.map(({ url, content }) => {
    const targetLength = Math.max(600, Math.floor(content.length * ratio));
    if (targetLength >= content.length) {
      return { url, content };
    }
    const { text, truncated, originalLength, finalLength } = truncateGraphemeSafe(content, targetLength);
    if (truncated) {
      warnings.push(truncateNotice(url, originalLength, finalLength));
    }
    return { url, content: text };
  });
}

export const POST = withAdminAuthAndCSRF(async (req: NextRequest) => {
  try {
    const parsedBody = requestSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const { name, urls, country, language } = parsedBody.data;

    const normalizationResults = urls.map(normalizeUrlCandidate);
    const normalizedUrls: string[] = [];
    const normalizationWarnings: string[] = [];

    normalizationResults.forEach((result, index) => {
      const original = urls[index];
      if (result.normalized) {
        if (original.trim() !== result.normalized) {
          normalizationWarnings.push(`URL "${original}" was normalised to "${result.normalized}".`);
        }
        normalizedUrls.push(result.normalized);
      } else if (result.error) {
        normalizationWarnings.push(`URL "${original}": ${result.error}`);
      }
    });

    if (!normalizedUrls.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid URLs provided. Please check the formatting of each URL.',
          details: normalizationWarnings,
        },
        { status: 400 }
      );
    }

    const openai = getOpenAIClientOrThrow(); // Throws if no client can be configured.

    const successfulScrapes: { url: string; content: string }[] = [];
    const scrapeWarnings: string[] = [];
    const processingWarnings: string[] = [];

    for (const url of normalizedUrls) {
      try {
        const scrapeResult = await scrapeWebsiteContent(url);
        const content = scrapeResult.content;
        if (!content.trim()) {
          scrapeWarnings.push(`No readable content could be extracted from ${url}.`);
          continue;
        }
        if (scrapeResult.warnings.length) {
          scrapeWarnings.push(...scrapeResult.warnings);
        }
        successfulScrapes.push({ url, content });
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to scrape ${url}`;
        scrapeWarnings.push(message);
      }
    }

    if (!successfulScrapes.length) {
      const combined = [...normalizationWarnings, ...scrapeWarnings];
      const detail = combined.length ? combined : ['No readable content could be extracted from the provided URLs.'];
      return NextResponse.json(
        {
          success: false,
          error: 'We could not extract readable content from the supplied URLs.',
          details: detail,
        },
        { status: 422 }
      );
    }

    const preparedScrapes = enforceCombinedCharacterLimit(successfulScrapes, processingWarnings);
    
    // Prepare prompt for OpenAI
    const countryInfo = COUNTRIES.find(c => c.value === country);
    const countryName = countryInfo ? countryInfo.label : country;
    
    // Determine specific language name for prompts
    let specificLanguageName = getLanguageName(language); // Default to mapped name or code
    if (language.toLowerCase() === 'en' && country === 'AU') {
      specificLanguageName = 'Australian English';
    } else if (language.toLowerCase() === 'en' && country === 'GB') {
      specificLanguageName = 'British English';
    } else if (language.toLowerCase() === 'en' && country === 'US') {
      specificLanguageName = 'American English';
    } else if (language.toLowerCase() === 'en' && country === 'CA') {
      specificLanguageName = 'Canadian English';
    }
    // Add more specific English variations if needed, or rely on getLanguageName for codes like 'en-AU'

    const systemMessage = `You are an expert brand analyst who creates comprehensive brand identity profiles. 
Your analysis is clear, professional, and tailored to the specific brand and region.
CRITICAL: Your entire response MUST be in the language specified by the user (${specificLanguageName}).
Do not include any content in English unless the specified language is ${specificLanguageName} or a variant of English.`;
    
    const userMessage = `Create a comprehensive brand identity profile for "${name}" based on the following website content:
    
${preparedScrapes.map(({ url, content }, index) => {
  const safeContent = content && content.trim().length > 0 ? content : '[No readable content extracted from this URL.]';
  return `URL ${index + 1}: ${url}\n${safeContent}\n`;
}).join('\n')}

The brand operates in ${countryName} and communicates in ${specificLanguageName}.

IMPORTANT:
- Generate ALL content in ${specificLanguageName}. The entire response must be written in this language, appropriate for the market in ${countryName}.
- DO NOT use any other language for any part of your response unless the requested language is ${specificLanguageName}.
- CRITICAL: Do NOT explicitly mention the country "${countryName}" or its derived nationality/adjective (e.g., Australian, British) in any of the generated text for Brand Identity, Tone of Voice, or Content Guardrails, unless it's part of an official name (like an agency or a law). The content should be culturally adapted for ${countryName} without explicitly stating the country or nationality.

Please provide the following elements:

1. BRAND IDENTITY: A detailed paragraph describing the brand's personality, values, and mission. (100-150 words)

2. TONE OF VOICE: A description of how the brand communicates in ${specificLanguageName} - formal/casual, technical/accessible, etc. (50-75 words)

3. CONTENT GUARDRAILS: 5 specific guidelines that content creators must follow when creating content for this brand. Format as bullet points.

4. BRAND COLOR: From the provided website content and URLs, identify the brand's primary, official color. This is likely the main color used in their logo, headers, buttons, or defined in their CSS as a primary brand color. Do not invent a color or suggest one that "would be appropriate". Identify the most dominant and consistently used color that represents their core visual identity. Provide this color in hex format (e.g., #FF5733). If multiple prominent colors are used, identify the one that appears to be the most central to their official branding.

Set the "suggestedAgencies" field in your response to an empty array; compliance recommendations will be generated separately.

Format your response as a structured JSON object with these keys: brandIdentity, toneOfVoice, guardrails, suggestedAgencies, and brandColor.
Remember that ALL text fields (except potentially within agency names) must be written in ${specificLanguageName}, and should avoid mentioning "${countryName}" or its nationality.`;
    
    try {
      const modelToUse = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const completionResponse = await openai.chat.completions.create({
        model: modelToUse,
        messages: [{ role: "system", content: systemMessage }, { role: "user", content: userMessage }],
        max_tokens: 1500, // Increased max_tokens for potentially longer agency lists
        temperature: 0.7,
        response_format: { type: "json_object" }, // Request JSON output
      });
      
      const completion = completionResponse.choices[0]?.message?.content;
      if (!completion) throw new Error('No completion received from AI service.');
      
      let jsonData;
      try {
        jsonData = JSON.parse(completion);
      } catch {
        // Log this parsing error securely on server-side in production
        throw new Error('AI service returned malformed JSON. Please try again.');
      }
      
      const uniqueScrapeWarnings = Array.from(new Set(scrapeWarnings));
      const uniqueNormalizationWarnings = Array.from(new Set(normalizationWarnings));
      const uniqueProcessingWarnings = Array.from(new Set(processingWarnings));
      
      // Validate and structure the result - remove defaults for missing fields
      const result = {
        brandIdentity: jsonData.brandIdentity,
        toneOfVoice: jsonData.toneOfVoice,
        guardrails: jsonData.guardrails,
        suggestedAgencies: Array.isArray(jsonData.suggestedAgencies) ? jsonData.suggestedAgencies : [],
        brandColor: (jsonData.brandColor && /^#[0-9A-Fa-f]{6}$/.test(jsonData.brandColor)) ? jsonData.brandColor : null,
        scrapeWarnings: uniqueScrapeWarnings,
        normalizationWarnings: uniqueNormalizationWarnings,
        processingWarnings: uniqueProcessingWarnings,
        // usedFallback: false, // This flag is no longer relevant
      };

      // Ensure all expected fields are present, even if null, to maintain consistent structure
      const requiredKeys = ['brandIdentity', 'toneOfVoice', 'guardrails', 'suggestedAgencies', 'brandColor'];
      for (const key of requiredKeys) {
        if (!(key in result) || result[key as keyof typeof result] === undefined) {
          (result as Record<string, unknown>)[key] = null; // Set to null if undefined or missing
        }
      }

      try {
        const recommendation = await recommendVettingAgencies({
          brandId: null,
          brandName: name,
          countryCode: country,
          languageCodes: [language],
          categoryTags: [],
          brandSummary:
            typeof result.brandIdentity === 'string'
              ? result.brandIdentity
              : null,
        });

        const suggestionPayload = recommendation.suggestions.map((entry) => ({
          id: entry.record.id,
          name: entry.record.name,
          description: entry.record.description,
          countryCode: entry.record.countryCode,
          priority: entry.record.priorityLabel,
          priorityLabel: entry.record.priorityLabel,
          priorityRank: entry.record.priorityRank,
          status: entry.record.status,
          regulatoryScope: entry.record.regulatoryScope,
          categoryTags: entry.record.categoryTags,
          languageCodes: entry.record.languageCodes,
          websiteUrl: entry.record.websiteUrl,
          rationale: entry.rationale,
          confidence: entry.confidence,
          source: entry.source,
          isFallback: entry.record.isFallback,
        }));

        const catalogPayload = recommendation.catalog.map((record) => ({
          id: record.id,
          name: record.name,
          description: record.description,
          countryCode: record.countryCode,
          priority: record.priorityLabel,
          priorityLabel: record.priorityLabel,
          priorityRank: record.priorityRank,
          status: record.status,
          regulatoryScope: record.regulatoryScope,
          categoryTags: record.categoryTags,
          languageCodes: record.languageCodes,
          websiteUrl: record.websiteUrl,
          rationale: record.rationale,
          source: record.source,
          isFallback: record.isFallback,
        }));

        result.suggestedAgencies = suggestionPayload;
        (result as Record<string, unknown>).vettingAgencies = {
          suggestions: suggestionPayload,
          catalog: catalogPayload,
          warnings: recommendation.warnings,
          fallbackApplied: recommendation.fallbackApplied,
          metadata: recommendation.metadata,
        };
      } catch (recommendationError) {
        console.error('Failed to recommend vetting agencies:', recommendationError);
        (result as Record<string, unknown>).vettingAgenciesError = 'Failed to recommend vetting agencies';
      }

      return NextResponse.json({ success: true, data: result });
      
    } catch (aiError) {
      // AI call or parsing failed. This will be handled by the outer catch block.
      throw aiError; 
    }
    
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to process brand identity request';
    return handleApiError(error, message);
  }
}); 
