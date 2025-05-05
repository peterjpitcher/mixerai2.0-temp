# Auto-Generate Description Fix

This document explains the fix implemented for the auto-generate description feature in the workflow edit page.

## Issue

The application was experiencing an issue where the auto-generate button was successfully generating descriptions from Azure OpenAI, but the generated descriptions were not appearing in the text field. The console showed successful API calls but the UI wasn't updating.

Console errors similar to the following were observed:
```
Unchecked runtime.lastError: The page keeping the extension port is moved into back/forward cache, so the message channel is closed.
```

## Cause

Investigation revealed multiple issues:

1. Browser extensions were interfering with React's state updates
2. Generated descriptions sometimes included quote marks that were not being properly removed
3. **Page refreshes** were occurring after the API call, causing the React state to be lost
4. The browser's BFCache (Back-Forward Cache) was causing issues with extension connections

## Solution

We implemented several fixes to address the issue:

1. **Prevent API Caching**: Added cache control headers to the API response to prevent page refreshes
   - Added `cache: 'no-store'` to the fetch request options
   - Added cache control headers to the API response

2. **Quote Removal**: Added code to clean generated descriptions by removing any wrapping quote marks at the API level
   - Added regex to remove quotes directly in the API response

3. **Enhanced Alternative Input**: Made the alternative input field more visible and usable
   - Improved styling to make it stand out
   - Added clearer instructions

4. **Direct DOM Updates**: Added code to directly update both the textarea and alternative input
   - Update both fields directly when a response is received

## Implementation Details

### 1. API Cache Prevention

The modified API route includes:

```javascript
// In the fetch request
const response = await fetch(
  apiUrl,
  {
    // Other options...
    cache: 'no-store' // Prevent caching
  }
);

// In the response
return NextResponse.json(result, {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  }
});
```

### 2. Quote Removal at API Level

```javascript
// Extract the generated description from Azure OpenAI response
let description = data.choices?.[0]?.message?.content?.trim() || '';

// Remove any quotes that might be wrapping the description
description = description.replace(/^["']|["']$/g, '');
```

### 3. Alternative Input Field

```jsx
{/* Alternative description input to address update issues */}
<div className="mb-6 mt-2 bg-primary/5 p-3 rounded-md border border-primary/20">
  <div className="flex justify-between items-center mb-2">
    <Label htmlFor={`step-${index}-alt-description`} className="text-sm font-medium text-primary-foreground">
      Alternative Description Input
    </Label>
    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Recommended</span>
  </div>
  <Input
    id={`step-${index}-alt-description`}
    value={step.description}
    onChange={(e) => handleStepChange(index, 'description', e.target.value)}
    placeholder="If the main textarea doesn't update, your generated description will appear here"
    className="border-input"
  />
  <p className="text-xs text-muted-foreground mt-1">
    <strong>This field is synchronized with the main textarea above.</strong> If the auto-generate button 
    doesn't update the main textarea due to browser extensions, you can see and edit the content here instead.
  </p>
</div>
```

## How to Use the Fix

If you encounter issues with the auto-generate feature:

1. Click the "Auto-generate" button as usual
2. If the main textarea doesn't update, look at the alternative input field below
3. The generated text should appear in this field
4. You can edit it in either the main textarea or alternative input
5. Both fields are synchronized and the content will be saved with the form

## Debugging Tools

For developers, a "Test" button has been added next to the auto-generate button that:
1. Directly modifies the textarea value
2. Logs the update process to the console
3. Verifies if React state updates correctly

## For Persistent Issues

If the fix doesn't resolve all issues, users can:

1. Try disabling browser extensions that might interfere with the page
2. Use the alternative input field which is more likely to show the generated content
3. Manually copy/paste text between fields if needed
4. Save the form even if the description appears invisible - it's still being stored in the form state

## Related Improvements

We also fixed TypeScript errors in the `/api/test-azure-openai` endpoint to ensure proper type safety for the API testing function. 

# Brand Identity Generation Fix

## Issue Summary

When using the "Generate Brand Identity" button on the brand edit page, the system was installing boilerplate content rather than generating unique content with AI. The specific issues were:

1. The system couldn't connect to Azure OpenAI service due to a non-existent deployment name
2. Debug logging was insufficient to diagnose the exact problem
3. There was no explicit fallback mode that could be enabled for testing

## Investigation Findings

After investigating the issue, we found:

1. The environment variables were correctly set in `.env`, but the deployment name "gpt-4o" doesn't exist in the Azure OpenAI resource
2. The fallback generation was being triggered, but the issue wasn't clearly logged
3. The code was configured to require additional debug information

## Solution Implemented

1. Added comprehensive logging to `src/lib/azure/openai.ts` to better diagnose connection issues
2. Improved error handling throughout the AI generation pipeline
3. Added a special `USE_LOCAL_GENERATION=true` mode that can be enabled for testing
4. Created a test API endpoint at `/api/env-check` to verify environment variables
5. Created a diagnostic script at `scripts/test-azure-openai.js` to test the Azure OpenAI connection
6. Created a utility script `scripts/force-local-generation.js` to enable/disable local generation mode

## Using the Solution

### For Testing with Local Generation

To test brand identity generation with local templates:

```bash
node scripts/force-local-generation.js enable
# Restart your Next.js server
```

This will ensure the system uses the local generation templates regardless of Azure OpenAI configuration.

### For Production with Azure OpenAI

To use Azure OpenAI for generation:

1. Verify available deployments in your Azure OpenAI resource
2. Update the `.env` file with the correct deployment name:
   ```
   AZURE_OPENAI_DEPLOYMENT=your-actual-deployment-name
   ```
3. Disable local generation mode:
   ```bash
   node scripts/force-local-generation.js disable
   ```
4. Restart your Next.js server

## Documentation

See [AZURE_OPENAI_TROUBLESHOOTING.md](./AZURE_OPENAI_TROUBLESHOOTING.md) for comprehensive troubleshooting guidance related to Azure OpenAI integration. 