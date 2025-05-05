// Script to test local environment variables
require('dotenv').config();

console.log('==== Environment Variable Check ====');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('AZURE_OPENAI_API_KEY exists:', !!process.env.AZURE_OPENAI_API_KEY);
console.log('AZURE_OPENAI_API_KEY first chars:', process.env.AZURE_OPENAI_API_KEY ? 
  process.env.AZURE_OPENAI_API_KEY.substring(0, 5) + '...' : 'N/A');
console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT || 'Not set');
console.log('AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT || 'Not set (will use default)');

// Test OpenAI connection if all variables are set
const { OpenAI } = require('openai');

async function testOpenAIConnection() {
  if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    console.log('\n⚠️ Cannot test OpenAI connection - Missing required environment variables');
    return;
  }

  try {
    console.log('\n==== Testing Azure OpenAI Connection ====');
    const client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments`,
      defaultQuery: { "api-version": "2023-09-01-preview" },
      defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY }
    });

    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    console.log(`Using deployment: ${deploymentName}`);

    console.log('Making test API call...');
    const completion = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Connection to Azure OpenAI successful!"' }
      ],
      max_tokens: 30
    });

    console.log('\nAPI Response:');
    console.log(completion.choices[0]?.message?.content || 'No content in response');
    console.log('\n✅ Connection to Azure OpenAI successful!\n');
  } catch (error) {
    console.error('\n❌ Azure OpenAI Connection Failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testOpenAIConnection(); 