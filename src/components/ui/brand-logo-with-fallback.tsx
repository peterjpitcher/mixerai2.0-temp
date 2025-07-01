'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';
import { generateBrandColor, getBrandLogoImageProps } from '@/lib/utils/brand-logo';

interface BrandLogoWithFallbackProps {
  logoUrl?: string | null;
  brandName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
  showBorder?: boolean;
}

/**
 * Brand logo component with intelligent fallback handling
 * - Attempts to load the logo image
 * - Falls back to brand initial with consistent color if image fails
 * - Handles loading states gracefully
 */
export function BrandLogoWithFallback({
  logoUrl,
  brandName,
  size = 'md',
  className,
  fallbackClassName,
  showBorder = false
}: BrandLogoWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset error state when logo URL changes
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [logoUrl]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-xl'
  };

  const containerClasses = cn(
    'relative rounded-lg overflow-hidden flex items-center justify-center',
    sizeClasses[size],
    showBorder && 'border-2 border-border',
    className
  );

  // Show fallback if no logo URL or if image failed to load
  if (!logoUrl || imageError) {
    const initial = brandName.charAt(0).toUpperCase();
    const brandColor = generateBrandColor(brandName);

    return (
      <div
        className={cn(
          containerClasses,
          'font-bold text-white',
          fallbackClassName
        )}
        style={{ backgroundColor: brandColor }}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <Image
        {...getBrandLogoImageProps(logoUrl, brandName, size)}
        className={cn(
          'object-contain w-full h-full',
          isLoading && 'opacity-0'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setImageError(true);
        }}
      />
    </div>
  );
}

/**
 * Large brand logo display for brand detail pages
 */
export function BrandLogoHero({
  logoUrl,
  brandName,
  className
}: {
  logoUrl?: string | null;
  brandName: string;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (!logoUrl || imageError) {
    return (
      <div
        className={cn(
          'w-32 h-32 rounded-xl flex items-center justify-center text-4xl font-bold text-white shadow-lg',
          className
        )}
        style={{ backgroundColor: generateBrandColor(brandName) }}
      >
        {brandName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={cn('w-32 h-32 rounded-xl overflow-hidden shadow-lg bg-white', className)}>
      <Image
        src={logoUrl}
        alt={`${brandName} logo`}
        width={256}
        height={256}
        className="object-contain w-full h-full p-4"
        quality={100}
        priority
        onError={() => setImageError(true)}
        unoptimized={logoUrl.includes('supabase')}
      />
    </div>
  );
}

/**
 * Placeholder for empty brand logo slots
 */
export function BrandLogoPlaceholder({
  size = 'md',
  className
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30',
        sizeClasses[size],
        className
      )}
    >
      <Building2 className={cn('text-muted-foreground/50', iconSizes[size])} />
    </div>
  );
}