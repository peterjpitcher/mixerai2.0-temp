'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';
import { apiFetchJson, ApiClientError } from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';

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

    const data = await apiFetchJson<ApiResponse<Brand[]>>('/api/brands', {
      errorMessage: 'Failed to fetch brands',
    });

    if (data?.success && Array.isArray(data.data)) {
      return data.data;
    }

    return [];
  };

  // Fetch single brand details
  const fetchBrand = async (brandId: string): Promise<Brand | null> => {
    if (!user || !brandId) return null;

    try {
      const data = await apiFetchJson<{ success: boolean; brand?: Brand; data?: { brand?: Brand } }>(`/api/brands/${brandId}`, {
        errorMessage: 'Failed to fetch brand',
      });

      if (data?.success) {
        if (data.brand) return data.brand;
        if (data.data?.brand) return data.data.brand;
      }
    } catch (error) {
      if (
        (error instanceof ApiClientError && error.status === 404) ||
        (error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 404)
      ) {
        return null;
      }
      throw error;
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
  const setActiveBrand = useCallback((brand: Brand | null) => {
    if (brand) {
      setActiveBrandIdState(brand.id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_BRAND_KEY, brand.id);
      }
      // Cache the brand data
      queryClient.setQueryData(brandQueryKey(brand.id), brand);
    } else {
      setActiveBrandIdState(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_BRAND_KEY);
      }
    }
  }, [queryClient]);

  // Set active brand by ID
  const setActiveBrandId = useCallback((brandId: string) => {
    setActiveBrandIdState(brandId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_BRAND_KEY, brandId);
    }
  }, []);

  // Refresh brands data
  const refreshBrands = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: brandsQueryKey });
    if (activeBrandId) {
      await queryClient.invalidateQueries({ queryKey: brandQueryKey(activeBrandId) });
    }
  }, [queryClient, activeBrandId]);

  // Auto-select first brand if none selected
  useEffect(() => {
    if (!activeBrandId && brands.length > 0 && !isLoadingBrands) {
      setActiveBrand(brands[0]);
    }
  }, [activeBrandId, brands, isLoadingBrands, setActiveBrand]);

  // Clear persisted brand when user logs out
  useEffect(() => {
    if (!user) {
      setActiveBrandIdState(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_BRAND_KEY);
      }
    }
  }, [user]);

  const value = useMemo<BrandContextType>(() => ({
    brands,
    activeBrand: activeBrand || null,
    isLoading: isLoadingBrands || isLoadingActiveBrand,
    error: (brandsError as Error | null) ?? null,
    setActiveBrand,
    setActiveBrandId,
    refreshBrands,
  }), [
    brands,
    activeBrand,
    isLoadingBrands,
    isLoadingActiveBrand,
    brandsError,
    setActiveBrand,
    setActiveBrandId,
    refreshBrands,
  ]);

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
