-- Add created_by column to brands table
-- This migration adds a column to track which user created each brand

-- First check if the column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'brands' AND column_name = 'created_by'
    ) THEN
        -- Add created_by column as UUID with foreign key reference to auth.users
        ALTER TABLE brands 
        ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        
        -- Add an index for better query performance
        CREATE INDEX idx_brands_created_by ON brands(created_by);
        
        -- Output message
        RAISE NOTICE 'Added created_by column to brands table';
    ELSE
        RAISE NOTICE 'created_by column already exists in brands table';
    END IF;
END $$;

-- Update RLS policies to account for the new column
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS brands_insert_policy ON brands;
    
    -- Create updated insert policy that sets created_by automatically
    CREATE POLICY brands_insert_policy ON brands
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_brand_permissions
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );
    
    -- Create policy allowing users to see brands they created
    DROP POLICY IF EXISTS brands_view_created_policy ON brands;
    
    CREATE POLICY brands_view_created_policy ON brands
    FOR SELECT USING (
        created_by = auth.uid()
    );
    
    RAISE NOTICE 'Updated RLS policies for brands table';
END $$; 