import { useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

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