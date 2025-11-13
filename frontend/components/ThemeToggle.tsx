"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, useToggleTheme } from "@/lib/use-theme";

/**
 * Theme Toggle Component
 * 
 * Provides an accessible button to toggle between light and dark themes.
 * Follows best practices from LogRocket and Material UI articles:
 * - Smooth animations and transitions
 * - ARIA labels for accessibility
 * - Visual feedback with icons and tooltips
 * - Prevents hydration mismatch
 * - High contrast colors (AAA grade)
 * 
 * Features from the articles:
 * - Icon rotation animations (LogRocket)
 * - Tooltip on hover for better UX
 * - Proper color contrast for accessibility (Material UI)
 * - SSR-safe implementation
 * 
 * @see https://blog.logrocket.com/dark-mode-react-in-depth-guide/
 * @see https://semaphore.io/blog/dark-mode-reactjs-material-ui
 */
export function ThemeToggle() {
  const { mounted, isDark } = useTheme();
  const toggleTheme = useToggleTheme();

  // Avoid hydration mismatch by only rendering after mount
  // Shows a skeleton button during SSR
  if (!mounted) {
    return (
      <button
        className="relative group rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle theme"
        disabled
      >
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative group rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
    >
      {/* Animated icon wrapper with rotation effect from LogRocket article */}
      <div className="relative h-5 w-5">
        {/* Sun icon - visible in dark mode with smooth rotation */}
        <Sun 
          className={`absolute inset-0 h-5 w-5 text-yellow-500 dark:text-yellow-400 transition-all duration-300 ease-in-out ${
            isDark 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-0'
          }`}
          aria-hidden="true"
        />
        
        {/* Moon icon - visible in light mode with smooth rotation */}
        <Moon 
          className={`absolute inset-0 h-5 w-5 text-slate-700 transition-all duration-300 ease-in-out ${
            !isDark 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-0'
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Tooltip for desktop - enhances accessibility */}
      <span 
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-700 rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none hidden sm:block z-50"
        role="tooltip"
      >
        {isDark ? "Light mode" : "Dark mode"}
        {/* Tooltip arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></span>
      </span>
    </button>
  );
}

/**
 * Compact Theme Toggle - Minimal version without tooltip
 * Useful for mobile navigation or tight spaces
 */
export function ThemeToggleCompact() {
  const { mounted, isDark } = useTheme();
  const toggleTheme = useToggleTheme();

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      type="button"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-400" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5 text-slate-700" aria-hidden="true" />
      )}
    </button>
  );
}
