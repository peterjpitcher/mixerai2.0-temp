'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface BrandData {
  id: string;
  name: string;
  brand_color?: string | null;
  logo_url?: string | null;
  country?: string | null;
  language?: string | null;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
}

/**
 * Hook to fetch and cache brand data for consistent display
 */
export function useBrandDisplay(brandId?: string) {
  const query = useQuery({
    queryKey: ['brand-display', brandId],
    queryFn: async () => {
      if (!brandId) return null;
      
      const response = await fetch(`/api/brands/${brandId}`);
      if (!response.ok) throw new Error('Failed to fetch brand');
      
      const data = await response.json();
      return data.data as BrandData;
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return query;
}

/**
 * Hook to fetch all brands for consistent listing
 */
export function useBrandsDisplay() {
  const query = useQuery({
    queryKey: ['brands-display'],
    queryFn: async () => {
      const response = await fetch('/api/brands');
      if (!response.ok) throw new Error('Failed to fetch brands');
      
      const data = await response.json();
      return (data.data || []) as BrandData[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return query;
}

/**
 * Utility hook to get brand display props from various brand objects
 */
export function useBrandDisplayProps() {
  const normalizeBrand = useCallback((brand: any): BrandData | null => {
    if (!brand) return null;
    
    return {
      id: brand.id || brand.brand_id,
      name: brand.name || brand.brand_name || 'Unknown Brand',
      brand_color: brand.brand_color || brand.color || null,
      logo_url: brand.logo_url || brand.logoUrl || brand.brand_logo_url || null,
      country: brand.country || brand.brand_country || null,
      language: brand.language || brand.brand_language || null,
      brand_identity: brand.brand_identity || null,
      tone_of_voice: brand.tone_of_voice || null,
    };
  }, []);

  return { normalizeBrand };
}