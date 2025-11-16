/**
 * Theme Utilities Hook
 * 
 * Provides helpful utilities for working with themes in components.
 * Follows the custom hook pattern from LogRocket's dark mode guide.
 * 
 * Features:
 * - SSR-safe theme detection
 * - Helper functions for conditional rendering
 * - System preference detection
 * - Persistent state management
 * 
 * @see https://blog.logrocket.com/dark-mode-react-in-depth-guide/
 */

'use client';

import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Enhanced theme hook with additional utilities
 * Similar to the useColorScheme pattern from LogRocket article
 * 
 * @example
 * const { isDark, isLight, mounted, theme, setTheme } = useTheme();
 * if (!mounted) return null; // Prevent hydration mismatch
 * 
 * return <div className={isDark ? 'dark-class' : 'light-class'}>...</div>
 */
export function useTheme() {
  const { theme, setTheme, systemTheme, themes, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  // Wait until mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate actual theme (considering system preference)
  const activeTheme = mounted ? (theme === 'system' ? systemTheme : theme) : undefined;

  return {
    theme,
    setTheme,
    systemTheme,
    themes,
    resolvedTheme,
    mounted,
    isDark: mounted && activeTheme === 'dark',
    isLight: mounted && activeTheme === 'light',
    isSystem: mounted && theme === 'system',
    activeTheme, // The actual theme being displayed
  };
}

/**
 * Hook to check if dark mode is active (returns boolean)
 * Safe to use during SSR - returns false until mounted
 * 
 * Follows the pattern from LogRocket article for safe theme detection
 * 
 * @example
 * const isDark = useIsDark();
 * const iconColor = isDark ? '#fff' : '#000';
 */
export function useIsDark(): boolean {
  const { isDark, mounted } = useTheme();
  return mounted ? isDark : false;
}

/**
 * Hook to get the active theme name
 * Safe to use during SSR - returns 'light' until mounted
 * 
 * @example
 * const activeTheme = useActiveTheme();
 * console.log(`Current theme: ${activeTheme}`);
 */
export function useActiveTheme(): 'light' | 'dark' | undefined {
  const { activeTheme, mounted } = useTheme();
  return mounted ? (activeTheme as 'light' | 'dark') : 'light';
}

/**
 * Hook to get theme-aware values
 * Inspired by Material UI's theming approach
 * 
 * @example
 * const bgColor = useThemedValue('#ffffff', '#1e293b');
 * // Returns '#ffffff' in light mode, '#1e293b' in dark mode
 * 
 * const padding = useThemedValue('1rem', '1.5rem');
 * // Returns '1rem' in light mode, '1.5rem' in dark mode
 */
export function useThemedValue<T>(lightValue: T, darkValue: T): T {
  const { isDark, mounted } = useTheme();
  
  if (!mounted) {
    return lightValue; // Default to light value during SSR
  }
  
  return isDark ? darkValue : lightValue;
}

/**
 * Hook to toggle between light and dark themes
 * Simplifies theme toggling without managing state manually
 * 
 * @example
 * const toggleTheme = useToggleTheme();
 * <button onClick={toggleTheme}>Toggle Theme</button>
 */
export function useToggleTheme(): () => void {
  const { theme, setTheme, activeTheme } = useTheme();
  
  return () => {
    if (theme === 'system') {
      // If on system theme, switch to opposite of current system preference
      setTheme(activeTheme === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };
}

/**
 * Hook to check if system prefers dark mode
 * Uses the prefers-color-scheme media query
 * 
 * @example
 * const systemPrefersDark = useSystemPrefersDark();
 * console.log(`System prefers: ${systemPrefersDark ? 'dark' : 'light'}`);
 */
export function useSystemPrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    
    // Fallback for older browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, []);

  return mounted ? prefersDark : false;
}
