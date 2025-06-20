#!/usr/bin/env node

/**
 * Test script to verify content templates API endpoint
 */

const fetch = require('node-fetch');

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testContentTemplatesAPI() {
  console.log('Testing content templates API endpoint...');
  console.log(`API URL: ${API_URL}/api/content-templates`);
  
  try {
    const response = await fetch(`${API_URL}/api/content-templates`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`API returned error status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('\nAPI Response structure:');
    console.log('Keys:', Object.keys(data));
    
    if (data.templates) {
      console.log(`\nFound ${data.templates.length} templates under 'templates' key`);
      if (data.templates.length > 0) {
        console.log('\nFirst template:', JSON.stringify(data.templates[0], null, 2));
      }
    } else if (data.data) {
      console.log(`\nFound ${data.data.length} templates under 'data' key`);
      if (data.data.length > 0) {
        console.log('\nFirst template:', JSON.stringify(data.data[0], null, 2));
      }
    } else {
      console.log('\nNo templates found in response');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('Error calling API:', error.message);
  }
}

// Run the test
testContentTemplatesAPI();