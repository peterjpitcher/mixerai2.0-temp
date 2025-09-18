import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuthAndCSRF } from '@/lib/auth/api-auth'; // Use withAdminAuthAndCSRF
import { handleApiError } from '@/lib/api-utils';

const testsEnabled = process.env.ENABLE_TEST_ENDPOINTS === 'true';

function disabledResponse() {
  return NextResponse.json(
    { success: false, error: 'This test endpoint is disabled. Set ENABLE_TEST_ENDPOINTS=true to enable locally.' },
    { status: 410 }
  );
}

/**
 * GET: Test basic Azure OpenAI connectivity (admin only).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAdminAuthAndCSRF(async (_req: NextRequest, _user) => {
  if (!testsEnabled) {
    return disabledResponse();
  }
  try {
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';

    if (!azureEndpoint || !azureApiKey || !azureDeployment) {
      return NextResponse.json({
        success: false,
        error: 'Azure OpenAI configuration is incomplete on the server.',
        missingConfig: {
          endpoint: !azureEndpoint,
          apiKey: !azureApiKey,
          deployment: !azureDeployment
        }
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${azureEndpoint}/openai/deployments/${azureDeployment}`,
      defaultQuery: { 'api-version': azureApiVersion },
      defaultHeaders: { 'api-key': azureApiKey }
    });

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: azureDeployment,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello world!' }
      ],
      max_tokens: 10,
      temperature: 0.1,
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return NextResponse.json({
      success: true,
      message: 'Azure OpenAI API test ping successful.',
      responseTime: `${responseTime}ms`,
      modelUsed: response.model,
      modelResponse: response.choices[0]?.message?.content,
      tokenUsage: response.usage,
      deploymentName: azureDeployment,
      apiVersion: azureApiVersion
    });
    
  } catch (error: unknown) {
    return handleApiError(error, `Azure OpenAI GET test failed`);
  }
});

/**
 * POST: Test Azure OpenAI with custom prompt (admin only).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAdminAuthAndCSRF(async (req: NextRequest, _user) => {
  if (!testsEnabled) {
    return disabledResponse();
  }
  try {
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';

    if (!azureEndpoint || !azureApiKey || !azureDeployment) {
      return NextResponse.json({
        success: false,
        error: 'Azure OpenAI configuration is incomplete on the server.',
        missingConfig: {
          endpoint: !azureEndpoint,
          apiKey: !azureApiKey,
          deployment: !azureDeployment
        }
      }, { status: 500 });
    }

    const body = await req.json();
    const prompt = body.prompt || 'Hello, world!';
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
    const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 100;

    const openai = new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${azureEndpoint}/openai/deployments/${azureDeployment}`,
      defaultQuery: { 'api-version': azureApiVersion },
      defaultHeaders: { 'api-key': azureApiKey }
    });

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: azureDeployment,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens,
      temperature,
    });
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return NextResponse.json({
      success: true,
      message: 'Azure OpenAI API custom request successful.',
      responseTime: `${responseTime}ms`,
      modelUsed: response.model,
      modelResponse: response.choices[0]?.message?.content,
      tokenUsage: response.usage,
      deploymentName: azureDeployment,
      apiVersion: azureApiVersion
    });
    
  } catch (error: unknown) {
    return handleApiError(error, `Azure OpenAI POST test failed`);
  }
}); 
