"use client";

import React from 'react';
import { Toaster, toast, useToast } from '@/components/toast';

// This is just a wrapper component for the Toaster
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

export { toast, useToast }; 