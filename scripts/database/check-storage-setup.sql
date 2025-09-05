-- Check Storage Setup
-- Run this script to see current storage buckets and policies

-- Check existing buckets
SELECT 
  id as bucket_id, 
  name as bucket_name, 
  public as is_public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY id;

-- Check existing storage policies
SELECT 
  schemaname,
  tablename,
  policyname as policy_name,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- Check specifically for our expected buckets
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') 
    THEN '✅ avatars bucket exists' 
    ELSE '❌ avatars bucket missing' 
  END as avatars_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'brand-logos') 
    THEN '✅ brand-logos bucket exists' 
    ELSE '❌ brand-logos bucket missing' 
  END as brand_logos_status;

-- Count policies for each bucket
SELECT 
  CASE 
    WHEN qual LIKE '%avatars%' OR with_check LIKE '%avatars%' THEN 'avatars'
    WHEN qual LIKE '%brand-logos%' OR with_check LIKE '%brand-logos%' THEN 'brand-logos'
    ELSE 'other'
  END as bucket,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
GROUP BY 1
ORDER BY 1;