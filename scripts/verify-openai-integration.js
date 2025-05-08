#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { OpenAI } = require('openai');
const chalk = require('chalk');

async function verifyOpenAIIntegration() {
  console.log(chalk.blue('=== MixerAI OpenAI Integration Verification ==='));
  console.log('Checking environment variables...');
  
  // Check environment variables
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  
  let hasErrors = false;
  
  if (!azureEndpoint) {
    console.log(chalk.red('❌ AZURE_OPENAI_ENDPOINT is missing'));
    hasErrors = true;
  } else {
    console.log(chalk.green(`✓ AZURE_OPENAI_ENDPOINT: ${azureEndpoint}`));
  }
  
  if (!azureApiKey) {
    console.log(chalk.red('❌ AZURE_OPENAI_API_KEY is missing'));
    hasErrors = true;
  } else {
    console.log(chalk.green(`✓ AZURE_OPENAI_API_KEY: ${azureApiKey.substring(0, 5)}...`));
  }
  
  if (!azureDeployment) {
    console.log(chalk.yellow('⚠️ AZURE_OPENAI_DEPLOYMENT is missing (will use default "gpt-4o")')); 
  } else {
    console.log(chalk.green(`✓ AZURE_OPENAI_DEPLOYMENT: ${azureDeployment}`));
  }
  
  if (hasErrors) {
    console.log(chalk.red('\n❌ Cannot test OpenAI integration due to missing environment variables.'));
    console.log('\nPlease add these to your .env file:');
    console.log(`
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=your_endpoint_url
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
    `);
    process.exit(1);
  }
  
  console.log(chalk.blue('\nInitializing Azure OpenAI client...'));
  
  try {
    // Initialize the OpenAI client with Azure configuration
    const client = new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${azureEndpoint}/openai/deployments`,
      defaultQuery: { "api-version": "2023-12-01-preview" },
      defaultHeaders: { "api-key": azureApiKey }
    });
    
    const deploymentName = azureDeployment || 'gpt-4o';
    console.log(`Using deployment: ${deploymentName}`);
    
    console.log(chalk.blue('\nSending test request...'));
    console.time('Request time');
    
    const completion = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: 'system', content: 'You are a helpful assistant for MixerAI. Respond with British English only.' },
        { role: 'user', content: 'Write a single sentence that confirms the Azure OpenAI connection is working.' }
      ],
      max_tokens: 50,
      temperature: 0.3,
    });
    
    console.timeEnd('Request time');
    
    const response = completion.choices[0]?.message?.content?.trim();
    
    if (response) {
      console.log(chalk.green('\n✅ Azure OpenAI integration is working!'));
      console.log(chalk.blue('\nResponse:'));
      console.log(`"${response}"`);
      
      console.log(chalk.blue('\nUsage statistics:'));
      console.log(`- Prompt tokens: ${completion.usage?.prompt_tokens}`);
      console.log(`- Completion tokens: ${completion.usage?.completion_tokens}`);
      console.log(`- Total tokens: ${completion.usage?.total_tokens}`);
      
      console.log(chalk.green('\n✅ Verification completed successfully.'));
      return true;
    } else {
      console.log(chalk.red('\n❌ No response received from Azure OpenAI.'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`\n❌ Azure OpenAI integration test failed: ${error.message}`));
    
    if (error.response) {
      console.log(chalk.yellow('\nError details:'));
      console.log(`Status: ${error.response.status}`);
      console.log(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.log(chalk.blue('\nTroubleshooting tips:'));
    console.log('1. Verify your Azure OpenAI endpoint is correct');
    console.log('2. Check if your API key is valid');
    console.log('3. Confirm the deployment name exists in your Azure resource');
    console.log('4. Check your Azure OpenAI quotas and rate limits');
    
    return false;
  }
}

// Run the verification
verifyOpenAIIntegration().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 