# Azure OpenAI Integration in MixerAI 2.0a

This document outlines the technical details, implementation strategy, and error handling for the Azure OpenAI integration within MixerAI 2.0a.

## Technical Setup

### Client Configuration

MixerAI 2.0a uses the Azure OpenAI service for all AI-powered content generation. The system is configured via environment variables:

```
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=deployment_name
```

The OpenAI client is initialized in `/src/lib/azure/openai.ts`:

```typescript
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
```

### Model Configuration

Model is specified through the `AZURE_OPENAI_DEPLOYMENT` environment variable. If the deployment name is not available, the system reports the error directly to the UI.

```typescript
export function getModelName(): string {
  const configuredModel = process.env.AZURE_OPENAI_DEPLOYMENT || "";
  
  // If nothing is configured, default to an expected error
  if (!configuredModel) {
    return "deployment_not_found";
  }
  
  return configuredModel;
}
```

## API Error Handling Strategy

MixerAI 2.0a handles API failures with direct transparency to the user. When the Azure OpenAI API fails:

1. The error is logged to the console for debugging
2. Specific error messages are returned to the client (e.g., "Azure OpenAI API key is missing")
3. The UI displays appropriate error notifications to the user
4. No fallback content generation is attempted

Example error reporting in API routes:

```typescript
try {
  // API call here
} catch (error) {
  console.error("Error calling Azure OpenAI:", error);
  return NextResponse.json(
    { 
      success: false,
      error: 'Azure OpenAI service is currently unavailable. Please try again later.' 
    },
    { status: 503 }
  );
}
```

## NO FALLBACK GENERATION

MixerAI 2.0a strictly prohibits the implementation of fallback generation mechanisms. This is a critical requirement:

### Prohibited Practices
- **No Template-Based Fallbacks**: The system must NEVER fall back to pre-written templates when AI generation fails
- **No Default Content**: No default values or pre-written content should be returned if the Azure OpenAI API call fails
- **No Local Generation**: No local language models or rule-based generation as alternatives to Azure OpenAI
- **No Silent Failures**: All API failures must be explicitly reported to the user with clear error messages

### Reasoning
- Maintains transparency with users about service availability
- Prevents misleading users with potentially low-quality template-based content
- Ensures consistent quality of all generated content
- Simplifies debugging by providing clear error states

### Implementation
API routes and generation functions must never include conditionals that substitute template-based or default content when API calls fail. When the Azure OpenAI service is unavailable, the application must:

1. Return appropriate error codes
2. Display clear error messages to the user
3. Suggest that the user try again later
4. Log the specific error for debugging purposes

## Brand Context Integration

All AI tools in MixerAI 2.0a incorporate brand-specific context to ensure generated content aligns with the brand's identity and requirements.

### Brand Parameters Included in Every Request

Each AI generation includes:

1. **Brand Language & Country**: Used for localization and cultural context
   ```typescript
   brandLanguage = brandLanguage || brandData.language || 'en';  
   brandCountry = brandCountry || brandData.country || 'US';
   ```

2. **Brand Identity**: The core personality and values of the brand
   ```typescript
   brandIdentity = brandIdentity || brandData.brand_identity || '';
   ```

3. **Tone of Voice**: How the brand communicates with its audience
   ```typescript
   toneOfVoice = toneOfVoice || brandData.tone_of_voice || '';
   ```

4. **Guardrails**: Specific content guidelines and restrictions
   ```typescript
   guardrails = guardrails || brandData.guardrails || '';
   ```

### Brand Data Retrieval

All AI tools retrieve brand data from the database if not explicitly provided:

```typescript
// Example from metadata generator API
if (!brandLanguage || !brandCountry || !brandIdentity || !toneOfVoice || !guardrails) {
  // Fetch brand details from the database
  const supabase = createSupabaseAdminClient();
  const { data: brandData, error: brandError } = await supabase
    .from('brands')
    .select('name, country, language, brand_identity, tone_of_voice, guardrails')
    .eq('id', data.brandId)
    .single();
    
  if (brandError) {
    console.error('Error fetching brand data:', brandError);
    return NextResponse.json(
      { error: 'Failed to fetch brand information' },
      { status: 500 }
    );
  }
  
  // Use brand data from database or defaults
  brandLanguage = brandLanguage || brandData.language || 'en';
  brandCountry = brandCountry || brandData.country || 'US';
  brandIdentity = brandIdentity || brandData.brand_identity || '';
  toneOfVoice = toneOfVoice || brandData.tone_of_voice || '';
  guardrails = guardrails || brandData.guardrails || '';
}
```

### Vetting Agency Alignment

Content is validated against regulatory requirements based on the brand's country. Each country has specific vetting agencies:

```typescript
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
  // Additional countries defined in openai.ts
};
```

## Content Generation Tools

MixerAI 2.0a includes three primary AI-powered tools:

### 1. Metadata Generator

Generates SEO-optimized meta titles and descriptions:

- Enforces strict character limits (50-60 for titles, 150-160 for descriptions)
- Incorporates brand identity, tone of voice, and guardrails
- Reports API failures directly to the user interface

Prompt Structure:
```typescript
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
```

### 2. Alt Text Generator

Creates accessible image descriptions:

- Follows accessibility best practices (no "image of...", concise descriptions)
- Contains brand context for consistent voice
- Limited to 125 characters for optimal screen reader experience
- Reports API failures directly to the user interface

Prompt Structure:
```typescript
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
```

### 3. Content Trans-Creator

Adapts content between languages with cultural sensitivity:

- Goes beyond direct translation to localize for target markets
- Adjusts idioms, expressions, and cultural references
- Reports API failures directly to the user interface

Prompt Structure:
```typescript
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
```

## Error Messaging in UI

When Azure OpenAI API calls fail, the following UI patterns are used:

```typescript
// Example UI error notification
toast({
  title: 'Service Unavailable',
  description: 'Azure OpenAI service is currently unavailable. Please try again later.',
  variant: 'destructive',
});
```

## Testing and Debugging

The system includes logging throughout the OpenAI integration to help identify issues:

```typescript
// Log format for tracking API calls and errors
console.log(`Generating ${contentType} for ${brandName}`);
console.log("Environment check:");
console.log("- AZURE_OPENAI_API_KEY exists:", !!process.env.AZURE_OPENAI_API_KEY);
console.log("- AZURE_OPENAI_ENDPOINT exists:", !!process.env.AZURE_OPENAI_ENDPOINT);
console.log("- AZURE_OPENAI_DEPLOYMENT:", process.env.AZURE_OPENAI_DEPLOYMENT);
```

## Security Considerations

- API keys are stored as environment variables, never exposed to the client
- All API calls occur server-side within API routes
- User authentication is required before accessing AI tools
- Rate limiting is applied to prevent abuse

## Deployment Considerations

When deploying MixerAI 2.0a:

1. Configure Azure OpenAI resources in advance
2. Set environment variables in the hosting platform (Vercel, etc.)
3. Verify API connectivity before releasing to production
4. Monitor API usage and errors via logging

## Common API Errors and Handling

| Error | Cause | Handling |
|-------|-------|----------|
| "Azure OpenAI API key is missing" | AZURE_OPENAI_API_KEY environment variable not set | UI shows "Service configuration error. Please contact administrator." |
| "Azure OpenAI endpoint is missing" | AZURE_OPENAI_ENDPOINT environment variable not set | UI shows "Service configuration error. Please contact administrator." |
| "DeploymentNotFound" | The specified model deployment doesn't exist | UI shows "AI service configuration error. Please contact support." |
| Rate limit exceeded | Too many API requests in a short time | UI shows "Service temporarily unavailable. Please try again in a few minutes." |
| Network timeout | Connection to Azure OpenAI service timed out | UI shows "Service connection timeout. Please try again later." |

## Response Format Standardization

All Azure OpenAI API responses are formatted as JSON and validated:

```typescript
response_format: { type: "json_object" }
```

This ensures consistent parsing and error handling across all AI tools. 