const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testClaimDetailsAPI() {
  const claimId = '505aad1c-fc81-435a-a9c2-83fe88c878e8';
  
  console.log('Testing claim details API...');
  console.log('Claim ID:', claimId);
  
  try {
    // First, check if the claim exists in the database
    console.log('\n1. Checking if claim exists in database...');
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();
    
    if (claimError) {
      console.error('Error fetching claim:', claimError);
      if (claimError.code === 'PGRST116') {
        console.log('❌ Claim not found in database');
      }
      return;
    }
    
    if (claim) {
      console.log('✅ Claim found in database:');
      console.log('  - Text:', claim.claim_text);
      console.log('  - Type:', claim.claim_type);
      console.log('  - Level:', claim.level);
      console.log('  - Workflow ID:', claim.workflow_id);
      console.log('  - Current Step:', claim.current_workflow_step);
      console.log('  - Status:', claim.workflow_status);
    }
    
    // Check if there are any claims with workflow_status = 'pending_review'
    console.log('\n2. Checking for claims with pending_review status...');
    const { data: pendingClaims, error: pendingError } = await supabase
      .from('claims')
      .select('id, claim_text, workflow_status')
      .eq('workflow_status', 'pending_review')
      .limit(5);
    
    if (pendingError) {
      console.error('Error fetching pending claims:', pendingError);
    } else if (pendingClaims && pendingClaims.length > 0) {
      console.log(`✅ Found ${pendingClaims.length} claims with pending_review status:`);
      pendingClaims.forEach(c => {
        console.log(`  - ID: ${c.id}, Text: ${c.claim_text.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ No claims found with pending_review status');
    }
    
    // Check the claims_pending_approval view
    console.log('\n3. Checking claims_pending_approval view...');
    const { data: viewData, error: viewError } = await supabase
      .from('claims_pending_approval')
      .select('*')
      .limit(5);
    
    if (viewError) {
      console.error('Error fetching from view:', viewError);
    } else if (viewData && viewData.length > 0) {
      console.log(`✅ Found ${viewData.length} claims in pending approval view`);
      viewData.forEach(c => {
        console.log(`  - ID: ${c.id}, Text: ${c.claim_text.substring(0, 50)}...`);
      });
    } else {
      console.log('❌ No claims found in pending approval view');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testClaimDetailsAPI();