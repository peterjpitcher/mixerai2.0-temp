// Simple script to test Azure OpenAI connection
require('dotenv').config();
const { OpenAI } = require('openai');

async function testAzureOpenAI() {
  console.log('=== Azure OpenAI Connection Test ===');
  console.log('Environment variables:');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('- AZURE_OPENAI_API_KEY exists:', !!process.env.AZURE_OPENAI_API_KEY);
  console.log('- AZURE_OPENAI_API_KEY length:', process.env.AZURE_OPENAI_API_KEY?.length);
  console.log('- AZURE_OPENAI_ENDPOINT exists:', !!process.env.AZURE_OPENAI_ENDPOINT);
  console.log('- AZURE_OPENAI_ENDPOINT value:', process.env.AZURE_OPENAI_ENDPOINT);
  console.log('- AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT || 'Not set (will use gpt-4o)');
  
  if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    console.error('\nMissing required environment variables. Please check your .env file.');
    return;
  }
  
  console.log('\nTrying to initialize OpenAI client...');
  let client;
  
  try {
    client = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments`,
      defaultQuery: { "api-version": "2023-09-01-preview" },
      defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY }
    });
    console.log('Client initialized successfully.');
  } catch (initError) {
    console.error('\nFailed to initialize OpenAI client:', initError.message);
    return;
  }
  
  console.log('\nTrying to make a simple API call...');
  
  try {
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
    console.log(`Using deployment: ${deployment}`);
    
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello world in JSON format" }
      ]
    });
    
    console.log("\nAPI call result:", completion.choices[0]?.message?.content);
    console.log("\nConnection test successful! The Azure OpenAI service is working properly.");
  } catch (error) {
    console.error(`\nError testing Azure OpenAI connection:\n${error.message}`);
    
    // Try with a fallback deployment name if the issue is about deployment not existing
    if (error.message && error.message.includes("API deployment for this resource does not exist")) {
      console.log("\nTrying with fallback deployment 'gpt-35-turbo'...");
      
      try {
        const fallbackCompletion = await client.chat.completions.create({
          model: "gpt-35-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Say hello world in JSON format" }
          ]
        });
        
        console.log("\nFallback API call result:", fallbackCompletion.choices[0]?.message?.content);
        console.log("\nConnection test with fallback deployment successful!");
        console.log("\nImportant: Please update AZURE_OPENAI_DEPLOYMENT in your .env file to 'gpt-35-turbo' to avoid this error in the future.");
      } catch (fallbackError) {
        console.error(`\nFallback model also failed: ${fallbackError.message}`);
        console.log("\nConnection test failed. Please verify your Azure OpenAI resource has available deployments.");
      }
    } else {
      console.log("\nConnection test failed. Please fix the configuration and try again.");
    }
  }
}

testAzureOpenAI(); 