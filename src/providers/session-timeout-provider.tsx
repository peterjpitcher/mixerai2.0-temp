'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { toast } from 'sonner';

interface SessionTimeoutContextValue {
  resetSessionTimer: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextValue | null>(null);

export function useSessionTimeoutContext() {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeoutContext must be used within SessionTimeoutProvider');
  }
  return context;
}

interface SessionTimeoutProviderProps {
  children: ReactNode;
  warningMinutes?: number;
  sessionMinutes?: number;
}

export function SessionTimeoutProvider({ 
  children,
  warningMinutes = 25,
  sessionMinutes = 30
}: SessionTimeoutProviderProps) {
  const router = useRouter();

  const handleSessionTimeout = () => {
    // Show toast notification
    toast.error('Your session has expired. Please log in again.', {
      duration: 10000,
      action: {
        label: 'Log in',
        onClick: () => router.push('/auth/login')
      }
    });

    // Redirect to login after a short delay
    setTimeout(() => {
      router.push('/auth/login?expired=true');
    }, 2000);
  };

  const { resetSessionTimer } = useSessionTimeout(
    handleSessionTimeout,
    warningMinutes,
    sessionMinutes
  );

  // Reset timer on route changes
  useEffect(() => {
    resetSessionTimer();
  }, [router, resetSessionTimer]);

  return (
    <SessionTimeoutContext.Provider value={{ resetSessionTimer }}>
      {children}
    </SessionTimeoutContext.Provider>
  );
}