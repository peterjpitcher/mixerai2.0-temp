"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface BrandIconProps {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BrandIcon({ 
  name, 
  color = "#3498db", 
  size = "md", 
  className 
}: BrandIconProps) {
  // Get the first letter of the brand name
  const initial = name.charAt(0).toUpperCase();
  
  // Define size classes
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-lg",
    lg: "w-12 h-12 text-xl"
  };
  
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