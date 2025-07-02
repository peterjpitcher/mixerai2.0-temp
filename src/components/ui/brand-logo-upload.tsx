'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import { Spinner } from '@/components/spinner';
import { 
  validateFile, 
  validateFileContent, 
  generateUniqueFileName, 
  validateImageDimensions,
  sanitizeFileName
} from '@/lib/validation/file-upload';

interface BrandLogoUploadProps {
  currentLogoUrl?: string | null;
  onLogoChange: (url: string | null) => void;
  brandId: string;
  brandName?: string;
  isDisabled?: boolean;
}

export function BrandLogoUpload({ 
  currentLogoUrl, 
  onLogoChange, 
  brandId,
  brandName,
  isDisabled = false
}: BrandLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file using comprehensive validation
    const validationResult = validateFile(file, { category: 'brandLogo' });
    if (!validationResult.valid) {
      toast.error(validationResult.error || 'Invalid file');
      return;
    }

    // Validate file content for security (allow SVG for brand logos)
    const contentValidation = await validateFileContent(file, { allowSVG: true });
    if (!contentValidation.valid) {
      toast.error(contentValidation.error || 'File content validation failed');
      return;
    }

    // Validate image dimensions for brand logos
    if (!file.type.includes('svg')) {
      const dimensionValidation = await validateImageDimensions(file, {
        minWidth: 200,
        maxWidth: 4000,
        minHeight: 200,
        maxHeight: 4000,
        aspectRatio: { min: 0.8, max: 1.25 } // Prefer square-ish logos
      });
      if (!dimensionValidation.valid) {
        toast.error(dimensionValidation.error || 'Invalid image dimensions');
        return;
      }
    }

    setIsUploading(true);

    try {
      // Generate a unique, sanitized filename
      const sanitized = sanitizeFileName(file.name);
      const fileExt = sanitized.split('.').pop();
      const fileName = `${brandId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(filePath);

      // Update the preview
      setPreviewUrl(publicUrl);
      
      // Call the parent callback
      onLogoChange(publicUrl);
      
      toast.success('Brand logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading brand logo:', error);
      toast.error('Failed to upload brand logo');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setPreviewUrl(null);
    onLogoChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Brand Logo</label>
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={`${brandName || 'Brand'} logo`}
                width={192}
                height={192}
                className="w-full h-full object-contain"
                quality={100}
                unoptimized={previewUrl.includes('supabase')}
              />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isDisabled || isUploading}
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled || isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {previewUrl ? 'Change Logo' : 'Upload Logo'}
          </Button>
          
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLogo}
              disabled={isDisabled || isUploading}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Recommended: Square image, at least 512x512px for best quality. Supports JPEG, PNG, WebP, and SVG.
      </p>
    </div>
  );
}