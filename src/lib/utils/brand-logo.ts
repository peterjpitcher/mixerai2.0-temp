/**
 * Utility functions for handling brand logos consistently
 */

import { createBrowserClient } from '@supabase/ssr';

export interface BrandLogoOptions {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  quality?: number;
  fallbackColor?: string;
}

/**
 * Get the appropriate size in pixels for a brand logo
 */
export function getBrandLogoSize(size: BrandLogoOptions['size'] = 'md'): number {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64
  };
  return sizes[size];
}

/**
 * Get high DPI size for retina displays
 */
export function getBrandLogoRetinaSize(size: BrandLogoOptions['size'] = 'md'): number {
  return getBrandLogoSize(size) * 2;
}

/**
 * Generate a consistent color for a brand based on its name
 * This ensures the same brand always gets the same color
 */
export function generateBrandColor(brandName: string): string {
  // List of professional colors for brand fallbacks
  const colors = [
    '#2563eb', // blue-600
    '#dc2626', // red-600
    '#16a34a', // green-600
    '#ea580c', // orange-600
    '#9333ea', // purple-600
    '#0891b2', // cyan-600
    '#e11d48', // rose-600
    '#7c3aed', // violet-600
    '#0d9488', // teal-600
    '#ca8a04', // yellow-600
  ];
  
  // Generate a hash from the brand name
  let hash = 0;
  for (let i = 0; i < brandName.length; i++) {
    hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Check if a logo URL is valid and accessible
 */
export async function validateLogoUrl(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  
  try {
    // For Supabase URLs, we can check if they're properly formatted
    if (url.includes('supabase')) {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      // Extract bucket and path from URL
      const urlParts = url.split('/storage/v1/object/public/');
      if (urlParts.length === 2) {
        const [bucket, ...pathParts] = urlParts[1].split('/');
        const path = pathParts.join('/');
        
        // Try to get a public URL - this will fail if the file doesn't exist
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return !!data.publicUrl;
      }
    }
    
    // For other URLs, do a HEAD request to check if accessible
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the best available logo URL or generate a fallback
 */
export function getBrandLogoUrl(
  logoUrl: string | null | undefined,
  brandName: string,
  options: BrandLogoOptions = {}
): { url: string | null; isFallback: boolean } {
  if (logoUrl) {
    return { url: logoUrl, isFallback: false };
  }
  
  // Return null to trigger the fallback rendering in BrandIcon
  return { url: null, isFallback: true };
}

/**
 * Preload brand logos for better performance
 */
export function preloadBrandLogos(brands: Array<{ logo_url?: string | null }>) {
  if (typeof window === 'undefined') return;
  
  brands.forEach(brand => {
    if (brand.logo_url) {
      const img = new Image();
      img.src = brand.logo_url;
    }
  });
}

/**
 * Get optimized image props for Next.js Image component
 */
export function getBrandLogoImageProps(
  logoUrl: string,
  brandName: string,
  size: BrandLogoOptions['size'] = 'md'
) {
  const pixelSize = getBrandLogoRetinaSize(size);
  
  return {
    src: logoUrl,
    alt: `${brandName} logo`,
    width: pixelSize,
    height: pixelSize,
    quality: 95,
    priority: false,
    unoptimized: logoUrl.includes('supabase'), // Disable Next.js optimization for Supabase URLs
  };
}