'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { BrandIcon } from '@/components/brand-icon';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface BrandDisplayProps {
  brand: {
    id?: string;
    name: string;
    brand_color?: string | null;
    logo_url?: string | null;
    country?: string | null;
    language?: string | null;
  };
  variant?: 'default' | 'compact' | 'detailed' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showMetadata?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Centralized component for displaying brand information consistently
 * across the application. Ensures logo, name, and metadata are always
 * displayed in the same way.
 */
export function BrandDisplay({
  brand,
  variant = 'default',
  size = 'md',
  showTooltip = false,
  showMetadata = false,
  className,
  onClick
}: BrandDisplayProps) {
  const sizeClasses = {
    sm: 'gap-2 text-sm',
    md: 'gap-3 text-base',
    lg: 'gap-4 text-lg'
  };

  const content = (
    <div 
      className={cn(
        'flex items-center',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
    >
      <BrandIcon
        name={brand.name}
        color={brand.brand_color || undefined}
        logoUrl={brand.logo_url || undefined}
        size={size}
      />
      
      {variant === 'compact' ? null : (
        <div className={cn('flex', variant === 'inline' ? 'items-center gap-2' : 'flex-col')}>
          <span className={cn(
            'font-medium',
            variant === 'detailed' && 'text-lg'
          )}>
            {brand.name}
          </span>
          
          {variant === 'detailed' && showMetadata && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {brand.country && (
                <Badge variant="outline" className="text-xs">
                  {brand.country}
                </Badge>
              )}
              {brand.language && (
                <Badge variant="outline" className="text-xs">
                  {brand.language}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (showTooltip && variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              <span className="font-medium">{brand.name}</span>
              {showMetadata && (
                <div className="text-xs text-muted-foreground">
                  {brand.country && `Country: ${brand.country}`}
                  {brand.country && brand.language && ' • '}
                  {brand.language && `Language: ${brand.language}`}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

/**
 * Brand display specifically for lists and tables
 */
export function BrandCell({ brand, onClick }: { 
  brand: BrandDisplayProps['brand']; 
  onClick?: () => void;
}) {
  return (
    <BrandDisplay
      brand={brand}
      variant="default"
      size="sm"
      onClick={onClick}
    />
  );
}

/**
 * Brand display for headers and navigation
 */
export function BrandHeader({ brand }: { brand: BrandDisplayProps['brand'] }) {
  return (
    <BrandDisplay
      brand={brand}
      variant="detailed"
      size="md"
      showMetadata
    />
  );
}

/**
 * Compact brand display for badges and tags
 */
export function BrandBadge({ brand }: { brand: BrandDisplayProps['brand'] }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 border">
      <BrandIcon
        name={brand.name}
        color={brand.brand_color || undefined}
        logoUrl={brand.logo_url || undefined}
        size="sm"
        className="h-4 w-4"
      />
      <span>{brand.name}</span>
    </div>
  );
}