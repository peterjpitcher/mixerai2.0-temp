'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { apiFetchJson, ApiClientError, apiFetch } from '@/lib/api-client';

interface UserMetadata {
  role?: string;
  full_name?: string;
  avatar_url?: string;
}

interface BrandPermission {
  brand_id: string;
  role: string;
  brand?: {
    id: string;
    name: string;
    master_claim_brand_id?: string | null;
  } | null;
}

interface AuthUser extends Omit<User, 'user_metadata'> {
  user_metadata?: UserMetadata;
  brand_permissions?: BrandPermission[];
  full_name?: string | null;
  job_title?: string | null;
  company?: string | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Query key for user data
export const userQueryKey = ['auth', 'user'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const queryClient = useQueryClient();
  const supabase = createSupabaseClient();

  // Fetch user data
  const fetchUser = async (): Promise<AuthUser | null> => {
    try {
      // First get the authenticated user from Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        // Don't throw or log errors for unauthenticated users
        // This is a normal state when users haven't logged in yet
        return null;
      }

      // Then fetch additional user data from our API
      try {
        const data = await apiFetchJson<{ success: boolean; user?: AuthUser }>(
          '/api/me',
          { errorMessage: 'Failed to fetch user data' }
        );

        if (data.success && data.user) {
          return {
            ...user,
            ...data.user,
            user_metadata: data.user.user_metadata || {},
            brand_permissions: data.user.brand_permissions || [],
          };
        }

        return user;
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user:', error);
      throw error;
    }
  };

  // Use React Query to manage user state
  const { data: user, isLoading, error } = useQuery({
    queryKey: userQueryKey,
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: false, // Don't retry auth failures - they're usually intentional (not logged in)
  });

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Invalidate and refetch user data
        queryClient.invalidateQueries({ queryKey: userQueryKey });
      } else if (event === 'SIGNED_OUT') {
        // Clear user data
        queryClient.setQueryData(userQueryKey, null);
      }
    });

    setIsInitializing(false);

    return () => subscription.unsubscribe();
  }, [supabase, queryClient]);

  const signOut = useCallback(async () => {
    try {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.warn('[AuthContext] Failed to hit logout endpoint', error);
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      // Clear all cached data
      queryClient.clear();
      
      // Clear CSRF cookie on the client
      if (typeof document !== 'undefined') {
        document.cookie = 'csrf-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
      }

      // Redirect to login
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  }, [supabase, queryClient]);

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: userQueryKey });
  }, [queryClient]);

  const value = useMemo<AuthContextType>(() => ({
    user: user || null,
    isLoading: isInitializing || isLoading,
    error: (error as Error | null) ?? null,
    signOut,
    refreshUser,
  }), [user, isInitializing, isLoading, error, signOut, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to check permissions
export function usePermissions() {
  const { user } = useAuth();

  const isGlobalAdmin = user?.user_metadata?.role === 'admin';
  
  const hasBrandPermission = (brandId: string, requiredRole?: string) => {
    if (isGlobalAdmin) return true;
    
    const permission = user?.brand_permissions?.find(p => p.brand_id === brandId);
    if (!permission) return false;
    
    if (!requiredRole) return true;
    
    // Role hierarchy: admin > editor > viewer
    const roleHierarchy = { admin: 3, editor: 2, viewer: 1 };
    const userRoleLevel = roleHierarchy[permission.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  };

  return {
    isGlobalAdmin,
    hasBrandPermission,
  };
}
