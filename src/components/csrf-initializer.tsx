'use client';

import { useEffect } from 'react';
import { initializeCSRFToken } from '@/lib/csrf-setup';

/**
 * Client component that ensures CSRF token is initialized
 * This should be included in the root layout
 */
export function CSRFInitializer() {
  useEffect(() => {
    initializeCSRFToken();
  }, []);

  return null;
}