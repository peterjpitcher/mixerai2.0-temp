#!/usr/bin/env node

/**
 * Script to check for existing workflows that have steps without assignees
 * This helps identify workflows that would fail validation with the new requirements
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWorkflowsWithoutAssignees() {
  try {
    console.log('Fetching all workflows...\n');
    
    // Fetch all workflows
    const { data: workflows, error: workflowsError } = await supabase
      .from('workflows')
      .select('id, name, brand_id')
      .order('created_at', { ascending: false });
    
    if (workflowsError) {
      console.error('Error fetching workflows:', workflowsError);
      return;
    }
    
    console.log(`Found ${workflows.length} workflows\n`);
    
    let workflowsWithIssues = [];
    
    // Check each workflow's steps
    for (const workflow of workflows) {
      const { data: steps, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('id, name, assigned_user_ids')
        .eq('workflow_id', workflow.id)
        .order('step_order', { ascending: true });
      
      if (stepsError) {
        console.error(`Error fetching steps for workflow ${workflow.id}:`, stepsError);
        continue;
      }
      
      const stepsWithoutAssignees = steps.filter(step => 
        !step.assigned_user_ids || 
        step.assigned_user_ids.length === 0
      );
      
      if (stepsWithoutAssignees.length > 0) {
        workflowsWithIssues.push({
          workflow,
          stepsWithoutAssignees
        });
      }
    }
    
    // Report findings
    if (workflowsWithIssues.length === 0) {
      console.log('✅ All workflows have assignees for all steps!');
    } else {
      console.log(`⚠️  Found ${workflowsWithIssues.length} workflows with steps lacking assignees:\n`);
      
      workflowsWithIssues.forEach(({ workflow, stepsWithoutAssignees }) => {
        console.log(`Workflow: ${workflow.name} (ID: ${workflow.id})`);
        console.log(`  Steps without assignees:`);
        stepsWithoutAssignees.forEach(step => {
          console.log(`    - ${step.name} (ID: ${step.id})`);
        });
        console.log('');
      });
      
      console.log('These workflows will need to be updated to add assignees to all steps.');
    }
    
  } catch (error) {
    console.error('Error checking workflows:', error);
  }
}

// Run the check
console.log('=== Checking for Workflows Without Assignees ===\n');
checkWorkflowsWithoutAssignees();