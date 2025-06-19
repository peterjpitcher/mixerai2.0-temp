# Content Generation API

This API endpoint provides AI-powered content generation through Azure OpenAI, driven by predefined content templates.

## Endpoint

```
POST /api/content/generate
```

## Description

Generates AI content based on a specified content template and user-provided input for its fields. It incorporates brand-specific information to create tailored marketing content.

## Request Format

```json
{
  "brand": {
    "name": "Brand Name",
    "brand_identity": "Brand identity description",
    "tone_of_voice": "Tone of voice guidelines",
    "guardrails": "Content guardrails"
  },
  "template": {
    "id": "template-uuid-123",
    "name": "Basic Article Template",
    "inputFields": [
      {
        "id": "title",
        "name": "Title",
        "type": "shortText",
        "value": "The Future of Renewable Energy"
      },
      {
        "id": "keywords",
        "name": "Keywords",
        "type": "tags",
        "value": "solar, wind, sustainability"
      }
    ],
    "outputFields": [
      {
        "id": "articleBody",
        "name": "Article Body",
        "type": "richText",
        "aiPrompt": "Generate a 500-word article about {{title}} including keywords: {{keywords}}."
      },
      {
        "id": "metaDescription",
        "name": "Meta Description",
        "type": "plainText",
        "aiPrompt": "Generate a meta description for an article titled {{title}}."
      }
    ]
  },
  "input": {
    "additionalInstructions": "Ensure the tone is optimistic.",
    "templateFields": {
      "title": "A New Dawn for Renewable Energy"
    }
  }
}
```

### Required Fields

- `brand`: Brand information
  - `name`: Brand name (required)
- `template`: The content template object (required if not providing `input.templateId` in a simplified flow)
  - `id`: Unique ID of the template.
  - `name`: Name of the template.
  - `inputFields`: Array of input field definitions from the template, each including its `id`, `name`, `type`, and the `value` provided by the user.
  - `outputFields`: Array of output field definitions from the template, used to structure the AI's response.

It's also possible to send a simplified request if the template structure is already known to the backend or fetched by `templateId`:
```json
{
  "brand": { ... },
  "input": {
    "templateId": "template-uuid-123",
    "templateFields": {
      "title": "The Future of Renewable Energy",
      "keywords": "solar, wind, sustainability"
    },
    "additionalInstructions": "Ensure the tone is optimistic."
  }
}
```
In this simplified flow, `input.templateId` is required.

## Response Format

The response will be a JSON object where keys correspond to the `id` of each `outputField` defined in the template. The values will be the AI-generated content for those fields.

```json
{
  "success": true,
  "userId": "user-uuid-abc",
  "articleBody": "Generated rich text content for the article body...",
  "metaDescription": "Generated SEO meta description..."
}
```

## Error Responses

- `400 Bad Request`: Missing required fields
  ```json
  {
    "success": false,
    "error": "Brand name is required"
  }
  ```
  ```json
  {
    "success": false,
    "error": "Template ID is required for content generation."
  }
  ```

- `500 Internal Server Error`: Failed to generate content
  ```json
  {
    "success": false,
    "error": "Failed to generate content from template"
  }
  ```

## Implementation Details

This endpoint:
1. Validates the request data (e.g., presence of brand name and template information).
2. Calls the Azure OpenAI service through the `generateContentFromTemplate` function, passing the brand context and the detailed template structure with user inputs.
3. Returns a structured JSON object with generated content for each output field defined in the template.

## Usage Example

```javascript
const response = await fetch('/api/content/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    brand: {
      name: 'GreenFuture Inc.',
      brand_identity: 'Pioneering sustainable solutions for a better tomorrow.',
      tone_of_voice: 'Informative, hopeful, and actionable.'
    },
    template: {
      id: 'article-template-v1',
      name: 'Informative Article',
      inputFields: [
        { id: 'mainTopic', name: 'Main Topic', type: 'shortText', value: 'The Importance of Urban Greening' },
        { id: 'keyPoints', name: 'Key Points to Cover', type: 'tags', value: 'community, biodiversity, mental health' }
      ],
      outputFields: [
        { id: 'fullArticle', name: 'Full Article', type: 'richText', aiPrompt: 'Write a 600-word article on {{mainTopic}}, focusing on {{keyPoints}}.' },
        { id: 'summary', name: 'Summary', type: 'plainText', aiPrompt: 'Provide a 3-sentence summary for an article on {{mainTopic}}.' }
      ]
    },
    input: {
      additionalInstructions: 'Make sure to include a call to action for local community involvement.'
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

For more detailed documentation about the content template system, see [/docs/CONTENT_TEMPLATE_SYSTEM.md](/docs/CONTENT_TEMPLATE_SYSTEM.md). 