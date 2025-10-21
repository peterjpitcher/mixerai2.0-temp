'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '@/lib/api-client';
import { toast } from 'sonner';

// Common query keys for deduplication
export const commonQueryKeys = {
  currentUser: ['currentUser'],
  masterClaimBrands: ['masterClaimBrands'],
  vettingAgencies: ['vettingAgencies'],
  brands: ['brands'],
} as const;

export interface UserSessionData {
  id: string;
  email?: string;
  user_metadata?: {
    role?: string;
    full_name?: string;
  };
  brand_permissions?: Array<{
    brand_id: string;
    role: string;
  }>;
}

interface MasterClaimBrand {
  id: string;
  name: string;
}

interface VettingAgency {
  id: string;
  name: string;
  description: string | null;
  countryCode: string | null;
  priorityRank: number | null;
  priorityLabel: 'High' | 'Medium' | 'Low' | null;
  status: string;
  regulatoryScope: string | null;
  categoryTags: string[];
  languageCodes: string[];
  websiteUrl: string | null;
  rationale: string | null;
  source: string;
  sourceMetadata: Record<string, unknown>;
  isFallback: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Hook to fetch current user data with caching and deduplication
 */
export function useCurrentUser() {
  const query = useQuery({
    queryKey: commonQueryKeys.currentUser,
    queryFn: async () => {
      try {
        const data = await apiFetchJson<{ success: boolean; user?: UserSessionData }>(
          '/api/me',
          { errorMessage: 'Failed to fetch user session' }
        );

        if (data.success && data.user) {
          return data.user;
        }
        throw new Error('Invalid user data');
      } catch (error) {
        console.error('Error fetching current user:', error);
        toast.error('Could not verify your permissions.');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
  });
  
  return query;
}

/**
 * Hook to fetch master claim brands with caching and deduplication
 */
export function useMasterClaimBrands() {
  const query = useQuery({
    queryKey: commonQueryKeys.masterClaimBrands,
    queryFn: async () => {
      try {
        const data = await apiFetchJson<{ success: boolean; data?: MasterClaimBrand[]; error?: string }>(
          '/api/master-claim-brands',
          { errorMessage: 'Failed to fetch Master Claim Brands' }
        );

        if (data.success && Array.isArray(data.data)) {
          return data.data;
        }
        throw new Error(data.error || 'Invalid master claim brands data');
      } catch (error) {
        console.error('Error fetching Master Claim Brands:', error);
        toast.error('Failed to fetch Master Claim Brands list.');
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
  
  return query;
}

/**
 * Hook to fetch vetting agencies with caching and deduplication
 */
export function useVettingAgencies() {
  const query = useQuery({
    queryKey: commonQueryKeys.vettingAgencies,
    queryFn: async () => {
      try {
        const data = await apiFetchJson<{ success: boolean; data?: any[]; error?: string }>(
          '/api/content-vetting-agencies',
          { errorMessage: 'Failed to fetch vetting agencies' }
        );

        if (data.success && Array.isArray(data.data)) {
          return data.data.map((agency: any): VettingAgency => {
            const priorityLabel = mapNumericPriorityToLabel(
              agency.priority_label ?? agency.priority,
            );
            const priorityRank =
              typeof agency.priority === 'number'
                ? agency.priority
                : priorityLabel
                ? mapPriorityLabelToRank(priorityLabel)
                : null;

            return {
              id: agency.id,
              name: agency.name,
              description: agency.description ?? null,
              countryCode: agency.country_code ?? null,
              priorityRank,
              priorityLabel,
              status: agency.status ?? 'approved',
              regulatoryScope: agency.regulatory_scope ?? null,
              categoryTags: Array.isArray(agency.category_tags)
                ? agency.category_tags
                : [],
              languageCodes: Array.isArray(agency.language_codes)
                ? agency.language_codes
                : [],
              websiteUrl: agency.website_url ?? null,
              rationale: agency.rationale ?? null,
              source: agency.source ?? 'unknown',
              sourceMetadata:
                (agency.source_metadata as Record<string, unknown> | undefined) ??
                {},
              isFallback: Boolean(agency.is_fallback),
              createdAt: agency.created_at ?? null,
              updatedAt: agency.updated_at ?? null,
            };
          });
        }
        throw new Error(data.error || 'Invalid vetting agencies data');
      } catch (error) {
        console.error('Error fetching vetting agencies:', error);
        toast.error('Failed to fetch vetting agencies list.');
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
  
  return query;
}

// Helper function to map numeric priority to string label
function mapNumericPriorityToLabel(priority: number | string | null | undefined): 'High' | 'Medium' | 'Low' | null {
  if (priority === 1 || priority === 'High') return 'High';
  if (priority === 2 || priority === 'Medium') return 'Medium';
  if (priority === 3 || priority === 'Low') return 'Low';
  return null;
}

function mapPriorityLabelToRank(label: string | null | undefined): number | null {
  if (label === 'High') return 1;
  if (label === 'Medium') return 2;
  if (label === 'Low') return 3;
  return null;
}
