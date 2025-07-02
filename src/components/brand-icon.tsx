"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { generateBrandColor, getBrandLogoRetinaSize, getBrandLogoImageProps } from "@/lib/utils/brand-logo";
import { getBestTextColor } from "@/lib/utils/color-contrast";

export interface BrandIconProps {
  name: string | null | undefined;
  color?: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BrandIcon({ 
  name, 
  color, 
  logoUrl,
  size = "md", 
  className 
}: BrandIconProps) {
  // Get the first letter of the brand name
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  
  // Generate consistent color if not provided
  const brandColor = color || (name ? generateBrandColor(name) : '#6b7280');
  
  // Define size classes
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-lg",
    lg: "w-12 h-12 text-xl"
  };

  // Use utility function for image sizes
  const imageSize = getBrandLogoRetinaSize(size as 'sm' | 'md' | 'lg');
  
  // If logo URL is provided, show the image
  if (logoUrl) {
    return (
      <div 
        className={cn(
          "relative rounded-full overflow-hidden bg-gray-100",
          sizeClasses[size],
          className
        )}
      >
        <Image
          {...getBrandLogoImageProps(logoUrl, name || 'Brand', size as 'sm' | 'md' | 'lg')}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }
  
  // Otherwise, show initials with background color
  // Determine the best text color for contrast
  const textColor = getBestTextColor(color);
  
  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center font-bold", 
        sizeClasses[size],
        className
      )}
      style={{ 
          backgroundColor: brandColor,
          color: textColor
      }}
    >
      {initial}
    </div>
  );
} 