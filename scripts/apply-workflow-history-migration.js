const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running workflow history migration...');
  
  try {
    // Add new columns to claim_workflow_history
    console.log('Adding new columns to claim_workflow_history...');
    const { error: alterError } = await supabase.rpc('query', {
      query: `
        ALTER TABLE claim_workflow_history 
        ADD COLUMN IF NOT EXISTS updated_claim_text TEXT,
        ADD COLUMN IF NOT EXISTS comment TEXT;
      `
    });
    
    if (alterError) {
      console.error('Error adding columns:', alterError);
      // Try running the SQL directly through the admin API
      const migration = `
        -- Add fields to claim_workflow_history to track updated claim text and separate comment field
        ALTER TABLE claim_workflow_history 
        ADD COLUMN IF NOT EXISTS updated_claim_text TEXT,
        ADD COLUMN IF NOT EXISTS comment TEXT;
      `;
      
      console.log('Trying alternative method...');
      // Note: You'll need to run this in Supabase SQL Editor
      console.log('\nPlease run the following SQL in your Supabase SQL Editor:');
      console.log('================================================');
      console.log(migration);
      console.log('================================================');
    } else {
      console.log('✓ Columns added successfully');
    }
    
    // Update the function
    console.log('\nUpdating advance_claim_workflow function...');
    const functionSQL = `
CREATE OR REPLACE FUNCTION advance_claim_workflow(
  p_claim_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_feedback TEXT DEFAULT '',
  p_reviewer_id UUID DEFAULT NULL,
  p_comment TEXT DEFAULT NULL,
  p_updated_claim_text TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_step_id UUID;
  v_workflow_id UUID;
  v_next_step_id UUID;
  v_first_step_id UUID;
  v_step_name TEXT;
  v_result JSONB;
BEGIN
  -- Get current workflow info
  SELECT current_workflow_step, workflow_id
  INTO v_current_step_id, v_workflow_id
  FROM claims
  WHERE id = p_claim_id;

  IF v_current_step_id IS NULL OR v_workflow_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Claim has no active workflow'
    );
  END IF;

  -- Get step name
  SELECT name INTO v_step_name
  FROM claims_workflow_steps
  WHERE id = v_current_step_id;

  -- Record the action in history with new fields
  INSERT INTO claim_workflow_history (
    claim_id,
    workflow_step_id,
    step_name,
    action_status,
    feedback,
    reviewer_id,
    created_at,
    comment,
    updated_claim_text
  ) VALUES (
    p_claim_id,
    v_current_step_id,
    v_step_name,
    CASE 
      WHEN p_action = 'approve' THEN 'approved'
      WHEN p_action = 'reject' THEN 'rejected'
      ELSE 'pending_review'
    END,
    p_feedback,
    p_reviewer_id,
    NOW(),
    p_comment,
    p_updated_claim_text
  );

  -- Handle approval
  IF p_action = 'approve' THEN
    -- Add current step to completed steps
    UPDATE claims
    SET completed_workflow_steps = array_append(
      COALESCE(completed_workflow_steps, ARRAY[]::UUID[]), 
      v_current_step_id
    )
    WHERE id = p_claim_id;

    -- Get next step
    SELECT id INTO v_next_step_id
    FROM claims_workflow_steps
    WHERE workflow_id = v_workflow_id
      AND step_order > (
        SELECT step_order 
        FROM claims_workflow_steps 
        WHERE id = v_current_step_id
      )
    ORDER BY step_order
    LIMIT 1;

    IF v_next_step_id IS NOT NULL THEN
      -- Move to next step
      UPDATE claims
      SET 
        current_workflow_step = v_next_step_id,
        workflow_status = 'pending_review',
        updated_at = NOW(),
        updated_by = p_reviewer_id
      WHERE id = p_claim_id;
    ELSE
      -- Workflow completed
      UPDATE claims
      SET 
        current_workflow_step = NULL,
        workflow_status = 'completed',
        updated_at = NOW(),
        updated_by = p_reviewer_id
      WHERE id = p_claim_id;
    END IF;

  -- Handle rejection
  ELSIF p_action = 'reject' THEN
    -- Get first step of the workflow
    SELECT id INTO v_first_step_id
    FROM claims_workflow_steps
    WHERE workflow_id = v_workflow_id
    ORDER BY step_order
    LIMIT 1;

    -- Reset to first step and clear completed steps
    UPDATE claims
    SET 
      current_workflow_step = v_first_step_id,
      completed_workflow_steps = ARRAY[]::UUID[],
      workflow_status = 'pending_review',
      updated_at = NOW(),
      updated_by = p_reviewer_id
    WHERE id = p_claim_id;

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be "approve" or "reject"'
    );
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'next_step_id', CASE 
      WHEN p_action = 'approve' THEN v_next_step_id 
      ELSE v_first_step_id 
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    console.log('\nPlease also run this function update in your Supabase SQL Editor.');
    
    // Update the view
    console.log('\nUpdating claims_pending_approval view...');
    const viewSQL = `
CREATE OR REPLACE VIEW public.claims_pending_approval AS
SELECT 
    c.id,
    c.claim_text,
    c.claim_type,
    c.level,
    c.description,
    c.workflow_id,
    c.current_workflow_step,
    c.workflow_status,
    c.created_at,
    c.created_by,
    cw.name as workflow_name,
    ws.name as current_step_name,
    ws.role as current_step_role,
    ws.assigned_user_ids as current_step_assignees,
    p.full_name as creator_name,
    CASE 
        WHEN c.level = 'brand' THEN mcb.name
        WHEN c.level = 'product' THEN prod.name
        WHEN c.level = 'ingredient' THEN ing.name
    END as entity_name,
    -- Add brand information from workflow or master claim brand's associated brand
    COALESCE(cw.brand_id, b.id, mcb_brand.id) as brand_id,
    COALESCE(b.name, mcb_brand.name) as brand_name,
    COALESCE(b.logo_url, mcb_brand.logo_url) as brand_logo_url,
    COALESCE(b.brand_color, mcb_brand.brand_color) as brand_primary_color
FROM public.claims c
LEFT JOIN public.claims_workflows cw ON c.workflow_id = cw.id
LEFT JOIN public.claims_workflow_steps ws ON c.current_workflow_step = ws.id
LEFT JOIN public.profiles p ON c.created_by = p.id
LEFT JOIN public.master_claim_brands mcb ON c.master_brand_id = mcb.id
LEFT JOIN public.products prod ON c.product_id = prod.id
LEFT JOIN public.ingredients ing ON c.ingredient_id = ing.id
-- Join brands based on workflow
LEFT JOIN public.brands b ON cw.brand_id = b.id
-- Join brands through master claim brands (for products)
LEFT JOIN public.brands mcb_brand ON mcb.mixerai_brand_id = mcb_brand.id
WHERE c.workflow_status = 'pending_review'
  AND c.workflow_id IS NOT NULL;
    `;
    
    console.log('\nAnd finally, run this view update in your Supabase SQL Editor.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();