import { useState, useCallback } from 'react';

export interface UseLoadingReturn {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  startLoading: () => void;
  stopLoading: () => void;
}

/**
 * Custom hook for managing loading states
 * 
 * @example
 * ```tsx
 * const { isLoading, withLoading } = useLoading();
 * 
 * const handleSubmit = async () => {
 *   await withLoading(async () => {
 *     await saveData();
 *   });
 * };
 * ```
 */
export function useLoading(initialState: boolean = false): UseLoadingReturn {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);

  const withLoading = useCallback(async <T,>(
    fn: () => Promise<T>
  ): Promise<T> => {
    setIsLoading(true);
    try {
      return await fn();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    setIsLoading,
    withLoading,
    startLoading,
    stopLoading
  };
}

/**
 * Hook for managing multiple loading states
 * 
 * @example
 * ```tsx
 * const loading = useMultipleLoading({
 *   save: false,
 *   delete: false,
 *   fetch: true
 * });
 * 
 * await loading.withLoading('save', async () => {
 *   await saveData();
 * });
 * ```
 */
export function useMultipleLoading<K extends string>(
  initialStates: Record<K, boolean>
): {
  states: Record<K, boolean>;
  isAnyLoading: boolean;
  setLoading: (key: K, loading: boolean) => void;
  withLoading: <T>(key: K, fn: () => Promise<T>) => Promise<T>;
} {
  const [states, setStates] = useState(initialStates);

  const isAnyLoading = Object.values(states).some(Boolean);

  const setLoading = useCallback((key: K, loading: boolean) => {
    setStates(prev => ({ ...prev, [key]: loading }));
  }, []);

  const withLoading = useCallback(async <T,>(
    key: K,
    fn: () => Promise<T>
  ): Promise<T> => {
    setLoading(key, true);
    try {
      return await fn();
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  return {
    states,
    isAnyLoading,
    setLoading,
    withLoading
  };
}