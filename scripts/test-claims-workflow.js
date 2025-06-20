#!/usr/bin/env node

/**
 * Test script for claims approval workflow
 * This script tests the complete flow from claim creation to approval/rejection
 */

const fetch = require('node-fetch');

// Test configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || ''; // You'll need to set this

// Helper function to make authenticated requests
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`Error from ${endpoint}:`, data);
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return data;
}

async function testClaimsWorkflow() {
  console.log('🧪 Starting Claims Workflow Test Suite\n');

  try {
    // Step 1: Get available workflows
    console.log('1️⃣ Fetching available workflows...');
    const workflowsResponse = await makeRequest('/api/claims/workflows');
    const workflows = workflowsResponse.data || [];
    console.log(`Found ${workflows.length} workflows`);
    
    if (workflows.length === 0) {
      console.log('❌ No workflows found. Please create a workflow first.');
      return;
    }

    const testWorkflow = workflows[0];
    console.log(`Using workflow: ${testWorkflow.name} (${testWorkflow.id})`);

    // Step 2: Get master claim brands
    console.log('\n2️⃣ Fetching master claim brands...');
    const brandsResponse = await makeRequest('/api/claims/matrix?type=brand');
    const brands = brandsResponse.data || [];
    console.log(`Found ${brands.length} master claim brands`);

    if (brands.length === 0) {
      console.log('❌ No master claim brands found. Please create one first.');
      return;
    }

    const testBrand = brands[0];
    console.log(`Using brand: ${testBrand.name} (${testBrand.id})`);

    // Step 3: Create a test claim
    console.log('\n3️⃣ Creating a test claim...');
    const claimData = {
      claim_text: `Test claim for workflow testing - ${new Date().toISOString()}`,
      claim_type: 'allowed',
      level: 'brand',
      description: 'This is a test claim to verify the approval workflow',
      master_brand_id: testBrand.id,
      country_codes: ['US'],
      workflow_id: testWorkflow.id
    };

    const createResponse = await makeRequest('/api/claims', {
      method: 'POST',
      body: JSON.stringify(claimData),
    });

    const createdClaim = createResponse.claims?.[0];
    if (!createdClaim) {
      console.log('❌ Failed to create claim');
      return;
    }

    console.log(`✅ Created claim: ${createdClaim.id}`);

    // Step 4: Check pending approval list
    console.log('\n4️⃣ Checking pending approval claims...');
    const pendingResponse = await makeRequest('/api/claims/pending-approval');
    const pendingClaims = pendingResponse.data || [];
    
    const ourClaim = pendingClaims.find(c => c.id === createdClaim.id);
    if (ourClaim) {
      console.log('✅ Claim appears in pending approval list');
      console.log(`   Current step: ${ourClaim.current_step_name}`);
      console.log(`   Assigned to: ${ourClaim.current_step_assignees?.join(', ') || 'No assignees'}`);
    } else {
      console.log('❌ Claim not found in pending approval list');
    }

    // Step 5: Get claim details
    console.log('\n5️⃣ Fetching claim details...');
    const detailsResponse = await makeRequest(`/api/claims/${createdClaim.id}/details`);
    const claimDetails = detailsResponse.data;
    
    console.log('Claim details:');
    console.log(`   Status: ${claimDetails.claim.workflow_status}`);
    console.log(`   Workflow steps: ${claimDetails.workflowSteps.length}`);
    console.log(`   History entries: ${claimDetails.history.length}`);

    // Step 6: Get workflow status
    console.log('\n6️⃣ Checking workflow status...');
    const workflowStatusResponse = await makeRequest(`/api/claims/${createdClaim.id}/workflow`);
    const workflowStatus = workflowStatusResponse.data;
    
    console.log('Workflow status retrieved successfully');
    
    // Step 7: Attempt to approve the claim
    console.log('\n7️⃣ Testing claim approval...');
    try {
      const approveResponse = await makeRequest(`/api/claims/${createdClaim.id}/workflow`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'approve',
          comment: 'Approved via test script'
        }),
      });

      if (approveResponse.success) {
        console.log('✅ Claim approved successfully');
      } else {
        console.log('❌ Approval failed:', approveResponse.error);
      }
    } catch (error) {
      console.log('❌ Error during approval:', error.message);
      console.log('   This might be expected if you are not assigned to the current step');
    }

    // Step 8: Check updated status
    console.log('\n8️⃣ Checking updated claim status...');
    const updatedDetailsResponse = await makeRequest(`/api/claims/${createdClaim.id}/details`);
    const updatedDetails = updatedDetailsResponse.data;
    
    console.log(`Updated status: ${updatedDetails.claim.workflow_status}`);
    console.log(`History entries: ${updatedDetails.history.length}`);

    // Step 9: Test rejection flow
    console.log('\n9️⃣ Testing claim rejection...');
    try {
      const rejectResponse = await makeRequest(`/api/claims/${createdClaim.id}/workflow`, {
        method: 'PUT',
        body: JSON.stringify({
          action: 'reject',
          feedback: 'Rejected for testing purposes',
          comment: 'This is a test rejection'
        }),
      });

      if (rejectResponse.success) {
        console.log('✅ Claim rejected successfully');
      } else {
        console.log('❌ Rejection failed:', rejectResponse.error);
      }
    } catch (error) {
      console.log('❌ Error during rejection:', error.message);
    }

    console.log('\n✨ Test suite completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testClaimsWorkflow().catch(console.error);