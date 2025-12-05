'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/use-theme';
import { cn } from '@/lib/manager/utils';

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    // Use setTimeout to avoid the click that opened the menu from immediately closing it
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  // Show skeleton during SSR
  if (!mounted) {
    return (
      <button
        className="relative rounded-lg p-2 transition-all duration-200 text-gray-400"
        disabled
        aria-label="Loading theme"
      >
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  const CurrentIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          'relative rounded-lg p-2 transition-all duration-200',
          'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          'dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
          'focus:outline-none focus:ring-2 focus:ring-primary/20'
        )}
        aria-label="Toggle theme"
      >
        <CurrentIcon className="h-5 w-5" />
      </button>

      {showMenu && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          <div className="p-2 space-y-1">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  setShowMenu(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  theme === value
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {theme === value && (
                  <span className="ml-auto text-primary dark:text-primary-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
