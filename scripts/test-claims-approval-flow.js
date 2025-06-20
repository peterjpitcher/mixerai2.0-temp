#!/usr/bin/env node

/**
 * Test script for claims approval workflow
 * Tests the end-to-end flow including security fixes
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test user credentials (you'll need to update these)
const TEST_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'password123'
  },
  approver1: {
    email: 'approver1@example.com', 
    password: 'password123'
  },
  approver2: {
    email: 'approver2@example.com',
    password: 'password123'
  }
};

async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed for ${email}`);
  }
  
  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function testPendingApprovalSecurity(authCookie) {
  console.log('\n🔒 Testing pending approval security...');
  
  const response = await fetch(`${API_BASE_URL}/api/claims/pending-approval`, {
    headers: {
      'Cookie': authCookie
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('❌ Failed to fetch pending approvals:', data.error);
    return false;
  }
  
  console.log(`✅ Fetched ${data.data.length} pending claims`);
  console.log('📋 Verifying user can only see assigned claims...');
  
  // Check that current user ID is in assignees for all returned claims
  const currentUserId = data.currentUserId;
  const unauthorizedClaims = data.data.filter(claim => 
    !claim.current_step_assignees?.includes(currentUserId)
  );
  
  if (unauthorizedClaims.length > 0) {
    console.error('❌ Security issue: User can see claims they are not assigned to!');
    console.error('Unauthorized claims:', unauthorizedClaims.map(c => c.id));
    return false;
  }
  
  console.log('✅ Security check passed: User only sees assigned claims');
  return true;
}

async function testWorkflowProgression(authCookie, claimId) {
  console.log('\n📈 Testing workflow progression...');
  
  // Approve the claim
  const approveResponse = await fetch(`${API_BASE_URL}/api/claims/${claimId}/approve`, {
    method: 'POST',
    headers: {
      'Cookie': authCookie,
      'Content-Type': 'application/json'
    }
  });
  
  const approveData = await approveResponse.json();
  
  if (!approveData.success) {
    console.error('❌ Failed to approve claim:', approveData.error);
    return false;
  }
  
  console.log('✅ Claim approved successfully');
  
  // Check if completed_workflow_steps was updated
  const claimResponse = await fetch(`${API_BASE_URL}/api/claims/${claimId}`, {
    headers: {
      'Cookie': authCookie
    }
  });
  
  const claimData = await claimResponse.json();
  
  if (!claimData.success) {
    console.error('❌ Failed to fetch claim details:', claimData.error);
    return false;
  }
  
  if (claimData.data.completed_workflow_steps === undefined) {
    console.error('❌ Missing completed_workflow_steps column in database');
    console.log('🔧 Please run: ./scripts/run-migrations.sh');
    return false;
  }
  
  console.log(`✅ Workflow steps completed: ${claimData.data.completed_workflow_steps}`);
  return true;
}

async function runTests() {
  console.log('🧪 Starting claims approval workflow tests...\n');
  
  try {
    // Test 1: Login as approver
    console.log('1️⃣ Testing login...');
    const authCookie = await login(TEST_USERS.approver1.email, TEST_USERS.approver1.password);
    console.log('✅ Login successful');
    
    // Test 2: Security check on pending approvals
    const securityPassed = await testPendingApprovalSecurity(authCookie);
    if (!securityPassed) {
      console.error('\n❌ Security test failed!');
      process.exit(1);
    }
    
    // Test 3: Get a claim to test workflow progression
    const pendingResponse = await fetch(`${API_BASE_URL}/api/claims/pending-approval`, {
      headers: { 'Cookie': authCookie }
    });
    const pendingData = await pendingResponse.json();
    
    if (pendingData.data.length > 0) {
      const testClaim = pendingData.data[0];
      console.log(`\n📄 Testing with claim: ${testClaim.title || testClaim.id}`);
      
      const workflowPassed = await testWorkflowProgression(authCookie, testClaim.id);
      if (!workflowPassed) {
        console.error('\n❌ Workflow progression test failed!');
        process.exit(1);
      }
    } else {
      console.log('\n⚠️  No pending claims to test workflow progression');
    }
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);