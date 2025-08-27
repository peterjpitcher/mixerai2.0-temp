#!/usr/bin/env node

/**
 * Diagnostic script to test the content-templates API endpoint
 * and understand why it's returning 403 errors in production
 * 
 * ROOT CAUSE FOUND: CSRF validation is failing because the client
 * is not sending the x-csrf-token header with PUT requests.
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const TEMPLATE_ID = '9810e38d-3401-441f-896e-0a7a7ca99e68';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function diagnoseEndpoint() {
  console.log('=== Content Templates API Diagnostic ===\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Base URL:', BASE_URL);
  console.log('Template ID:', TEMPLATE_ID);
  console.log('\n');

  try {
    // First, let's try to fetch without authentication
    console.log('1. Testing without authentication...');
    const noAuthResponse = await fetch(`${BASE_URL}/api/content-templates/${TEMPLATE_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response Status:', noAuthResponse.status);
    console.log('Response Headers:', Object.fromEntries(noAuthResponse.headers.entries()));
    
    const contentType = noAuthResponse.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    let responseBody;
    if (contentType && contentType.includes('application/json')) {
      responseBody = await noAuthResponse.json();
      console.log('JSON Response:', JSON.stringify(responseBody, null, 2));
    } else {
      responseBody = await noAuthResponse.text();
      console.log('Text Response:', responseBody.substring(0, 200) + '...');
    }
    
    console.log('\n---\n');

    // Now let's try with a mock authentication header
    console.log('2. Testing with mock authentication header...');
    const authResponse = await fetch(`${BASE_URL}/api/content-templates/${TEMPLATE_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
        'X-User-Role': 'admin', // Mock role header
      },
    });

    console.log('Response Status:', authResponse.status);
    console.log('Response Headers:', Object.fromEntries(authResponse.headers.entries()));
    
    const authContentType = authResponse.headers.get('content-type');
    console.log('Content-Type:', authContentType);
    
    let authResponseBody;
    if (authContentType && authContentType.includes('application/json')) {
      authResponseBody = await authResponse.json();
      console.log('JSON Response:', JSON.stringify(authResponseBody, null, 2));
    } else {
      authResponseBody = await authResponse.text();
      console.log('Text Response:', authResponseBody.substring(0, 200) + '...');
    }

    console.log('\n---\n');

    // Test what happens with a PUT request
    console.log('3. Testing PUT request...');
    const putResponse = await fetch(`${BASE_URL}/api/content-templates/${TEMPLATE_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Template',
        description: 'Test Description',
        inputFields: [],
        outputFields: []
      }),
    });

    console.log('Response Status:', putResponse.status);
    console.log('Response Headers:', Object.fromEntries(putResponse.headers.entries()));
    
    const putContentType = putResponse.headers.get('content-type');
    console.log('Content-Type:', putContentType);
    
    let putResponseBody;
    if (putContentType && putContentType.includes('application/json')) {
      putResponseBody = await putResponse.json();
      console.log('JSON Response:', JSON.stringify(putResponseBody, null, 2));
    } else {
      putResponseBody = await putResponse.text();
      console.log('Text Response:', putResponseBody.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('Diagnostic Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Check if the API error handler is working
async function testErrorEndpoint() {
  console.log('\n=== Testing Error Handler ===\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/error`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Error Endpoint Status:', response.status);
    console.log('Error Endpoint Headers:', Object.fromEntries(response.headers.entries()));
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const body = await response.json();
      console.log('Error Endpoint JSON:', JSON.stringify(body, null, 2));
    } else {
      const body = await response.text();
      console.log('Error Endpoint Text:', body);
    }
  } catch (error) {
    console.error('Error testing error endpoint:', error.message);
  }
}

// Run diagnostics
async function run() {
  await diagnoseEndpoint();
  await testErrorEndpoint();
  
  console.log('\n=== Diagnostic Complete ===');
  console.log('\nNext steps:');
  console.log('1. Check the server logs for [DEBUG] messages');
  console.log('2. Compare the response headers between dev and production');
  console.log('3. Check if Vercel is intercepting the response');
}

run().catch(console.error);