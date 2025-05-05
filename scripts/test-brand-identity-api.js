// Script to test the brand identity API directly
const fetch = require('node-fetch');

async function testBrandIdentityAPI() {
  console.log('==== Brand Identity API Test ====');
  
  try {
    const response = await fetch('http://localhost:3001/api/brands/identity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        brandName: 'Test Brand Name',
        urls: ['https://example.com'],
        countryCode: 'GB',
        languageCode: 'en'
      })
    });
    
    const data = await response.json();
    
    console.log('\n==== API Response Summary ====');
    console.log('Status:', response.status);
    console.log('Success:', data.success);
    
    if (data.success && data.data) {
      console.log('\n==== Generated Content ====');
      console.log('Brand Identity:', summarizeText(data.data.brandIdentity));
      console.log('Tone of Voice:', summarizeText(data.data.toneOfVoice));
      console.log('Guardrails:', summarizeText(data.data.guardrails));
      console.log('Brand Color:', data.data.brandColor);
      
      if (data.data.vettingAgencies && data.data.vettingAgencies.length > 0) {
        console.log('\n==== Vetting Agencies ====');
        data.data.vettingAgencies.forEach((agency, index) => {
          console.log(`${index + 1}. ${agency.name} (${agency.priority}): ${agency.description}`);
        });
      } else {
        console.log('\nNo vetting agencies included in response');
      }
      
      // Output the full response structure
      console.log('\n==== Full Response Structure ====');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('Error making request:', error);
  }
}

// Helper to truncate long text for display
function summarizeText(text) {
  if (!text) return 'Empty';
  return text.length > 100 ? text.substring(0, 100) + '...' : text;
}

testBrandIdentityAPI(); 