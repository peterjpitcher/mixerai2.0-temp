import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndCSRF } from '@/lib/auth/api-auth';
import { withFileUploadValidation } from '@/lib/api/middleware/file-upload';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeFileName } from '@/lib/validation/file-upload';

/**
 * Upload brand logo endpoint with comprehensive file validation
 */
export const POST = withAuthAndCSRF(async (req: NextRequest, user) => {
  const uploadHandler = withFileUploadValidation(
    async (req: NextRequest, file: File) => {
      try {
        // Get brand ID from form data
        const formData = await req.formData();
        const brandId = formData.get('brandId') as string;
        
        if (!brandId) {
          return NextResponse.json(
            { error: 'Brand ID is required' },
            { status: 400 }
          );
        }
        
        // Verify user has permission to upload logo for this brand
        const supabase = createSupabaseServerClient();
        const { data: brandPermission, error: permError } = await supabase
          .from('user_brand_permissions')
          .select('role')
          .eq('user_id', user.id)
          .eq('brand_id', brandId)
          .single();
        
        if (permError || !brandPermission) {
          return NextResponse.json(
            { error: 'You do not have permission to upload logo for this brand' },
            { status: 403 }
          );
        }
        
        // Only managers and admins can upload brand logos
        if (!['admin', 'manager'].includes(brandPermission.role)) {
          return NextResponse.json(
            { error: 'Only brand managers and admins can upload logos' },
            { status: 403 }
          );
        }
        
        // Generate unique filename
        const sanitized = sanitizeFileName(file.name);
        const fileExt = sanitized.split('.').pop();
        const fileName = `${brandId}-${Date.now()}.${fileExt}`;
        
        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('brand-logos')
          .upload(fileName, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          throw uploadError;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('brand-logos')
          .getPublicUrl(fileName);
        
        // Update brand record
        const { error: updateError } = await supabase
          .from('brands')
          .update({ logo_url: publicUrl })
          .eq('id', brandId);
        
        if (updateError) {
          throw updateError;
        }
        
        return NextResponse.json({
          success: true,
          data: {
            url: publicUrl,
            path: fileName
          }
        });
      } catch (error) {
        console.error('Brand logo upload error:', error);
        return NextResponse.json(
          { error: 'Failed to upload brand logo' },
          { status: 500 }
        );
      }
    },
    { category: 'brandLogo' }
  );
  
  return uploadHandler(req);
});