# Azure OpenAI Call Pattern Investigation

## Issue

The `/api/ai/suggest` endpoint, which uses the `generateTextCompletion` function from `src/lib/azure/openai.ts`, was encountering a "404 Resource not found" error when calling the Azure OpenAI service. This occurred despite other AI functionalities in the application reportedly working with the same environment variables (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT_NAME` which resolves to "gpt-4o").

## Discovery Findings

1.  **Client Initialization (`getAzureOpenAIClient`)**:
    *   The `getAzureOpenAIClient()` function initializes a new `OpenAI` SDK client.
    *   The `baseURL` for this client is set directly to `process.env.AZURE_OPENAI_ENDPOINT` (e.g., `https://owned-ai-dev.openai.azure.com`).
    *   It does *not* include the `/openai/deployments/YOUR_DEPLOYMENT_NAME` segment in the `baseURL`.

2.  **Deployment Name Retrieval (`getModelName`)**:
    *   The `getModelName()` function correctly retrieves the deployment name from `process.env.AZURE_OPENAI_DEPLOYMENT_NAME` (or `AZURE_OPENAI_DEPLOYMENT`), which logs indicate is "gpt-4o" for the failing calls.

3.  **Failing Call Pattern (SDK Client Method)**:
    *   The `generateTextCompletion` function (used by `/api/ai/suggest`) and the `generateBrandIdentityFromUrls` function (as last reviewed) use the SDK client:
        ```typescript
        const client = getAzureOpenAIClient();
        const deploymentName = getModelName();
        // ...
        const completion = await client.chat.completions.create({
          model: deploymentName, // "gpt-4o"
          messages: [...],
          // ... other params
        });
        ```
    *   This pattern results in a "404 Resource not found" for `generateTextCompletion`.

4.  **Working Call Pattern (Direct `fetch` Method)**:
    *   The `generateContentFromTemplate` function and the `generateMetadata` function, which are reportedly working, bypass the `client.chat.completions.create()` method for their primary API call.
    *   Instead, they manually construct the full Azure OpenAI endpoint URL, explicitly including the deployment name in the path:
        ```typescript
        const deploymentName = getModelName();
        // ...
        const endpoint = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deploymentName}/chat/completions?api-version=YYYY-MM-DD`;
        // ...
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.AZURE_OPENAI_API_KEY || ''
          },
          body: JSON.stringify(completionRequest)
        });
        ```
    *   This direct `fetch` pattern successfully reaches the Azure OpenAI deployment.

## Conclusion

The "404 Resource not found" error occurs because the `OpenAI` SDK, when initialized with only the base Azure endpoint (e.g., `https://YOUR_RESOURCE_NAME.openai.azure.com`) in `baseURL`, does not automatically place the deployment name (passed as the `model` parameter to `create()`) into the URL path in the specific format required by Azure for chat completions (`/openai/deployments/YOUR_DEPLOYMENT_NAME/chat/completions`).

Azure OpenAI requires the deployment name to be part of the URL path for these types of API calls. The functions that work are manually ensuring this URL structure. The functions that fail are relying on the SDK's default behavior which, in this Azure configuration, isn't forming the correct path.

## Recommendations for Resolution (If changes were to be made)

1.  **Consistent Direct `fetch` (Align with working parts)**:
    *   Modify `generateTextCompletion` and `generateBrandIdentityFromUrls` (if it also uses the SDK client method and needs fixing) to use the direct `fetch` pattern with the manually constructed endpoint URL, similar to `generateContentFromTemplate` and `generateMetadata`.
    *   This ensures all critical AI calls use a proven, working method within the codebase.

2.  **SDK-Compliant Client Initialization (Preferred for SDK usage)**:
    *   Modify `getAzureOpenAIClient()` to construct the `baseURL` correctly for Azure, including the deployment name in the path.
        ```typescript
        export const getAzureOpenAIClient = () => {
          // ... (get apiKey, endpoint)
          const deploymentName = getModelName(); // Call this *before* client init
          if (!deploymentName) { // Add a check for deploymentName
            console.error("Azure OpenAI deployment name is missing");
            throw new Error("Azure OpenAI deployment name is missing");
          }

          const client = new OpenAI({
            apiKey: apiKey,
            baseURL: `${endpoint}/openai/deployments/${deploymentName}`, // Correct baseURL
            defaultQuery: { "api-version": "2023-12-01-preview" }, // Or your target API version
            defaultHeaders: { "api-key": apiKey }
          });

          // When using the client later:
          // client.chat.completions.create({ model: deploymentName, ... })
          // The 'model' parameter here might be used by the SDK for internal routing or validation,
          // even if the deployment is in the baseURL. Or, for some SDK versions/configurations,
          // it might be ignored if the deployment is already in the path.
          // It's safer to keep providing it as it's the deployment ID.
          return client;
        };
        ```
    *   With this change, `client.chat.completions.create({ model: deploymentName, ... })` should then work correctly as the base URL already targets the specific deployment.

Choosing between these depends on the preferred approach: leveraging the SDK's abstractions (Option 2) or ensuring consistency with already working direct `fetch` calls (Option 1). Option 2 is generally cleaner if the intent is to use the SDK properly. 