import { OpenAI } from "openai";
import type { StyledClaims } from "@/types/claims";

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
  
  // Default to gpt-4o which supports vision capabilities
  return "gpt-4o";
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

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(completionRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateTextCompletion] API request failed with status ${response.status}: ${errorText}`);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

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
 * Generate content based on a template
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
  // console.log(`Targeting Language: ${brand.language || 'not specified'}, Country: ${brand.country || 'not specified'}`);
  
  const deploymentName = getModelName();
  // console.log(`Using deployment name: "${deploymentName}"`);
  
  // Build the system prompt with brand information
  let systemPrompt = `You are an expert content creator for the brand "${brand.name}".`;
  
  // Add localization instructions if provided
  if (brand.language && brand.country) {
    systemPrompt += ` Generate content in ${brand.language} for an audience in ${brand.country}.`;
  } else if (brand.language) {
    systemPrompt += ` Generate content in ${brand.language}.`;
  }
  
  // Add the new content rules
  systemPrompt += `

Content Rules:
- NEVER mention the product's size or weight (e.g., '460 ml') in the generated content.
- NEVER mention the brand's country of origin or the target country in the generated content.
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
  
  systemPrompt += `\nYou are using a template called "${template.name}" to generate content. For any fields that are intended for rich text display (like a main article body), generate the content directly as well-formed HTML using common semantic tags (e.g., <p>, <h1>-<h6>, <ul>, <ol>, <li>, <strong>, <em>,<blockquote>). Do not use Markdown for these rich text fields. For other fields, follow their specific aiPrompt or generate plain text.`;
  
  // Build the user prompt using template fields and prompts
  let userPrompt = `Create content according to this template: "${template.name}".\n\n`;
  
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
  });
  
  userPrompt += `\nGenerate the following output fields:\n`;
  
  // Include output field requirements with their prompts
  template.outputFields.forEach(field => {
    userPrompt += `- For the field named \"${field.name}\" (with ID \"${field.id}\"):\n`;
    userPrompt += `  BEGIN CONTENT FOR THIS FIELD HERE (ID: ${field.id}):\n`;
    
    let fieldSpecificInstruction = "";
    if (field.type === 'richText') {
      fieldSpecificInstruction += 'Output as well-formed HTML, not Markdown. ';
    }

    let fieldAIPrompt = "";
    if (field.aiPrompt) {
      const processedPrompt = field.aiPrompt.replace(/\{\{(\w+)\}\}/g, (match, inputFieldIdOrName) => {
        const inputField = template.inputFields.find(f => f.id === inputFieldIdOrName || f.name === inputFieldIdOrName);
        return inputField && inputField.value ? inputField.value : match;
      });
      fieldAIPrompt = processedPrompt;
    }
    
    if (fieldAIPrompt || fieldSpecificInstruction) {
        userPrompt += `  Instructions: ${fieldSpecificInstruction}${fieldAIPrompt}\n`;
    }

    if (field.useBrandIdentity && brand.brand_identity) {
      userPrompt += `  Apply Brand Identity: ${brand.brand_identity}\n`;
    }
    if (field.useToneOfVoice && brand.tone_of_voice) {
      userPrompt += `  Apply Tone of Voice: ${brand.tone_of_voice}\n`;
    }
    if (field.useGuardrails && brand.guardrails) {
      userPrompt += `  Apply Guardrails: ${brand.guardrails}\n`;
    }

    userPrompt += `  WRAP THE ENTIRE GENERATED CONTENT FOR THIS SPECIFIC FIELD \"${field.name}\" (ID: ${field.id}) WITH THE MARKERS: ##FIELD_ID:${field.id}## ... ##END_FIELD_ID##\n\n`;
  });
  
  // Add additional instructions if provided
  if (input?.additionalInstructions) {
    userPrompt += `\nAdditional instructions: ${input.additionalInstructions}`;
  }
  
  // Make the API call with error handling
  try {
    // console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
    
    // Prepare the request body
    const completionRequest = {
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.95,
      frequency_penalty: 0.5,
      presence_penalty: 0.5,
    };
    
    // Specify the deployment in the URL path
    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
    // console.log(`Using direct endpoint URL: ${endpoint}`);
    
    // Make a direct fetch call
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
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const responseData = await response.json();
    // console.log("API call successful");
    
    let content = responseData.choices?.[0]?.message?.content || "";
    // console.log(`Received response with content length: ${content.length}`);
    
    // Remove Markdown code block delimiters like ```html ... ``` or ``` ... ```
    content = content.replace(/```[a-zA-Z]*\n?/g, "").replace(/\n?```/g, "");
    
    // Save full content for debugging and fallback
    const fullContent = content;
    
    // Parse the fields from the response
    const result: Record<string, string> = {};
    let fieldsParsed = false;
    
    // Process each output field
    template.outputFields.forEach(field => {
      // console.log(`Processing output field: ${field.name} (${field.id})`);
      
      const fieldRegex = new RegExp(`##FIELD_ID:${field.id}##\\s*([\\s\\S]*?)\\s*##END_FIELD_ID##`, 'i');
      let match = content.match(fieldRegex);
      
      if (match && match[1]) {
        result[field.id] = match[1].trim();
        fieldsParsed = true;
        // console.log(`Successfully parsed field ${field.id} with length ${result[field.id].length}`);
      } else {
        // Attempt to match field name if markers are not found, for simpler AI responses
        // This is a fallback and might be less reliable for multiple fields.
        const escapedFieldName = field.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const fieldNameRegex = new RegExp(`(?:${escapedFieldName}\s*:\s*|##${escapedFieldName}##\s*)([\s\S]*?)(?:\n##FIELD_ID:|\n##[A-Z_]+##|$)`, 'i');
        match = content.match(fieldNameRegex);
        if (match && match[1]) {
          result[field.id] = match[1].trim();
          fieldsParsed = true;
          // console.log(`Parsed field ${field.id} using field name (fallback), length: ${result[field.id].length}`);
        }
      }
    });
    
    // If no fields were parsed correctly, use the entire content
    if (!fieldsParsed && template.outputFields.length > 0) {
      // console.log('No fields parsed using any format, using the full content');
      const mainField = template.outputFields[0];
      result[mainField.id] = fullContent;
      // console.log(`Assigned full content (${fullContent.length} chars) to field ${mainField.id}`);
    }
    
    // Log what fields we're returning
    // console.log('Returning template-based output fields:', Object.keys(result));
    
    return result;
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
  country: string
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
  const client = getAzureOpenAIClient();
      
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
  try {
      // console.log("Sending request to Azure OpenAI API");
      // console.log(`Using deployment: ${deploymentName}`);
      
      const systemMessageContent = "You are a brand strategy expert that helps analyze and create detailed brand identities.";
      // console.log("---- System Prompt ----\n", systemMessageContent);
      // console.log("---- User Prompt for Brand Identity ----\n", prompt);

      const completion = await client.chat.completions.create({
        model: deploymentName,
        messages: [
          { role: "system", content: systemMessageContent },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });
      
      // console.log("Received response from Azure OpenAI API");
      const responseContent = completion.choices[0]?.message?.content || "{}";
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
      
      // Make a direct fetch call instead
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
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
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
Focus on the main subject, context, and any relevant text visible in the image.
Be factual and avoid subjective interpretations.
If the image is decorative and doesn't convey information, you can indicate that, but prefer descriptive text if possible.`;

  if (brandContext?.toneOfVoice) {
    systemPrompt += `\nAdhere to the following tone of voice: ${brandContext.toneOfVoice}.`;
  }
  if (brandContext?.brandIdentity) { // Less common for alt text, but possible
    systemPrompt += `\nReflect the brand identity: ${brandContext.brandIdentity}.`;
  }
  if (brandContext?.guardrails) {
    systemPrompt += `\nFollow these content guardrails: ${brandContext.guardrails}.`;
  }
  
  systemPrompt += `\nYour response MUST be a JSON object with a single key "altText" containing the generated alt text string. For example: {"altText": "A descriptive alt text goes here."}. Do NOT include any other text, explanations, or the original URL in your response.`;

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
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(completionRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generateAltText] API request failed with status ${response.status}: ${errorText}`, { imageUrl });
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

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
        return { altText: parsedJson.altText.trim() };
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
    if (error instanceof Error) {
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
    
    // Make a direct fetch call
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
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
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
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

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
      throw new Error(`API request for title generation failed with status ${response.status}: ${errorText}`);
    }

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
