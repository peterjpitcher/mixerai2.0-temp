const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdvanceWorkflowFunction() {
  console.log('Checking advance_claim_workflow function...\n');
  
  try {
    // Try to get function information using a different approach
    console.log('1. Attempting to call the function with test parameters...');
    
    // Use a dummy UUID that won't exist
    const dummyId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await supabase.rpc('advance_claim_workflow', {
      p_claim_id: dummyId,
      p_action: 'approve',
      p_feedback: '',
      p_reviewer_id: null,
      p_comment: null,
      p_updated_claim_text: null
    });
    
    if (error) {
      if (error.message && error.message.includes('function advance_claim_workflow')) {
        console.log('❌ Function advance_claim_workflow does NOT exist');
        console.log('\nYou need to run the migration to create this function.');
        console.log('The migration file is: /supabase/migrations/20250117_add_workflow_history_fields.sql');
      } else if (error.message && error.message.includes('Claim has no active workflow')) {
        console.log('✅ Function advance_claim_workflow EXISTS');
        console.log('   (It returned an expected error for the dummy claim ID)');
      } else {
        console.log('Function might exist but returned an error:', error.message);
      }
    } else if (data) {
      console.log('✅ Function advance_claim_workflow EXISTS');
      console.log('   Result:', data);
    }
    
    // Check if the new columns exist in claim_workflow_history
    console.log('\n2. Checking if new columns exist in claim_workflow_history...');
    const { data: historyData, error: historyError } = await supabase
      .from('claim_workflow_history')
      .select('*')
      .limit(1);
    
    if (historyError) {
      console.log('Error checking claim_workflow_history:', historyError.message);
    } else if (historyData && historyData.length > 0) {
      const columns = Object.keys(historyData[0]);
      console.log('Columns in claim_workflow_history:', columns);
      
      const hasUpdatedClaimText = columns.includes('updated_claim_text');
      const hasComment = columns.includes('comment');
      
      console.log(`  - updated_claim_text: ${hasUpdatedClaimText ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`  - comment: ${hasComment ? '✅ EXISTS' : '❌ MISSING'}`);
      
      if (!hasUpdatedClaimText || !hasComment) {
        console.log('\n⚠️  Missing columns! Run the migration to add them.');
      }
    } else {
      console.log('No data in claim_workflow_history table to check columns');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkAdvanceWorkflowFunction();