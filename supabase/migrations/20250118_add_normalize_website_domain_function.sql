-- Migration: Add normalize_website_domain function
-- Description: Creates a function to normalize website domains for consistent storage
-- Date: 2025-01-18

CREATE OR REPLACE FUNCTION normalize_website_domain(url text) 
RETURNS text AS $$
DECLARE
    normalized_url text;
BEGIN
    -- Return NULL if input is NULL or empty
    IF url IS NULL OR url = '' THEN
        RETURN NULL;
    END IF;
    
    -- Convert to lowercase
    normalized_url := LOWER(TRIM(url));
    
    -- Remove common protocols
    normalized_url := REGEXP_REPLACE(normalized_url, '^https?://', '');
    normalized_url := REGEXP_REPLACE(normalized_url, '^ftp://', '');
    
    -- Remove www prefix
    normalized_url := REGEXP_REPLACE(normalized_url, '^www\.', '');
    
    -- Remove trailing slashes and paths
    normalized_url := REGEXP_REPLACE(normalized_url, '/.*$', '');
    
    -- Remove port numbers
    normalized_url := REGEXP_REPLACE(normalized_url, ':[0-9]+$', '');
    
    RETURN normalized_url;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment
COMMENT ON FUNCTION normalize_website_domain(text) IS 'Normalizes website URLs to their domain form for consistent comparison';