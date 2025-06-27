import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * Hook for managing loading states
 * Provides consistent loading and error state management
 */
export function useLoadingState(initialLoading = false): LoadingState {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null); // Clear error when starting new operation
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    setLoading,
    setError,
    reset,
  };
}

interface AsyncState<T> extends LoadingState {
  data: T | null;
  execute: (asyncFunction: () => Promise<T>) => Promise<T | null>;
}

/**
 * Hook for managing async operations with loading states
 * Automatically handles loading, error, and data states
 */
export function useAsyncState<T>(initialData: T | null = null): AsyncState<T> {
  const [data, setData] = useState<T | null>(initialData);
  const loadingState = useLoadingState();

  const execute = useCallback(async (asyncFunction: () => Promise<T>): Promise<T | null> => {
    loadingState.setLoading(true);
    try {
      const result = await asyncFunction();
      setData(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      loadingState.setError(errorMessage);
      return null;
    } finally {
      loadingState.setLoading(false);
    }
  }, [loadingState]);

  return {
    ...loadingState,
    data,
    execute,
  };
}

interface FormState extends LoadingState {
  isSubmitting: boolean;
  submitCount: number;
  handleSubmit: <T>(submitFunction: () => Promise<T>) => Promise<T | null>;
}

/**
 * Hook specifically for form submissions
 * Tracks submission state and count
 */
export function useFormState(): FormState {
  const [submitCount, setSubmitCount] = useState(0);
  const loadingState = useLoadingState();

  const handleSubmit = useCallback(async <T,>(submitFunction: () => Promise<T>): Promise<T | null> => {
    loadingState.setLoading(true);
    try {
      const result = await submitFunction();
      setSubmitCount(count => count + 1);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed';
      loadingState.setError(errorMessage);
      return null;
    } finally {
      loadingState.setLoading(false);
    }
  }, [loadingState]);

  return {
    ...loadingState,
    isSubmitting: loadingState.isLoading,
    submitCount,
    handleSubmit,
  };
}