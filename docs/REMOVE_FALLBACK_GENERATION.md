# Removing Fallback Generation in MixerAI 2.0a

This document outlines the changes required to remove all fallback content generation logic from the MixerAI 2.0a Azure OpenAI integration.

## Background

Currently, MixerAI 2.0a implements various fallback mechanisms when Azure OpenAI API calls fail:

1. Model fallback mapping (e.g., falling back to "gpt-35-turbo" when "gpt-4" is not available)
2. Template-based fallback content generation
3. Local string manipulation for basic translations

Per project requirements, we need to remove all fallback mechanisms and directly report API failures to users.

## Required Changes

### 1. Update `getModelName()` in `/src/lib/azure/openai.ts`

```typescript
// CURRENT IMPLEMENTATION
export function getModelName(): string {
  const configuredModel = process.env.AZURE_OPENAI_DEPLOYMENT || "";
  
  // If a fallback exists for this model, use it
  if (configuredModel && MODEL_FALLBACK_MAP[configuredModel]) {
    console.log(`Using fallback model '${MODEL_FALLBACK_MAP[configuredModel]}' instead of '${configuredModel}'`);
    return MODEL_FALLBACK_MAP[configuredModel];
  }
  
  // If no fallback exists but we have a model configured, use that
  if (configuredModel) {
    return configuredModel;
  }
  
  // Default fallback if nothing is configured
  return "gpt-35-turbo";
}

// NEW IMPLEMENTATION
export function getModelName(): string {
  const configuredModel = process.env.AZURE_OPENAI_DEPLOYMENT || "";
  
  if (!configuredModel) {
    console.warn("Azure OpenAI deployment name is not configured");
  }
  
  return configuredModel;
}
```

### 2. Remove `MODEL_FALLBACK_MAP` constant

Remove this entire map:

```typescript
// Remove this completely
export const MODEL_FALLBACK_MAP: Record<string, string> = {
  "gpt-4o": "gpt-35-turbo", // If gpt-4o isn't available, try gpt-35-turbo
  "gpt-4": "gpt-35-turbo",  // If gpt-4 isn't available, try gpt-35-turbo
  "gpt4": "gpt-35-turbo",   // Common typo/variation
  "gpt-4-turbo": "gpt-35-turbo" // Another possible name
};
```

### 3. Remove Fallback Functions

The following functions should be completely removed:

- `generateFallbackBrandIdentity`
- `generateFallbackMetadata`
- `enforceMetaTitleLimits`
- `enforceMetaDescriptionLimits`
- `generateFallbackAltText`
- `generateBasicTranslation`

### 4. Update `generateMetadata` Function

Remove retry logic and fallback handling:

```typescript
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
  
  const client = getAzureOpenAIClient();
  
  // Prepare the prompt
  let systemPrompt = `You are an expert SEO specialist who creates compelling, optimized metadata for webpages.
  You're analyzing content in ${brandLanguage} for users in ${brandCountry}.
  
  You MUST follow these strict requirements:
  1. Meta title MUST be EXACTLY between 50-60 characters
  2. Meta description MUST be EXACTLY between 150-160 characters
  
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
    
    Important:
    - Base your metadata primarily on this content. 
    - The meta title should accurately represent the page content and NOT include the brand or website name.
    - META TITLE MUST be EXACTLY 50-60 characters.
    - META DESCRIPTION MUST be EXACTLY 150-160 characters.`;
  } else {
    userPrompt += `\n\nNote: No page content was available for analysis. Please create metadata based on the URL structure. 
    
    Important:
    - The meta title should NOT include the brand or website name.
    - META TITLE MUST be EXACTLY 50-60 characters.
    - META DESCRIPTION MUST be EXACTLY 150-160 characters.`;
  }
  
  userPrompt += `\n\nCreate:
  1. A compelling meta title (MUST be EXACTLY 50-60 characters)
  2. An informative meta description (MUST be EXACTLY 150-160 characters)
  
  Format as JSON with metaTitle and metaDescription keys.`;
  
  // Make the API call
  const response = await client.chat.completions.create({
    model: getModelName(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
    temperature: 0.7
  });
  
  const content = response.choices[0]?.message?.content || "{}";
  
  const parsedResponse = JSON.parse(content);
  return {
    metaTitle: parsedResponse.metaTitle || "",
    metaDescription: parsedResponse.metaDescription || ""
  };
}
```

### 5. Update `generateAltText` Function

Remove fallback handling:

```typescript
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
  const client = getAzureOpenAIClient();
  
  // Prepare the prompt with best practices
  let systemPrompt = `You are an accessibility expert who creates clear and descriptive alt text for images.
  You're writing alt text in ${brandLanguage} for users in ${brandCountry}.
  
  Follow these best practices for creating alt text:
  
  ✅ DO:
  - Be descriptive and specific about essential image details
  - Keep it concise (under 125 characters)
  - Describe function if the image is a functional element
  - Include important text visible in the image
  - Consider the image's context on the page
  - Use keywords thoughtfully if they naturally fit
  
  ❌ AVOID:
  - Starting with "Image of..." or "Picture of..."
  - Overly vague descriptions
  - Keyword stuffing
  - Long descriptions (use adjacent text for complex images)
  - Decorative image descriptions (for purely decorative images)
  
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
  
  const userPrompt = `Generate accessible alt text for this image: ${imageUrl}
  
  Examples of good alt text:
  - "Woman holding a protest sign reading 'Equality for All' during a march in central London"
  - "Mountain range at sunset with orange-pink sky reflected in a still lake"
  - "Chef demonstrating how to knead bread dough on a flour-dusted countertop"
  
  Bad examples to avoid:
  - "Image of a nice scenery" (too vague)
  - "Picture showing a person at an event" (starts with 'picture' and is vague)
  - "Beautiful product photo of our newest spring collection item perfect for your wardrobe essential must-have fashion trend 2023" (keyword stuffed)
  
  Keep it under 125 characters and focus on the most important visual details. If there's text in the image, include it.
  
  Format your response as JSON with an altText key.`;
  
  // Make the API call  
  const response = await client.chat.completions.create({
    model: getModelName(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
    temperature: 0.7
  });
  
  const content = response.choices[0]?.message?.content || "{}";
  
  const parsedResponse = JSON.parse(content);
  return {
    altText: parsedResponse.altText || ""
  };
}
```

### 6. Update `transCreateContent` Function

Remove fallback handling:

```typescript
export async function transCreateContent(
  content: string,
  sourceLanguage: string = 'en',
  targetLanguage: string = 'es',
  targetCountry: string = 'ES'
): Promise<{
  transCreatedContent: string;
}> {
  const client = getAzureOpenAIClient();
  
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
  
  // Make the API call
  const response = await client.chat.completions.create({
    model: getModelName(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
    temperature: 0.7
  });
  
  const responseContent = response.choices[0]?.message?.content || "{}";
  
  const parsedResponse = JSON.parse(responseContent);
  return {
    transCreatedContent: parsedResponse.transCreatedContent || ""
  };
}
```

### 7. Update Error Handling in API Routes

All API routes should be updated to handle API errors directly and return appropriate error messages to the user interface. Example for alt-text-generator:

```typescript
export const POST = withAuthAndMonitoring(async (request: NextRequest, user) => {
  try {
    // ...existing code...
    
    // Generate alt text with brand context
    const generatedAltText = await generateAltText(
      data.imageUrl,
      brandLanguage,
      brandCountry,
      {
        brandIdentity,
        toneOfVoice,
        guardrails
      }
    );
    
    return NextResponse.json({
      success: true,
      userId: user.id,
      imageUrl: data.imageUrl,
      ...generatedAltText
    });
  } catch (error) {
    console.error('Error generating alt text:', error);
    
    // Provide specific error message when possible
    let errorMessage = 'Failed to generate alt text';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Azure OpenAI API key is missing or invalid';
      } else if (error.message.includes('endpoint')) {
        errorMessage = 'Azure OpenAI endpoint is missing or invalid';
      } else if (error.message.includes('DeploymentNotFound')) {
        errorMessage = 'Azure OpenAI deployment not found';
      } else {
        errorMessage = `Azure OpenAI error: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage
      },
      { status: 503 }
    );
  }
});
```

### 8. Update UI Components

All UI components need to be updated to properly display error messages from API failures:

```tsx
// Example for AltTextGeneratorPage
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation...
  
  setIsLoading(true);
  setResults(null);
  
  try {
    const response = await fetch('/api/tools/alt-text-generator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        brandId: selectedBrandId,
        brandLanguage: selectedBrand?.language || 'en',
        brandCountry: selectedBrand?.country || 'US',
        brandIdentity: selectedBrand?.brand_identity || '',
        toneOfVoice: selectedBrand?.tone_of_voice || '',
        guardrails: selectedBrand?.guardrails || '',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate alt text');
    }
    
    if (data.success) {
      setResults({
        altText: data.altText,
      });
      
      toast({
        title: 'Alt text generated',
        description: 'Accessible alt text has been generated successfully',
      });
    } else {
      throw new Error(data.error || 'Failed to generate alt text');
    }
  } catch (error) {
    toast({
      title: 'Azure OpenAI Error',
      description: error instanceof Error ? error.message : 'An unknown error occurred',
      variant: 'destructive',
    });
  } finally {
    setIsLoading(false);
  }
};
```

## Testing the Changes

After implementing these changes, test thoroughly to ensure:

1. All API errors are properly caught and reported to users
2. No fallback content is generated when API calls fail
3. UI displays appropriate error messages
4. System logs provide clear information about what went wrong

## Benefits of This Approach

1. Transparent error reporting to users
2. Clearer indication when the Azure OpenAI service is unavailable
3. Simpler codebase without complex fallback logic
4. Better alignment with the expectation that only Azure OpenAI should provide AI-generated content 