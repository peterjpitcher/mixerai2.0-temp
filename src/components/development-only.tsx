'use client';

import React from 'react';

interface DevelopmentOnlyProps {
  children: React.ReactNode;
}

export function DevelopmentOnly({ children }: DevelopmentOnlyProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <>{children}</>;
} 