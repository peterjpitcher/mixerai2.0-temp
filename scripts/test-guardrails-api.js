const fetch = require('node-fetch');
require('dotenv').config();

// Use the app URL from environment variables
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testGuardrailsInAPI() {
  console.log('🔍 Testing Guardrails in API Responses\n');
  console.log(`Using APP_URL: ${APP_URL}\n`);

  try {
    // First, we need to authenticate
    console.log('1. Testing brands listing API...');
    const brandsResponse = await fetch(`${APP_URL}/api/brands`, {
      headers: {
        'Cookie': 'your-auth-cookie-here' // You'll need to add a valid auth cookie
      }
    });

    if (!brandsResponse.ok) {
      console.log(`❌ Brands API returned status: ${brandsResponse.status}`);
      const errorText = await brandsResponse.text();
      console.log('Error response:', errorText);
      console.log('\n⚠️  Note: You need to provide valid authentication cookies to test protected APIs.');
      console.log('You can get these from your browser DevTools while logged in.\n');
      return;
    }

    const brandsData = await brandsResponse.json();
    console.log(`✅ Brands API returned ${brandsData.data?.length || 0} brands\n`);

    // Check if any brands have guardrails
    const brandsWithGuardrails = brandsData.data?.filter(brand => brand.guardrails) || [];
    console.log(`📋 Brands with guardrails: ${brandsWithGuardrails.length}`);

    if (brandsWithGuardrails.length > 0) {
      console.log('\nSample brand with guardrails:');
      const sampleBrand = brandsWithGuardrails[0];
      console.log(`- ID: ${sampleBrand.id}`);
      console.log(`- Name: ${sampleBrand.name}`);
      console.log(`- Guardrails: ${sampleBrand.guardrails?.substring(0, 100)}...`);
    } else {
      console.log('⚠️  No brands have guardrails set');
    }

    // Test individual brand API
    if (brandsData.data?.length > 0) {
      const firstBrandId = brandsData.data[0].id;
      console.log(`\n2. Testing individual brand API for ID: ${firstBrandId}...`);
      
      const brandResponse = await fetch(`${APP_URL}/api/brands/${firstBrandId}`, {
        headers: {
          'Cookie': 'your-auth-cookie-here' // Same auth cookie
        }
      });

      if (brandResponse.ok) {
        const brandData = await brandResponse.json();
        console.log('✅ Individual brand API response:');
        console.log(`- Has guardrails field: ${brandData.brand?.guardrails !== undefined}`);
        console.log(`- Guardrails value: ${brandData.brand?.guardrails ? 'Present' : 'Empty/null'}`);
        if (brandData.brand?.guardrails) {
          console.log(`- Guardrails preview: ${brandData.brand.guardrails.substring(0, 100)}...`);
        }
      } else {
        console.log(`❌ Individual brand API returned status: ${brandResponse.status}`);
      }
    }

  } catch (error) {
    console.error('❌ Error testing APIs:', error.message);
  }
}

// Run the test
testGuardrailsInAPI();