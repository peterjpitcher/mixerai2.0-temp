// Script to diagnose brand identity generation
require('dotenv').config();
const fetch = require('node-fetch');

// Tests to run
const tests = [
  testEnvironmentVariables,
  testFallbackGeneration,
  testAPIResponse,
  testVettingAgencies,
  testBrandColor
];

async function runTests() {
  console.log('====== BRAND IDENTITY GENERATION DIAGNOSTICS ======\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  for (const [index, test] of tests.entries()) {
    try {
      console.log(`\n[TEST ${index + 1}/${tests.length}] Running: ${test.name}`);
      console.log('-'.repeat(50));
      const passed = await test();
      if (passed) {
        console.log(`✅ ${test.name} - Passed`);
        testsPassed++;
      } else {
        console.log(`❌ ${test.name} - Failed`);
        testsFailed++;
      }
    } catch (error) {
      console.error(`❌ ${test.name} - Failed with error:`, error);
      testsFailed++;
    }
  }
  
  console.log('\n====== DIAGNOSTICS SUMMARY ======');
  console.log(`Tests passed: ${testsPassed}/${tests.length}`);
  console.log(`Tests failed: ${testsFailed}/${tests.length}`);
  
  if (testsFailed === 0) {
    console.log('\n✅ All tests passed! The brand identity generation should be working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues listed above.');
  }
}

// Test 1: Check environment variables
async function testEnvironmentVariables() {
  console.log('Testing environment variables...');
  
  const variables = {
    NODE_ENV: process.env.NODE_ENV,
    AZURE_OPENAI_API_KEY: !!process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT,
    USE_LOCAL_GENERATION: process.env.USE_LOCAL_GENERATION
  };
  
  console.log('Environment variables:', variables);
  
  if (!variables.AZURE_OPENAI_API_KEY) {
    console.error('⚠️ Missing AZURE_OPENAI_API_KEY');
  }
  
  if (!variables.AZURE_OPENAI_ENDPOINT) {
    console.error('⚠️ Missing AZURE_OPENAI_ENDPOINT');
  }
  
  if (!variables.AZURE_OPENAI_DEPLOYMENT) {
    console.error('⚠️ Missing AZURE_OPENAI_DEPLOYMENT');
  }
  
  if (variables.USE_LOCAL_GENERATION === 'true') {
    console.log('✓ USE_LOCAL_GENERATION is enabled, will use fallback content');
  }
  
  // The test passes if either API credentials are set OR local generation is enabled
  return variables.USE_LOCAL_GENERATION === 'true' || 
    (variables.AZURE_OPENAI_API_KEY && variables.AZURE_OPENAI_ENDPOINT && variables.AZURE_OPENAI_DEPLOYMENT);
}

// Test 2: Test fallback generation
async function testFallbackGeneration() {
  console.log('Testing API with forced fallback generation...');
  
  try {
    // Create a backup of current .env setting
    const useLocalGenerationOriginal = process.env.USE_LOCAL_GENERATION;
    
    // Force local generation
    process.env.USE_LOCAL_GENERATION = 'true';
    
    // Make API request
    const response = await fetch('http://localhost:3001/api/brands/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: 'Fallback Test Brand',
        urls: ['https://technology-example.com'],
        countryCode: 'US',
        languageCode: 'en'
      })
    });
    
    // Restore original setting
    process.env.USE_LOCAL_GENERATION = useLocalGenerationOriginal;
    
    if (!response.ok) {
      console.error('API request failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('Response received with success:', data.success);
    
    if (!data.success) {
      console.error('API response indicates failure:', data.error);
      return false;
    }
    
    // Check all required fields are present
    const requiredFields = ['brandIdentity', 'toneOfVoice', 'guardrails', 'vettingAgencies', 'brandColor'];
    const missingFields = requiredFields.filter(field => !data.data[field]);
    
    if (missingFields.length > 0) {
      console.error('Response is missing required fields:', missingFields);
      return false;
    }
    
    console.log('All required fields present in response');
    return true;
  } catch (error) {
    console.error('Error testing fallback generation:', error);
    return false;
  }
}

// Test 3: Test basic API response
async function testAPIResponse() {
  console.log('Testing brand identity API response structure...');
  
  try {
    const response = await fetch('http://localhost:3001/api/brands/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: 'API Test Brand',
        urls: ['https://example.com'],
        countryCode: 'GB',
        languageCode: 'en'
      })
    });
    
    if (!response.ok) {
      console.error('API request failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('API response indicates failure:', data.error);
      return false;
    }
    
    console.log('Response fields:', Object.keys(data.data));
    
    // Check success and data object
    if (!data.success || !data.data) {
      console.error('Response missing success indicator or data object');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error testing API response:', error);
    return false;
  }
}

// Test 4: Test vetting agencies
async function testVettingAgencies() {
  console.log('Testing vetting agencies in API response...');
  
  try {
    const response = await fetch('http://localhost:3001/api/brands/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: 'Agency Test Brand',
        urls: ['https://example.com'],
        countryCode: 'GB', // United Kingdom should have specific agencies
        languageCode: 'en'
      })
    });
    
    if (!response.ok) {
      console.error('API request failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('API response indicates failure:', data.error);
      return false;
    }
    
    // Check vettingAgencies
    if (!data.data.vettingAgencies || !Array.isArray(data.data.vettingAgencies)) {
      console.error('Response missing vettingAgencies array');
      return false;
    }
    
    if (data.data.vettingAgencies.length === 0) {
      console.error('vettingAgencies array is empty');
      return false;
    }
    
    // Check first agency has required fields
    const firstAgency = data.data.vettingAgencies[0];
    console.log('First agency example:', firstAgency);
    
    if (!firstAgency.name || !firstAgency.description || !firstAgency.priority) {
      console.error('Agency missing required fields (name, description, priority)');
      return false;
    }
    
    // Ensure agencies for GB include ASA (Advertising Standards Authority)
    const hasASA = data.data.vettingAgencies.some(agency => 
      agency.name === 'ASA' || agency.name.includes('Advertising Standards')
    );
    
    if (!hasASA) {
      console.warn('⚠️ Expected to find ASA for GB country code, but it was not found');
    }
    
    return true;
  } catch (error) {
    console.error('Error testing vetting agencies:', error);
    return false;
  }
}

// Test 5: Test brand color
async function testBrandColor() {
  console.log('Testing brand color in API response...');
  
  try {
    const response = await fetch('http://localhost:3001/api/brands/identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: 'Color Test Brand',
        urls: ['https://example.com'],
        countryCode: 'US',
        languageCode: 'en'
      })
    });
    
    if (!response.ok) {
      console.error('API request failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('API response indicates failure:', data.error);
      return false;
    }
    
    // Check brandColor exists
    if (!data.data.brandColor) {
      console.error('Response missing brandColor');
      return false;
    }
    
    // Validate hex color format
    const isValidHexColor = /^#[0-9A-F]{6}$/i.test(data.data.brandColor);
    if (!isValidHexColor) {
      console.error('Invalid hex color format:', data.data.brandColor);
      return false;
    }
    
    console.log('Brand color from response:', data.data.brandColor);
    return true;
  } catch (error) {
    console.error('Error testing brand color:', error);
    return false;
  }
}

// Run the test suite
runTests(); 