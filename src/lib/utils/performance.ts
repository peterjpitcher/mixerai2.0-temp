/**
 * Performance optimization utilities
 * Helps prevent excessive re-renders and optimize component performance
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Debounce hook for input handlers
 * Prevents excessive function calls
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for scroll/resize handlers
 * Limits function execution frequency
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Create a stable callback that doesn't change between renders
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () => ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Intersection observer hook for lazy loading
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const element = ref.current;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
      if (typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    };
  }, [element, options]);

  return isIntersecting;
}

/**
 * Previous value hook for comparison
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Mount state hook to prevent updates on unmounted components
 */
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Async state hook with loading and error states
 */
export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): {
  value: T | undefined;
  loading: boolean;
  error: Error | undefined;
  execute: () => Promise<void>;
} {
  const [value, setValue] = useState<T>();
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error>();
  const isMounted = useIsMounted();

  const execute = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await asyncFunction();
      if (isMounted()) {
        setValue(result);
      }
    } catch (err) {
      if (isMounted()) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [asyncFunction, isMounted]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { value, loading, error, execute };
}

/**
 * Memoized event handler creator
 */
export function useMemoizedHandler<T extends (...args: unknown[]) => unknown>(
  handler: T,
  deps: React.DependencyList
): T {
  const handlerRef = useRef<T>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  return useMemo(
    () => ((...args: Parameters<T>) => handlerRef.current(...args)) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}

/**
 * Deep comparison effect hook
 */
export function useDeepCompareEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList
): void {
  const ref = useRef<React.DependencyList>();
  const signalRef = useRef(0);

  if (!deepEqual(deps, ref.current)) {
    ref.current = deps;
    signalRef.current += 1;
  }

  useEffect(effect, [signalRef.current, effect]);
}

/**
 * Simple deep equality check
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if ((a as any).constructor !== (b as any).constructor) return false;

  if (Array.isArray(a)) {
    if (a.length !== (b as unknown[]).length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], (b as unknown[])[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && a !== null) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Batch updates to reduce re-renders
 */
export function useBatchedState<T>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchedSetState = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState((prevState) => ({ ...prevState, ...pendingUpdates.current }));
      pendingUpdates.current = {};
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchedSetState];
}
