-- Migration: Add created_by column to workflows table
-- Description: Adds a foreign key reference to the profiles table to track who created each workflow

-- Check if the migration has already been applied
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'workflows'
        AND column_name = 'created_by'
    ) THEN
        -- Add the created_by column with a foreign key constraint
        ALTER TABLE workflows
        ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
        
        -- Add a comment to the column
        COMMENT ON COLUMN workflows.created_by IS 'The user who created this workflow';
        
        -- Update existing workflows to set created_by to a system admin if available
        -- This is optional and can be adjusted based on your needs
        UPDATE workflows
        SET created_by = (
            SELECT id
            FROM profiles
            WHERE id IN (
                SELECT user_id
                FROM user_brand_permissions
                WHERE role = 'admin'
                LIMIT 1
            )
        )
        WHERE created_by IS NULL;
        
        RAISE NOTICE 'Added created_by column to workflows table';
    ELSE
        RAISE NOTICE 'Column created_by already exists in workflows table. Skipping migration.';
    END IF;
END
$$;

-- Update RLS policies to account for the new column
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS workflows_select_policy ON workflows;
    
    -- Create updated policy that includes the created_by field
    CREATE POLICY workflows_select_policy ON workflows
        FOR SELECT
        USING (
            -- Allow users to see workflows they created
            auth.uid() = created_by 
            OR 
            -- Allow users to see workflows for brands they have permissions for
            EXISTS (
                SELECT 1 FROM user_brand_permissions
                WHERE user_id = auth.uid()
                AND brand_id = workflows.brand_id
            )
        );
        
    RAISE NOTICE 'Updated RLS policies for workflows table';
END
$$; 