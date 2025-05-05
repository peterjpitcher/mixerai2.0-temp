// Script to manage the USE_LOCAL_GENERATION setting in .env file
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load the current .env file
const envPath = path.resolve(process.cwd(), '.env');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('Loaded .env file successfully');
} catch (error) {
  console.error('Error reading .env file:', error.message);
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const action = args[0]?.toLowerCase();

if (!action || (action !== 'enable' && action !== 'disable')) {
  console.log(`
Usage: node scripts/force-local-generation.js <enable|disable>

  enable  - Forces the system to use local generation instead of Azure OpenAI
  disable - Allows the system to use Azure OpenAI API if available
  
When enabled, the system will use the pre-built templates for brand identity generation
regardless of whether Azure OpenAI credentials are valid or not.
`);
  process.exit(0);
}

// Remove existing setting if present
const regex = /\nUSE_LOCAL_GENERATION=.*/g;
envContent = envContent.replace(regex, '');

// Add the new setting if enabling
if (action === 'enable') {
  envContent += '\nUSE_LOCAL_GENERATION=true';
  console.log('✅ Local generation mode ENABLED.');
  console.log('Brand identity will now use pre-built templates instead of Azure OpenAI.');
} else {
  console.log('✅ Local generation mode DISABLED.');
  console.log('Brand identity will attempt to use Azure OpenAI if credentials are available.');
}

// Write the modified content back to the .env file
try {
  fs.writeFileSync(envPath, envContent);
  console.log('.env file updated successfully.');
} catch (error) {
  console.error('Error writing to .env file:', error.message);
  process.exit(1);
}

console.log(`\nRestart your server for the changes to take effect.`); 