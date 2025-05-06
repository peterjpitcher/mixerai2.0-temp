# Azure OpenAI Troubleshooting Guide

## Overview

This document provides instructions for troubleshooting issues with the Azure OpenAI integration in the MixerAI 2.0 application, particularly related to brand identity generation.

## Environment Variables

The following environment variables are required for proper Azure OpenAI integration:

```
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your_deployment_name_here
```

The provided values should be:
- `AZURE_OPENAI_API_KEY`: 91657ac1fc944910992d8c9da1d9c866
- `AZURE_OPENAI_ENDPOINT`: https://owned-ai-dev.openai.azure.com
- `AZURE_OPENAI_DEPLOYMENT`: gpt-4o

## Common Issues

### Fallback Content Generation

If you're seeing boilerplate/template content rather than AI-generated content, this typically indicates the system is using the fallback generation mechanism instead of calling Azure OpenAI. This can occur for several reasons:

1. **Development Environment Check**: By default, the `generateBrandIdentityFromUrls` function in `src/lib/azure/openai.ts` was checking if `process.env.NODE_ENV === 'development'`, and if true, was automatically using fallback content. This has been updated to only use fallback if both in development AND missing credentials.

2. **Missing Environment Variables**: The application checks for `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` at runtime. If either is missing, it falls back to template-based generation.

3. **Incorrect Deployment Name**: If the deployment name doesn't match an available deployment in your Azure OpenAI resource, the API call will fail, triggering the fallback mechanism.

### Debugging Steps

1. **Run the Test Script**:
   ```bash
   node scripts/test-azure-openai.js
   ```
   This script will output detailed information about your environment configuration and attempt to make a direct test call to Azure OpenAI.

2. **Use the Test API Endpoint**:
   Visit `http://localhost:3001/api/test-azure-openai` in your browser or use a tool like Postman to make a GET request to this endpoint. It will return detailed information about the environment variables and attempt to make a test call to Azure OpenAI.

3. **Check the Console Logs**:
   The application now includes detailed logging in the `generateBrandIdentityFromUrls` function. Look for messages that indicate whether:
   - It's using fallback due to development mode and missing credentials
   - It's attempting to initialize the Azure OpenAI client
   - It's successfully making the API call
   - It's receiving and parsing the response

## Solutions

### Environment Variable Issues

1. **Check `.env` File**: Make sure your `.env` file is in the root directory and contains the correct variables.

2. **Restart the Development Server**: After updating the `.env` file, restart your development server:
   ```bash
   npm run dev
   ```

3. **Use `.env.local`**: Next.js prioritizes `.env.local` over `.env`. Try creating a `.env.local` file with your environment variables.

### API Integration Issues

1. **Update `openai.ts`**: The logic for fallback content generation has been updated. Make sure you're using the latest version of the file.

2. **Check Azure Portal**: Verify that the deployment name in your environment variables matches an actual deployment in your Azure OpenAI resource.

3. **Check API Version**: The application uses the "2023-09-01-preview" API version. Make sure your Azure OpenAI resource supports this version.

## Verifying Fixes

After implementing fixes, you can verify they're working correctly by:

1. Using the brand identity generation feature on the brand edit page
2. Checking the console logs for messages indicating successful API calls
3. Confirming the generated content is unique and not from the fallback templates

If you continue to see fallback content, check that your code changes have been properly saved and the server has been restarted.

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

## Fallback Generation Mode

The system has a built-in fallback generation mode that uses pre-built industry-specific templates instead of calling Azure OpenAI. This mode is activated automatically when:

1. Azure OpenAI credentials are missing or invalid
2. The specified deployment name doesn't exist in your Azure OpenAI resource
3. The `USE_LOCAL_GENERATION` environment variable is set to `true`

### Enabling Fallback Generation Mode

You can force the system to use the fallback generator by enabling the local generation mode:

```bash
node scripts/force-local-generation.js enable
```

This will update your `.env` file to include the `USE_LOCAL_GENERATION=true` setting. To disable it later:

```bash
node scripts/force-local-generation.js disable
```

Remember to restart your development server after changing this setting.

## Handling "API deployment does not exist" Errors

If you're seeing the error message "404 The API deployment for this resource does not exist", it means the model deployment name you provided does not exist in your Azure OpenAI resource. To fix this:

1. Check your Azure OpenAI resource in the Azure portal and verify which deployments are actually available
2. Update your `AZURE_OPENAI_DEPLOYMENT` environment variable to match an existing deployment
3. Or, enable the fallback generation mode as described above if you don't have a valid deployment

### Common Deployment Names

Common deployment names in Azure OpenAI include:
- `gpt-35-turbo` (GPT-3.5 Turbo)
- `gpt-4` (GPT-4)
- `text-davinci-003` (older model)

The exact name depends on how the deployments were set up in your Azure OpenAI resource. 