#!/usr/bin/env node

/**
 * Test Script for AI Title Generation Feature
 * 
 * This script tests the new AI-powered title generation functionality
 * that was added to the content creation workflow.
 */

const fetch = require('node-fetch');
require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_CONTENT = `
This delicious chocolate chip cookie recipe yields soft, chewy cookies with a perfect balance of sweetness and chocolate. 
Made with high-quality butter, brown sugar, and premium chocolate chips, these cookies are ideal for any occasion. 
The secret to their incredible texture lies in chilling the dough for at least 30 minutes before baking.
`;

async function testTitleGeneration() {
  console.log('🧪 Testing AI Title Generation Feature\n');
  
  try {
    // Test 1: Basic title generation
    console.log('Test 1: Basic title generation with content body only');
    const response1 = await fetch(`${API_BASE_URL}/api/ai/generate-title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need proper authentication headers
      },
      body: JSON.stringify({
        contentBody: TEST_CONTENT,
        brand_id: 'test-brand-id', // Replace with actual brand ID
      })
    });
    
    const result1 = await response1.json();
    console.log('Response:', result1);
    
    if (result1.success) {
      console.log('✅ Generated title:', result1.title);
    } else {
      console.log('❌ Error:', result1.error);
    }
    
    // Test 2: Title generation with topic and keywords
    console.log('\nTest 2: Title generation with topic and keywords');
    const response2 = await fetch(`${API_BASE_URL}/api/ai/generate-title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentBody: TEST_CONTENT,
        brand_id: 'test-brand-id', // Replace with actual brand ID
        topic: 'Baking Recipe',
        keywords: ['chocolate chip', 'cookies', 'homemade', 'easy recipe']
      })
    });
    
    const result2 = await response2.json();
    console.log('Response:', result2);
    
    if (result2.success) {
      console.log('✅ Generated title with context:', result2.title);
    } else {
      console.log('❌ Error:', result2.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTitleGeneration();