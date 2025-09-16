import { OpenAI } from "openai";
import type { StyledClaims } from "@/types/claims";
import { activityTracker } from "./activity-tracker";

// Helper function to extract rate limit headers
function extractRateLimitHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  
  const remainingRequests = response.headers.get('x-ratelimit-remaining-requests') || response.headers.get('x-ms-ratelimit-remaining-requests');
  const resetRequests = response.headers.get('x-ratelimit-reset-requests') || response.headers.get('x-ms-ratelimit-reset-requests');
  const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ms-retry-after-ms');
  
  if (remainingRequests) headers['x-ratelimit-remaining-requests'] = remainingRequests;
  if (resetRequests) headers['x-ratelimit-reset-requests'] = resetRequests;
  if (retryAfter) headers['retry-after'] = retryAfter;
  
  return headers;
}

// Initialize the Azure OpenAI client
export const getAzureOpenAIClient = () => {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  
  if (!apiKey) {
    console.error("Azure OpenAI API key is missing");
    throw new Error("Azure OpenAI API key is missing");
  }
  
  if (!endpoint) {
    console.error("Azure OpenAI endpoint is missing");
    throw new Error("Azure OpenAI endpoint is missing");
  }
  
  
  // Removed API key logging for security
  
  return new OpenAI({
    apiKey: apiKey,
    baseURL: endpoint,
    defaultQuery: { 
      "api-version": "2023-12-01-preview"
    },
    defaultHeaders: { 
      "api-key": apiKey 
    }
  });
};

// Get the model name from environment variables or use a reliable default
export function getModelName(): string {
  // First check if an Azure deployment name is configured that supports vision
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT;
  
  if (deploymentName) {
    return deploymentName;
  }
  
  // No default deployment name - throw error if not configured
  throw new Error("Azure OpenAI deployment name is not configured. Please set AZURE_OPENAI_DEPLOYMENT_NAME or AZURE_OPENAI_DEPLOYMENT environment variable.");
}

// New function for generic text completion
export async function generateTextCompletion(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 250, // Sensible default for descriptions
  temperature: number = 0.7
): Promise<string | null> {
  try {
    const deploymentName = getModelName(); // Use the centralized model/deployment name
    const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    if (!azureOpenAIEndpoint || !apiKey) {
      console.error("[generateTextCompletion] Azure OpenAI endpoint or API key is missing.");
      throw new Error("Azure OpenAI endpoint or API key is missing for direct fetch.");
    }

    // Removed prompt logging for security and performance

    const completionRequest = {
      model: deploymentName, // Though model is in path, SDKs often still expect it
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    };

    const endpointUrl = `${azureOpenAIEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;

    // Start tracking the request
    const requestId = activityTracker.startRequest('generateTextCompletion');

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(completionRequest),
      });

      // Extract rate limit headers (Azure OpenAI format)
      const rateLimitHeaders = extractRateLimitHeaders(response);
      
      // Debug: Log all headers to understand what Azure returns
      if (process.env.NODE_ENV === 'development') {
        console.log('[Azure OpenAI] Response headers:', Object.fromEntries(response.headers.entries()));
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[generateTextCompletion] API request failed with status ${response.status}: ${errorText}`);
        
        // Check if it's a rate limit error
        const status = response.status === 429 ? 'rate_limited' : 'error';
        activityTracker.completeRequest(requestId, status, rateLimitHeaders);
        
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      // Mark request as successful
      activityTracker.completeRequest(requestId, 'success', rateLimitHeaders);

      const responseData = await response.json();

      if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message) {
        const content = responseData.choices[0].message.content;
        return content;
      } else {
        console.error("[generateTextCompletion] No content in completion choices or choices array is empty.");
        // Consistent with original logic, though an error was thrown above for !response.ok
        // This case implies a 200 OK but unexpected payload.
        return null; 
      }
    } catch (requestError) {
      // Make sure to mark the request as failed if it wasn't already
      if (requestId) {
        activityTracker.completeRequest(requestId, 'error');
      }
      throw requestError;
    }
  } catch (error) {
    console.error("[generateTextCompletion] Error calling Azure OpenAI:", error);
    // Re-throw the error so the caller (e.g., an API route) can handle it specifically
    // and provide a more detailed response to the client.
    throw error; 
  }
}

// Content vetting agencies by country
export const VETTING_AGENCIES_BY_COUNTRY: Record<string, Array<{name: string, description: string}>> = {
  "US": [
    { name: "FDA", description: "Food and Drug Administration - Regulates food, drugs, cosmetics, and medical devices" },
    { name: "FTC", description: "Federal Trade Commission - Enforces consumer protection and antitrust laws" },
    { name: "NAD", description: "National Advertising Division - Self-regulatory body that monitors advertising for truthfulness and accuracy" }
  ],
  "GB": [
    { name: "ASA", description: "Advertising Standards Authority - Regulates advertising across all media in the UK" },
    { name: "MHRA", description: "Medicines and Healthcare products Regulatory Agency - Regulates medicines, medical devices, and blood components" },
    { name: "CMA", description: "Competition and Markets Authority - Promotes competition and prevents anti-competitive activities" }
  ],
  "CA": [
    { name: "ASC", description: "Ad Standards Canada - Self-regulatory body that sets standards for advertising" },
    { name: "Health Canada", description: "Federal department responsible for health product regulation" },
    { name: "CRTC", description: "Canadian Radio-television and Telecommunications Commission - Regulates broadcasting and telecommunications" }
  ],
  "AU": [
    { name: "ACCC", description: "Australian Competition and Consumer Commission - Promotes fair trading and competition" },
    { name: "TGA", description: "Therapeutic Goods Administration - Regulates medical drugs and devices" },
    { name: "Ad Standards", description: "Independent body that administers the complaint resolution process for advertising" }
  ],
  "DE": [
    { name: "WBZ", description: "Wettbewerbszentrale - Centre for Protection against Unfair Competition" },
    { name: "BfArM", description: "Federal Institute for Drugs and Medical Devices - Regulates pharmaceuticals and medical devices" },
    { name: "Deutscher Werberat", description: "German Advertising Council - Self-regulatory organization" }
  ],
  "FR": [
    { name: "ARPP", description: "Autorité de Régulation Professionnelle de la Publicité - Professional Advertising Regulatory Authority" },
    { name: "ANSM", description: "Agence Nationale de Sécurité du Médicament - National Agency for Medicines Safety" },
    { name: "DGCCRF", description: "Direction Générale de la Concurrence, de la Consommation et de la Répression des Fraudes - Consumer protection agency" }
  ]
};

/**
 * Returns a list of content vetting agencies relevant for a given country
 */
export function getVettingAgenciesForCountry(countryCode: string): Array<{name: string, description: string}> {
  return VETTING_AGENCIES_BY_COUNTRY[countryCode] || [];
}

/**
 * Generate content based on a template using AI
 * 
 * @param brand - Brand context including identity, tone of voice, and guardrails
 * @param brand.name - The brand name
 * @param brand.brand_identity - Brand identity description (optional)
 * @param brand.tone_of_voice - Brand tone of voice guidelines (optional)
 * @param brand.guardrails - Content guardrails and restrictions (optional)
 * @param template - Content template with input and output field definitions
 * @param template.prompt - Main AI prompt for content generation
 * @param template.fields - Template field configuration with inputFields and outputFields
 * @param values - User-provided values for template input fields
 * @param productContext - Optional product context for claims-based content
 * @param styledClaims - Optional pre-styled marketing claims
 * @param systemInstructions - Optional system-level instructions for AI
 * @returns Promise resolving to an object containing generated content for each output field
 * @throws Error if AI generation fails or required fields are missing
 * 
 * @example
 * const result = await generateContentFromTemplate(
 *   { name: "BrandX", tone_of_voice: "Professional" },
 *   { prompt: "Create a product description", fields: {...} },
 *   { product_name: "Widget Pro" }
 * );
 */
export async function generateContentFromTemplate(
  brand: {
    name: string;
    brand_identity?: string | null;
    tone_of_voice?: string | null;
    guardrails?: string | null;
    language?: string | null;
    country?: string | null;
  },
  template: {
    id: string;
    name: string;
    inputFields: Array<{
      id: string;
      name: string;
      type: string;
      value: string;
      aiPrompt?: string;
    }>;
    outputFields: Array<{
      id: string;
      name: string;
      type: string;
      aiPrompt?: string;
      aiAutoComplete?: boolean;
      useBrandIdentity?: boolean;
      useToneOfVoice?: boolean;
      useGuardrails?: boolean;
    }>;
  },
  input?: {
    additionalInstructions?: string;
    templateFields?: Record<string, string>;
    product_context?: { productName: string; styledClaims: StyledClaims | null };
  }
) {
  // console.log(`Generating template-based content for brand: ${brand.name} using template: ${template.name}`);
  // console.log(`Brand localization - Language: ${brand.language || 'not specified'}, Country: ${brand.country || 'not specified'}`);
  
  const deploymentName = getModelName();
  
  // Language code to full name mapping
  const languageNames: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'nl': 'Dutch',
    'pl': 'Polish',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };

  const countryNames: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'UK': 'United Kingdom',
    'FR': 'France',
    'DE': 'Germany',
    'ES': 'Spain',
    'IT': 'Italy',
    'CA': 'Canada',
    'AU': 'Australia',
    'JP': 'Japan',
    'CN': 'China',
    'IN': 'India',
    'BR': 'Brazil',
    'MX': 'Mexico'
  };

  // Build the system prompt with brand information and strict output rules
  let systemPrompt = `You are an expert content creator for the brand "${brand.name}".

You must return a single JSON object with no preface or trailing text. Keys MUST be the exact output field IDs provided, and values MUST be strings containing the generated content for that field. Do not include markdown code fences. Do not include any commentary. Example: {"field_abc":"...","field_xyz":"..."}.`;
  
  // Add localization instructions if provided
  if (brand.language && brand.country) {
    const languageName = languageNames[brand.language] || brand.language;
    const countryName = countryNames[brand.country] || brand.country;
    
    systemPrompt += ` IMPORTANT: You MUST generate ALL content in ${languageName} language for an audience in ${countryName}.`;
    systemPrompt += ` This means all text, headlines, body copy, and any other content MUST be written in ${languageName}.`;
    
    if (brand.language !== 'en') {
      systemPrompt += ` Do NOT generate content in English. Generate ONLY in ${languageName}.`;
    }
  } else if (brand.language) {
    const languageName = languageNames[brand.language] || brand.language;
    systemPrompt += ` Generate ALL content in ${languageName} language.`;
  }
  
  // Add the new content rules
  systemPrompt += `

Content Rules:
- NEVER mention the product's size or weight (e.g., '460 ml') in the generated content.
- NEVER mention the brand's country of origin or the target country in the generated content.
- Generate concise, high-quality content without repetition or filler.
- Avoid redundant phrases and synonym chains.
- Each section should be distinct and purposeful.
- Stop generating when you've completed the requested fields - do not continue indefinitely.
`;
  
  // Only add global brand information if there are no field-specific settings
  const anyFieldUsesBrandIdentity = template.outputFields.some(field => field.useBrandIdentity);
  const anyFieldUsesToneOfVoice = template.outputFields.some(field => field.useToneOfVoice);
  const anyFieldUsesGuardrails = template.outputFields.some(field => field.useGuardrails);
  
  // Add global brand context only if no field-specific settings are used
  if (brand.brand_identity && !anyFieldUsesBrandIdentity) {
    systemPrompt += ` The brand identity can be described as: ${brand.brand_identity}.`;
  }
  
  if (brand.tone_of_voice && !anyFieldUsesToneOfVoice) {
    systemPrompt += ` The tone of voice should be: ${brand.tone_of_voice}.`;
  }
  
  if (brand.guardrails && !anyFieldUsesGuardrails) {
    systemPrompt += ` Content guardrails: ${brand.guardrails}.`;
  }
  
  if (input?.product_context) {
    systemPrompt += `
IMPORTANT PRODUCT CONTEXT: You have been provided with specific information and a set of pre-approved 'styled claims' for a product. This information is the absolute source of truth.
Your generated content for all fields MUST strictly adhere to the provided claims.
- Do NOT invent new claims.
- Do NOT use claims marked as 'disallowed'.
- You MUST use the 'mandatory' claims where appropriate.
- You SHOULD incorporate the 'allowed' claims to enrich the content.
The product context is provided in the user prompt.
`;
  }
  
  systemPrompt += `\nYou are using a template called "${template.name}" to generate content.\n- For rich text fields: generate well-formed HTML fragments ONLY (no <!DOCTYPE>, <html>, <head>, or <body> wrappers).\n- For plain text fields: output plain text only (no HTML tags).\n- Avoid repetition and duplicate headings. Provide concise, high quality content without filler.`;
  
  // Build the user prompt using template fields and prompts
  const requiredIds = (template.outputFields || []).map(f => f.id);
  let userPrompt = `Create content according to this template: "${template.name}". Return only valid JSON as described.\n\n`;
  
  if (input?.product_context) {
    // The context is now expected to be an object with productName and styledClaims
    const { productName, styledClaims } = input.product_context as { productName: string; styledClaims: StyledClaims | null };
    
    if (productName) {
      userPrompt += `--- PRODUCT CONTEXT ---\n`;
      userPrompt += `Product Name: ${productName}\n\n`;
      if (styledClaims) {
        userPrompt += `Styled Claims:\n${JSON.stringify(styledClaims, null, 2)}\n`;
      }
      userPrompt += `-----------------------\n\n`;
    }
  }

  userPrompt += `Template input fields:\n`;
  
  // Add each input field with its value to the prompt
  template.inputFields.forEach(field => {
    const fieldValue = field.value || '';
    userPrompt += `- ${field.name}: ${fieldValue}\n`;
    
    // Log if a field is empty that might be expected to have a value
    if (!fieldValue && field.name.toLowerCase().includes('title')) {
      console.warn(`[Template ${template.name}] Input field "${field.name}" (ID: ${field.id}) is empty but appears to be a title field`);
    }
  });
  
  userPrompt += `\nIMPORTANT: You MUST generate content for ALL ${template.outputFields.length} output fields listed below.\nReturn ONLY a single JSON object whose keys are EXACTLY: ${JSON.stringify(requiredIds)}. No extra keys, no commentary.\n\n`;
  userPrompt += `Generate the following ${template.outputFields.length} output fields:\n`;
  
  // Include output field requirements with their prompts
  template.outputFields.forEach((field, index) => {
    userPrompt += `\n${index + 1}. Field: \"${field.name}\" (ID: ${field.id})\n`;
    userPrompt += `   This field MUST be generated and wrapped with the markers below:\n`;
    
    let fieldSpecificInstruction = "";
    if (field.type === 'richText') {
      fieldSpecificInstruction += 'Output as well-formed HTML, not Markdown. ';
    }

    let fieldAIPrompt = "";
    if (field.aiPrompt) {
      console.log(`[Field ${field.id}] Original AI prompt: ${field.aiPrompt}`);
      console.log(`[Field ${field.id}] Available input fields:`, template.inputFields.map(f => ({ id: f.id, name: f.name, value: f.value ? f.value.substring(0, 50) + '...' : 'NO VALUE' })));
      
      const processedPrompt = field.aiPrompt.replace(/\{\{([^}]+)\}\}/g, (match, inputFieldIdOrName) => {
        console.log(`[Field ${field.id}] Processing placeholder: ${match}, extracted name: "${inputFieldIdOrName}"`);
        
        // Handle special placeholders
        if (inputFieldIdOrName === 'Rules') {
          // Combine product context rules if available
          if (input?.product_context?.styledClaims) {
            console.log(`[Field ${field.id}] Replaced {{Rules}} with product context`);
            return 'Follow the product claims and guidelines provided in the product context.';
          }
          console.log(`[Field ${field.id}] Replaced {{Rules}} with default guidelines`);
          return 'Create engaging, accurate content following brand guidelines.';
        }
        
        if (inputFieldIdOrName === 'Product Name' && input?.product_context?.productName) {
          console.log(`[Field ${field.id}] Replaced {{Product Name}} with: ${input.product_context.productName}`);
          return input.product_context.productName;
        }
        
        // Find by ID or name (trimmed to handle spaces)
        const fieldName = inputFieldIdOrName.trim();
        const inputField = template.inputFields.find(f => 
          f.id === fieldName || f.name === fieldName
        );
        
        if (inputField) {
          if (inputField.value && inputField.value.trim() !== '') {
            console.log(`[Field ${field.id}] Found matching input field for "${fieldName}": ${inputField.value.substring(0, 50)}...`);
            return inputField.value;
          } else {
            console.log(`[Field ${field.id}] Found input field "${fieldName}" but it has no value, keeping placeholder for context`);
            // Keep the field name so the AI has context about what's expected
            return `[${inputField.name}]`;
          }
        } else {
          console.log(`[Field ${field.id}] No matching input field found for "${fieldName}", keeping placeholder`);
          return match;
        }
      });
      
      console.log(`[Field ${field.id}] Processed AI prompt: ${processedPrompt}`);
      
      // Clean up the prompt if we removed placeholders
      // Remove phrases that reference empty placeholders
      fieldAIPrompt = processedPrompt
        .replace(/that includes these priority keywords \(\s*\)/g, '') // Remove empty priority keywords phrase
        .replace(/\(\s*\)/g, '') // Remove any remaining empty parentheses
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // If the prompt becomes too short or incomplete after replacements, add context
      if (fieldAIPrompt && fieldAIPrompt.split(' ').length < 3) {
        console.warn(`[Field ${field.id}] AI prompt seems incomplete after processing: "${fieldAIPrompt}"`);
        fieldAIPrompt = `${fieldAIPrompt} based on the provided brand context and input values`;
      }
    }
    
    if (fieldAIPrompt || fieldSpecificInstruction) {
        userPrompt += `   Instructions: ${fieldSpecificInstruction}${fieldAIPrompt}\n`;
    }

    if (field.useBrandIdentity && brand.brand_identity) {
      userPrompt += `   Apply Brand Identity: ${brand.brand_identity}\n`;
    }
    if (field.useToneOfVoice && brand.tone_of_voice) {
      userPrompt += `   Apply Tone of Voice: ${brand.tone_of_voice}\n`;
    }
    if (field.useGuardrails && brand.guardrails) {
      userPrompt += `   Apply Guardrails: ${brand.guardrails}\n`;
    }

    const isRich = field.type === 'richText' || field.type === 'html';
    userPrompt += `   Output Type: ${isRich ? 'HTML_FRAGMENT' : 'PLAIN_TEXT'}\n`;
    userPrompt += `   JSON Key: ${field.id}\n`;
  });
  
  // Add additional instructions if provided
  if (input?.additionalInstructions) {
    userPrompt += `\nAdditional instructions: ${input.additionalInstructions}\n`;
  }
  
  // Language reminder if not English
  if (brand.language && brand.language !== 'en') {
    const languageName = languageNames[brand.language] || brand.language;
    userPrompt += `\n\nCRITICAL LANGUAGE REQUIREMENT: ALL content MUST be generated in ${languageName}. Do NOT generate any content in English.`;
  }
  
  // Final reminder
  userPrompt += `\nREMINDER: Generate ALL ${template.outputFields.length} fields. Output ONLY a single JSON object keyed by field IDs ${JSON.stringify(requiredIds)}. No extra text.`;
  
  // DEBUG: Log the complete prompt being sent to AI
  console.log('\n========== AI GENERATION DEBUG ==========');
  console.log('Template:', template.name);
  console.log('Brand:', brand.name);
  console.log('\n--- System Prompt ---');
  console.log(systemPrompt);
  console.log('\n--- User Prompt ---');
  console.log(userPrompt);
  console.log('\n--- Input Fields ---');
  template.inputFields.forEach(field => {
    console.log(`  ${field.name} (ID: ${field.id}): "${field.value || '[EMPTY]'}"`);
  });
  console.log('========================================\n');
  
  // Make the API call with error handling
  try {
    // console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
    
    // Detect a long-form single-field HTML generation case
    const isSingleField = Array.isArray(template.outputFields) && template.outputFields.length === 1;
    const singleField = isSingleField ? (template.outputFields as any[])[0] : null;
    const isSingleHtml = !!(singleField && (singleField.type === 'richText' || singleField.type === 'html'));

    // Prepare the request body
    const completionRequest = !isSingleHtml ? {
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" as const },
      // For multiple fields, keep a balanced budget
      max_tokens: Math.min(2200, 400 + (template.outputFields?.length || 1) * 400),
      temperature: 0.3,
      top_p: 0.9,
      frequency_penalty: 1.0,
      presence_penalty: 0.3,
    } : {
      // Long-form single-field HTML output mode: request raw HTML fragment (no JSON)
      model: deploymentName,
      messages: [
        { role: 'system', content: (
          `You are an expert content creator for the brand "${brand.name}".\n` +
          `Return ONLY a well-formed HTML fragment for the requested field. Do NOT return JSON, code fences, or explanatory text.\n` +
          `Headings should use semantic tags (h2/h3) and body text should use <p>, <ul>, <li> where appropriate.\n` +
          (brand.language && brand.country ? `All content must be in ${brand.language} for an audience in ${brand.country}.\n` : '') +
          `Avoid repetition and unnecessary filler.`
        )},
        { role: 'user', content: userPrompt }
      ],
      // High budget to cover all sections in a single field template
      max_tokens: 3200,
      temperature: 0.4,
      top_p: 0.9,
      frequency_penalty: 0.8,
      presence_penalty: 0.2,
    };
    
    // Specify the deployment in the URL path
    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
    // console.log(`Using direct endpoint URL: ${endpoint}`);
    
    // Start tracking the request
    const requestId = activityTracker.startRequest('generateContentFromTemplate');
    
    // Make a direct fetch call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY || ''
      },
      body: JSON.stringify(completionRequest)
    });
    
    // Extract rate limit headers
    const rateLimitHeaders = extractRateLimitHeaders(response);
    
    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status === 429 ? 'rate_limited' : 'error';
      activityTracker.completeRequest(requestId, status, rateLimitHeaders);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    // Mark request as successful
    activityTracker.completeRequest(requestId, 'success', rateLimitHeaders);
    
    const responseData = await response.json();
    // console.log("API call successful");
    
    let content = responseData.choices?.[0]?.message?.content || "";
    // Remove potential code fences
    content = content.replace(/```[a-zA-Z]*\n?/g, "").replace(/\n?```/g, "");

    const tryParseJson = (text: string): Record<string, string> | null => {
      try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) return null;
        const candidate = text.slice(firstBrace, lastBrace + 1);
        const obj = JSON.parse(candidate);
        return obj && typeof obj === 'object' ? obj : null;
      } catch {
        return null;
      }
    };

    const stripHtmlWrappers = (html: string) =>
      html
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?(?:html|head|body)[^>]*>/gi, '');

    const validateAndPostProcess = (field: any, value: string): string => {
      if (!value) return '';
      let v = String(value).trim();
      const isRich = field.type === 'richText' || field.type === 'html';
      if (!isRich) {
        v = v.replace(/<[^>]+>/g, '');
      } else {
        v = v.replace(/```[a-zA-Z]*\n?/g, '').replace(/\n?```/g, '');
        v = stripHtmlWrappers(v);
        try {
          const { sanitizeHTML } = require('@/lib/sanitize/html-sanitizer');
          v = sanitizeHTML(v, { allow_images: false, allow_links: true, allow_tables: true });
        } catch {}
        // Normalize stray tags and remove empty paragraphs produced by editors
        v = v.replace(/<\s+p\s*>/g, '<p>')
             .replace(/<\s*\/\s*p\s*>/g, '</p>')
             .replace(/(?:<p>\s*<\/p>\s*){2,}/g, '')
             .replace(/<p>\s*<\/p>/g, '');
      }
      const optionMax = (field.options && (field.options as any).maxLength) || undefined;
      const maxChars = field.maxChars || optionMax;
      if (maxChars && v.length > maxChars) {
        v = v.slice(0, maxChars);
      }
      return v;
    };

    // If we asked for raw HTML (single field mode), skip JSON parsing and return directly
    const out: Record<string, string> = {};
    if (isSingleHtml && singleField) {
      const processed = validateAndPostProcess(singleField, content);
      out[(singleField as any).id] = processed;
      return out;
    }

    let json = tryParseJson(content);
    const requiredIds = (template.outputFields || []).map(f => f.id);
    const hasAllKeys = (obj: Record<string, string> | null) => !!obj && requiredIds.every(id => Object.prototype.hasOwnProperty.call(obj, id));

    if (!hasAllKeys(json)) {
      const retryRequest = {
        model: deploymentName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt + "\nCRITICAL: Output ONLY a valid JSON object keyed EXACTLY by these field IDs: " + JSON.stringify(requiredIds) + ". No explanation, no extra keys." }
        ],
        response_format: { type: "json_object" },
        max_tokens: Math.min(1200, 300 + (template.outputFields?.length || 1) * 250),
        temperature: 0.2,
        top_p: 0.9,
        frequency_penalty: 1.2,
        presence_penalty: 0.2,
      };
      const endpoint2 = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
      const retryResp = await fetch(endpoint2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.AZURE_OPENAI_API_KEY || '' },
        body: JSON.stringify(retryRequest)
      });
      if (retryResp.ok) {
        const rj = await retryResp.json();
        let retryContent = rj.choices?.[0]?.message?.content || '';
        retryContent = retryContent.replace(/```[a-zA-Z]*\n?/g, '').replace(/\n?```/g, '');
        json = tryParseJson(retryContent);
      }
    }

    // Temporary marker-based fallback if JSON still doesn't include all keys
    if (!hasAllKeys(json) && content) {
      try {
        const fallback: Record<string, string> = {};
        for (const f of (template.outputFields || [])) {
          const re = new RegExp(`##FIELD_ID:${f.id}##([\\s\\S]*?)##END_FIELD_ID##`, 'i');
          const m = content.match(re);
          if (m && m[1]) fallback[f.id] = m[1].trim();
        }
        if (Object.keys(fallback).length) {
          json = fallback as any;
        }
      } catch {}
    }

    // Section-heading fallback: if the model returned a single essay with recognizable section headings,
    // split content by output field names and map chunks to fields.
    if (!hasAllKeys(json) && content) {
      try {
        const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        type Hit = { id: string; name: string; start: number };
        const hits: Hit[] = [];
        for (const f of (template.outputFields || [])) {
          const name = String(f.name || '').trim();
          if (!name) continue;
          const pattern = new RegExp(`(^|\n|\r)\s*(?:#{1,4}\s*)?${escapeRegExp(name)}(?:\s*\([^\)]*\))?\s*(?:\n|\r|:)`, 'i');
          const m = content.match(pattern);
          if (m && typeof m.index === 'number') {
            // compute absolute index of heading start
            const start = m.index + (m[1] ? m[1].length : 0);
            hits.push({ id: f.id, name, start });
          }
        }
        hits.sort((a, b) => a.start - b.start);
        if (hits.length >= 1) {
          const sectionMap: Record<string, string> = {};
          for (let i = 0; i < hits.length; i++) {
            const curr = hits[i];
            const next = hits[i + 1];
            const chunk = content.slice(curr.start, next ? next.start : content.length);
            // Remove the first line (heading) from the chunk
            const chunkBody = chunk.replace(/^[^\n\r]*[\n\r]+/, '').trim();
            sectionMap[curr.id] = chunkBody;
          }
          if (Object.keys(sectionMap).length) {
            json = sectionMap as any;
          }
        }
      } catch {}
    }

    if (!json) {
      console.warn('Failed to parse JSON output from AI; returning empty content for fields');
      (template.outputFields || []).forEach((f: any) => { out[f.id] = ''; });
      // continue to per-field fallback attempts below
    }

    if (json) {
      (template.outputFields || []).forEach((f: any) => {
        const raw = (json as any)[f.id];
        out[f.id] = validateAndPostProcess(f, typeof raw === 'string' ? raw : (raw != null ? String(raw) : ''));
      });
    }

    // Per-field fallback: if any required field is still empty, try a focused generation for that field only
    const missingFields = (template.outputFields || []).filter((f: any) => !out[f.id] || out[f.id].trim().length === 0);
    if (missingFields.length > 0) {
      for (const f of missingFields) {
        try {
          const singleFieldSystemPrompt = (() => {
            let sp = `You are an expert content creator for the brand "${brand.name}".`;
            sp += ` Return ONLY a JSON object where the single key is exactly "${f.id}" and the value is the generated content string for that field.`;
            const isRich = f.type === 'richText' || f.type === 'html';
            if (isRich) {
              sp += ` For this field, output well-formed HTML fragments ONLY (no <!DOCTYPE>, <html>, <head>, or <body> wrappers).`;
            } else {
              sp += ` For this field, output plain text (no HTML tags).`;
            }
            if (brand.language && brand.country) {
              sp += ` Generate ALL content in ${brand.language} for an audience in ${brand.country}.`;
              if (brand.language !== 'en') {
                sp += ` Do NOT generate content in English.`;
              }
            }
            if (brand.brand_identity && f.useBrandIdentity) sp += ` Brand identity: ${brand.brand_identity}.`;
            if (brand.tone_of_voice && f.useToneOfVoice) sp += ` Tone of voice: ${brand.tone_of_voice}.`;
            if (brand.guardrails && f.useGuardrails) sp += ` Content guardrails: ${brand.guardrails}.`;
            return sp;
          })();

          // Build a concise user prompt focusing on the single field
          let singleFieldUserPrompt = `Generate content for field "${f.name}" (ID: ${f.id}) based on the template "${template.name}".`;
          // Include the field-specific AI prompt if available
          if (f.aiPrompt) {
            singleFieldUserPrompt += `\nInstructions: ${f.aiPrompt}`;
          }
          // Provide input field values context
          if (Array.isArray(template.inputFields) && template.inputFields.length > 0) {
            singleFieldUserPrompt += `\n\nTemplate input fields:`;
            template.inputFields.forEach((inp: any) => {
              singleFieldUserPrompt += `\n- ${inp.name}: ${inp.value || ''}`;
            });
          }
          if (input?.additionalInstructions) {
            singleFieldUserPrompt += `\n\nAdditional instructions: ${input.additionalInstructions}`;
          }
          if (input?.product_context) {
            const { productName, styledClaims } = input.product_context as { productName?: string; styledClaims?: any };
            if (productName) singleFieldUserPrompt += `\nProduct Name: ${productName}`;
            if (styledClaims) singleFieldUserPrompt += `\nStyled Claims: ${JSON.stringify(styledClaims).slice(0, 1500)}`; // keep concise
          }

          const singleReq = {
            model: deploymentName,
            messages: [
              { role: 'system', content: singleFieldSystemPrompt },
              { role: 'user', content: singleFieldUserPrompt }
            ],
            response_format: { type: 'json_object' as const },
            max_tokens: 600,
            temperature: 0.5,
            top_p: 0.9,
          };
          const endpointSf = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
          const sfResp = await fetch(endpointSf, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': process.env.AZURE_OPENAI_API_KEY || '' },
            body: JSON.stringify(singleReq)
          });
          if (sfResp.ok) {
            const sfJson = await sfResp.json();
            let sfContent = sfJson.choices?.[0]?.message?.content || '';
            sfContent = sfContent.replace(/```[a-zA-Z]*\n?/g, '').replace(/\n?```/g, '');
            const parsed = tryParseJson(sfContent);
            const raw = parsed ? (parsed as any)[f.id] : '';
            const processed = validateAndPostProcess(f, typeof raw === 'string' ? raw : (raw != null ? String(raw) : ''));
            if (processed && processed.trim().length > 0) {
              out[f.id] = processed;
            }
          }
        } catch (e) {
          console.warn(`Single-field fallback failed for ${f.id}:`, e);
        }
      }
    }

    return out;
  } catch (error) {
    console.error("Error generating content with template:", error);
    throw new Error(`Failed to generate template-based content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates brand identity from a list of URLs
 */
export async function generateBrandIdentityFromUrls(
  brandName: string,
  urls: string[],
  language: string,
  country: string,
  context?: { userId?: string; brandId?: string }
): Promise<{
  brandIdentity: string;
  toneOfVoice: string;
  guardrails: string;
  suggestedAgencies: Array<{name: string, description: string, priority: 'high' | 'medium' | 'low'}>;
  brandColor: string;
}> {
    // console.log(`Generating brand identity for ${brandName} from ${urls.length} URLs, Language: ${language}, Country: ${country}`);
    
    // Debug environment variables
    // console.log("Environment check:");
    // console.log("- NODE_ENV:", process.env.NODE_ENV);
    // console.log("- AZURE_OPENAI_API_KEY exists:", !!process.env.AZURE_OPENAI_API_KEY);
    // console.log("- AZURE_OPENAI_ENDPOINT exists:", !!process.env.AZURE_OPENAI_ENDPOINT);
    // console.log("- AZURE_OPENAI_DEPLOYMENT:", process.env.AZURE_OPENAI_DEPLOYMENT);
  
  const deploymentName = getModelName();
      
      // Prepare the prompt
      const prompt = `
      Please analyze the following URLs related to the brand "${brandName}".
      The brand operates in ${country} and its communications should be in ${language.toUpperCase()}.

      Based on these URLs, generate a comprehensive brand identity profile IN ${language.toUpperCase()} with the following components, tailored for an audience in ${country}:
      
      1. BRAND IDENTITY: A detailed description of the brand's personality, values, target audience, and key messaging themes. This should be in plain text paragraphs.
      
      2. TONE OF VOICE: A description of how the brand communicates - the style, language, and approach it uses. This should be a concise paragraph.
      
      3. CONTENT GUARDRAILS: Provide 5 specific guidelines that content creators should follow when creating content for this brand. Format these as a bulleted list of strings.
      
      4. SUGGESTED VETTING AGENCIES: Based on the industry and ${country}, recommend 3-5 regulatory or vetting agencies relevant to this brand. Provide their name, a brief description, and assign a priority level (high, medium, or low) based on perceived criticality for this brand in ${country}.
      
      5. BRAND COLOR: Suggest a primary brand color that would best represent this brand's identity and values. Provide the color in hex format (e.g., #FF5733).
      
      IMPORTANT: ALL textual content in your response (brandIdentity, toneOfVoice, guardrails items, and agency descriptions) MUST be in ${language.toUpperCase()}.
      Format your response as a JSON object with these keys: brandIdentity, toneOfVoice, guardrails (as an array of strings), suggestedAgencies (as an array of objects with name, description, and priority fields), and brandColor (as a hex color code).
      `;
      
      // Make the API call
      // Start tracking the request
      const requestId = activityTracker.startRequest('generateBrandIdentityFromUrls');
      
  try {
      // console.log("Sending request to Azure OpenAI API");
      // console.log(`Using deployment: ${deploymentName}`);
      
      const systemMessageContent = "You are a brand strategy expert that helps analyze and create detailed brand identities.";
      // console.log("---- System Prompt ----\n", systemMessageContent);
      // console.log("---- User Prompt for Brand Identity ----\n", prompt);

      const completionRequest = {
        model: deploymentName,
        messages: [
          { role: "system", content: systemMessageContent },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      };

      const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_API_KEY || ''
        },
        body: JSON.stringify(completionRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Extract rate limit headers even on error
        const rateLimitHeaders = extractRateLimitHeaders(response);
        
        const status = response.status === 429 ? 'rate_limited' : 'error';
        activityTracker.completeRequest(requestId, status, rateLimitHeaders);
        
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      
      // Extract rate limit headers (Azure OpenAI format)
      const rateLimitHeaders = extractRateLimitHeaders(response);
      
      // Complete the request tracking
      activityTracker.completeRequest(requestId, 'success', rateLimitHeaders);
      
      // console.log("Received response from Azure OpenAI API");
      const responseContent = responseData.choices[0]?.message?.content || "{}";
      // console.log("Raw API response:", responseContent.substring(0, 100) + "...");
      
    const parsedResponse = JSON.parse(responseContent);
          
          // Ensure guardrails are formatted properly
          if (Array.isArray(parsedResponse.guardrails)) {
            parsedResponse.guardrails = parsedResponse.guardrails.map((item: unknown) => `- ${String(item)}`).join('\n');
          }
          
          // console.log("Successfully parsed response and formatted guardrails");
          return {
            brandIdentity: parsedResponse.brandIdentity || "",
            toneOfVoice: parsedResponse.toneOfVoice || "",
            guardrails: parsedResponse.guardrails || "",
            suggestedAgencies: parsedResponse.suggestedAgencies || [],
            brandColor: parsedResponse.brandColor || ""
          };
        } catch (error) {
    console.error("Error generating brand identity with Azure OpenAI:", error);
    // Mark request as failed
    activityTracker.completeRequest(requestId, 'error');
    throw new Error(`Failed to generate brand identity: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates SEO-optimized meta title and description from a URL
 */
export async function generateMetadata(
  url: string,
  brandLanguage: string = 'en',
  brandCountry: string = 'US',
  brandContext?: {
    brandIdentity?: string;
    toneOfVoice?: string;
    guardrails?: string;
    pageContent?: string;
  }
): Promise<{
  metaTitle: string;
  metaDescription: string;
}> {
  // console.log(`Generating metadata for ${url}`);
  
  try {
    const deploymentName = getModelName();
    
    // Prepare the prompt
    let systemPrompt = `You are an expert SEO specialist. Your task is to create compelling, optimized metadata (meta title and meta description) for webpages. ALL METADATA YOU GENERATE MUST BE IN THE ${brandLanguage} LANGUAGE. You're analyzing content for users in ${brandCountry}.
    
    You MUST follow these STRICT requirements:
    1. Meta title MUST be EXACTLY between 45-60 characters (NOT LESS THAN 45, NOT MORE THAN 60)
    2. Meta description MUST be EXACTLY between 150-160 characters (NOT LESS THAN 150, NOT MORE THAN 160)
    
    IMPORTANT NOTE: The CMS will automatically append the brand name to the end of the meta title. 
    Therefore, aim for a title closer to 45-50 characters to allow room for the brand name.
    
    Focus on clarity, keywords, and attracting clicks while accurately representing the page content.`;
    
    // Add brand context if available
    if (brandContext?.brandIdentity) {
      systemPrompt += `\n\nBrand identity: ${brandContext.brandIdentity}`;
    }
    
    if (brandContext?.toneOfVoice) {
      systemPrompt += `\n\nTone of voice: ${brandContext.toneOfVoice}`;
    }
    
    if (brandContext?.guardrails) {
      systemPrompt += `\n\nContent guardrails: ${brandContext.guardrails}`;
    }
    
    let userPrompt = `Generate SEO-optimized meta title and description for this URL: ${url}`;
    
    // Add page content if available
    if (brandContext?.pageContent) {
      // Extract more meaningful content for better metadata generation
      const content = brandContext.pageContent;
      const truncatedContent = content.length > 3000 
        ? content.slice(0, 3000) + "..."
        : content;
      
      userPrompt += `\n\nHere is the content from the webpage that should be used as the primary source for metadata generation:\n${truncatedContent}
      
      CRITICAL REQUIREMENTS:
      1. Base your metadata primarily on this content
      2. The meta title should accurately represent the page content
      3. META TITLE MUST have EXACTLY 45-60 characters (count spaces too) - IMPORTANT: Aim for 45-50 chars as the CMS will add the brand name
      4. META DESCRIPTION MUST have EXACTLY 150-160 characters (count spaces too)
      
      EXAMPLES OF GOOD META TITLES (note the character counts):
      - "How to Measure Flour Without a Scale Perfectly" (45 chars)
      - "Easy Methods to Measure Ingredients Without Tools" (47 chars)
      - "Kitchen Tips: Measuring Ingredients Without Scales" (49 chars)
      
      Remember that the CMS will append the brand name automatically, so keep the title shorter than the maximum length.
      
      COUNT EVERY CHARACTER including spaces before submitting your response.`;
    } else {
      userPrompt += `\n\nNote: No page content was available for analysis. Please create metadata based on the URL structure. 
      
      CRITICAL REQUIREMENTS:
      1. META TITLE MUST have EXACTLY 45-60 characters (count spaces too) - IMPORTANT: Aim for 45-50 chars as the CMS will add the brand name
      2. META DESCRIPTION MUST have EXACTLY 150-160 characters (count spaces too)
      
      EXAMPLES OF GOOD META TITLES (note the character counts):
      - "How to Measure Flour Without a Scale Perfectly" (45 chars)
      - "Easy Methods to Measure Ingredients Without Tools" (47 chars)
      - "Kitchen Tips: Measuring Ingredients Without Scales" (49 chars)
      
      Remember that the CMS will append the brand name automatically, so keep the title shorter than the maximum length.
      
      COUNT EVERY CHARACTER including spaces before submitting your response.`;
    }
    
    userPrompt += `\n\nCreate:
    1. A compelling meta title (MUST have EXACTLY 45-60 characters, aim for 45-50 chars to allow room for brand name)
    2. An informative meta description (MUST have EXACTLY 150-160 characters)
    
    BEFORE FINALIZING:
    1. Count the exact number of characters in your title (make sure it's 45-60, ideally 45-50)
    2. Count the exact number of characters in your description (make sure it's 150-160)
    3. Do NOT include character count numbers in your final JSON output
    
    Format as JSON with metaTitle and metaDescription keys. Do not include character counts in the actual values.`;
    
    try {
      // console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
      // console.log(`System prompt length: ${systemPrompt.length} characters`);
      // console.log(`User prompt length: ${userPrompt.length} characters`);
      
      // Make the API call using the deployment name in the deployment_id parameter
      const completionRequest = {
        model: deploymentName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.7
      };
      
      // Specify the deployment in the URL path
      const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
      // console.log(`Using direct endpoint URL: ${endpoint}`);
      
      // Start tracking the request
      const requestId = activityTracker.startRequest('generateMetadata');
      
      // Make a direct fetch call instead
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_API_KEY || ''
        },
        body: JSON.stringify(completionRequest)
      });
      
      // Extract rate limit headers (Azure OpenAI format)
      const rateLimitHeaders = extractRateLimitHeaders(response);
      
      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status === 429 ? 'rate_limited' : 'error';
        activityTracker.completeRequest(requestId, status, rateLimitHeaders);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      // Mark request as successful
      activityTracker.completeRequest(requestId, 'success', rateLimitHeaders);
      
      const responseData = await response.json();
      // console.log("API call successful");
      
      const content = responseData.choices?.[0]?.message?.content || "{}";
      // console.log(`Received response with content length: ${content.length}`);
      
      const parsedResponse = JSON.parse(content);
      // console.log(`Parsed response: ${JSON.stringify(parsedResponse, null, 2)}`);
      
      // Remove any character count annotations from the response
      const metaTitle = (parsedResponse.metaTitle || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
      const metaDescription = (parsedResponse.metaDescription || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
      
      return {
        metaTitle,
        metaDescription,
      };
    } catch (error) {
      console.error("Error generating metadata with Azure OpenAI:", error);
      throw new Error(`Failed to generate metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Error generating metadata:", error);
    throw new Error(`Failed to generate metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate alt text for an image URL.
 * Uses Azure OpenAI to analyze the image and produce a concise, descriptive alt text.
 * The response is expected to be a JSON object containing the alt text.
 */
export async function generateAltText(
  imageUrl: string,
  brandLanguage: string = 'en',
  brandContext?: {
    brandIdentity?: string;
    toneOfVoice?: string;
    guardrails?: string; // e.g. "Avoid mentioning competitors", "Focus on sustainability"
  }
): Promise<{ // Return type updated to match expected JSON structure
  altText: string;
  detectedLanguage?: string; // Add detected language to return type
}> {
  const deploymentName = getModelName(); // Get the deployment/model name

  // console.log(`[generateAltText] Generating alt text for: ${imageUrl} in ${brandLanguage} using deployment: ${deploymentName}`);
  if (brandContext) {
    // console.log(`[generateAltText] Using brand context:`, { 
    //   identity: !!brandContext.brandIdentity, 
    //   tone: !!brandContext.toneOfVoice,
    //   guardrails: !!brandContext.guardrails
    // });
  }

  let systemPrompt = `You are an AI assistant specialized in generating concise and accurate alternative text for images.
Analyze the provided image and generate a descriptive alt text in ${brandLanguage}.

CRITICAL REQUIREMENTS:
1. The alt text MUST be 125 characters or less for SEO and accessibility.
2. Be concise and focus only on the most important elements.
3. Prioritize the main subject and essential context.

Focus on the main subject, context, and any relevant text visible in the image.
Be factual and avoid subjective interpretations.
IMPORTANT: Do NOT include color descriptions in the alt text for accessibility reasons. Focus on shape, size, position, content, and function instead of colors.
If the image is decorative and doesn't convey information, you can indicate that, but prefer descriptive text if possible.

LANGUAGE DETECTION: If you detect any text in the image, identify its language using ISO 639-1 two-letter codes (e.g., 'en' for English, 'fr' for French, 'de' for German, 'es' for Spanish, etc.). If no text is visible or the language cannot be determined, omit the detectedLanguage field.`;

  if (brandContext?.toneOfVoice) {
    systemPrompt += `\nAdhere to the following tone of voice: ${brandContext.toneOfVoice}.`;
  }
  if (brandContext?.brandIdentity) { // Less common for alt text, but possible
    systemPrompt += `\nReflect the brand identity: ${brandContext.brandIdentity}.`;
  }
  if (brandContext?.guardrails) {
    systemPrompt += `\nFollow these content guardrails: ${brandContext.guardrails}.`;
  }
  
  systemPrompt += `\nYour response MUST be a JSON object with:
1. "altText" key containing the generated alt text string (MAXIMUM 125 CHARACTERS)
2. "detectedLanguage" key (optional) containing the ISO 639-1 code of any text detected in the image

IMPORTANT: The altText value MUST NOT exceed 125 characters. Be extremely concise.

Examples:
- If French text is detected: {"altText": "Product label with French ingredient text", "detectedLanguage": "fr"}
- If no text is visible: {"altText": "Mountain landscape photograph"}
- If English text is detected: {"altText": "Business hours sign display", "detectedLanguage": "en"}

Do NOT include any other text, explanations, or the original URL in your response.`;

  const userTextMessage = "Generate alt text for the provided image based on the system instructions.";
  
  // console.log(`[generateAltText] System Prompt (first 200 chars): ${systemPrompt.substring(0,200)}...`);
  // // console.log(`[generateAltText] Full System Prompt: ${systemPrompt}`); // Uncomment for full prompt debugging
  // console.log(`[generateAltText] User Text Message for AI: ${userTextMessage}`);
  // console.log(`[generateAltText] Image URL for AI: ${imageUrl}`);

  const completionRequest = {
    model: deploymentName, // This is often ignored when deployment is in URL, but good practice
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userTextMessage },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" }, // Request JSON output
    max_tokens: 150,
    temperature: 0.5,
  };

  const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;

  if (!azureOpenAIEndpoint || !apiKey) {
    console.error("[generateAltText] Azure OpenAI endpoint or API key is missing.");
    throw new Error("Azure OpenAI endpoint or API key is missing for direct fetch.");
  }
  
  // Construct the endpoint URL with the deployment name
  const endpointUrl = `${azureOpenAIEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
  // console.log(`[generateAltText] Using direct fetch endpoint URL: ${endpointUrl}`);

  try {
    // Start tracking the request
    const requestId = activityTracker.startRequest('generateAltText');
    
    // Add timeout to prevent gateway timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(completionRequest),
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    // Extract rate limit headers (Azure OpenAI format)
    const rateLimitHeaders = extractRateLimitHeaders(response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateAltText] API request failed with status ${response.status}: ${errorText}`, { imageUrl });
      const status = response.status === 429 ? 'rate_limited' : 'error';
      activityTracker.completeRequest(requestId, status, rateLimitHeaders);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    // Mark request as successful
    activityTracker.completeRequest(requestId, 'success', rateLimitHeaders);

    const responseData = await response.json();
    const content = responseData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[generateAltText] Azure OpenAI API call succeeded but returned no content.', { imageUrl, brandLanguage });
      throw new Error('AI returned no content for alt text.');
    }

    // console.log(`[generateAltText] Received raw content from AI: ${content}`);

    try {
      const parsedJson = JSON.parse(content.trim());
      if (typeof parsedJson.altText === 'string') {
        // console.log(`[generateAltText] Successfully parsed alt text: ${parsedJson.altText}`);
        
        // Enforce 125 character limit
        let altText = parsedJson.altText.trim();
        if (altText.length > 125) {
          console.warn(`[generateAltText] Alt text exceeded 125 characters (${altText.length}), truncating...`);
          // Truncate to 122 chars and add ellipsis
          altText = altText.substring(0, 122) + '...';
        }
        
        const result: { altText: string; detectedLanguage?: string } = { 
          altText 
        };
        
        // Include detected language if provided by AI
        if (typeof parsedJson.detectedLanguage === 'string') {
          result.detectedLanguage = parsedJson.detectedLanguage.toLowerCase();
          // console.log(`[generateAltText] Language detected in image: ${result.detectedLanguage}`);
        }
        
        return result;
      } else {
        console.error('[generateAltText] Parsed JSON does not contain a valid "altText" string field.', { parsedJson });
        throw new Error('AI response was valid JSON but missing "altText" field or it was not a string.');
      }
    } catch (parseError) {
      console.error('[generateAltText] Failed to parse AI response as JSON.', { content, parseError });
      throw new Error('AI response was not valid JSON as expected for alt text.');
    }

  } catch (error) {
    console.error(`[generateAltText] Error generating alt text for ${imageUrl}:`, error);
    
    // Handle abort/timeout specifically
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 25 seconds. Please try again with a smaller image or check your connection.');
      }
      throw error;
    }
    throw new Error(`Failed to generate alt text: ${String(error)}`);
  }
}

/**
 * Trans-creates content from one language to another
 */
export async function transCreateContent(
  content: string,
  sourceLanguage: string, // Source language, no default
  brandLanguage: string,  // Renamed from targetLanguage, no default, expected from brand settings
  brandCountry: string    // Renamed from targetCountry, no default, expected from brand settings
): Promise<{
  transCreatedContent: string;
}> {
  // console.log(`Trans-creating content from ${sourceLanguage} to ${brandLanguage} for ${brandCountry}`);
  
  const deploymentName = getModelName();
  // console.log(`Using deployment name: "${deploymentName}"`);
  
  // Language map with common names to help with prompting
  const languageNames: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean'
    // Add more as needed
  };
  
  const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;
  const targetLangName = languageNames[brandLanguage] || brandLanguage; // Use brandLanguage
  
  // Prepare the prompt
  const systemPrompt = `You are an expert localisation specialist who trans-creates content from ${sourceLangName} to ${targetLangName} for audiences in ${brandCountry}.
  Trans-creation means adapting content culturally and linguistically, not just translating it.
  Consider cultural nuances, idioms, expressions, and preferences of the target audience.
  Maintain the original meaning, tone, and intent while making it feel natural to native ${targetLangName} speakers.
  
  For ${targetLangName} content specifically (if applicable, e.g. Spanish):
  - Adapt idioms and expressions to ${targetLangName} equivalents
  - Consider cultural references relevant to ${targetLangName}-speaking audiences in ${brandCountry}
  - Use language that feels natural and authentic to native speakers
  - Adapt humor appropriately for the culture
  - Pay attention to formal vs. informal tone based on context`;
  
  const userPrompt = `Trans-create the following content from ${sourceLangName} to ${targetLangName} for audiences in ${brandCountry}:
  
  "${content}"
  
  Don't just translate literally - adapt the content to feel authentic and natural to ${targetLangName} native speakers in ${brandCountry}.
  Adjust cultural references, idioms, humor, and examples as needed while preserving the main message.
  
  Format your response as JSON with a transCreatedContent key containing ONLY the translated content.`;
  
  try {
    // console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
    
    // Prepare the request body
    const completionRequest = {
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.7
    };
    
    // Specify the deployment in the URL path
    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
    // console.log(`Using direct endpoint URL: ${endpoint}`);
    
    // Start tracking the request
    const requestId = activityTracker.startRequest('transCreateContent');
    
    // Make a direct fetch call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY || ''
      },
      body: JSON.stringify(completionRequest)
    });
    
    // Extract rate limit headers (Azure OpenAI format)
    const rateLimitHeaders = extractRateLimitHeaders(response);
    
    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status === 429 ? 'rate_limited' : 'error';
      activityTracker.completeRequest(requestId, status, rateLimitHeaders);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    // Mark request as successful
    activityTracker.completeRequest(requestId, 'success', rateLimitHeaders);
    
    const responseData = await response.json();
    // console.log("API call successful");
    
    const responseContent = responseData.choices?.[0]?.message?.content || "{}";
    // console.log(`Received response with content length: ${responseContent.length}`);
    
    const parsedResponse = JSON.parse(responseContent);
    return {
      transCreatedContent: parsedResponse.transCreatedContent || ""
    };
  } catch (error) {
    console.error("Error trans-creating content with Azure OpenAI:", error);
    throw new Error(`Failed to trans-create content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates suggestions like article titles or keywords based on context.
 */
export async function generateSuggestions(
  suggestionType: 'article-titles' | 'keywords',
  context: {
    topic?: string;
    content?: string;
    brandContext?: { // Optional brand context for tailoring suggestions
      name?: string;
      brand_identity?: string | null;
      tone_of_voice?: string | null;
      language: string; // Made required if brandContext is provided
      country: string;  // Made required if brandContext is provided
    };
  }
): Promise<string[]> {
  // console.log(`Generating suggestions of type: ${suggestionType}`);
  // Updated console log to reflect new required fields if brandContext exists
  if (context.brandContext) {
    // console.log(`Targeting Language: ${context.brandContext.language}, Country: ${context.brandContext.country}`);
  }

  const deploymentName = getModelName();

  let systemPrompt = `You are an expert assistant skilled in generating content ideas and extracting information.`;
  if (context.brandContext) {
    systemPrompt += ` You are generating suggestions for the brand "${context.brandContext.name || 'Unknown Brand'}".`;
    if (context.brandContext.tone_of_voice) {
      systemPrompt += ` Maintain a ${context.brandContext.tone_of_voice} tone.`;
    }
    // Add localization instructions if provided
    if (context.brandContext.language && context.brandContext.country) {
      systemPrompt += ` Generate suggestions in ${context.brandContext.language} targeted for an audience in ${context.brandContext.country}.`;
    } else if (context.brandContext.language) {
      systemPrompt += ` Generate suggestions in ${context.brandContext.language}.`;
    }
  }

  let userPrompt = '';
  let expectedOutputFormat = 'Return the suggestions as a JSON array of strings.';

  if (suggestionType === 'article-titles') {
    if (!context.topic) {
      throw new Error('Topic is required to generate article titles.');
    }
    userPrompt = `Generate 5 diverse and compelling article titles based on the following topic: "${context.topic}".`;
    expectedOutputFormat = 'Return the titles as a JSON array of strings, like: ["Title 1", "Title 2", ...]';
  } else if (suggestionType === 'keywords') {
    if (!context.content) {
      throw new Error('Content is required to generate keywords.');
    }
    const truncatedContent = context.content.length > 1500 ? context.content.substring(0, 1500) + '...' : context.content;
    userPrompt = `Extract the 5-10 most relevant and important keywords or key phrases from the following content:\n\n"${truncatedContent}"`;
    expectedOutputFormat = 'Return the keywords as a JSON array of strings, like: ["keyword1", "key phrase 2", ...]';
  } else {
    throw new Error(`Unsupported suggestion type: ${suggestionType}`);
  }

  userPrompt += `\n\n${expectedOutputFormat}`; // Add output format instruction

  try {
    // console.log(`Making API call to Azure OpenAI deployment: ${deploymentName} for ${suggestionType}`);

    const completionRequest = {
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300, // Adjust as needed
      temperature: 0.7
    };

    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
    // console.log(`Using direct endpoint URL: ${endpoint}`);

    // Start tracking the request
    const requestId = activityTracker.startRequest('generateSuggestions');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY || ''
      },
      body: JSON.stringify(completionRequest)
    });

    // Extract rate limit headers (Azure OpenAI format)
    const rateLimitHeaders = extractRateLimitHeaders(response);

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status === 429 ? 'rate_limited' : 'error';
      activityTracker.completeRequest(requestId, status, rateLimitHeaders);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    // Mark request as successful
    activityTracker.completeRequest(requestId, 'success', rateLimitHeaders);

    const responseData = await response.json();
    // console.log("API call successful");

    const content = responseData.choices?.[0]?.message?.content || "[]"; // Default to empty array string
    // console.log(`Received response content for suggestions: ${content}`);

    // Attempt to parse the JSON array directly from the content
    let suggestions: string[] = [];
    try {
        const parsedJson = JSON.parse(content);
        // Basic validation to check if it's an array of strings
        if (Array.isArray(parsedJson) && parsedJson.every(item => typeof item === 'string')) {
            suggestions = parsedJson;
        } else {
            // If the root is not an array, check common nested structures like { "suggestions": [...] } or { "keywords": [...] }
            const keys = Object.keys(parsedJson);
            if (keys.length === 1 && Array.isArray(parsedJson[keys[0]]) && parsedJson[keys[0]].every((item: unknown) => typeof item === 'string')) {
                suggestions = parsedJson[keys[0]];
            } else {
              console.warn('Parsed JSON is not a direct array of strings or a simple object containing one. Returning empty array.', parsedJson);
            }
        }
    } catch (parseError) {
        console.error('Failed to parse suggestions JSON from AI response:', parseError, 'Raw content:', content);
        // Fallback or throw error depending on desired behavior
        // Returning empty array for now
    }

    // console.log(`Returning ${suggestions.length} suggestions of type ${suggestionType}`);
    return suggestions;

  } catch (error) {
    console.error(`Error generating suggestions (${suggestionType}) with Azure OpenAI:`, error);
    throw new Error(`Failed to generate ${suggestionType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a compelling content title based on provided context.
 */
export async function generateContentTitleFromContext(
  contentBody: string,
  brandContext: {
    name?: string;
    brand_identity?: string | null;
    tone_of_voice?: string | null;
    language: string; // Language is mandatory for title generation
    country: string;  // Country is mandatory for title generation
    topic?: string | null; // Optional topic for more context
    keywords?: string[] | null; // Optional keywords
  }
): Promise<string> {
  // console.log(`Generating content title for brand: ${brandContext.name || 'Unknown Brand'}`);
  // console.log(`Targeting Language: ${brandContext.language}, Country: ${brandContext.country}`);

  const deploymentName = getModelName();

  let systemPrompt = `You are an expert content strategist specializing in creating compelling and SEO-friendly titles.`;
  systemPrompt += ` Generate a title in ${brandContext.language} suitable for an audience in ${brandContext.country}.`;
  if (brandContext.name) {
    systemPrompt += ` The title is for the brand "${brandContext.name}".`;
  }
  if (brandContext.tone_of_voice) {
    systemPrompt += ` The tone of voice should be: ${brandContext.tone_of_voice}.`;
  }

  let userPrompt = `Based on the following content body, generate a concise, engaging, and relevant title.`;
  if (brandContext.topic) {
    userPrompt += `\nThe main topic is: "${brandContext.topic}".`;
  }
  if (brandContext.keywords && brandContext.keywords.length > 0) {
    userPrompt += `\nKey keywords to consider: ${brandContext.keywords.join(', ')}.`;
  }
  
  const truncatedContentBody = contentBody.length > 2000 ? contentBody.substring(0, 2000) + '...' : contentBody;
  userPrompt += `\n\nContent Body (excerpt):\n"${truncatedContentBody}"`;
  userPrompt += `\n\nProvide just the title as a plain string, without any labels, quotes, or explanations. The title should be relatively short and impactful.`;

  try {
    // console.log(`Making API call to Azure OpenAI for title generation. Deployment: ${deploymentName}`);
    const completionRequest = {
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 50, // Titles are short
      temperature: 0.7,
      top_p: 0.9,
    };

    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
    
    // Start tracking the request
    const requestId = activityTracker.startRequest('generateContentTitleFromContext');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY || ''
      },
      body: JSON.stringify(completionRequest)
    });

    // Extract rate limit headers (Azure OpenAI format)
    const rateLimitHeaders = extractRateLimitHeaders(response);

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status === 429 ? 'rate_limited' : 'error';
      activityTracker.completeRequest(requestId, status, rateLimitHeaders);
      throw new Error(`API request for title generation failed with status ${response.status}: ${errorText}`);
    }

    // Mark request as successful
    activityTracker.completeRequest(requestId, 'success', rateLimitHeaders);

    const responseData = await response.json();
    let title = responseData.choices?.[0]?.message?.content?.trim() || "Suggested Title (Error)";
    
    // Explicitly remove leading/trailing quotes of common types
    if (title.startsWith('"') && title.endsWith('"')) {
      title = title.substring(1, title.length - 1);
    }
    if (title.startsWith('"') && title.endsWith('"')) {
      title = title.substring(1, title.length - 1);
    }
    if (title.startsWith("'") && title.endsWith("'")) {
        title = title.substring(1, title.length - 1);
    }

    // console.log(`Generated title (cleaned): "${title}"`);
    return title;

  } catch (error) {
    console.error('Error generating content title with Azure OpenAI:', error);
    throw new Error(`Failed to generate content title: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
