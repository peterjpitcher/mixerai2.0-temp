# Content Generation API

This API endpoint provides AI-powered content generation through Azure OpenAI.

## Endpoint

```
POST /api/content/generate
```

## Description

Generates AI content for different content types, incorporating brand-specific information and user inputs to create tailored marketing content.

## Request Format

```json
{
  "contentType": "article | retailer_pdp | owned_pdp",
  "brand": {
    "name": "Brand Name",
    "brand_identity": "Brand identity description",
    "tone_of_voice": "Tone of voice guidelines",
    "guardrails": "Content guardrails"
  },
  "input": {
    "topic": "Main topic for articles",
    "keywords": ["keyword1", "keyword2"],
    "productName": "Product name for PDPs",
    "productDescription": "Product details for PDPs",
    "additionalInstructions": "Any additional guidance"
  }
}
```

### Required Fields

- `contentType`: The type of content to generate
  - `article`: Blog or article content
  - `retailer_pdp`: Product description for retailer websites
  - `owned_pdp`: Product description for brand's own website
  
- `brand`: Brand information
  - `name`: Brand name (required)
  - `brand_identity`: Brand identity/values (optional)
  - `tone_of_voice`: Brand's tone of voice (optional)
  - `guardrails`: Content restrictions or guidelines (optional)

- `input`: Generation inputs
  - For articles:
    - `topic`: The main topic (required)
    - `keywords`: Related keywords (optional)
  - For PDPs:
    - `productName`: Name of the product (required)
    - `productDescription`: Details about the product (optional)
  - For all types:
    - `additionalInstructions`: Any special instructions (optional)

## Response Format

```json
{
  "content": "Generated markdown content...",
  "metaTitle": "Generated SEO title",
  "metaDescription": "Generated SEO description"
}
```

## Error Responses

- `400 Bad Request`: Missing required fields
  ```json
  {
    "error": "Content type and brand name are required"
  }
  ```

- `400 Bad Request`: Missing content-type specific fields
  ```json
  {
    "error": "Topic is required for article content type"
  }
  ```

- `500 Internal Server Error`: Failed to generate content
  ```json
  {
    "error": "Failed to generate content"
  }
  ```

## Implementation Details

This endpoint:
1. Validates the request data to ensure required fields are present
2. Performs content-type specific validation
3. Calls the Azure OpenAI service through the `generateContent` function
4. Returns the generated content with metadata

## Usage Example

```javascript
const response = await fetch('/api/content/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contentType: 'article',
    brand: {
      name: 'EcoFriendly Co.',
      brand_identity: 'Committed to sustainability and eco-friendly products.',
      tone_of_voice: 'Friendly, educational, and inspiring.'
    },
    input: {
      topic: 'Benefits of Eco-Friendly Packaging',
      keywords: ['sustainability', 'recycling', 'reduced waste'],
      additionalInstructions: 'Include some statistics about plastic waste.'
    }
  })
});

const data = await response.json();
```

## Related Files

- Implementation: `src/app/api/content/generate/route.ts`
- Azure OpenAI client: `src/lib/azure/openai.ts`
- Content storage API: `src/app/api/content/route.ts`
- Frontend component: `src/components/content/content-generator-form.tsx`

## Documentation

For more detailed documentation about the content generation feature, see [/docs/CONTENT_GENERATION.md](/docs/CONTENT_GENERATION.md). 