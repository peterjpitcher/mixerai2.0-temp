"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"

/**
 * ThemeProvider component.
 * Wraps the application with `next-themes` provider to enable light/dark/system mode functionality.
 * Passes all props through to the underlying `NextThemesProvider`.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
} 