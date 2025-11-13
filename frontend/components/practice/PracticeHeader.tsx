/**
 * Practice Header Component
 * Header for practice pages with font controls, theme toggle, text highlighter clear
 * Styled like exam header but adapted for practice mode
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface PracticeHeaderProps {
  title: string;
  subtitle: string;
  answeredCount: number;
  totalQuestions: number;
  onSubmit: () => void;
  onExit: () => void;
  submitting?: boolean;
  bookId?: number;
  sectionType?: "listening" | "reading";
}

export default function PracticeHeader({
  title,
  subtitle,
  answeredCount,
  totalQuestions,
  onSubmit,
  onExit,
  submitting = false,
  bookId,
  sectionType,
}: PracticeHeaderProps) {
  const router = useRouter();
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(2); // Medium (text-base)
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fontSizes = [
    { class: "text-xs", label: "Extra Small" },
    { class: "text-sm", label: "Small" },
    { class: "text-base", label: "Medium" },
    { class: "text-lg", label: "Large" },
    { class: "text-xl", label: "Extra Large" },
    { class: "text-2xl", label: "2X Large" },
    { class: "text-3xl", label: "3X Large" },
  ];

  // Initialize theme from localStorage
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    const isDark = theme === "dark";
    setIsDarkTheme(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Font size controls
  const selectFontSize = (index: number) => {
    setFontSizeIndex(index);
    setShowFontSizeDropdown(false);
    localStorage.setItem("practice-font-size", index.toString());
    // Trigger event to notify sections of font size change
    window.dispatchEvent(
      new CustomEvent("fontSizeChange", {
        detail: { fontSize: fontSizes[index].class },
      })
    );
  };

  // Clear highlights
  const clearHighlights = () => {
    try {
      // Build storage key pattern for practice mode
      const storageKey = `text-highlights-practice-${sectionType}`;
      localStorage.removeItem(storageKey);
      
      // Trigger event to notify TextHighlighter components
      window.dispatchEvent(new CustomEvent("clearHighlights"));
      
      console.log('[PRACTICE-HEADER] Cleared highlights for:', sectionType);
    } catch (error) {
      console.error('[PRACTICE-HEADER] Failed to clear highlights:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFontSizeDropdown(false);
      }
    };

    if (showFontSizeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFontSizeDropdown]);

  // Initialize font size from localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem("practice-font-size");
    if (savedFontSize) {
      const index = parseInt(savedFontSize);
      if (index >= 0 && index < fontSizes.length) {
        setFontSizeIndex(index);
        // Trigger font size change on mount
        window.dispatchEvent(
          new CustomEvent("fontSizeChange", {
            detail: { fontSize: fontSizes[index].class },
          })
        );
      }
    }
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div className="min-w-0 shrink">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {subtitle}
          </p>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Progress */}
          {/* <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {answeredCount} / {totalQuestions}
            </span>
          </div> */}

          {/* Font Size */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Font Size"
            >
              <svg
                className="w-5 h-5 text-gray-700 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
            </button>

            {showFontSizeDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="py-1">
                  {fontSizes.map((size, index) => (
                    <button
                      key={index}
                      onClick={() => selectFontSize(index)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        index === fontSizeIndex
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clear Highlights */}
          <button
            onClick={clearHighlights}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Clear Highlights"
          >
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkTheme ? (
              <svg
                className="w-5 h-5 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-700"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Exit Button */}
          <button
            onClick={onExit}
            className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Exit
          </button>

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            disabled={submitting || answeredCount === 0}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white transition-colors text-sm font-medium disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Finish"}
          </button>
        </div>
      </div>
    </header>
  );
}
