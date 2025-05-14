# Azure OpenAI Integration in MixerAI 2.0

This document outlines the technical details, implementation strategy, error handling, and available tools for the Azure OpenAI integration within MixerAI 2.0.

## Core Principle: No Fallback Generation

MixerAI 2.0 strictly prohibits the implementation of any fallback generation mechanisms for AI content. This is a critical requirement to maintain transparency with users and ensure content quality.

-   **No Template-Based Fallbacks**: The system must NEVER fall back to pre-written templates when AI generation fails.
-   **No Default Content**: No default values or pre-written content should be returned if the Azure OpenAI API call fails.
-   **No Local Generation**: No local language models or rule-based generation as alternatives to Azure OpenAI.
-   **No Silent Failures**: All API failures must be explicitly reported to the user with clear error messages.

**Reasoning**:
-   Maintains transparency with users about service availability.
-   Prevents misleading users with potentially low-quality template-based content.
-   Ensures consistent quality of all generated content.
-   Simplifies debugging by providing clear error states.

**Implementation**: API routes and generation functions must never include conditionals that substitute template-based or default content when API calls fail. When the Azure OpenAI service is unavailable, the application must return appropriate error codes, display clear error messages to the user, suggest trying again later, and log the specific error.

## Technical Setup

### Client Configuration

MixerAI 2.0 uses the Azure OpenAI service for all AI-powered content generation. Configuration is managed via environment variables:

```env
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your_deployment_name # This is your model deployment name, e.g., "gpt-4o"
```

The OpenAI client is initialized in `/src/lib/azure/openai.ts`. Example:

```typescript
// Simplified example. Actual implementation in src/lib/azure/openai.ts should be referenced.
import OpenAI from 'openai';

export const getAzureOpenAIClient = () => {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  
  if (!apiKey || !endpoint) {
    console.error("Azure OpenAI API key or endpoint is missing");
    throw new Error("Azure OpenAI API key or endpoint is missing. Service configuration error.");
  }
  
  return new OpenAI({
    apiKey: apiKey,
    baseURL: `${endpoint}/openai/deployments`, // Base URL for Azure OpenAI
    defaultQuery: { "api-version": "2023-09-01-preview" }, // Or your target API version
    defaultHeaders: { "api-key": apiKey }
  });
};

export function getModelName(): string {
  const configuredModel = process.env.AZURE_OPENAI_DEPLOYMENT || "";
  if (!configuredModel) {
    console.warn("Azure OpenAI deployment name (model) is not configured.");
  }
  return configuredModel; // The deployment name IS the model for Azure
}
```

**Note on Model Deployment:** The model name (e.g., "gpt-4o") is specified via the `AZURE_OPENAI_DEPLOYMENT` environment variable. This refers to your specific deployment of that model in your Azure OpenAI resource.

### API Endpoint Structure & Authentication

-   A consistent API call pattern is used across all OpenAI functions.
-   Direct `fetch` calls (or calls through the OpenAI SDK client as configured above) target specific deployment endpoints.
-   The endpoint URL format is typically: `https://your-resource-name.openai.azure.com`.
-   Authentication uses an `api-key` header (handled by the SDK).
-   API calls must specify the deployment name in the URL path (handled by the SDK if `baseURL` includes `/deployments`).
-   The API version (e.g., `2023-05-15` or newer) must be included as a query parameter (handled by SDK `defaultQuery`).

## API Error Handling Strategy

When Azure OpenAI API calls fail:

1.  The error is logged server-side for debugging (including request/response details where feasible).
2.  Specific, user-friendly error messages are returned to the client (e.g., "Azure OpenAI service is currently unavailable. Please try again later.", or more specific messages if the error cause can be determined).
3.  The UI displays these error notifications prominently (e.g., using toasts).
```typescript
    // Example UI error notification
    toast({
      title: 'Service Unavailable',
      description: 'Azure OpenAI service is currently unavailable. Please try again later.',
      variant: 'destructive',
    });
    ```
4.  HTTP status codes like `503 Service Unavailable` are used for API responses when appropriate.

### Common API Errors and Suggested Handling

| Error Message (Example)                     | Potential Cause                                        | Handling                                                                 |
| ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| "Azure OpenAI API key is missing"         | `AZURE_OPENAI_API_KEY` env var not set                 | UI: "Service configuration error. Please contact administrator."         |
| "Azure OpenAI endpoint is missing"        | `AZURE_OPENAI_ENDPOINT` env var not set                | UI: "Service configuration error. Please contact administrator."         |
| "Azure OpenAI deployment not found"       | `AZURE_OPENAI_DEPLOYMENT` env var incorrect/not deployed | UI: "AI service configuration error. Please contact support."            |
| (Actual error from Azure, e.g., RateLimit)  | Too many API requests / Azure issue                    | UI: "Service temporarily unavailable. Please try again in a few minutes." |
| (Actual error from Azure, e.g., Timeout)    | Connection to Azure OpenAI timed out                   | UI: "Service connection timeout. Please try again later."                |

## Brand Context Integration

All AI tools incorporate brand-specific context to ensure generated content aligns with the brand's identity and requirements. This typically includes:

1.  **Brand Language & Country**: For localization and cultural relevance.
2.  **Brand Identity**: Core personality and values.
3.  **Tone of Voice**: Communication style.
4.  **Guardrails**: Content guidelines and restrictions.

This data is fetched from the `brands` table if not explicitly provided in the API request. See `src/lib/azure/openai.ts` and individual tool API routes for specific implementations.

### Vetting Agency Alignment
Content can be validated against regulatory requirements based on the brand's country, using a predefined list of vetting agencies.

## AI-Powered Technical Tools

MixerAI 2.0 includes several technical tools leveraging Azure OpenAI:

### 1. Metadata Generator
-   **Purpose**: Generates SEO-optimised meta titles and descriptions from webpage URLs.
-   **Features**: Scrapes webpage content, analyzes with Azure OpenAI, creates language/country-specific metadata, adheres to length best practices (titles: 50-60 chars, descriptions: 150-160 chars).
-   **API**: `POST /api/tools/metadata-generator`
-   **UI**: `/dashboard/tools/metadata-generator`
-   **Note**: Exclusively supports URL-based generation.
-   **Prompt Snippet Idea**:
    ```
    System: You are an expert SEO specialist...
    User: Generate SEO-optimized meta title and description for this URL: {url} ... using this content: {pageContent} ... Format as JSON...
```

### 2. Alt Text Generator
-   **Purpose**: Creates accessible alt text for images.
-   **Features**: Analyzes images (via Azure OpenAI vision capabilities if available, or image URL context), generates concise/descriptive alt text (under 125 chars), supports multiple languages.
-   **API**: `POST /api/tools/alt-text-generator`
-   **UI**: `/dashboard/tools/alt-text-generator`
-   **Prompt Snippet Idea**:
    ```
    System: You are an accessibility expert... DOs and DON'Ts for alt text...
    User: Generate accessible alt text for this image: {imageUrl} ... Format as JSON...
```

### 3. Content Trans-Creator
-   **Purpose**: Trans-creates content across languages and cultures, beyond simple translation.
-   **Features**: Adapts content to be culturally relevant, preserves meaning while making it natural for native speakers, supports multiple language/country combinations, maintains brand voice.
-   **API**: `POST /api/tools/content-transcreator`
-   **UI**: `/dashboard/tools/content-transcreator`
-   **Prompt Snippet Idea**:
    ```
    System: You are an expert localisation specialist... trans-create from {sourceLang} to {targetLang} for audiences in {targetCountry}...
    User: Trans-create the following content: "{content}" ... Format as JSON...
    ```

## Azure OpenAI Integration for Specific Features

### Brand Identity Generation
-   Uses Azure OpenAI to analyze website URLs and generate comprehensive brand profiles (identity, tone of voice, guardrails, recommended vetting agencies, suggested brand color).
-   Supports multi-language generation based on brand settings, with explicit language instructions in prompts.
-   Includes regional content adaptation (country/language awareness).
-   Error handling includes input validation. Per core principles, no AI fallbacks; errors are reported.
-   **API Endpoints**: `/api/brands/identity`, `/api/scrape-url`.

### Workflow Description Auto-Generation
-   The feature to auto-generate workflow step descriptions utilizes Azure OpenAI.
-   Enhanced with simplified API configuration (direct fetch or SDK calls) and comprehensive error handling.

## Testing and Debugging Azure OpenAI Integration

MixerAI 2.0 provides tools and practices for testing and debugging:

### 1. Diagnostic Scripts (Examples)
-   **API Services Debug Script** (`scripts/debug-api-services.js`): Tests multiple AI-related endpoints.
-   **Brand Identity Test Script** (`scripts/test-brand-identity.js`): Specific test for `/api/brands/identity`.

### 2. Azure OpenAI Test API Endpoint
-   Located at `/api/test-azure-openai`.
-   Provides direct validation of Azure OpenAI connectivity, showing auth status, deployment details, and response times.

### 3. Dedicated Testing Page (`/openai-test`)

This page provides a UI for various testing scenarios:

-   **Quick Test Component**: Streamlined interface for quickly testing Azure OpenAI with simple prompts and advanced parameter controls (temperature, token limits). Shows response time and errors.
-   **System Status Panel**: May show real-time connection status for Azure OpenAI API, local templates (if fallback mode was ever considered), and Supabase DB.
-   **Environment Configuration Display**: Shows Azure OpenAI settings, API versions, feature flags, DB connection status.
-   **Advanced Testing Tools**:
    -   **Brand Identity Generation Test**: Test with customizable inputs.
    -   **Content Generation Test**: Test with various parameters.
    -   **Direct API Test**: Advanced tool for custom API endpoint testing with full request customization.
-   **Troubleshooting on this page**:
    1.  Check environment variables listed on the page.
    2.  Verify deployment name.
    3.  Use Direct API Test for different versions/endpoints.
    4.  Check browser console for errors.
-   **Example Prompts for Test Page**:
    ```
    Explain how Azure OpenAI works in 3 sentences.
    Write a short product description for a wireless headphone.
    Generate a list of 5 creative marketing taglines for a sustainable fashion brand.
    ```
-   **API Response Format on Test Page (Example)**:
    -   Success: `{ success: true, message: string, responseTime: number, modelUsed: string, modelResponse: object, tokenUsage: object, deploymentName: string, apiVersion: string }`
    -   Error: `{ success: false, error: string, errorDetails?: object }`

### 4. Enhanced Logging
-   Critical areas like brand identity generation, workflow description generation, and URL scraping have detailed server-side logging.
-   Logs include input parameters, API response status/content, and error details.

### 5. General Testing & Validation Process
-   Run diagnostic scripts to verify basic API functionality.
-   Test specific features (workflow generation, brand identity).
-   Examine logs for errors.
-   Verify correct passing of context parameters (brand, language, country).

## Security Considerations

-   API keys are stored as environment variables, never exposed to the client.
-   All AI-related API calls occur server-side.
-   User authentication is required before accessing AI tools.
-   Consider rate limiting on AI-intensive API routes to prevent abuse.

## Deployment Considerations

-   Ensure Azure OpenAI resources (and deployments) are configured correctly in Azure.
-   Set all required environment variables (`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`) in the hosting platform.
-   Verify API connectivity in the deployed environment before full release.
-   Monitor API usage, errors, and performance via logging and Azure dashboards.

## Response Format Standardization

Azure OpenAI API calls should be configured to return JSON objects to ensure consistent parsing and error handling:

```typescript
// Example in client.chat.completions.create call
response_format: { type: "json_object" }
```