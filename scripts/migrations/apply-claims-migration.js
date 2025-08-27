#!/usr/bin/env node

/**
 * Apply the completed_workflow_steps migration to Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Checking if completed_workflow_steps column exists...');
  
  try {
    // First, check if the column already exists
    const { data: testData, error: testError } = await supabase
      .from('claims')
      .select('id, completed_workflow_steps')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Column already exists! No migration needed.');
      return;
    }
    
    if (testError && !testError.message.includes('column "completed_workflow_steps" does not exist')) {
      console.error('❌ Unexpected error:', testError);
      return;
    }
    
    console.log('📦 Column does not exist. Creating it now...');
    
    // Apply the migration using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add completed_workflow_steps column to claims table
        ALTER TABLE claims
        ADD COLUMN IF NOT EXISTS completed_workflow_steps INTEGER DEFAULT 0 NOT NULL;
        
        -- Update the column comment
        COMMENT ON COLUMN claims.completed_workflow_steps IS 'Number of workflow steps that have been completed for this claim';
        
        -- Update any existing claims to have the correct completed steps count based on their workflow history
        UPDATE claims c
        SET completed_workflow_steps = (
          SELECT COUNT(DISTINCT cwh.step_number)
          FROM claim_workflow_history cwh
          WHERE cwh.claim_id = c.id
            AND cwh.action = 'approved'
            AND cwh.step_number IS NOT NULL
        )
        WHERE c.workflow_id IS NOT NULL;
        
        -- Create an index for performance
        CREATE INDEX IF NOT EXISTS idx_claims_completed_workflow_steps ON claims(completed_workflow_steps);
      `
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      
      // If exec_sql doesn't exist, try a different approach
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\n⚠️  Unable to apply migration automatically.');
        console.log('Please run this SQL manually in Supabase SQL Editor:');
        console.log('\n--- START SQL ---');
        console.log(`
ALTER TABLE claims
ADD COLUMN IF NOT EXISTS completed_workflow_steps INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN claims.completed_workflow_steps IS 'Number of workflow steps that have been completed for this claim';

UPDATE claims c
SET completed_workflow_steps = (
  SELECT COUNT(DISTINCT cwh.step_number)
  FROM claim_workflow_history cwh
  WHERE cwh.claim_id = c.id
    AND cwh.action = 'approved'
    AND cwh.step_number IS NOT NULL
)
WHERE c.workflow_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claims_completed_workflow_steps ON claims(completed_workflow_steps);
        `);
        console.log('--- END SQL ---\n');
      }
      return;
    }
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the column now exists
    const { data: verifyData, error: verifyError } = await supabase
      .from('claims')
      .select('id, completed_workflow_steps')
      .limit(1);
    
    if (!verifyError) {
      console.log('✅ Column verified - migration complete!');
    } else {
      console.error('⚠️  Column may not have been created properly:', verifyError);
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

applyMigration();