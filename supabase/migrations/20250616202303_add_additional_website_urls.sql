-- Add additional_website_urls column to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS additional_website_urls text[] DEFAULT ARRAY[]::text[];

-- Add comment to describe the column
COMMENT ON COLUMN public.brands.additional_website_urls IS 'Additional website URLs associated with the brand';