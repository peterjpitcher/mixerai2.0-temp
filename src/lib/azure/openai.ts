import { OpenAI } from "openai";

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
  
  // Get deployment name
  const deploymentName = getModelName();
  
  console.log(`Initializing Azure OpenAI client with:
  - Endpoint: ${endpoint}
  - API Key: ${apiKey ? apiKey.substring(0, 5) + "..." : "undefined"}
  - Deployment: ${deploymentName}
  `);
  
  // Create the OpenAI client with Azure configuration
  // The baseURL needs to include /openai/deployments for Azure OpenAI
  return new OpenAI({
    apiKey: apiKey,
    baseURL: `${endpoint}/openai/deployments`,
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
    console.log(`Using configured deployment name: ${deploymentName}`);
    return deploymentName;
  }
  
  // Default to gpt-4o which supports vision capabilities
  console.log(`No deployment name configured, using default: gpt-4o`);
  return "gpt-4o";
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
 * Generate content based on a content type
 */
export async function generateContent(
  contentType: "article" | "retailer_pdp" | "owned_pdp", 
  brand: {
    name: string;
    brand_identity?: string | null;
    tone_of_voice?: string | null;
    guardrails?: string | null;
  },
  input: {
    topic?: string;
    keywords?: string[];
    productName?: string;
    productDescription?: string;
    additionalInstructions?: string;
  }
) {
  console.log(`Generating ${contentType} content for brand: ${brand.name}`);
  
  const deploymentName = getModelName();
  console.log(`Using deployment name: "${deploymentName}"`);
  
  // Build the prompt based on content type and brand information
  let systemPrompt = `You are an expert content creator for the brand "${brand.name}".`;
  
  if (brand.brand_identity) {
    systemPrompt += ` The brand identity can be described as: ${brand.brand_identity}.`;
  }
  
  if (brand.tone_of_voice) {
    systemPrompt += ` The tone of voice should be: ${brand.tone_of_voice}.`;
  }
  
  if (brand.guardrails) {
    systemPrompt += ` Content guardrails: ${brand.guardrails}.`;
  }
  
  let userPrompt = "";
  
  switch (contentType) {
    case "article":
      userPrompt = `Create a high-quality article about "${input.topic || "the requested topic"}".`;
      if (input.keywords && input.keywords.length > 0) {
        userPrompt += ` Include these keywords: ${input.keywords.join(", ")}.`;
      }
      break;
      
    case "retailer_pdp":
      userPrompt = `Create a compelling product description for "${input.productName || "the product"}" to be used on retailer websites.`;
      if (input.productDescription) {
        userPrompt += ` Product details: ${input.productDescription}.`;
      }
      break;
      
    case "owned_pdp":
      userPrompt = `Create a detailed product description for "${input.productName || "the product"}" to be used on the brand's own website.`;
      if (input.productDescription) {
        userPrompt += ` Product details: ${input.productDescription}.`;
      }
      break;
  }
  
  if (input.additionalInstructions) {
    userPrompt += ` Additional instructions: ${input.additionalInstructions}.`;
  }
  
  userPrompt += ` Format the content in markdown. For articles, include appropriate section headers. Always include a compelling meta title and meta description at the end in the format: META TITLE: [title] META DESCRIPTION: [description].`;
  
  // Make the API call directly with error handling
  try {
    console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
    
    // Prepare the request body
    const completionRequest = {
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
      top_p: 0.95,
      frequency_penalty: 0.5,
      presence_penalty: 0.5,
    };
    
    // Specify the deployment in the URL path
    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
    console.log(`Using direct endpoint URL: ${endpoint}`);
    
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
    console.log("API call successful");
    
    const content = responseData.choices?.[0]?.message?.content || "";
    console.log(`Received response with content length: ${content.length}`);
    
    // Extract meta title and description
    const metaTitleMatch = content.match(/META TITLE: (.*?)($|\n)/i);
    const metaDescriptionMatch = content.match(/META DESCRIPTION: (.*?)($|\n)/i);
    
    const metaTitle = metaTitleMatch ? metaTitleMatch[1].trim() : "";
    const metaDescription = metaDescriptionMatch ? metaDescriptionMatch[1].trim() : "";
    
    // Remove the meta information from the main content
    let mainContent = content;
    if (metaTitleMatch) {
      mainContent = mainContent.replace(/META TITLE: .*?($|\n)/i, "");
    }
    if (metaDescriptionMatch) {
      mainContent = mainContent.replace(/META DESCRIPTION: .*?($|\n)/i, "");
    }
    
    return {
      content: mainContent.trim(),
      metaTitle,
      metaDescription,
    };
  } catch (error) {
    console.error("Error generating content with Azure OpenAI:", error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate content based on a template
 */
export async function generateContentFromTemplate(
  contentType: "article" | "retailer_pdp" | "owned_pdp" | string, 
  brand: {
    name: string;
    brand_identity?: string | null;
    tone_of_voice?: string | null;
    guardrails?: string | null;
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
    }>;
  },
  input?: {
    additionalInstructions?: string;
    templateFields?: Record<string, string>;
  }
) {
  console.log(`Generating template-based content for brand: ${brand.name} using template: ${template.name}`);
  
  const deploymentName = getModelName();
  console.log(`Using deployment name: "${deploymentName}"`);
  
  // Build the system prompt with brand information
  let systemPrompt = `You are an expert content creator for the brand "${brand.name}".`;
  
  if (brand.brand_identity) {
    systemPrompt += ` The brand identity can be described as: ${brand.brand_identity}.`;
  }
  
  if (brand.tone_of_voice) {
    systemPrompt += ` The tone of voice should be: ${brand.tone_of_voice}.`;
  }
  
  if (brand.guardrails) {
    systemPrompt += ` Content guardrails: ${brand.guardrails}.`;
  }
  
  systemPrompt += `\nYou are using a template called "${template.name}" to generate content.`;
  
  // Build the user prompt using template fields and prompts
  let userPrompt = `Create content for content type "${contentType}" according to this template: "${template.name}".\n\n`;
  userPrompt += `Template input fields:\n`;
  
  // Add each input field with its value to the prompt
  template.inputFields.forEach(field => {
    const fieldValue = field.value || '';
    userPrompt += `- ${field.name}: ${fieldValue}\n`;
  });
  
  userPrompt += `\nGenerate the following output fields:\n`;
  
  // Include output field requirements with their prompts
  template.outputFields.forEach(field => {
    userPrompt += `- ${field.name}`;
    if (field.aiPrompt) {
      const processedPrompt = field.aiPrompt.replace(/\{\{(\w+)\}\}/g, (match, fieldId) => {
        // Replace template variables with actual values
        const inputField = template.inputFields.find(f => f.id === fieldId);
        return inputField && inputField.value ? inputField.value : match;
      });
      
      userPrompt += `: ${processedPrompt}`;
      console.log(`Using AI prompt for field ${field.name}: ${processedPrompt}`);
    }
    userPrompt += `\n`;
  });
  
  // Add additional instructions if provided
  if (input?.additionalInstructions) {
    userPrompt += `\nAdditional instructions: ${input.additionalInstructions}`;
  }
  
  userPrompt += `\nFormat each output field as follows (IMPORTANT: place the content BETWEEN the markers, not including the markers):
##FIELD_ID:field_id## 
content goes here 
##END_FIELD_ID##

Make sure you don't include the field markers (##FIELD_ID and ##END_FIELD_ID##) in the actual content.`;
  
  // Make the API call with error handling
  try {
    console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
    
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
    console.log(`Using direct endpoint URL: ${endpoint}`);
    
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
    console.log("API call successful");
    
    const content = responseData.choices?.[0]?.message?.content || "";
    console.log(`Received response with content length: ${content.length}`);
    
    // Parse the fields from the response
    const result: Record<string, string> = {};
    let fieldsParsed = false;
    
    // Extract each field using regex
    template.outputFields.forEach(field => {
      // Look for field content between the markers with any whitespace
      const fieldRegex = new RegExp(`##FIELD_ID:${field.id}##\\s*([\\s\\S]*?)\\s*##END_FIELD_ID##`, 'i');
      const match = content.match(fieldRegex);
      
      if (match && match[1]) {
        result[field.id] = match[1].trim();
        fieldsParsed = true;
        console.log(`Successfully parsed field ${field.id} with length ${result[field.id].length}`);
      } else {
        console.log(`No match found for field ${field.id}, trying alternative formats`);
        
        // Try alternative formats that the AI might use
        const altRegex1 = new RegExp(`##FIELD_ID: *${field.id}##\\s*([\\s\\S]*?)\\s*##END_FIELD_ID##`, 'i');
        const altRegex2 = new RegExp(`## *FIELD_ID: *${field.id} *##\\s*([\\s\\S]*?)\\s*## *END_FIELD_ID *##`, 'i');
        const altRegex3 = new RegExp(`${field.name}:\\s*(.+?)(?=\\n\\n|\\n[^\\n]|$)`, 'i');
        
        const altMatch1 = content.match(altRegex1);
        const altMatch2 = content.match(altRegex2);
        const altMatch3 = content.match(altRegex3);
        
        if (altMatch1 && altMatch1[1]) {
          result[field.id] = altMatch1[1].trim();
          fieldsParsed = true;
          console.log(`Parsed field ${field.id} with alternative format 1`);
        } else if (altMatch2 && altMatch2[1]) {
          result[field.id] = altMatch2[1].trim();
          fieldsParsed = true;
          console.log(`Parsed field ${field.id} with alternative format 2`);
        } else if (altMatch3 && altMatch3[1]) {
          result[field.id] = altMatch3[1].trim();
          fieldsParsed = true;
          console.log(`Parsed field ${field.id} using field name format`);
        }
      }
    });
    
    // If no fields were parsed correctly, try to extract content without markers
    if (!fieldsParsed) {
      console.log('No fields parsed from template using expected formats, trying to extract content');
      
      // Look for each field ID in raw content (in case the AI included field ID but not markers)
      template.outputFields.forEach(field => {
        const simpleFieldRegex = new RegExp(`${field.name}:\\s*([\\s\\S]*?)(?=\\n\\n|\\n[A-Za-z]|$)`, 'i');
        const simpleMatch = content.match(simpleFieldRegex);
        
        if (simpleMatch && simpleMatch[1]) {
          result[field.id] = simpleMatch[1].trim();
          fieldsParsed = true;
          console.log(`Extracted field ${field.id} using simple field name extraction`);
        }
      });
      
      // If still no fields parsed, assign the entire content to the first output field
      if (!fieldsParsed && template.outputFields.length > 0) {
        const firstField = template.outputFields[0];
        result[firstField.id] = content;
        fieldsParsed = true;
        console.log(`Assigned full content to first output field: ${firstField.id}`);
      }
    }
    
    // Check if any field contains the markers and strip them
    Object.keys(result).forEach(fieldId => {
      // Remove any field markers from the content
      result[fieldId] = result[fieldId]
        .replace(/##FIELD_ID:[a-zA-Z0-9_]+##/g, '')
        .replace(/##END_FIELD_ID##/g, '')
        .trim();
    });
    
    // Log what fields we're returning
    console.log('Returning only the template-based output fields:', Object.keys(result));
    
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
  urls: string[]
): Promise<{
  brandIdentity: string;
  toneOfVoice: string;
  guardrails: string;
  suggestedAgencies: Array<{name: string, description: string, priority: 'high' | 'medium' | 'low'}>;
  brandColor: string;
}> {
    console.log(`Generating brand identity for ${brandName} from ${urls.length} URLs`);
    
    // Debug environment variables
    console.log("Environment check:");
    console.log("- NODE_ENV:", process.env.NODE_ENV);
    console.log("- AZURE_OPENAI_API_KEY exists:", !!process.env.AZURE_OPENAI_API_KEY);
    console.log("- AZURE_OPENAI_ENDPOINT exists:", !!process.env.AZURE_OPENAI_ENDPOINT);
    console.log("- AZURE_OPENAI_DEPLOYMENT:", process.env.AZURE_OPENAI_DEPLOYMENT);
  
      const client = getAzureOpenAIClient();
  const deploymentName = getModelName();
      
      // Prepare the prompt
      const prompt = `
      Please analyze the following URLs related to the brand "${brandName}":
      ${urls.map(url => `- ${url}`).join('\n')}
      
      Based on these URLs, generate a comprehensive brand identity profile with the following components:
      
      1. BRAND IDENTITY: A detailed description of the brand's personality, values, target audience, and key messaging themes. This should be in plain text paragraphs, not markdown.
      
      2. TONE OF VOICE: A description of how the brand communicates - the style, language, and approach it uses. This should be a concise paragraph.
      
      3. CONTENT GUARDRAILS: Provide 5 specific guidelines that content creators should follow when creating content for this brand. Format these as a bulleted list.
      
      4. SUGGESTED VETTING AGENCIES: Based on the industry and country (if known), recommend 3-5 regulatory or vetting agencies that might be relevant to this brand, with a brief description of each. Also assign each a priority level (high, medium, or low) based on how critical compliance with this agency is for the brand.
      
      5. BRAND COLOR: Suggest a primary brand color that would best represent this brand's identity and values. Provide the color in hex format (e.g., #FF5733).
      
      Format your response as a JSON object with these keys: brandIdentity, toneOfVoice, guardrails (as an array of strings), suggestedAgencies (as an array of objects with name, description, and priority fields), and brandColor (as a hex color code).
      `;
      
      // Make the API call
  try {
      console.log("Sending request to Azure OpenAI API");
      console.log(`Using deployment: ${deploymentName}`);
      
        const completion = await client.chat.completions.create({
          model: deploymentName,
          messages: [
            { role: "system", content: "You are a brand strategy expert that helps analyze and create detailed brand identities." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        });
        
        console.log("Received response from Azure OpenAI API");
        const responseContent = completion.choices[0]?.message?.content || "{}";
        console.log("Raw API response:", responseContent.substring(0, 100) + "...");
        
    const parsedResponse = JSON.parse(responseContent);
          
          // Ensure guardrails are formatted properly
          if (Array.isArray(parsedResponse.guardrails)) {
            parsedResponse.guardrails = parsedResponse.guardrails.map((item: string) => `- ${item}`).join('\n');
          }
          
          console.log("Successfully parsed response and formatted guardrails");
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
  console.log(`Generating metadata for ${url}`);
  
  try {
    const client = getAzureOpenAIClient();
    const deploymentName = getModelName();
    
    // Prepare the prompt
    let systemPrompt = `You are an expert SEO specialist who creates compelling, optimized metadata for webpages.
    You're analyzing content in ${brandLanguage} for users in ${brandCountry}.
    
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
      console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
      console.log(`System prompt length: ${systemPrompt.length} characters`);
      console.log(`User prompt length: ${userPrompt.length} characters`);
      
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
      console.log(`Using direct endpoint URL: ${endpoint}`);
      
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
      console.log("API call successful");
      
      const content = responseData.choices?.[0]?.message?.content || "{}";
      console.log(`Received response with content length: ${content.length}`);
      
      const parsedResponse = JSON.parse(content);
      console.log(`Parsed response: ${JSON.stringify(parsedResponse, null, 2)}`);
      
      // Remove any character count annotations from the response
      const metaTitle = (parsedResponse.metaTitle || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
      const metaDescription = (parsedResponse.metaDescription || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
      
      return {
        metaTitle,
        metaDescription
      };
    } catch (error) {
      console.error("Error calling Azure OpenAI API:", error);
      
      // Try to extract more detailed error info
      let errorMessage = "Unknown error";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Error details:", error);
      }
      
      throw new Error(`Azure OpenAI API error: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Error generating metadata with Azure OpenAI:", error);
    throw new Error(`Failed to generate metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates SEO-optimized meta title and description from content directly
 */
export async function generateMetadataFromContent(
  contentTitle: string,
  contentBody: string,
  brandLanguage: string = 'en',
  brandCountry: string = 'US',
  brandContext?: {
    brandIdentity?: string;
    toneOfVoice?: string;
    guardrails?: string;
  }
): Promise<{
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}> {
  console.log(`Generating metadata for content: ${contentTitle}`);
  
  const client = getAzureOpenAIClient();
  const deploymentName = getModelName();
  
  // Prepare the prompt
  let systemPrompt = `You are an expert SEO specialist who creates compelling, optimized metadata for content.
  You're analyzing content in ${brandLanguage} for users in ${brandCountry}.
  
  You MUST follow these strict requirements:
  1. Meta title MUST be EXACTLY between 50-60 characters
  2. Meta description MUST be EXACTLY between 150-160 characters
  3. Generate 5-8 relevant keywords or keyword phrases based on the content
  
  Focus on clarity, SEO optimization, and attracting clicks while accurately representing the content.`;
  
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
  
  // Truncate content body if too long
  const truncatedBody = contentBody.length > 3000 
    ? contentBody.slice(0, 3000) + "..."
    : contentBody;
  
  const userPrompt = `Generate SEO-optimized meta title, description, and keywords for this content:
  
  Title: ${contentTitle}
  
  Content:
  ${truncatedBody}
  
  Important:
  - Base your metadata on the content provided
  - The meta title should accurately represent the content and NOT include the brand or website name
  - META TITLE MUST be EXACTLY 50-60 characters
  - META DESCRIPTION MUST be EXACTLY 150-160 characters
  - Generate 5-8 relevant keywords or keyword phrases based on the content
  
  Format as JSON with metaTitle, metaDescription, and keywords keys (keywords should be an array of strings).`;
  
  try {
    console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
    
    // Prepare the request body
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
    console.log(`Using direct endpoint URL: ${endpoint}`);
    
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
    console.log("API call successful");
    
    const content = responseData.choices?.[0]?.message?.content || "{}";
    console.log(`Received response with content length: ${content.length}`);
    
    const parsedResponse = JSON.parse(content);
    return {
      metaTitle: parsedResponse.metaTitle || "",
      metaDescription: parsedResponse.metaDescription || "",
      keywords: Array.isArray(parsedResponse.keywords) ? parsedResponse.keywords : []
    };
  } catch (error) {
    console.error("Error generating metadata with Azure OpenAI:", error);
    throw new Error(`Failed to generate metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates accessible alt text for an image
 */
export async function generateAltText(
  imageUrl: string,
  brandLanguage: string = 'en',
  brandCountry: string = 'US',
  brandContext?: {
    brandIdentity?: string;
    toneOfVoice?: string;
    guardrails?: string;
  }
): Promise<{
  altText: string;
}> {
  console.log(`Generating alt text for ${imageUrl}`);
  
  const client = getAzureOpenAIClient();
  const deploymentName = getModelName();
  
  // Prepare the prompt with best practices
  let systemPrompt = `You are an accessibility expert who creates clear and descriptive alt text for images.
  You're writing alt text in ${brandLanguage} for users in ${brandCountry}.
  
  Follow these STRICT requirements for creating alt text:
  
  ✅ MUST DO:
  - Be descriptive and specific about essential image details
  - Keep it EXACTLY between 20-125 characters (including spaces)
  - Describe function if the image is a functional element
  - Include important text visible in the image
  - Consider the image's context on the page
  - Use keywords thoughtfully if they naturally fit
  
  ❌ NEVER DO:
  - NEVER start with "Image of..." or "Picture of..."
  - Never use overly vague descriptions
  - Never use keyword stuffing
  - Never have fewer than 20 characters
  - Never exceed 125 characters
  
  Create alt text that clearly communicates what a user would miss if they couldn't see the image.`;
  
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
  
  const userPromptText = `Generate accessible alt text for this image:
  
  Examples of good alt text:
  - "Woman holding a protest sign reading 'Equality for All' during a march in central London" (91 chars)
  - "Mountain range at sunset with orange-pink sky reflected in a still lake" (73 chars)
  - "Chef demonstrating how to knead bread dough on a flour-dusted countertop" (72 chars)
  
  Examples to avoid:
  - "Image of a nice scenery" (too vague and starts with 'image of')
  - "Picture showing a person at an event" (starts with 'picture' and is vague)
  - "Beautiful product photo of our newest spring collection item perfect for your wardrobe essential must-have fashion trend 2023" (keyword stuffed)
  
  CRITICAL REQUIREMENTS:
  - Keep it EXACTLY between 20-125 characters. Count carefully.
  - NEVER start with "Image of..." or "Picture of..."
  - Focus on the most important visual details
  - If there's text in the image, include it
  - Before submitting, count the exact number of characters to verify length
  
  Format your response as JSON with an altText key, and include the character count in your reasoning.`;
  
  try {
    console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
    
    // Prepare the request body with properly formatted image content
    const completionRequest = {
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            { type: "text", text: userPromptText },
            { 
              type: "image_url", 
              image_url: { 
                url: imageUrl 
              } 
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.7
    };
    
    // Specify the deployment in the URL path
    const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-12-01-preview`;
    console.log(`Using direct endpoint URL: ${endpoint}`);
    
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
    console.log("API call successful");
    
    const content = responseData.choices?.[0]?.message?.content || "{}";
    console.log(`Received response with content length: ${content.length}`);
    
    const parsedResponse = JSON.parse(content);
    
    // Remove any character count that might have been included in the response
    const altText = (parsedResponse.altText || "").replace(/\s*\(\d+\s*chars?\)$/i, "");
    
    return {
      altText
    };
  } catch (error) {
    console.error("Error generating alt text with Azure OpenAI:", error);
    throw new Error(`Failed to generate alt text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trans-creates content from one language to another
 */
export async function transCreateContent(
  content: string,
  sourceLanguage: string = 'en',
  targetLanguage: string = 'es',
  targetCountry: string = 'ES'
): Promise<{
  transCreatedContent: string;
}> {
  console.log(`Trans-creating content from ${sourceLanguage} to ${targetLanguage} for ${targetCountry}`);
  
  const deploymentName = getModelName();
  console.log(`Using deployment name: "${deploymentName}"`);
  
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
  };
  
  const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;
  const targetLangName = languageNames[targetLanguage] || targetLanguage;
  
  // Prepare the prompt
  const systemPrompt = `You are an expert localisation specialist who trans-creates content from ${sourceLangName} to ${targetLangName} for audiences in ${targetCountry}.
  Trans-creation means adapting content culturally and linguistically, not just translating it.
  Consider cultural nuances, idioms, expressions, and preferences of the target audience.
  Maintain the original meaning, tone, and intent while making it feel natural to native ${targetLangName} speakers.
  
  For Spanish content specifically:
  - Adapt idioms and expressions to Spanish equivalents
  - Consider cultural references relevant to Spanish-speaking audiences
  - Use language that feels natural and authentic to native speakers
  - Adapt humor appropriately for the culture
  - Pay attention to formal vs. informal tone based on context`;
  
  const userPrompt = `Trans-create the following content from ${sourceLangName} to ${targetLangName} for audiences in ${targetCountry}:
  
  "${content}"
  
  Don't just translate literally - adapt the content to feel authentic and natural to ${targetLangName} native speakers in ${targetCountry}.
  Adjust cultural references, idioms, humor, and examples as needed while preserving the main message.
  
  Format your response as JSON with a transCreatedContent key containing ONLY the translated content.`;
  
  try {
    console.log(`Making API call to Azure OpenAI deployment: ${deploymentName}`);
    
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
    console.log(`Using direct endpoint URL: ${endpoint}`);
    
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
    console.log("API call successful");
    
    const responseContent = responseData.choices?.[0]?.message?.content || "{}";
    console.log(`Received response with content length: ${responseContent.length}`);
    
    const parsedResponse = JSON.parse(responseContent);
    return {
      transCreatedContent: parsedResponse.transCreatedContent || ""
    };
  } catch (error) {
    console.error("Error trans-creating content with Azure OpenAI:", error);
    throw new Error(`Failed to trans-create content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 