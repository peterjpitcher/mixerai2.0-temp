# OpenAI Testing Tools

This document describes the OpenAI testing tools available in MixerAI 2.0 to help debug, test, and develop AI-powered content generation features.

## Testing Page

A comprehensive testing page is available at `/openai-test` that provides various tools for testing OpenAI integration:

### System Information Panel

Located on the left side of the page, this panel provides:

- **System Status**: Shows connectivity status for Azure OpenAI, local templates, and Supabase.
- **Environment Configuration**: Detailed information about your environment, including Azure OpenAI settings, feature flags, and database connection details.

### Testing Tools

The page includes several testing tabs:

#### 1. Brand Identity Generation Test

Tests the brand identity generation functionality with the following features:

- Input fields for brand name, country, language, and URLs
- Generation results display with detection of whether content was genuinely AI-generated or used fallback templates
- Content preview including brand identity, tone of voice, guardrails, and brand color
- Vetting agencies listing
- Raw API response display

#### 2. Content Generation Test

Tests the content generation functionality with:

- Input fields for title, content type, brand, and generation prompt
- Generated content preview with meta information
- AI detection to check if content was genuinely AI-generated
- Raw API response display

#### 3. Direct API Test

Provides a more flexible tool for testing any API endpoint:

- Support for both internal MixerAI API endpoints and external APIs
- Configurable HTTP method (GET, POST, PUT, DELETE)
- JSON request body editor
- Custom headers configuration
- Formatted response display

## API Endpoints

The following API endpoints are available for testing:

### `/api/env-check`

Returns information about the current environment configuration:

- Azure OpenAI settings
- Database connection status
- Feature flags
- Environment variables

### `/api/test-azure-openai`

Tests the Azure OpenAI connectivity:

- Sends a simple prompt to Azure OpenAI
- Returns timing information and response
- Reports any connectivity errors

### `/api/test-template-generation`

Tests the fallback template generation system:

- Endpoint: POST `/api/test-template-generation`
- Supports both brand identity and content generation

#### Brand Identity Template Generation

Request:
```json
{
  "type": "brand-identity",
  "brandName": "Test Brand",
  "country": "United Kingdom",
  "language": "English"
}
```

#### Content Template Generation

Request:
```json
{
  "type": "content",
  "title": "Test Content",
  "contentType": "blog",
  "brandName": "Test Brand"
}
```

## Debugging Tips

1. **AI vs Template Detection**: The testing tools include heuristics to detect if content was genuinely AI-generated or used fallback templates. Look for the "AI Detection Results" section after generation.

2. **Azure OpenAI Issues**: If experiencing problems with Azure OpenAI:
   - Check the Azure OpenAI deployment name in your `.env` file
   - Verify API key and endpoint are correct
   - Test with the Direct API tab using the `test-azure-openai` endpoint

3. **Local Generation**: If Azure OpenAI is unavailable, you can:
   - Set `USE_LOCAL_GENERATION=true` in your `.env` file to force template usage
   - Test templates directly with the `test-template-generation` endpoint

4. **Environment Variables**: The required environment variables for OpenAI functionality are:
   - `AZURE_OPENAI_ENDPOINT`: The Azure OpenAI endpoint URL
   - `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
   - `AZURE_OPENAI_DEPLOYMENT`: The deployment name for your model (e.g., "gpt-4")
   - `AZURE_OPENAI_API_VERSION`: The API version to use (default: "2023-05-15")

5. **Response Times**: The testing tools display request completion times to help identify performance issues.

## Troubleshooting Common Issues

### "Azure OpenAI configuration is incomplete"

Ensure all required Azure OpenAI environment variables are set correctly in your `.env` file.

### "Invalid JSON in request body"

Check that your JSON in the Direct API test tab is properly formatted.

### Slow Response Times

If experiencing slow responses:
- Check your network connection
- Verify Azure OpenAI service status
- Consider reducing token limits or prompt complexity

### Template Content Instead of AI-Generated Content

If you're receiving template content when expecting AI-generated content:
- Check Azure OpenAI connectivity
- Verify deployment name is correct
- Look for specific error messages in the raw API response 