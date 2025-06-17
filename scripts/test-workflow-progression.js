const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWorkflowProgression() {
  console.log('Testing workflow progression...\n');
  
  try {
    // 1. First check if the advance_claim_workflow function exists
    console.log('1. Checking if advance_claim_workflow function exists...');
    const { data: functions, error: funcError } = await supabase
      .rpc('pg_proc')
      .select('proname')
      .eq('proname', 'advance_claim_workflow');
    
    if (funcError) {
      console.log('Note: Could not check for function existence (this is normal)');
    }
    
    // 2. Get a claim with pending_review status
    console.log('\n2. Finding a claim with pending_review status...');
    const { data: claims, error: claimsError } = await supabase
      .from('claims')
      .select(`
        id,
        claim_text,
        workflow_id,
        current_workflow_step,
        workflow_status,
        completed_workflow_steps
      `)
      .eq('workflow_status', 'pending_review')
      .limit(1);
    
    if (claimsError) {
      console.error('Error fetching claims:', claimsError);
      return;
    }
    
    if (!claims || claims.length === 0) {
      console.log('No claims found with pending_review status');
      return;
    }
    
    const claim = claims[0];
    console.log('Found claim:', {
      id: claim.id,
      text: claim.claim_text.substring(0, 50) + '...',
      workflow_id: claim.workflow_id,
      current_step: claim.current_workflow_step,
      status: claim.workflow_status
    });
    
    // 3. Get workflow steps
    console.log('\n3. Getting workflow steps...');
    const { data: steps, error: stepsError } = await supabase
      .from('claims_workflow_steps')
      .select('*')
      .eq('workflow_id', claim.workflow_id)
      .order('step_order');
    
    if (stepsError) {
      console.error('Error fetching workflow steps:', stepsError);
      return;
    }
    
    console.log(`Found ${steps.length} workflow steps:`);
    steps.forEach(step => {
      const isCurrent = step.id === claim.current_workflow_step;
      const isCompleted = claim.completed_workflow_steps?.includes(step.id);
      console.log(`  ${step.step_order}. ${step.name} (${step.role}) ${isCurrent ? '← CURRENT' : ''} ${isCompleted ? '✓ COMPLETED' : ''}`);
    });
    
    // 4. Test the advance_claim_workflow function directly
    console.log('\n4. Testing advance_claim_workflow function...');
    console.log('Attempting to approve claim...');
    
    const { data: result, error: rpcError } = await supabase.rpc('advance_claim_workflow', {
      p_claim_id: claim.id,
      p_action: 'approve',
      p_feedback: '',
      p_reviewer_id: null,
      p_comment: 'Test approval',
      p_updated_claim_text: null
    });
    
    if (rpcError) {
      console.error('Error calling advance_claim_workflow:', rpcError);
      console.error('Full error details:', JSON.stringify(rpcError, null, 2));
      
      // Check if it's a function not found error
      if (rpcError.message && rpcError.message.includes('function')) {
        console.log('\n⚠️  The advance_claim_workflow function does not exist in the database.');
        console.log('Please run the migration script to create it.');
      }
      return;
    }
    
    console.log('Function result:', result);
    
    // 5. Check the claim status after approval
    console.log('\n5. Checking claim status after approval...');
    const { data: updatedClaim, error: updateError } = await supabase
      .from('claims')
      .select(`
        id,
        workflow_status,
        current_workflow_step,
        completed_workflow_steps
      `)
      .eq('id', claim.id)
      .single();
    
    if (updateError) {
      console.error('Error fetching updated claim:', updateError);
      return;
    }
    
    console.log('Updated claim status:', {
      workflow_status: updatedClaim.workflow_status,
      current_workflow_step: updatedClaim.current_workflow_step,
      completed_steps: updatedClaim.completed_workflow_steps?.length || 0
    });
    
    // Find which step it moved to
    if (updatedClaim.current_workflow_step) {
      const currentStep = steps.find(s => s.id === updatedClaim.current_workflow_step);
      if (currentStep) {
        console.log(`Moved to step: ${currentStep.step_order}. ${currentStep.name}`);
      }
    } else if (updatedClaim.workflow_status === 'completed') {
      console.log('Workflow completed!');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testWorkflowProgression();