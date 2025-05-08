import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(req: NextRequest) {
  try {
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';

    if (!azureEndpoint || !azureApiKey || !azureDeployment) {
      return NextResponse.json({
        success: false,
        error: 'Azure OpenAI configuration is incomplete',
        missingConfig: {
          endpoint: !azureEndpoint,
          apiKey: !azureApiKey,
          deployment: !azureDeployment
        }
      }, { status: 400 });
    }

    // Configure Azure OpenAI
    const openai = new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${azureEndpoint}/openai/deployments/${azureDeployment}`,
      defaultQuery: { 'api-version': azureApiVersion },
      defaultHeaders: { 'api-key': azureApiKey }
    });

    // Send a simple ping with a minimal prompt
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
      message: 'Azure OpenAI API is working correctly',
      responseTime: `${responseTime}ms`,
      modelUsed: response.model,
      modelResponse: response.choices[0]?.message?.content,
      tokenUsage: response.usage,
      deploymentName: azureDeployment,
      apiVersion: azureApiVersion
    });
    
  } catch (error: any) {
    console.error('Azure OpenAI test error:', error);
    
    return NextResponse.json({
      success: false,
      error: `Azure OpenAI test failed: ${error.message}`,
      errorDetails: error.response?.data || null
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get configuration
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';

    // Check required config
    if (!azureEndpoint || !azureApiKey || !azureDeployment) {
      return NextResponse.json({
        success: false,
        error: 'Azure OpenAI configuration is incomplete',
        missingConfig: {
          endpoint: !azureEndpoint,
          apiKey: !azureApiKey,
          deployment: !azureDeployment
        }
      }, { status: 400 });
    }

    // Get request parameters
    const body = await req.json();
    const prompt = body.prompt || 'Hello, world!';
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
    const max_tokens = typeof body.max_tokens === 'number' ? body.max_tokens : 100;

    console.log(`Running OpenAI test with:
      - Prompt: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}
      - Temperature: ${temperature}
      - Max Tokens: ${max_tokens}
    `);

    // Configure Azure OpenAI
    const openai = new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${azureEndpoint}/openai/deployments/${azureDeployment}`,
      defaultQuery: { 'api-version': azureApiVersion },
      defaultHeaders: { 'api-key': azureApiKey }
    });

    // Send the request with custom parameters
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
      message: 'Azure OpenAI API request successful',
      responseTime: `${responseTime}ms`,
      modelUsed: response.model,
      modelResponse: response.choices[0]?.message?.content,
      tokenUsage: response.usage,
      deploymentName: azureDeployment,
      apiVersion: azureApiVersion
    });
    
  } catch (error: any) {
    console.error('Azure OpenAI test error:', error);
    
    return NextResponse.json({
      success: false,
      error: `Azure OpenAI test failed: ${error.message}`,
      errorDetails: error.response?.data || null
    }, { status: 500 });
  }
} 