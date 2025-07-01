import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { withFileUploadValidation } from '@/lib/api/middleware/file-upload';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateUniqueFileName } from '@/lib/validation/file-upload';

/**
 * Upload avatar endpoint with comprehensive file validation
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const uploadHandler = withFileUploadValidation(
    async (req: NextRequest, file: File) => {
      try {
        const supabase = createSupabaseServerClient();
        
        // Generate unique filename
        const filePath = generateUniqueFileName(file.name, user.id);
        
        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        // Update user profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);
        
        if (updateError) {
          throw updateError;
        }
        
        return NextResponse.json({
          success: true,
          data: {
            url: publicUrl,
            path: filePath
          }
        });
      } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json(
          { error: 'Failed to upload avatar' },
          { status: 500 }
        );
      }
    },
    { category: 'avatar' }
  );
  
  return uploadHandler(req);
});