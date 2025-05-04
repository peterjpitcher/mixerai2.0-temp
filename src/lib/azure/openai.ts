import { OpenAI } from "openai";

// Initialize the Azure OpenAI client
export const getAzureOpenAIClient = () => {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  
  if (!apiKey || !endpoint) {
    throw new Error("Azure OpenAI API credentials are missing");
  }
  
  return new OpenAI({
    apiKey: apiKey,
    baseURL: `${endpoint}/openai/deployments`,
    defaultQuery: { "api-version": "2023-09-01-preview" },
    defaultHeaders: { "api-key": apiKey }
  });
};

// Content vetting agencies by country
export const VETTING_AGENCIES_BY_COUNTRY: Record<string, Array<{name: string, description: string}>> = {
  "US": [
    { name: "FDA", description: "Food and Drug Administration - Regulates food, drugs, cosmetics, and medical devices" },
    { name: "FTC", description: "Federal Trade Commission - Enforces consumer protection and antitrust laws" },
    { name: "NAD", description: "National Advertising Division - Self-regulatory body that monitors advertising for truthfulness" },
    { name: "EPA", description: "Environmental Protection Agency - Regulates environmental claims" }
  ],
  "GB": [
    { name: "ASA", description: "Advertising Standards Authority - Regulates advertising in the UK" },
    { name: "MHRA", description: "Medicines and Healthcare products Regulatory Agency - Regulates medicines and medical devices" },
    { name: "CAP", description: "Committee of Advertising Practice - Sets advertising standards in the UK" }
  ],
  "CA": [
    { name: "Health Canada", description: "Regulates health products, food, and consumer goods" },
    { name: "Ad Standards", description: "Canada's advertising self-regulatory body" },
    { name: "CFIA", description: "Canadian Food Inspection Agency - Regulates food claims" }
  ],
  "AU": [
    { name: "TGA", description: "Therapeutic Goods Administration - Regulates therapeutic goods including medicines and medical devices" },
    { name: "ACCC", description: "Australian Competition and Consumer Commission - Enforces consumer protection laws" },
    { name: "Ad Standards", description: "Australia's advertising self-regulatory body" }
  ],
  "EU": [
    { name: "EFSA", description: "European Food Safety Authority - Provides scientific advice on food-related risks" },
    { name: "EMA", description: "European Medicines Agency - Evaluates medicinal products" },
    { name: "EASA", description: "European Advertising Standards Alliance - Coordinates advertising self-regulation" }
  ]
};

/**
 * Returns a list of content vetting agencies relevant for a given country
 */
export function getVettingAgenciesForCountry(countryCode: string): Array<{name: string, description: string}> {
  return VETTING_AGENCIES_BY_COUNTRY[countryCode] || [];
}

// Generate content based on a content type
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
  const client = getAzureOpenAIClient();
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "";
  
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
  
  try {
    const response = await client.chat.completions.create({
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
    });
    
    const content = response.choices[0]?.message?.content || "";
    
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
    throw new Error("Failed to generate content");
  }
}

// Generate brand identity details from URLs
export async function generateBrandIdentityFromUrls(
  brandName: string,
  urls: string[]
) {
  const client = getAzureOpenAIClient();
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "";
  
  if (!urls || urls.length === 0) {
    throw new Error("At least one URL is required to generate brand identity");
  }
  
  // Create a system prompt for brand identity generation
  const systemPrompt = `You are an expert brand analyst who excels at analyzing websites and extracting key brand information. Your task is to analyze the content from these URLs for the brand "${brandName}" and generate a comprehensive brand identity profile.`;
  
  // Create the user prompt with the URLs
  const userPrompt = `I need you to analyze these websites for the brand "${brandName}": 
${urls.join('\n')}

Based on the content of these websites, please generate the following:

1. BRAND IDENTITY: A 2-3 paragraph description of the brand's identity, values, mission, and positioning in the market.

2. TONE OF VOICE: A concise description of how the brand communicates, including 4-5 adjectives (e.g., professional, friendly, authoritative, casual) that best describe their communication style.

3. CONTENT GUARDRAILS: A list of 3-5 specific guidelines that content creators should follow when creating content for this brand.

4. CONTENT VETTING AGENCIES: Identify any relevant content vetting agencies or regulatory bodies that might be applicable to this brand based on its industry.

Format your response in a JSON object with these keys: brandIdentity, toneOfVoice, guardrails, contentVettingAgencies.`;

  try {
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0]?.message?.content || "{}";
    
    try {
      const parsedContent = JSON.parse(content);
      return {
        brandIdentity: parsedContent.brandIdentity || "",
        toneOfVoice: parsedContent.toneOfVoice || "",
        guardrails: parsedContent.guardrails || "",
        contentVettingAgencies: parsedContent.contentVettingAgencies || ""
      };
    } catch (parseError) {
      console.error("Error parsing JSON from OpenAI response:", parseError);
      throw new Error("Failed to parse brand identity generation results");
    }
  } catch (error) {
    console.error("Error generating brand identity with Azure OpenAI:", error);
    throw new Error("Failed to generate brand identity");
  }
} 