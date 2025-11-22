'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';
import {
  validateFile,
  validateFileContent,
  generateUniqueFileName,
  validateImageDimensions
} from '@/lib/validation/file-upload';
import { createSupabaseClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api-client';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarChange: (url: string) => void;
  userId: string;
  fullName?: string;
  email?: string;
}

export function AvatarUpload({
  currentAvatarUrl,
  onAvatarChange,
  userId,
  fullName,
  email,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof createSupabaseClient> | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const client = createSupabaseClient();
      setSupabaseClient(client);
      setSupabaseError(null);
    } catch (error) {
      const debugMessage =
        error instanceof Error
          ? error.message
          : 'Supabase client could not be initialised for avatar uploads.';
      console.error('[avatar-upload] Failed to initialise Supabase client', debugMessage, error);
      setSupabaseClient(null);
      setSupabaseError('Profile photo uploads are currently unavailable. Please contact support.');
    }
  }, []);

  useEffect(() => {
    setPreviewUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!userId) {
      toast.error('User information is not ready. Please try again.');
      return;
    }

    // Validate file using comprehensive validation
    const validationResult = validateFile(file, { category: 'avatar' });
    if (!validationResult.valid) {
      toast.error(validationResult.error || 'Invalid file');
      return;
    }

    // Validate file content for security
    const contentValidation = await validateFileContent(file);
    if (!contentValidation.valid) {
      toast.error(contentValidation.error || 'File content validation failed');
      return;
    }

    // Validate image dimensions (optional but recommended for avatars)
    const dimensionValidation = await validateImageDimensions(file, {
      minWidth: 100,
      maxWidth: 2000,
      minHeight: 100,
      maxHeight: 2000,
      aspectRatio: { min: 0.5, max: 2 } // Prevent extremely wide or tall images
    });
    if (!dimensionValidation.valid) {
      toast.error(dimensionValidation.error || 'Invalid image dimensions');
      return;
    }

    const client = supabaseClient;
    if (!client) {
      toast.error(supabaseError ?? 'Profile photo uploads are currently unavailable. Please try again later.');
      event.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      // Generate a unique, sanitized filename
      const filePath = generateUniqueFileName(file.name, userId);

      // Upload to Supabase Storage
      const { error: uploadError } = await client.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = client.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update the preview
      setPreviewUrl(publicUrl);

      // Update the profile
      const response = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update profile photo.');
      }

      // Call the parent callback
      onAvatarChange(publicUrl);

      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile photo');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!previewUrl) return;

    setIsUploading(true);
    try {
      if (!userId) {
        throw new Error('User information is not ready.');
      }

      const response = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to remove profile photo.');
      }

      setPreviewUrl(null);
      onAvatarChange('');
      toast.success('Profile photo removed');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove profile photo');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(name => name[0]).join('').toUpperCase();
    }
    return email ? email[0].toUpperCase() : '?';
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-muted bg-muted/40 p-4 sm:gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profile"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-primary font-bold text-3xl">
              {getInitials()}
            </span>
          )}
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || !supabaseClient}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !supabaseClient}
        >
          {previewUrl ? (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Change Photo
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}

        {supabaseError && (
          <p className="text-xs text-destructive">
            Profile photo uploads are unavailable: {supabaseError}
          </p>
        )}
      </div>
    </div>
  );
}
