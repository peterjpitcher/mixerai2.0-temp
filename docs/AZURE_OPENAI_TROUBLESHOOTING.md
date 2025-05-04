# Azure OpenAI Troubleshooting Guide

This document provides guidance for troubleshooting common issues with Azure OpenAI integration in the MixerAI 2.0 application.

## Required Environment Variables

The application needs the following environment variables to connect to Azure OpenAI:

```
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
```

All three variables must be set correctly for the Azure OpenAI features to work.

## Testing Azure OpenAI Connection

You can use the built-in diagnostic endpoint to verify your Azure OpenAI configuration:

1. Visit `/api/test-azure-openai` in your browser
2. Check the JSON response for success or error messages

Alternatively, run the testing script from the command line:

```bash
node scripts/test-azure-openai.js
```

## Common Issues and Solutions

### 1. 500 Internal Server Error on Generate Description

**Symptoms**:
- Clicking "Auto-generate" button results in a 500 error
- Console shows "Error calling OpenAI API. Please check your API configuration"

**Possible Causes and Solutions**:

1. **Missing Environment Variables**
   - Make sure all three Azure OpenAI environment variables are set in your `.env` file
   - Restart the Next.js server after updating environment variables

2. **Incorrect API Endpoint Format**
   - The endpoint should be in the format: `https://resource-name.openai.azure.com`
   - Remove any trailing slashes

3. **Invalid API Key**
   - Double-check your API key for typos
   - Ensure the API key has permissions for the deployment

4. **Incorrect Deployment Name**
   - Verify the deployment name matches exactly what's in your Azure OpenAI resource
   - Deployment names are case-sensitive

5. **API Version Issues**
   - The application uses API version `2023-05-15`
   - Make sure your Azure OpenAI resource supports this version

### 2. Authentication Errors

**Symptoms**:
- 401 Unauthorized errors
- "Access denied due to invalid subscription key" messages

**Solutions**:
1. Regenerate your API key in the Azure portal
2. Make sure you're using the key from the correct Azure OpenAI resource
3. Check for whitespace or special characters in the copied key

### 3. Rate Limiting Issues

**Symptoms**:
- 429 Too Many Requests errors
- "Quota exceeded" messages

**Solutions**:
1. Check your Azure OpenAI quotas in the Azure portal
2. Reduce the frequency of requests
3. Consider upgrading your Azure OpenAI tier

### 4. Network Connection Issues

**Symptoms**:
- Connection timeout errors
- ECONNREFUSED errors

**Solutions**:
1. Check your internet connection
2. Ensure your network allows outbound connections to Azure OpenAI endpoints
3. Check if a proxy or firewall is blocking the connection

## Detailed Logging

For more detailed debugging information, you can enable verbose logging:

1. Set `DEBUG=azure:openai:*` in your `.env` file
2. Restart the Next.js server
3. Check the console for additional debugging information

## Updating the Azure OpenAI Client

If you're experiencing issues with the Azure OpenAI client, you can update the client configuration in:

- `src/app/api/workflows/generate-description/route.ts`

The client is configured with:

```javascript
// Simplified Azure OpenAI client configuration
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: process.env.AZURE_OPENAI_ENDPOINT,
  defaultQuery: { 'api-version': '2023-05-15' },
});
```

## Getting Support

If you continue to experience issues after trying these troubleshooting steps:

1. Check the Azure OpenAI documentation: https://docs.microsoft.com/en-us/azure/cognitive-services/openai/
2. Reach out to Azure support if you believe there's an issue with your Azure OpenAI resource
3. Open an issue in the project repository with detailed information about the problem 