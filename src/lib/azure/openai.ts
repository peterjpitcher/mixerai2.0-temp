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