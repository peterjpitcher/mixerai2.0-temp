# Vercel Deployment Fixes for Brand Identity Generation

## Issue

When deploying the MixerAI 2.0 application to Vercel preview environments, the brand identity generation feature was returning generic "Example Brand" content instead of properly generating content specific to the requested brand name. This occurred because the application was detecting the Vercel preview environment and returning mock data during API calls.

## Root Cause

The issue stemmed from two main factors:

1. **Preview Environment Detection**: The application had code to detect build-time environments in order to avoid making external API calls during the build process. This detection logic was triggering even during runtime API requests in Vercel preview deployments.

2. **Fallback Content Generation**: When the build-time environment was detected, the application would return generic "Example Brand" content rather than using the actual brand name from the request.

## Implemented Fixes

### 1. Enhanced Environment Detection

We added an environment variable bypass mechanism to allow the application to function normally in preview environments when needed:

```typescript
const isBuildTime = process.env.NODE_ENV === 'production' && 
                   typeof window === 'undefined' &&
                   (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' || 
                    process.env.VERCEL_ENV === 'preview') &&
                   process.env.IGNORE_BUILD_TIME_CHECK !== 'true';
```

The addition of the `IGNORE_BUILD_TIME_CHECK` environment variable allows us to selectively bypass the build-time detection logic when needed.

### 2. Brand Name Extraction During Build Time

We enhanced the fallback logic to attempt to extract the actual brand name from the request body:

```typescript
if (isBuildTime) {
  try {
    const body = await req.json();
    const brandName = body.name || body.brandName || 'Example Brand';
    const country = body.country || 'GB';
    
    return NextResponse.json({
      success: true,
      data: generateFallbackBrandIdentity(brandName, 'general', country)
    });
  } catch (error) {
    // Fallback to Example Brand if request parsing fails
    return NextResponse.json({
      success: true,
      data: generateFallbackBrandIdentity('Example Brand')
    });
  }
}
```

This ensures that even in build-time scenarios, the fallback content is generated using the correct brand name.

### 3. Improved OpenAI Client Initialization

We enhanced the OpenAI client initialization with better error handling and debug logging:

```typescript
const getOpenAIClient = () => {
  try {
    console.log('OpenAI client initialization:');
    console.log(`- AZURE_OPENAI_API_KEY exists: ${!!process.env.AZURE_OPENAI_API_KEY}`);
    console.log(`- AZURE_OPENAI_ENDPOINT exists: ${!!process.env.AZURE_OPENAI_ENDPOINT}`);
    console.log(`- AZURE_OPENAI_DEPLOYMENT exists: ${!!process.env.AZURE_OPENAI_DEPLOYMENT}`);
    
    // Detailed initialization logic with try/catch blocks
    // ...
  } catch (error) {
    console.error('Unexpected error during OpenAI client initialization:', error);
  }
  
  return null;
};
```

### 4. Additional Environment Diagnostics

We added comprehensive environment diagnostics to help troubleshoot issues in different deployment environments:

```typescript
console.log('Environment check:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- VERCEL_ENV: ${process.env.VERCEL_ENV}`);
console.log(`- NEXT_PUBLIC_VERCEL_ENV: ${process.env.NEXT_PUBLIC_VERCEL_ENV}`);
console.log(`- IGNORE_BUILD_TIME_CHECK: ${process.env.IGNORE_BUILD_TIME_CHECK}`);
console.log(`- Running in build-time mode: ${isBuildTime}`);
```

## How to Use

### For Local Development

No changes are needed for local development as the system will correctly detect the environment.

### For Vercel Preview Deployments

To ensure the brand identity generation works correctly in preview deployments:

1. Add the environment variable `IGNORE_BUILD_TIME_CHECK=true` in your Vercel project settings.
2. Ensure all the necessary Azure OpenAI or OpenAI environment variables are properly set.

### For Vercel Production Deployments

For production deployments, standard environment variables should be used:

- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT` 

## Troubleshooting

If the brand identity generation feature still returns generic content:

1. Check the logs for the environment detection output
2. Verify that `IGNORE_BUILD_TIME_CHECK` is set to "true"
3. Confirm that OpenAI client initialization is successful
4. Check that the request body contains the correct brand name and parameters

## Future Improvements

For future iterations, consider these improvements:

1. More robust request parsing that can handle Vercel preview environment constraints
2. Environment-specific configuration that doesn't depend on runtime detection
3. Centralized environment services that standardize environment checks across the application
4. Enhanced logging and monitoring for API failures in preview and production environments 