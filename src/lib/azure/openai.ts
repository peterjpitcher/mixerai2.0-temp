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

/**
 * Generates brand identity from a list of URLs
 * @param brandName The name of the brand
 * @param urls Array of URLs to analyze for brand identity
 * @returns A generated brand identity description
 */
export async function generateBrandIdentityFromUrls(
  brandName: string,
  urls: string[]
): Promise<string> {
  try {
    console.log(`Generating brand identity for ${brandName} from ${urls.length} URLs`);
    
    // For development and testing, always use the fallback generator
    // In production, this would check for valid credentials
    if (process.env.NODE_ENV === 'development' || !process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      console.log("Using fallback brand identity generation in development mode or missing credentials");
      return generateFallbackBrandIdentity(brandName, urls);
    }
    
    const client = getAzureOpenAIClient();
    
    // Prepare the prompt
    const prompt = `
    Please analyze the following URLs related to the brand "${brandName}":
    ${urls.map(url => `- ${url}`).join('\n')}
    
    Based on these URLs, generate a comprehensive brand identity that includes:
    1. Brand personality and values
    2. Target audience
    3. Key messaging themes
    4. Tone of voice recommendations
    
    Provide a well-structured and detailed response that captures the essence of the brand based on the information available from these URLs.
    `;
    
    // Make the API call
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-35-turbo",
      messages: [
        { role: "system", content: "You are a brand strategy expert that helps analyze and create detailed brand identities." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    const response = completion.choices[0]?.message?.content || "";
    return response;
  } catch (error) {
    console.error("Error generating brand identity:", error);
    // When an error occurs, fall back to the template generation
    console.log("Falling back to template generation after error");
    return generateFallbackBrandIdentity(brandName, urls);
  }
}

/**
 * Generates a fallback brand identity when Azure OpenAI is not available
 */
function generateFallbackBrandIdentity(brandName: string, urls: string[]): string {
  // Extract potential industry/category from URLs
  let industry = "general";
  if (urls.some(url => url.includes("food") || url.includes("recipe") || url.includes("cook"))) {
    industry = "food";
  } else if (urls.some(url => url.includes("tech") || url.includes("software") || url.includes("digital"))) {
    industry = "technology";
  } else if (urls.some(url => url.includes("fashion") || url.includes("cloth") || url.includes("wear"))) {
    industry = "fashion";
  } else if (urls.some(url => url.includes("health") || url.includes("wellness") || url.includes("fitness"))) {
    industry = "health";
  }
  
  const templates: Record<string, string> = {
    food: `
      # ${brandName} Brand Identity
      
      ## Brand Personality and Values
      ${brandName} projects a warm, inviting, and trustworthy personality. The brand values quality ingredients, culinary tradition, and creating memorable food experiences. It emphasizes authenticity, care, and attention to detail in all its offerings.
      
      ## Target Audience
      Primary audience includes home cooks of all skill levels, food enthusiasts, and families looking for reliable, delicious recipes and food products. Secondary audiences include culinary professionals seeking inspiration and quality ingredients.
      
      ## Key Messaging Themes
      - Quality ingredients lead to exceptional results
      - Making cooking accessible and enjoyable for everyone
      - Bringing people together through food
      - Balancing tradition with modern culinary innovation
      
      ## Tone of Voice Recommendations
      ${brandName} should communicate in a warm, encouraging, and knowledgeable voice. The tone should be conversational and friendly, but also authoritative on food topics. Use descriptive, sensory language when discussing food, and maintain a helpful, guiding approach when providing instructions or advice.
    `,
    technology: `
      # ${brandName} Brand Identity
      
      ## Brand Personality and Values
      ${brandName} embodies innovation, reliability, and forward-thinking vision. The brand values cutting-edge technology, user-centered design, and creating solutions that meaningfully improve people's lives and work.
      
      ## Target Audience
      Tech enthusiasts, early adopters, business professionals seeking efficiency through technology, and everyday consumers looking for intuitive digital solutions. The audience appreciates both functionality and aesthetic design.
      
      ## Key Messaging Themes
      - Simplifying complexity through smart design
      - Empowering users through technology
      - Continuous innovation and improvement
      - Security and reliability in a digital world
      
      ## Tone of Voice Recommendations
      ${brandName} should communicate in a clear, confident, and knowledgeable voice. The tone should balance technical expertise with accessibility, avoiding unnecessary jargon. Maintain an optimistic outlook about technological possibilities while being honest about capabilities and limitations.
    `,
    fashion: `
      # ${brandName} Brand Identity
      
      ## Brand Personality and Values
      ${brandName} represents elegance, creativity, and contemporary style. The brand values quality craftsmanship, sustainable practices, and enabling personal expression through fashion.
      
      ## Target Audience
      Style-conscious individuals who appreciate quality and design. They seek fashion that reflects their personal identity and values, and are willing to invest in pieces that will last.
      
      ## Key Messaging Themes
      - Quality and craftsmanship in every detail
      - Fashion as personal expression
      - Timeless style with modern sensibility
      - Responsible production and consumption
      
      ## Tone of Voice Recommendations
      ${brandName} should communicate in a sophisticated, inspiring, and confident voice. The tone should be aspirational yet accessible, using rich, descriptive language when discussing products. Balance trend awareness with an emphasis on enduring style.
    `,
    health: `
      # ${brandName} Brand Identity
      
      ## Brand Personality and Values
      ${brandName} embodies vitality, balance, and holistic wellbeing. The brand values scientific understanding, natural approaches to health, and empowering individuals to take control of their wellness journey.
      
      ## Target Audience
      Health-conscious individuals seeking to improve or maintain their wellbeing, fitness enthusiasts, and those looking for natural solutions to health concerns. The audience spans multiple age groups but shares a proactive approach to health.
      
      ## Key Messaging Themes
      - Balanced approach to health and wellness
      - Evidence-based natural solutions
      - Preventative care and lasting vitality
      - Personal empowerment through health knowledge
      
      ## Tone of Voice Recommendations
      ${brandName} should communicate in a nurturing, knowledgeable, and encouraging voice. The tone should be informative without being clinical, and motivational without being pushy. Use clear, straightforward language when discussing health concepts, and maintain an empathetic approach to wellness challenges.
    `,
    general: `
      # ${brandName} Brand Identity
      
      ## Brand Personality and Values
      ${brandName} projects a professional, reliable, and customer-focused personality. The brand values quality, innovation, and creating exceptional experiences for its customers. It emphasizes integrity, excellence, and adaptability in an evolving marketplace.
      
      ## Target Audience
      Primary audience includes discerning consumers who value quality and service. They appreciate attention to detail and are willing to invest in products or services that deliver consistent value and reliability.
      
      ## Key Messaging Themes
      - Unwavering commitment to quality
      - Innovation driven by customer needs
      - Building lasting relationships
      - Delivering on promises consistently
      
      ## Tone of Voice Recommendations
      ${brandName} should communicate in a clear, confident, and approachable voice. The tone should be professional without being impersonal, and authoritative without being condescending. Maintain a balance between showcasing expertise and being accessible to a wide audience.
    `,
  };
  
  return templates[industry];
} 