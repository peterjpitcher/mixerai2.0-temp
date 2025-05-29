-- RLS Policies for content_templates table

-- Drop existing policies for content_templates
DROP POLICY IF EXISTS "Everyone can view content templates" ON public.content_templates;
DROP POLICY IF EXISTS "Admins can manage content templates" ON public.content_templates;

-- Policy: Global Admins can view all content templates
CREATE POLICY "Global admins can view content templates" ON public.content_templates
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy: Global Admins can manage (insert, update, delete) all content templates
CREATE POLICY "Global admins can manage content templates" ON public.content_templates
  FOR ALL -- Covers INSERT, UPDATE, DELETE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Ensure RLS is enabled (it should be already based on supabase-schema.sql)
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY; 