'use client';

import { BrandIcon } from '@/components/brand-icon';
import { cn } from '@/lib/utils';

interface ActiveBrandIndicatorProps {
  brandId?: string;
  brandName: string;
  brandColor?: string | null;
  brandLogoUrl?: string | null;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Displays the currently active brand context
 * Used when working with brand-specific content to provide clear context
 */
export function ActiveBrandIndicator({
  brandName,
  brandColor,
  brandLogoUrl,
  className,
  showLabel = true,
  size = 'sm'
}: ActiveBrandIndicatorProps) {
  // Only show if we have a brand context
  if (!brandName || brandName === 'All Brands') {
    return null;
  }

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div 
      className={cn(
        'flex items-center gap-2 rounded-md border bg-muted/30',
        sizeClasses[size],
        className
      )}
      style={{
        borderColor: brandColor ? `${brandColor}30` : undefined,
        backgroundColor: brandColor ? `${brandColor}08` : undefined
      }}
    >
      <BrandIcon 
        name={brandName} 
        color={brandColor || undefined} 
        logoUrl={brandLogoUrl || undefined}
        size={size}
      />
      {showLabel && (
        <div className="flex flex-col">
          <span className={cn('font-medium', textSizeClasses[size])}>
            {brandName}
          </span>
          <span className="text-xs text-muted-foreground">
            Active Brand Context
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in headers or tight spaces
 */
export function ActiveBrandBadge({
  brandName,
  brandColor,
  brandLogoUrl,
  className
}: Omit<ActiveBrandIndicatorProps, 'showLabel' | 'size'>) {
  if (!brandName || brandName === 'All Brands') {
    return null;
  }

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-muted/50 border',
        className
      )}
      style={{
        borderColor: brandColor ? `${brandColor}40` : undefined,
        backgroundColor: brandColor ? `${brandColor}10` : undefined
      }}
    >
      <BrandIcon 
        name={brandName} 
        color={brandColor || undefined} 
        logoUrl={brandLogoUrl || undefined}
        size="sm"
        className="h-4 w-4"
      />
      <span>{brandName}</span>
    </div>
  );
}