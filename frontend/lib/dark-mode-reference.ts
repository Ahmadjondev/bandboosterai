/**
 * Quick Reference for Dark Mode Implementation
 * 
 * This file contains commonly used dark mode patterns and utilities
 * for easy reference and copy-pasting during development.
 */

// ============================================
// TAILWIND DARK MODE CLASS PATTERNS
// ============================================

/**
 * Backgrounds - Most Common
 */
export const BACKGROUNDS = {
  // Main container backgrounds
  page: "bg-white dark:bg-slate-900",
  card: "bg-white dark:bg-slate-800",
  subtle: "bg-slate-50 dark:bg-slate-800",
  input: "bg-white dark:bg-slate-700",
  
  // Interactive backgrounds
  hover: "hover:bg-slate-100 dark:hover:bg-slate-800",
  active: "active:bg-slate-200 dark:active:bg-slate-700",
  
  // Colored backgrounds
  primary: "bg-blue-600 dark:bg-blue-500",
  success: "bg-green-600 dark:bg-green-500",
  warning: "bg-yellow-600 dark:bg-yellow-500",
  danger: "bg-red-600 dark:bg-red-500",
};

/**
 * Text Colors
 */
export const TEXT_COLORS = {
  primary: "text-slate-900 dark:text-white",
  secondary: "text-slate-600 dark:text-slate-400",
  tertiary: "text-slate-500 dark:text-slate-500",
  muted: "text-slate-400 dark:text-slate-600",
  
  // Colored text
  accent: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  danger: "text-red-600 dark:text-red-400",
};

/**
 * Borders
 */
export const BORDERS = {
  default: "border-slate-200 dark:border-slate-700",
  subtle: "border-slate-100 dark:border-slate-800",
  input: "border-slate-300 dark:border-slate-600",
  focus: "focus:border-blue-500 dark:focus:border-blue-400",
};

/**
 * Shadows & Effects
 */
export const EFFECTS = {
  card: "shadow-lg dark:shadow-slate-900/50",
  hover: "hover:shadow-xl dark:hover:shadow-slate-900/60",
  ring: "ring-blue-500 dark:ring-blue-400",
  backdrop: "backdrop-blur-xl bg-white/80 dark:bg-slate-900/80",
};

/**
 * Gradients
 */
export const GRADIENTS = {
  primary: "bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400",
  secondary: "bg-linear-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400",
  background: "bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950",
};

// ============================================
// COMPONENT EXAMPLES
// ============================================

/**
 * Example: Basic Card Component
 */
export const CARD_EXAMPLE = `
<div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all">
  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
    Card Title
  </h3>
  <p className="text-slate-600 dark:text-slate-400">
    Card description text
  </p>
</div>
`;

/**
 * Example: Button with Dark Mode
 */
export const BUTTON_EXAMPLE = `
<button className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold transition-colors">
  Click Me
</button>
`;

/**
 * Example: Input Field
 */
export const INPUT_EXAMPLE = `
<input
  type="text"
  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
  placeholder="Enter text..."
/>
`;

/**
 * Example: Using Theme Hook
 */
export const THEME_HOOK_EXAMPLE = `
'use client';

import { useTheme } from 'next-themes';

export function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="bg-white dark:bg-slate-900">
      <p className="text-slate-900 dark:text-white">
        Current theme: {theme}
      </p>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        Toggle Theme
      </button>
    </div>
  );
}
`;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Combine dark mode classes conditionally
 */
export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get theme-aware class names
 */
export function getThemeClasses(
  lightClass: string,
  darkClass: string,
  isDark?: boolean
): string {
  return isDark ? darkClass : lightClass;
}

// ============================================
// COLOR REFERENCE
// ============================================

export const COLOR_PALETTE = {
  light: {
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
    },
    border: {
      default: '#e2e8f0',
      subtle: '#f1f5f9',
    },
  },
  dark: {
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
    },
    border: {
      default: '#334155',
      subtle: '#1e293b',
    },
  },
};

// ============================================
// EXPORT ALL
// ============================================

export const DARK_MODE_REFERENCE = {
  backgrounds: BACKGROUNDS,
  textColors: TEXT_COLORS,
  borders: BORDERS,
  effects: EFFECTS,
  gradients: GRADIENTS,
  examples: {
    card: CARD_EXAMPLE,
    button: BUTTON_EXAMPLE,
    input: INPUT_EXAMPLE,
    themeHook: THEME_HOOK_EXAMPLE,
  },
  colorPalette: COLOR_PALETTE,
  utils: {
    cn,
    getThemeClasses,
  },
};

export default DARK_MODE_REFERENCE;
