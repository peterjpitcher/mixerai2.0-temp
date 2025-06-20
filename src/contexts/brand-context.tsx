'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';

interface Brand {
  id: string;
  name: string;
  brand_color?: string | null;
  logo_url?: string | null;
  brand_identity?: string | null;
  tone_of_voice?: string | null;
  guardrails?: string | null;
  language?: string | null;
  country?: string | null;
}

interface BrandContextType {
  brands: Brand[];
  activeBrand: Brand | null;
  isLoading: boolean;
  error: Error | null;
  setActiveBrand: (brand: Brand | null) => void;
  setActiveBrandId: (brandId: string) => void;
  refreshBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

// Query keys
export const brandsQueryKey = ['brands'];
export const brandQueryKey = (id: string) => ['brands', id];

// Local storage key for persisting active brand
const ACTIVE_BRAND_KEY = 'mixerai-active-brand';

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(null);

  // Load active brand from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBrandId = localStorage.getItem(ACTIVE_BRAND_KEY);
      if (savedBrandId) {
        setActiveBrandIdState(savedBrandId);
      }
    }
  }, []);

  // Fetch all brands user has access to
  const fetchBrands = async (): Promise<Brand[]> => {
    if (!user) return [];

    const response = await fetch('/api/brands', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch brands: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data;
    }

    return [];
  };

  // Fetch single brand details
  const fetchBrand = async (brandId: string): Promise<Brand | null> => {
    if (!user || !brandId) return null;

    const response = await fetch(`/api/brands/${brandId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch brand: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.brand) {
      return data.brand;
    }

    return null;
  };

  // Query for all brands
  const { data: brands = [], isLoading: isLoadingBrands, error: brandsError } = useQuery({
    queryKey: brandsQueryKey,
    queryFn: fetchBrands,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for active brand details
  const { data: activeBrand, isLoading: isLoadingActiveBrand } = useQuery({
    queryKey: brandQueryKey(activeBrandId || ''),
    queryFn: () => fetchBrand(activeBrandId!),
    enabled: !!user && !!activeBrandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set active brand and persist to localStorage
  const setActiveBrand = (brand: Brand | null) => {
    if (brand) {
      setActiveBrandIdState(brand.id);
      localStorage.setItem(ACTIVE_BRAND_KEY, brand.id);
      // Cache the brand data
      queryClient.setQueryData(brandQueryKey(brand.id), brand);
    } else {
      setActiveBrandIdState(null);
      localStorage.removeItem(ACTIVE_BRAND_KEY);
    }
  };

  // Set active brand by ID
  const setActiveBrandId = (brandId: string) => {
    setActiveBrandIdState(brandId);
    localStorage.setItem(ACTIVE_BRAND_KEY, brandId);
  };

  // Refresh brands data
  const refreshBrands = async () => {
    await queryClient.invalidateQueries({ queryKey: brandsQueryKey });
    if (activeBrandId) {
      await queryClient.invalidateQueries({ queryKey: brandQueryKey(activeBrandId) });
    }
  };

  // Auto-select first brand if none selected
  useEffect(() => {
    if (!activeBrandId && brands.length > 0 && !isLoadingBrands) {
      setActiveBrand(brands[0]);
    }
  }, [activeBrandId, brands, isLoadingBrands]);

  const value: BrandContextType = {
    brands,
    activeBrand: activeBrand || null,
    isLoading: isLoadingBrands || isLoadingActiveBrand,
    error: brandsError as Error | null,
    setActiveBrand,
    setActiveBrandId,
    refreshBrands,
  };

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrands() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrands must be used within a BrandProvider');
  }
  return context;
}

// Helper hook to get active brand with loading state
export function useActiveBrand() {
  const { activeBrand, isLoading, error } = useBrands();
  return { brand: activeBrand, isLoading, error };
}

// Helper hook to check if user has access to a specific brand
export function useBrandAccess(brandId: string) {
  const { brands } = useBrands();
  return brands.some(brand => brand.id === brandId);
}