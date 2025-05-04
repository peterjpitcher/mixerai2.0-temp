import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check for required environment variables
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    
    const missingVars: string[] = [];
    if (!apiKey) missingVars.push('AZURE_OPENAI_API_KEY');
    if (!endpoint) missingVars.push('AZURE_OPENAI_ENDPOINT');
    if (!deployment) missingVars.push('AZURE_OPENAI_DEPLOYMENT');
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required environment variables: ${missingVars.join(', ')}`,
        config: {
          apiKey: apiKey ? '✓ Set' : '✗ Missing',
          endpoint: endpoint ? '✓ Set' : '✗ Missing',
          deployment: deployment ? '✓ Set' : '✗ Missing'
        }
      }, { status: 500 });
    }
    
    // Make a simple request to test connectivity
    const apiUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2023-05-15`;
    
    console.log('Testing Azure OpenAI connection with URL:', apiUrl);
    
    // Ensure apiKey is defined for the headers
    if (!apiKey) {
      throw new Error('API key is undefined');
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello world" }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `Azure OpenAI API returned ${response.status}`,
        details: errorText,
        requestUrl: apiUrl
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: "Successfully connected to Azure OpenAI API",
      response: data.choices[0]?.message?.content || "No content returned",
      config: {
        endpoint,
        deployment,
        apiVersion: '2023-05-15'
      }
    });
  } catch (error) {
    console.error('Error testing Azure OpenAI connection:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 