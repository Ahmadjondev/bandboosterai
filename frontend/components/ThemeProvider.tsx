"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Theme Provider Component
 * 
 * Wraps the application with next-themes provider to enable dark/light mode switching.
 * Uses blocking script in layout.tsx to prevent flash on initial load.
 * 
 * Features:
 * - NO flash on page load (handled by blocking script)
 * - Automatic system preference detection
 * - Persistent user preference via localStorage
 * - SSR-safe implementation (no hydration mismatches)
 * - Smooth transitions between themes
 * - Clean migration from old theme storage
 * 
 * @see https://tailwindcss.com/docs/dark-mode
 * @see https://blog.logrocket.com/dark-mode-react-in-depth-guide/
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storageKey = props.storageKey || 'theme';
    
    // Clean up old conflicting themes from previous implementations
    const oldExamTheme = localStorage.getItem('exam-theme');
    
    if (oldExamTheme) {
      console.log('🧹 Cleaning up old exam-theme:', oldExamTheme);
      localStorage.removeItem('exam-theme');
    }
  }, [props.storageKey]);

  // Don't wait for mount - return immediately to prevent any delays
  // The blocking script in layout.tsx has already set the correct theme
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
