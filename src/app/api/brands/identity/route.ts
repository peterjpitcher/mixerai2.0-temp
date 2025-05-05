import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { COUNTRIES } from '@/lib/constants';

// Simple in-memory rate limiting
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const RATE_LIMIT_PERIOD = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 requests per minute

// Simplified OpenAI client - will try to use Azure OpenAI first
const getOpenAIClient = () => {
  // Use Azure OpenAI if available
  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    console.log('Using Azure OpenAI client');
    return new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: process.env.AZURE_OPENAI_ENDPOINT,
      defaultQuery: { 'api-version': '2023-05-15' },
    });
  }
  
  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    console.log('Using standard OpenAI client');
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  // No credentials available
  console.warn('No OpenAI credentials available, will use fallback generation');
  return null;
};

// Validate URL function
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Function to extract website content from a URL
async function scrapeWebsiteContent(url: string): Promise<string> {
  try {
    console.log(`Attempting to scrape content from URL: ${url}`);
    
    // Use axios or another HTTP client to directly fetch the URL content
    // This is a simplified version - in production you'd want more robust error handling
    const axios = require('axios');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 8000 // 8 second timeout
    });
    
    // Simple content extraction - in production you'd use a more robust HTML parser
    const htmlContent = response.data;
    
    // Very basic HTML to text conversion
    const textContent = htmlContent
      .toString()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Get a reasonable chunk of content
    const truncatedContent = textContent.substring(0, 5000);
    
    console.log(`Successfully scraped content from ${url}, length: ${truncatedContent.length}`);
    return truncatedContent;
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error);
    return `[Error extracting content from ${url}]`;
  }
}

// Template-based fallback generation
function generateFallbackBrandIdentity(name: string, industry = 'general', country = 'GB') {
  console.log(`Using fallback generation for: ${name}, industry: ${industry}, country: ${country}`);
  
  // Get country label
  const countryObj = COUNTRIES.find(c => c.value === country);
  const countryName = countryObj ? countryObj.label : country;
  
  // Default templates by industry
  const templates: Record<string, any> = {
    food: {
      brandIdentity: `${name} is a trusted food brand focused on quality ingredients and delicious flavors. The brand values nutrition, taste, and culinary tradition, while prioritizing customer satisfaction and food safety. Operating in ${countryName}, ${name} has deep understanding of local food preferences and regulations.`,
      toneOfVoice: `Warm, inviting, and knowledgeable. Communications should be friendly yet professional, using appetizing descriptions and avoiding overly technical language. The tone reflects the culinary traditions of ${countryName}.`,
      guardrails: `- Never make unsubstantiated health claims\n- Always prioritize food safety in messaging\n- Be transparent about ingredients and nutritional information\n- Respect dietary restrictions and cultural food practices\n- Avoid negative language about food choices`,
      brandColor: "#E57373", // Soft red
      agencies: [
        { name: "Food Standards Agency", description: "Ensures food safety and standards", priority: "high" },
        { name: "Advertising Standards Authority", description: "Regulates food advertising claims", priority: "high" },
        { name: "Trading Standards", description: "Enforces food labeling regulations", priority: "medium" }
      ]
    },
    technology: {
      brandIdentity: `${name} is an innovative technology company that creates intuitive, reliable solutions. The brand values cutting-edge development, user-centered design, and technical excellence. As a tech company in ${countryName}, ${name} adheres to local data protection and privacy standards while driving digital innovation.`,
      toneOfVoice: `Clear, confident, and forward-thinking. Communications should balance technical authority with accessibility, avoiding unnecessary jargon while maintaining precision. The tone combines innovation with reliability.`,
      guardrails: `- Never over-promise on capabilities or features\n- Be transparent about data usage and privacy practices\n- Avoid technical language that excludes non-expert users\n- Don't make unsupported claims about competitors\n- Ensure all security claims are accurate and verifiable`,
      brandColor: "#2196F3", // Blue
      agencies: [
        { name: "Information Commissioner's Office", description: "Data protection and privacy regulation", priority: "high" },
        { name: "Advertising Standards Authority", description: "Regulates advertising claims", priority: "medium" },
        { name: "Trading Standards", description: "Consumer protection for tech products", priority: "medium" }
      ]
    },
    general: {
      brandIdentity: `${name} is a trusted brand that delivers quality products and services with integrity and professionalism. The brand values excellence, reliability, and customer satisfaction. Operating in ${countryName}, ${name} understands the local market and consumer expectations, following all relevant business practices and regulations.`,
      toneOfVoice: `Professional, clear, and approachable. Communications should convey expertise without being condescending, using straightforward language that builds trust. The tone balances authority with accessibility.`,
      guardrails: `- Maintain transparency in all communications\n- Avoid making exaggerated or unsubstantiated claims\n- Use inclusive language that respects diversity\n- Don't disparage competitors\n- Ensure all claims are accurate and can be verified`,
      brandColor: "#607D8B", // Blue grey
      agencies: [
        { name: "Advertising Standards Authority", description: "Regulates advertising across all media", priority: "high" },
        { name: "Trading Standards", description: "Enforces consumer protection regulations", priority: "medium" },
        { name: "Competition and Markets Authority", description: "Promotes competition and prevents anti-competitive activities", priority: "medium" }
      ]
    }
  };
  
  // Use appropriate template or default to general
  const template = templates[industry] || templates.general;
  
  return {
    brandIdentity: template.brandIdentity,
    toneOfVoice: template.toneOfVoice,
    guardrails: template.guardrails,
    suggestedAgencies: template.agencies,
    brandColor: template.brandColor,
    usedFallback: true
  };
}

export async function POST(req: NextRequest) {
  console.log('Starting brand identity generation process');
  
  // Check if this is a build-time call
  const isBuildTime = process.env.NODE_ENV === 'production' && 
                     typeof window === 'undefined' &&
                     (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || 
                      process.env.VERCEL_ENV === 'preview');
  
  if (isBuildTime) {
    console.log('Detected build-time environment, returning mock data');
    return NextResponse.json({
      success: true,
      data: generateFallbackBrandIdentity('Example Brand')
    });
  }
  
  // Apply rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  if (rateLimit.has(ip)) {
    const userRateLimit = rateLimit.get(ip)!;
    if (now - userRateLimit.timestamp > RATE_LIMIT_PERIOD) {
      userRateLimit.count = 1;
      userRateLimit.timestamp = now;
    } else if (userRateLimit.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    } else {
      userRateLimit.count += 1;
    }
  } else {
    rateLimit.set(ip, { count: 1, timestamp: now });
  }
  
  try {
    // Parse request body
    const body = await req.json();
    
    // Accept either name or brandName for flexibility
    const name = body.name || body.brandName;
    let urls = body.urls || [];
    
    // If urls is a string, convert to array
    if (typeof urls === 'string') {
      urls = [urls];
    } else if (!Array.isArray(urls)) {
      urls = [];
    }
    
    // Get country and language with defaults
    const country = body.country || 'GB';
    const language = body.language || 'en-GB';
    
    console.log('Request parameters:', { name, urlsCount: urls.length, country, language });
    
    // Validate required parameters
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one URL is required' },
        { status: 400 }
      );
    }
    
    // Filter to valid URLs
    const validUrls = urls.filter(url => typeof url === 'string' && isValidUrl(url));
    if (validUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid URLs provided' },
        { status: 400 }
      );
    }
    
    // Attempt to use OpenAI for generation
    const openai = getOpenAIClient();
    
    // If no OpenAI client available, use fallback
    if (!openai) {
      console.log('No OpenAI client available, using fallback generation');
      
      // Determine industry based on URLs
      let industry = 'general';
      const urlsString = validUrls.join(' ').toLowerCase();
      
      if (urlsString.includes('food') || urlsString.includes('recipe') || urlsString.includes('meal')) {
        industry = 'food';
      } else if (urlsString.includes('tech') || urlsString.includes('software') || urlsString.includes('digital')) {
        industry = 'technology';
      }
      
      return NextResponse.json({
        success: true,
        data: generateFallbackBrandIdentity(name, industry, country)
      });
    }
    
    // Get content from URLs
    console.log('Fetching content from URLs...');
    const contentPromises = validUrls.map(url => scrapeWebsiteContent(url));
    const contents = await Promise.all(contentPromises);
    
    // Prepare prompt for OpenAI
    const countryInfo = COUNTRIES.find(c => c.value === country);
    const countryName = countryInfo ? countryInfo.label : country;
    
    const systemMessage = `You are an expert brand analyst who creates comprehensive brand identity profiles. Your analysis is clear, professional, and tailored to the specific brand and region.`;
    
    const userMessage = `Create a comprehensive brand identity profile for "${name}" based on the following website content:
    
${contents.map((content, i) => `URL ${i+1}: ${validUrls[i]}\n${content.substring(0, 500)}...\n`).join('\n')}

The brand operates in ${countryName} and communicates in ${language}.

IMPORTANT: Generate ALL content in the "${language}" language. The entire response must be written in this language.

Please provide the following elements:

1. BRAND IDENTITY: A detailed paragraph describing the brand's personality, values, and mission. (100-150 words)

2. TONE OF VOICE: A description of how the brand communicates - formal/casual, technical/accessible, etc. (50-75 words)

3. CONTENT GUARDRAILS: 5 specific guidelines that content creators must follow when creating content for this brand. Format as bullet points.

4. SUGGESTED AGENCIES: 3-5 regulatory bodies or vetting agencies relevant to this brand in ${countryName}. For each agency, include their name, a brief description, and priority level (high/medium/low).

5. BRAND COLOR: Suggest a primary brand color in hex format (e.g., #FF5733).

Format your response as a structured JSON object with these keys: brandIdentity, toneOfVoice, guardrails, suggestedAgencies (as an array of objects with name, description, and priority), and brandColor.`;
    
    try {
      // Use direct fetch to handle both Azure and standard OpenAI
      let completion;
      
      if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT) {
        // Azure OpenAI
        const response = await fetch(
          `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2023-05-15`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': process.env.AZURE_OPENAI_API_KEY
            },
            body: JSON.stringify({
              messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
              ],
              max_tokens: 1000,
              temperature: 0.7
            })
          }
        );
        
        if (!response.ok) {
          console.error('Azure OpenAI API error:', response.status);
          throw new Error(`Azure OpenAI API error: ${response.status}`);
        }
        
        const data = await response.json();
        completion = data.choices?.[0]?.message?.content;
      } else {
        // Standard OpenAI
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          max_tokens: 1000,
          temperature: 0.7
        });
        
        completion = response.choices[0]?.message?.content;
      }
      
      if (!completion) {
        throw new Error('No completion received from API');
      }
      
      console.log('Received completion from OpenAI');
      
      // Parse JSON from completion
      let jsonData;
      try {
        // Try to parse the response as JSON directly
        jsonData = JSON.parse(completion);
      } catch (e) {
        // If that fails, try to extract JSON from the text
        console.log('Failed to parse direct JSON, trying to extract JSON from text');
        const jsonMatch = completion.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract JSON from response');
        }
      }
      
      // Validate and ensure all required fields
      const result = {
        brandIdentity: jsonData.brandIdentity || 'Brand identity not provided by AI service.',
        toneOfVoice: jsonData.toneOfVoice || 'Tone of voice not provided by AI service.',
        guardrails: jsonData.guardrails || '- Maintain professional tone\n- Be accurate\n- Be consistent',
        suggestedAgencies: Array.isArray(jsonData.suggestedAgencies) ? jsonData.suggestedAgencies : [],
        brandColor: (jsonData.brandColor && /^#[0-9A-Fa-f]{6}$/.test(jsonData.brandColor)) 
          ? jsonData.brandColor 
          : '#3498db', // Default blue
        usedFallback: false
      };
      
      return NextResponse.json({
        success: true,
        data: result
      });
      
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      
      // Use fallback generation when AI fails
      console.log('Using fallback generation due to AI error');
      
      // Determine industry based on URLs
      let industry = 'general';
      const urlsString = validUrls.join(' ').toLowerCase();
      
      if (urlsString.includes('food') || urlsString.includes('recipe') || urlsString.includes('meal')) {
        industry = 'food';
      } else if (urlsString.includes('tech') || urlsString.includes('software') || urlsString.includes('digital')) {
        industry = 'technology';
      }
      
      return NextResponse.json({
        success: true,
        data: generateFallbackBrandIdentity(name, industry, country)
      });
    }
    
  } catch (error) {
    console.error('Error processing brand identity request:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to process brand identity request' },
      { status: 500 }
    );
  }
} 