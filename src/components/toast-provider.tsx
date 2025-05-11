"use client";

import React from 'react';
import { Toaster, toast, useToast } from '@/components/toast';

/**
 * ToastProvider component.
 * A wrapper component that includes the main Toaster component to display notifications.
 * It also re-exports the `toast` function and `useToast` hook for convenience.
 */
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

export { toast, useToast }; 