#!/usr/bin/env node

const fetch = require('node-fetch');

async function testBrandUpdate() {
  try {
    // Test payload similar to what the UI sends
    const payload = {
      name: 'Test Brand Update',
      website_url: 'https://test.com',
      additional_website_urls: null,
      country: 'GB',
      language: 'en',
      brand_identity: 'Test identity',
      tone_of_voice: 'Professional',
      guardrails: 'Test guardrails',
      brand_color: '#1982C4',
      master_claim_brand_id: null,
      selected_agency_ids: [],
      new_custom_agency_names: [],
      logo_url: null
    };

    console.log('Testing brand update with payload:', payload);

    const response = await fetch('http://localhost:3002/api/brands/d5298cc7-64e0-4faa-a2e0-875358f46599', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Add any auth headers if needed
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('Error:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testBrandUpdate();