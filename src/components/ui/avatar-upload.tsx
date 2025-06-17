'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import { Spinner } from '@/components/spinner';

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
  email 
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
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

      // Update the preview
      setPreviewUrl(publicUrl);
      
      // Update the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
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
      // Update profile to remove avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
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
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profile"
              width={80}
              height={80}
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
          disabled={isUploading}
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
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
      </div>
    </div>
  );
}