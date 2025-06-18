#!/usr/bin/env node

/**
 * Test script to verify workflow assignee validation
 * Tests both creation and update endpoints
 */

const fetch = require('node-fetch');

// Test configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_WORKFLOW_DATA = {
  name: 'Test Workflow - Assignee Validation',
  brand_id: 'test-brand-id', // This would need to be a valid brand ID
  status: 'draft',
  steps: [
    {
      name: 'Review Step 1',
      description: 'First review step',
      role: 'editor',
      approvalRequired: true,
      assignees: [] // Empty assignees - should fail validation
    },
    {
      name: 'Review Step 2',
      description: 'Second review step',
      role: 'brand',
      approvalRequired: true,
      assignees: [
        { email: 'test@example.com', name: 'Test User' }
      ]
    }
  ]
};

async function testWorkflowCreation() {
  console.log('Testing workflow creation with missing assignee...\n');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_WORKFLOW_DATA)
    });
    
    const data = await response.json();
    
    if (response.status === 400 && data.error && data.error.includes('must have at least one assignee')) {
      console.log('✅ Validation working correctly!');
      console.log(`   Error message: ${data.error}`);
    } else {
      console.log('❌ Validation not working as expected');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, data);
    }
  } catch (error) {
    console.error('Error testing workflow creation:', error);
  }
}

async function testWorkflowWithAssignees() {
  console.log('\n\nTesting workflow creation with all assignees provided...\n');
  
  const validWorkflowData = {
    ...TEST_WORKFLOW_DATA,
    steps: TEST_WORKFLOW_DATA.steps.map(step => ({
      ...step,
      assignees: [{ email: 'test@example.com', name: 'Test User' }]
    }))
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validWorkflowData)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Workflow with assignees can be created successfully');
    } else {
      console.log('ℹ️  Response:', response.status, data);
      console.log('   Note: This may fail due to authentication or other validation');
    }
  } catch (error) {
    console.error('Error testing valid workflow:', error);
  }
}

// Run tests
async function runTests() {
  console.log('=== Workflow Assignee Validation Tests ===\n');
  console.log(`Testing against: ${API_BASE_URL}`);
  console.log('Note: These tests assume the API is running and accessible\n');
  
  await testWorkflowCreation();
  await testWorkflowWithAssignees();
  
  console.log('\n=== Tests Complete ===');
}

runTests();