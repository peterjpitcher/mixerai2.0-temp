-- Add normalized_website_domain column to brands table
ALTER TABLE public.brands
ADD COLUMN normalized_website_domain TEXT;

-- Create an index on the new column for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_normalized_website_domain ON public.brands(normalized_website_domain);

-- Note: Existing brands will have NULL in this column.
-- A separate script or manual update will be needed to backfill this column 
-- for existing records based on their current website_url.
-- For new/updated brands, the application logic should populate this field.

-- Optional: You could create a trigger to automatically populate this 
-- on INSERT or UPDATE of website_url, but the plan suggests application-level population.
-- Example Trigger (PostgreSQL):
/*
CREATE OR REPLACE FUNCTION public.update_normalized_website_domain() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.website_url IS NOT NULL THEN
    BEGIN
      NEW.normalized_website_domain := lower(regexp_replace(NEW.website_url, '^(?:https?:\/\/)?(?:www\.)?', ''));
      NEW.normalized_website_domain := split_part(NEW.normalized_website_domain, '/', 1);
    EXCEPTION WHEN others THEN
      NEW.normalized_website_domain := NULL; -- or handle error appropriately
    END;
  ELSE
    NEW.normalized_website_domain := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_normalized_website_domain
BEFORE INSERT OR UPDATE ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.update_normalized_website_domain();
*/ 