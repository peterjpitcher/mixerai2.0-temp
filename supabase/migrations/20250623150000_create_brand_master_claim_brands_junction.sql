-- Create junction table to support many-to-many relationship between brands and master_claim_brands
-- This allows one master claim brand to be linked to multiple MixerAI brands

-- First, create the junction table
CREATE TABLE IF NOT EXISTS public.brand_master_claim_brands (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    master_claim_brand_id uuid NOT NULL REFERENCES public.master_claim_brands(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid REFERENCES auth.users(id),
    UNIQUE(brand_id, master_claim_brand_id) -- Prevent duplicate links
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_master_claim_brands_brand_id ON public.brand_master_claim_brands(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_master_claim_brands_master_claim_brand_id ON public.brand_master_claim_brands(master_claim_brand_id);

-- Add RLS policies
ALTER TABLE public.brand_master_claim_brands ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view brand-master claim brand links if they have permission to view the brand
CREATE POLICY "Users can view brand master claim brand links" ON public.brand_master_claim_brands
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_brand_permissions WHERE brand_id = brand_master_claim_brands.brand_id
        )
        OR EXISTS (
            SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: Only brand admins and global admins can create/update/delete links
CREATE POLICY "Brand admins can manage brand master claim brand links" ON public.brand_master_claim_brands
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.user_brand_permissions 
            WHERE brand_id = brand_master_claim_brands.brand_id AND role = 'admin'
        )
        OR EXISTS (
            SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Migrate existing data from master_claim_brands.mixerai_brand_id to the new junction table
INSERT INTO public.brand_master_claim_brands (brand_id, master_claim_brand_id, created_at)
SELECT DISTINCT mixerai_brand_id, id, now()
FROM public.master_claim_brands
WHERE mixerai_brand_id IS NOT NULL
ON CONFLICT (brand_id, master_claim_brand_id) DO NOTHING;

-- Add comment to explain the table
COMMENT ON TABLE public.brand_master_claim_brands IS 'Junction table linking MixerAI brands to master claim brands in a many-to-many relationship';

-- Note: We're keeping the mixerai_brand_id column in master_claim_brands for now
-- to avoid breaking existing code. It can be removed in a future migration
-- after all code has been updated to use the junction table.