"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface BrandIconProps {
  name: string | null | undefined;
  color?: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BrandIcon({ 
  name, 
  color = "#3498db", 
  logoUrl,
  size = "md", 
  className 
}: BrandIconProps) {
  // Get the first letter of the brand name
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  
  // Define size classes
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-lg",
    lg: "w-12 h-12 text-xl"
  };

  // Use higher resolution for better quality
  const imageSizes = {
    sm: 64,  // 2x for retina
    md: 80,  // 2x for retina
    lg: 96   // 2x for retina
  };
  
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
          src={logoUrl}
          alt={name || 'Brand logo'}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-cover w-full h-full"
          quality={95}
          unoptimized={logoUrl.includes('supabase')}
        />
      </div>
    );
  }
  
  // Otherwise, show initials with background color
  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white", 
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: color
      }}
    >
      {initial}
    </div>
  );
} 