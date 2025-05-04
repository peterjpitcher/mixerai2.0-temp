// Test Azure OpenAI connection directly
require('dotenv').config();

// Use native fetch if available (Node.js 18+), otherwise use node-fetch
let fetch;
if (typeof global.fetch === 'function') {
  fetch = global.fetch;
} else {
  fetch = require('node-fetch');
}

async function testAzureOpenAI() {
  console.log('Testing Azure OpenAI connection...');
  
  // Check for required environment variables
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  
  console.log('\nEnvironment Configuration:');
  console.log(`API Key: ${apiKey ? '✓ Set' : '✗ Missing'}`);
  console.log(`Endpoint: ${endpoint ? '✓ Set' : '✗ Missing'} (${endpoint || 'undefined'})`);
  console.log(`Deployment: ${deployment ? '✓ Set' : '✗ Missing'} (${deployment || 'undefined'})`);
  
  if (!apiKey || !endpoint || !deployment) {
    console.error('\n❌ Error: Missing required environment variables');
    console.log('Make sure AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT are set in your .env file');
    process.exit(1);
  }
  
  try {
    // Construct the Azure OpenAI endpoint URL
    const apiUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2023-05-15`;
    console.log(`\nAPI URL: ${apiUrl}`);
    
    // Make a request to Azure OpenAI
    console.log('\nSending test request to Azure OpenAI...');
    
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
    
    // Check response status
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ Error: Azure OpenAI API returned ${response.status}`);
      console.error('Response:', errorText);
      process.exit(1);
    }
    
    // Parse response
    const data = await response.json();
    console.log('\nResponse data:');
    console.log(JSON.stringify(data, null, 2));
    
    const generatedText = data.choices?.[0]?.message?.content;
    
    if (generatedText) {
      console.log(`\n✅ Success! Generated text: "${generatedText}"`);
    } else {
      console.log('\n⚠️ Warning: No generated text in the response');
    }
    
  } catch (error) {
    console.error('\n❌ Error connecting to Azure OpenAI:');
    console.error(error);
    process.exit(1);
  }
}

testAzureOpenAI(); 