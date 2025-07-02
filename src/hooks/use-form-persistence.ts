import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { debounce } from 'lodash';
import { apiFetch } from '@/lib/api-client';

interface FormPersistenceOptions<T> {
  storageKey?: string;
  debounceMs?: number;
  excludeFields?: string[];
  onRestore?: (data: T) => void;
  onSave?: (data: T) => void;
}

/**
 * Hook to persist form data in localStorage to handle session timeouts
 * Automatically saves form data as it changes and restores on mount
 */
export function useFormPersistence<T extends Record<string, any>>(
  formData: T,
  options: FormPersistenceOptions<T> = {}
) {
  const pathname = usePathname();
  const {
    storageKey = `form-data-${pathname}`,
    debounceMs = 1000,
    excludeFields = [],
    onRestore,
    onSave
  } = options;

  const isRestoredRef = useRef(false);
  const lastSavedRef = useRef<string>('');

  // Save form data to localStorage
  const saveFormData = useCallback(() => {
    try {
      // Filter out excluded fields
      const dataToSave = Object.entries(formData).reduce((acc, [key, value]) => {
        if (!excludeFields.includes(key)) {
          (acc as any)[key] = value;
        }
        return acc;
      }, {} as T);

      const serialized = JSON.stringify({
        data: dataToSave,
        timestamp: Date.now(),
        pathname
      });

      // Only save if data has changed
      if (serialized !== lastSavedRef.current) {
        localStorage.setItem(storageKey, serialized);
        lastSavedRef.current = serialized;
        onSave?.(dataToSave);
      }
    } catch (error) {
      console.error('Failed to save form data:', error);
    }
  }, [formData, storageKey, excludeFields, pathname, onSave]);

  // Debounced save function
  const debouncedSave = useRef(
    debounce(saveFormData, debounceMs)
  ).current;

  // Restore form data from localStorage
  const restoreFormData = useCallback(() => {
    if (isRestoredRef.current) return null;

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const { data, timestamp, pathname: savedPath } = JSON.parse(stored);
      
      // Check if data is from the same page and not too old (24 hours)
      const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;
      const isSamePage = savedPath === pathname;

      if (isRecent && isSamePage && data) {
        isRestoredRef.current = true;
        onRestore?.(data);
        return data;
      } else {
        // Clear old data
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('Failed to restore form data:', error);
      localStorage.removeItem(storageKey);
    }

    return null;
  }, [storageKey, pathname, onRestore]);

  // Clear saved form data
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(storageKey);
    lastSavedRef.current = '';
    isRestoredRef.current = false;
  }, [storageKey]);

  // Auto-save form data when it changes
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      debouncedSave();
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [formData, debouncedSave]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    restoreFormData,
    clearSavedData,
    saveFormData: saveFormData // Immediate save without debounce
  };
}

/**
 * Session timeout warning component
 */
export function useSessionTimeout(
  onTimeout: () => void,
  warningMinutes: number = 5,
  sessionMinutes: number = 30
) {
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef(Date.now());

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      const remainingMinutes = sessionMinutes - warningMinutes;
      if (window.confirm(
        `Your session will expire in ${remainingMinutes} minutes. ` +
        `Would you like to continue working?`
      )) {
        // User wants to continue, reset timers
        resetTimers();
        // Optionally refresh the session here
        apiFetch('/api/auth/refresh', { method: 'POST' }).catch(() => {});
      }
    }, warningMinutes * 60 * 1000);

    // Set session timeout
    sessionTimeoutRef.current = setTimeout(() => {
      onTimeout();
    }, sessionMinutes * 60 * 1000);

    lastActivityRef.current = Date.now();
  }, [onTimeout, warningMinutes, sessionMinutes]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      // Only reset if more than 1 minute has passed since last activity
      if (now - lastActivityRef.current > 60000) {
        resetTimers();
      }
    };

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Start timers
    resetTimers();

    return () => {
      // Clean up
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, [resetTimers]);

  return {
    resetSessionTimer: resetTimers
  };
}
