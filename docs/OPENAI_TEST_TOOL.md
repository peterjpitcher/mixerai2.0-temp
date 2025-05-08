# MixerAI 2.0a OpenAI Test Tool

This document describes the enhanced OpenAI testing features available in MixerAI 2.0a.

## Overview

MixerAI 2.0a includes a comprehensive suite of testing tools for Azure OpenAI integration. These tools help you:

- Verify your Azure OpenAI API credentials
- Test prompts and responses
- Debug connection issues
- Fine-tune generation parameters
- Examine response times and token usage

## Accessing the Test Tools

The OpenAI test interface can be accessed at:

```
/openai-test
```

## Key Features

### Quick Test Component

A streamlined interface for quickly testing Azure OpenAI:

- Simple prompt input
- Advanced parameter controls (temperature, token limits)
- Response time measurement
- Clear error display
- Minimal configuration required

### System Status Panel

Shows real-time connection status for:

- Azure OpenAI API
- Local templates (fallback mode)
- Supabase database

### Environment Configuration

Detailed information about your environment:

- Azure OpenAI settings
- API versions
- Feature flags
- Database connection status

### Advanced Testing Tools

For more specific testing needs:

1. **Brand Identity Generation Test**: Test brand identity generation with customizable inputs
2. **Content Generation Test**: Test content generation with various parameters
3. **Direct API Test**: Advanced tool for custom API endpoint testing with full request customization

## Troubleshooting Connection Issues

If you encounter connection problems with Azure OpenAI:

1. Check your environment variables:
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_DEPLOYMENT`

2. Verify the deployment name exists in your Azure OpenAI resource

3. Use the Direct API Test tab to try different API versions or endpoints

4. Check the Console for detailed error messages

## Example Prompts

Here are some example prompts to test with:

```
Explain how Azure OpenAI works in 3 sentences.

Write a short product description for a wireless headphone.

Generate a list of 5 creative marketing taglines for a sustainable fashion brand.

Provide 3 SEO tips for improving website visibility.
```

## API Response Format

Successful responses include:

- `success`: Boolean indicating success
- `message`: Status message
- `responseTime`: Time taken for the request
- `modelUsed`: The model/deployment used
- `modelResponse`: The actual response content
- `tokenUsage`: Token usage statistics
- `deploymentName`: The deployment name used
- `apiVersion`: The API version used

Error responses include:

- `success`: false
- `error`: Error message
- `errorDetails`: Additional error details when available

## Local Development

When testing locally, you can:

1. Use the environment variables in a `.env.local` file
2. Run the test script to verify your connection:
   ```bash
   node scripts/test-azure-openai.js
   ```

## No-Fallback Policy

The MixerAI 2.0a API strictly prohibits fallback content generation. When the Azure OpenAI API is unavailable:

- The system will report the actual error
- No template-based or default content will be generated
- Users will be clearly informed that the AI service is unavailable

This ensures full transparency with users and maintains consistent quality standards.

## Support

If you continue to experience issues after using these tools, check:

1. Azure OpenAI service status
2. Your resource quotas and limits
3. Network connectivity to Azure endpoints 