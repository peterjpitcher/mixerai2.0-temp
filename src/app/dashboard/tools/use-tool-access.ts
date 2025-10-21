'use client';

import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/use-common-data';
import { ApiClientError } from '@/lib/api-client';

type Role = string | undefined | null;

export interface ToolAccessResult {
  user: ReturnType<typeof useCurrentUser>['data'] | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  status: number | null;
  hasAccess: boolean;
  refetch: () => void;
}

const DEFAULT_ROLES = ['admin', 'editor'];

function normalizeError(error: unknown): { message: string; status: number | null } {
  if (!error) {
    return { message: '', status: null };
  }

  if (error instanceof ApiClientError) {
    return {
      message: error.message || 'Unable to verify your session.',
      status: error.status ?? null,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, status: null };
  }

  return { message: 'Unable to verify your session.', status: null };
}

function hasRequiredRole(role: Role, requiredRoles: string[]): boolean {
  if (!role) return false;
  return requiredRoles.includes(role);
}

export function useToolAccess(requiredRoles: string[] = DEFAULT_ROLES): ToolAccessResult {
  const { data, isLoading, isFetching, error, refetch } = useCurrentUser();

  const { message, status } = useMemo(() => normalizeError(error), [error]);

  const hasAccess = useMemo(() => {
    if (!data) return false;
    const role = data.user_metadata?.role;
    return hasRequiredRole(role, requiredRoles);
  }, [data, requiredRoles]);

  return {
    user: data ?? null,
    isLoading,
    isFetching,
    error: message || null,
    status,
    hasAccess,
    refetch: () => {
      void refetch();
    },
  };
}
