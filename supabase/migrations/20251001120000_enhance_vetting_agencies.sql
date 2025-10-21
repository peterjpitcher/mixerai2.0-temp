-- Enhance vetting agency metadata and introduce audit logging
-- Created: 2025-10-01 12:00:00 UTC

-- Ensure extensions required for UUID generation are available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Status enum for agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    WHERE typ.typname = 'vetting_agency_status'
      AND typ.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.vetting_agency_status AS ENUM (
      'approved',
      'pending_verification',
      'rejected'
    );
  END IF;
END
$$;

-- Event enum for audit log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    WHERE typ.typname = 'vetting_agency_event_type'
      AND typ.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.vetting_agency_event_type AS ENUM (
      'suggested',
      'accepted',
      'dismissed',
      'auto_applied',
      'auto_rejected'
    );
  END IF;
END
$$;

-- Extend content_vetting_agencies with richer metadata
ALTER TABLE public.content_vetting_agencies
  ADD COLUMN IF NOT EXISTS status public.vetting_agency_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS regulatory_scope text,
  ADD COLUMN IF NOT EXISTS category_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS language_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS rationale text;

-- Backfill nulls for existing rows to satisfy NOT NULL constraints
UPDATE public.content_vetting_agencies
SET
  status = COALESCE(status, 'approved'),
  category_tags = COALESCE(category_tags, ARRAY[]::text[]),
  source = COALESCE(source, 'manual'),
  source_metadata = COALESCE(source_metadata, '{}'::jsonb),
  language_codes = COALESCE(language_codes, ARRAY[]::text[])
WHERE
  status IS NULL
  OR category_tags IS NULL
  OR source IS NULL
  OR source_metadata IS NULL
  OR language_codes IS NULL;

-- Helpful indexes for discovery
CREATE INDEX IF NOT EXISTS idx_content_vetting_agencies_country_status
  ON public.content_vetting_agencies (country_code, status);

CREATE INDEX IF NOT EXISTS idx_content_vetting_agencies_category_tags
  ON public.content_vetting_agencies
  USING gin (category_tags);

CREATE INDEX IF NOT EXISTS idx_content_vetting_agencies_language_codes
  ON public.content_vetting_agencies
  USING gin (language_codes);

-- Audit log for AI discovery pipeline and user actions
CREATE TABLE IF NOT EXISTS public.content_vetting_agency_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  agency_id uuid NULL REFERENCES public.content_vetting_agencies(id) ON DELETE SET NULL,
  event_type public.vetting_agency_event_type NOT NULL,
  country_code text,
  category_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_content_vetting_agency_events_brand
  ON public.content_vetting_agency_events (brand_id);

CREATE INDEX IF NOT EXISTS idx_content_vetting_agency_events_agency
  ON public.content_vetting_agency_events (agency_id);

CREATE INDEX IF NOT EXISTS idx_content_vetting_agency_events_event_type
  ON public.content_vetting_agency_events (event_type);

-- Grant access to managed roles
GRANT ALL ON TABLE public.content_vetting_agency_events TO anon;
GRANT ALL ON TABLE public.content_vetting_agency_events TO authenticated;
GRANT ALL ON TABLE public.content_vetting_agency_events TO service_role;

-- Comments for clarity
COMMENT ON COLUMN public.content_vetting_agencies.status IS
  'Workflow status for the agency (approved, pending verification, rejected).';

COMMENT ON COLUMN public.content_vetting_agencies.regulatory_scope IS
  'Optional description of the regulatory domain(s) the agency covers.';

COMMENT ON COLUMN public.content_vetting_agencies.category_tags IS
  'Free-form category tags (e.g., infant_nutrition, medical_devices) used for discovery.';

COMMENT ON COLUMN public.content_vetting_agencies.source IS
  'Provenance for the agency record (manual, ai, partner import, etc.).';

COMMENT ON COLUMN public.content_vetting_agencies.source_metadata IS
  'Arbitrary metadata captured when the agency entry is created (confidence scores, rationale, identifiers).';

COMMENT ON COLUMN public.content_vetting_agencies.website_url IS
  'Optional official website or documentation link for the agency.';

COMMENT ON COLUMN public.content_vetting_agencies.language_codes IS
  'Languages supported by the agency for official guidance or documentation.';

COMMENT ON COLUMN public.content_vetting_agencies.rationale IS
  'Short explanation describing why the agency is relevant for the associated country/category.';

COMMENT ON TABLE public.content_vetting_agency_events IS
  'Audit log capturing AI suggestions and user actions for vetting agency recommendations.';

