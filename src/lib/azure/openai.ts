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
  
  console.log(`Initializing Azure OpenAI client with endpoint: ${endpoint}`);
  
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
 * @returns An object with brand identity, tone of voice, guardrails and recommended agencies
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
  try {
    console.log(`Generating brand identity for ${brandName} from ${urls.length} URLs`);
    
    // Debug environment variables
    console.log("Environment check:");
    console.log("- NODE_ENV:", process.env.NODE_ENV);
    console.log("- AZURE_OPENAI_API_KEY exists:", !!process.env.AZURE_OPENAI_API_KEY);
    console.log("- AZURE_OPENAI_ENDPOINT exists:", !!process.env.AZURE_OPENAI_ENDPOINT);
    console.log("- AZURE_OPENAI_DEPLOYMENT:", process.env.AZURE_OPENAI_DEPLOYMENT);
    console.log("- USE_LOCAL_GENERATION:", process.env.USE_LOCAL_GENERATION || 'false');
    
    // Check if local generation is forced via env var
    if (process.env.USE_LOCAL_GENERATION === 'true') {
      console.log("Using fallback brand identity generation due to USE_LOCAL_GENERATION=true");
      return generateFallbackBrandIdentity(brandName, urls);
    }
    
    // Only use fallback if credentials are missing
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
      console.log("Using fallback brand identity generation due to missing credentials");
      return generateFallbackBrandIdentity(brandName, urls);
    }
    
    try {
      console.log("Attempting to initialize Azure OpenAI client");
      const client = getAzureOpenAIClient();
      console.log("Successfully initialized Azure OpenAI client");
      
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
      console.log("Sending request to Azure OpenAI API");
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-35-turbo";
      console.log(`Using deployment: ${deploymentName}`);
      
      try {
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
        
        let parsedResponse;
        
        try {
          parsedResponse = JSON.parse(responseContent);
          
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
          console.error("Failed to parse API response:", error);
          console.log("Raw response that failed to parse:", responseContent);
          return generateFallbackBrandIdentity(brandName, urls);
        }
      } catch (openAIError: any) {
        console.error("Error calling Azure OpenAI API:", openAIError.message);
        
        // If the deployment doesn't exist, try with a different model
        if (openAIError.message && openAIError.message.includes("API deployment for this resource does not exist")) {
          console.log("Deployment not found, trying fallback deployment 'gpt-35-turbo'");
          try {
            const fallbackCompletion = await client.chat.completions.create({
              model: "gpt-35-turbo",  // Use a common fallback model name
              messages: [
                { role: "system", content: "You are a brand strategy expert that helps analyze and create detailed brand identities." },
                { role: "user", content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 1000,
              response_format: { type: "json_object" }
            });
            
            console.log("Received response from fallback Azure OpenAI model");
            const fallbackResponseContent = fallbackCompletion.choices[0]?.message?.content || "{}";
            console.log("Raw fallback API response:", fallbackResponseContent.substring(0, 100) + "...");
            
            try {
              const parsedResponse = JSON.parse(fallbackResponseContent);
              
              // Ensure guardrails are formatted properly
              if (Array.isArray(parsedResponse.guardrails)) {
                parsedResponse.guardrails = parsedResponse.guardrails.map((item: string) => `- ${item}`).join('\n');
              }
              
              console.log("Successfully parsed response from fallback model");
              return {
                brandIdentity: parsedResponse.brandIdentity || "",
                toneOfVoice: parsedResponse.toneOfVoice || "",
                guardrails: parsedResponse.guardrails || "",
                suggestedAgencies: parsedResponse.suggestedAgencies || [],
                brandColor: parsedResponse.brandColor || ""
              };
            } catch (parseError) {
              console.error("Failed to parse fallback API response:", parseError);
              return generateFallbackBrandIdentity(brandName, urls);
            }
          } catch (fallbackError: any) {
            console.error("Fallback model also failed:", fallbackError.message);
            return generateFallbackBrandIdentity(brandName, urls);
          }
        } else {
          // For other errors, fall back to template generation
          return generateFallbackBrandIdentity(brandName, urls);
        }
      }
    } catch (apiError) {
      console.error("Azure OpenAI API call failed:", apiError);
      console.log("Falling back to template generation after API error");
      return generateFallbackBrandIdentity(brandName, urls);
    }
  } catch (error) {
    console.error("Error in generateBrandIdentityFromUrls:", error);
    // When an error occurs, fall back to the template generation
    console.log("Falling back to template generation after error");
    return generateFallbackBrandIdentity(brandName, urls);
  }
}

/**
 * Generates a fallback brand identity when Azure OpenAI is not available
 * @returns An object with brand identity, tone of voice, guardrails and vetting agencies
 */
function generateFallbackBrandIdentity(brandName: string, urls: string[]): {
  brandIdentity: string;
  toneOfVoice: string;
  guardrails: string;
  suggestedAgencies: Array<{name: string, description: string, priority: 'high' | 'medium' | 'low'}>;
  brandColor: string;
} {
  console.log("⚠️ Using fallback brand identity generation for:", brandName);
  
  // Extract potential industry/category from URLs
  let industry = "general";
  if (urls.some(url => url.includes("food") || url.includes("recipe") || url.includes("cook") || url.includes("baking"))) {
    industry = "food";
  } else if (urls.some(url => url.includes("tech") || url.includes("software") || url.includes("digital"))) {
    industry = "technology";
  } else if (urls.some(url => url.includes("fashion") || url.includes("cloth") || url.includes("wear"))) {
    industry = "fashion";
  } else if (urls.some(url => url.includes("health") || url.includes("wellness") || url.includes("fitness"))) {
    industry = "health";
  }
  
  console.log("Detected industry for fallback content:", industry);
  
  // Brand identity templates as plain text, not Markdown
  const templates: Record<string, {
    identity: string;
    tone: string;
    guardrails: string[];
    agencies: Array<{name: string, description: string, priority: 'high' | 'medium' | 'low'}>;
    color: string;
  }> = {
    food: {
      identity: `${brandName} projects a warm, inviting, and trustworthy personality. The brand values quality ingredients, culinary tradition, and creating memorable food experiences. It emphasizes authenticity, care, and attention to detail in all its offerings.\n\nPrimary audience includes home cooks of all skill levels, food enthusiasts, and families looking for reliable, delicious recipes and food products. Secondary audiences include culinary professionals seeking inspiration and quality ingredients.\n\nKey messaging themes include quality ingredients lead to exceptional results, making cooking accessible and enjoyable for everyone, bringing people together through food, and balancing tradition with modern culinary innovation.`,
      
      tone: `Warm, encouraging, and knowledgeable. The tone should be conversational and friendly, but also authoritative on food topics. Use descriptive, sensory language when discussing food, and maintain a helpful, guiding approach when providing instructions or advice.`,
      
      guardrails: [
        "Always prioritize food safety - never suggest undercooked ingredients that could cause illness",
        "Respect dietary restrictions and allergies with clear labeling and alternatives",
        "Ensure recipes are tested and accurate, with clear measurements and instructions",
        "Avoid negative language about food choices or eating habits",
        "Never make unsubstantiated health claims about recipes or ingredients"
      ],
      
      agencies: [
        { name: "FSA", description: "Food Standards Agency - Responsible for food safety and food hygiene across the UK", priority: "high" },
        { name: "ASA", description: "Advertising Standards Authority - Regulates advertising across all media in the UK", priority: "high" },
        { name: "DEFRA", description: "Department for Environment, Food and Rural Affairs - Oversees food production standards", priority: "medium" },
        { name: "BRC", description: "British Retail Consortium - Sets standards for food safety and quality", priority: "low" }
      ],
      color: "#E57373" // Soft red color for food
    },
    
    technology: {
      identity: `${brandName} embodies innovation, reliability, and forward-thinking vision. The brand values cutting-edge technology, user-centered design, and creating solutions that meaningfully improve people's lives and work.\n\nTarget audience includes tech enthusiasts, early adopters, business professionals seeking efficiency through technology, and everyday consumers looking for intuitive digital solutions. The audience appreciates both functionality and aesthetic design.\n\nKey messaging themes focus on simplifying complexity through smart design, empowering users through technology, continuous innovation and improvement, and security and reliability in a digital world.`,
      
      tone: `Clear, confident, and knowledgeable. The tone should balance technical expertise with accessibility, avoiding unnecessary jargon. Maintain an optimistic outlook about technological possibilities while being honest about capabilities and limitations.`,
      
      guardrails: [
        "Never overpromise on security or privacy features",
        "Maintain transparency about data collection and usage",
        "Avoid technical language that excludes non-expert users",
        "Don't make specific performance claims without evidence",
        "Be inclusive in all language and visual representations"
      ],
      
      agencies: [
        { name: "ICO", description: "Information Commissioner's Office - UK's independent authority set up to uphold information rights", priority: "high" },
        { name: "ASA", description: "Advertising Standards Authority - Regulates advertising across all media in the UK", priority: "high" },
        { name: "CMA", description: "Competition and Markets Authority - Promotes competition and prevents anti-competitive activities", priority: "medium" },
        { name: "BSI", description: "British Standards Institution - Provides technical standards for products and services", priority: "low" }
      ],
      color: "#2196F3" // Blue for technology
    },
    
    fashion: {
      identity: `${brandName} represents elegance, creativity, and contemporary style. The brand values quality craftsmanship, sustainable practices, and enabling personal expression through fashion.\n\nTarget audience includes style-conscious individuals who appreciate quality and design. They seek fashion that reflects their personal identity and values, and are willing to invest in pieces that will last.\n\nKey messaging themes emphasize quality and craftsmanship in every detail, fashion as personal expression, timeless style with modern sensibility, and responsible production and consumption.`,
      
      tone: `Sophisticated, inspiring, and confident. The tone should be aspirational yet accessible, using rich, descriptive language when discussing products. Balance trend awareness with an emphasis on enduring style.`,
      
      guardrails: [
        "Ensure all claims about sustainability are specific and verifiable",
        "Maintain diversity and inclusivity in all marketing materials",
        "Avoid language that promotes unhealthy body image",
        "Be transparent about manufacturing processes and materials",
        "Don't make claims about competitors' products or practices"
      ],
      
      agencies: [
        { name: "ASA", description: "Advertising Standards Authority - Regulates advertising across all media in the UK", priority: "high" },
        { name: "CMA", description: "Competition and Markets Authority - Promotes competition and prevents anti-competitive activities", priority: "medium" },
        { name: "Trading Standards", description: "Enforces consumer protection legislation and ensures product safety", priority: "medium" },
        { name: "BRC", description: "British Retail Consortium - Sets standards for retailers", priority: "low" }
      ],
      color: "#9C27B0" // Purple for fashion
    },
    
    health: {
      identity: `${brandName} embodies vitality, balance, and holistic wellbeing. The brand values scientific understanding, natural approaches to health, and empowering individuals to take control of their wellness journey.\n\nTarget audience includes health-conscious individuals seeking to improve or maintain their wellbeing, fitness enthusiasts, and those looking for natural solutions to health concerns. The audience spans multiple age groups but shares a proactive approach to health.\n\nKey messaging themes promote a balanced approach to health and wellness, evidence-based natural solutions, preventative care and lasting vitality, and personal empowerment through health knowledge.`,
      
      tone: `Nurturing, knowledgeable, and encouraging. The tone should be informative without being clinical, and motivational without being pushy. Use clear, straightforward language when discussing health concepts, and maintain an empathetic approach to wellness challenges.`,
      
      guardrails: [
        "Never make specific medical claims without scientific evidence",
        "Avoid promising specific results or outcomes from products or practices",
        "Be inclusive of different body types, abilities and health journeys",
        "Use qualified experts for health-related content",
        "Always include appropriate disclaimers for health content"
      ],
      
      agencies: [
        { name: "MHRA", description: "Medicines and Healthcare products Regulatory Agency - Regulates medicines, medical devices, and blood components", priority: "high" },
        { name: "ASA", description: "Advertising Standards Authority - Regulates advertising across all media in the UK", priority: "high" },
        { name: "NICE", description: "National Institute for Health and Care Excellence - Provides national guidance and advice to improve health and social care", priority: "medium" },
        { name: "Trading Standards", description: "Enforces consumer protection legislation and ensures product safety", priority: "low" }
      ],
      color: "#4CAF50" // Green for health
    },
    
    general: {
      identity: `${brandName} projects a professional, reliable, and customer-focused personality. The brand values quality, innovation, and creating exceptional experiences for its customers. It emphasizes integrity, excellence, and adaptability in an evolving marketplace.\n\nPrimary audience includes discerning consumers who value quality and service. They appreciate attention to detail and are willing to invest in products or services that deliver consistent value and reliability.\n\nKey messaging themes include unwavering commitment to quality, innovation driven by customer needs, building lasting relationships, and delivering on promises consistently.`,
      
      tone: `Clear, confident, and approachable. The tone should be professional without being impersonal, and authoritative without being condescending. Maintain a balance between showcasing expertise and being accessible to a wide audience.`,
      
      guardrails: [
        "Maintain transparency in all communications and practices",
        "Avoid making unsubstantiated claims about products or services",
        "Use inclusive language that respects diversity",
        "Don't disparage competitors or alternative solutions",
        "Ensure all claims are accurate and can be verified"
      ],
      
      agencies: [
        { name: "ASA", description: "Advertising Standards Authority - Regulates advertising across all media in the UK", priority: "high" },
        { name: "CMA", description: "Competition and Markets Authority - Promotes competition and prevents anti-competitive activities", priority: "medium" },
        { name: "Trading Standards", description: "Enforces consumer protection legislation and ensures product safety", priority: "medium" },
        { name: "ICO", description: "Information Commissioner's Office - UK's independent authority set up to uphold information rights", priority: "low" }
      ],
      color: "#607D8B" // Blue grey for general
    }
  };
  
  const templateData = templates[industry];
  
  // Format the response to ensure it has all required fields in the correct format
  const result = {
    brandIdentity: templateData.identity,
    toneOfVoice: templateData.tone,
    guardrails: templateData.guardrails.map(item => `- ${item}`).join('\n'),
    suggestedAgencies: templateData.agencies.map(agency => ({
      name: agency.name,
      description: agency.description,
      priority: agency.priority as 'high' | 'medium' | 'low'
    })),
    brandColor: templateData.color
  };
  
  console.log("Generated fallback brand identity with values:", {
    brandIdentityLength: result.brandIdentity.length,
    toneOfVoiceLength: result.toneOfVoice.length, 
    guardrailsLength: result.guardrails.length,
    agenciesCount: result.suggestedAgencies.length,
    brandColor: result.brandColor
  });
  
  return result;
} 