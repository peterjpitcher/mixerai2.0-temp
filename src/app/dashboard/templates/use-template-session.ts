'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetchJson, ApiClientError } from '@/lib/api-client';
import type { UserSessionData } from '@/hooks/use-common-data';

interface SessionResponse {
  success: boolean;
  user?: UserSessionData;
  error?: string;
}

export function useTemplateSession() {
  const [user, setUser] = useState<UserSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const data = await apiFetchJson<SessionResponse>('/api/me', {
        retry: 2,
        retryDelayMs: 400,
        errorMessage: 'Failed to verify your session',
      });

      if (data.success && data.user) {
        setUser(data.user);
        setError(null);
        setStatus(null);
        return;
      }

      setUser(null);
      setStatus(403);
      setError(data.error || 'You do not have permission to access this area.');
    } catch (err) {
      setUser(null);

      if (err instanceof ApiClientError) {
        setStatus(err.status);

        if (err.status === 401) {
          setError('Your session has expired. Please sign in again.');
        } else if (err.status === 403) {
          const body = err.body;
          const message =
            (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
              ? body.error
              : null) || err.message || 'You do not have permission to access this area.';
          setError(message);
        } else {
          setError(err.message || 'Unable to verify your session. Please try again.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to verify your session. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  return {
    user,
    isLoading,
    error,
    status,
    refetch: fetchSession,
  };
}
