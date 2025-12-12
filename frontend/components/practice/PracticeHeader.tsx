/**
 * Practice Header Component - Minimalist Design
 * Clean, compact header with FontAwesome icons
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFont,
  faEraser,
  faSun,
  faMoon,
  faArrowRightFromBracket,
  faCheck,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import MinimalTimer from "./MinimalTimer";

interface PracticeHeaderProps {
  title: string;
  subtitle: string;
  answeredCount: number;
  totalQuestions: number;
  onSubmit: () => void;
  onExit: () => void;
  submitting?: boolean;
  bookId?: number;
  sectionType?: "listening" | "reading" | "writing" | "speaking";
  timerDuration?: number;
  isTimerRunning?: boolean;
  timerStarted?: boolean;
  onTimerStart?: () => void;
  onTimerPause?: () => void;
  onTimerClick?: () => void;
  onTimeUp?: () => void;
}

export default function PracticeHeader({
  title,
  subtitle,
  answeredCount,
  totalQuestions,
  onSubmit,
  onExit,
  submitting = false,
  sectionType,
  timerDuration,
  isTimerRunning = false,
  timerStarted = false,
  onTimerStart,
  onTimerPause,
  onTimerClick,
  onTimeUp,
}: PracticeHeaderProps) {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(2);
  const menuRef = useRef<HTMLDivElement>(null);

  const fontSizes = [
    { class: "text-xs", label: "XS" },
    { class: "text-sm", label: "S" },
    { class: "text-base", label: "M" },
    { class: "text-lg", label: "L" },
    { class: "text-xl", label: "XL" },
  ];

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

  useEffect(() => {
    const savedFontSize = localStorage.getItem("practice-font-size");
    if (savedFontSize) {
      const index = parseInt(savedFontSize);
      if (index >= 0 && index < fontSizes.length) {
        setFontSizeIndex(index);
        window.dispatchEvent(
          new CustomEvent("fontSizeChange", {
            detail: { fontSize: fontSizes[index].class },
          })
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!showFontMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowFontMenu(false);
      }
    };
    setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showFontMenu]);

  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const selectFontSize = (index: number) => {
    setFontSizeIndex(index);
    setShowFontMenu(false);
    localStorage.setItem("practice-font-size", index.toString());
    window.dispatchEvent(
      new CustomEvent("fontSizeChange", {
        detail: { fontSize: fontSizes[index].class },
      })
    );
  };

  const clearHighlights = () => {
    localStorage.removeItem(`text-highlights-practice-${sectionType}`);
    window.dispatchEvent(new CustomEvent("clearHighlights"));
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Title */}
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {subtitle}
          </p>
        </div>

        {/* Center: Timer */}
        {timerDuration && onTimeUp && (
          <MinimalTimer
            duration={timerDuration}
            isRunning={isTimerRunning}
            onStart={onTimerStart}
            onPause={onTimerPause}
            onTimeUp={onTimeUp}
            onTimerClick={onTimerClick}
            hasStarted={timerStarted}
            sectionType={sectionType === "reading" || sectionType === "listening" ? sectionType : "reading"}
          />
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {/* Font Size */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowFontMenu(!showFontMenu)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              title="Font Size"
            >
              <FontAwesomeIcon icon={faFont} className="w-4 h-4" />
            </button>
            {showFontMenu && (
              <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                <div className="flex">
                  {fontSizes.map((size, i) => (
                    <button
                      key={i}
                      onClick={() => selectFontSize(i)}
                      className={`px-3 py-2 text-xs font-medium transition-colors ${
                        i === fontSizeIndex
                          ? "bg-blue-500 text-white"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Clear Highlights"
          >
            <FontAwesomeIcon icon={faEraser} className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            title={isDarkTheme ? "Light Mode" : "Dark Mode"}
          >
            <FontAwesomeIcon
              icon={isDarkTheme ? faSun : faMoon}
              className={`w-4 h-4 ${isDarkTheme ? "text-yellow-400" : ""}`}
            />
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Exit */}
          <button
            onClick={onExit}
            className="p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            title="Exit"
          >
            <FontAwesomeIcon icon={faArrowRightFromBracket} className="w-4 h-4" />
          </button>

          {/* Submit */}
          <button
            onClick={onSubmit}
            disabled={submitting || answeredCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon
              icon={submitting ? faSpinner : faCheck}
              className={`w-3.5 h-3.5 ${submitting ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">{submitting ? "Saving..." : "Finish"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
