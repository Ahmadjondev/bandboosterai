/**
 * Exam Header Component
 * Top navigation bar with timer, controls, and exit button
 * Matches Vue.js exam header with all features
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useExam } from "./ExamContext";
import { SectionName } from "@/types/exam";

export default function ExamHeader() {
  const {
    timeRemaining,
    userAnswers,
    sectionData,
    currentSection,
    handleExit,
    handleNextSection,
    showInstructions,
    isDarkTheme,
    toggleTheme,
    attemptId,
  } = useExam();

  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(2); // Medium (text-base)
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Count total questions (MCMA questions count as multiple based on correct answers)
  const countTotalQuestions = (): number => {
    if (!sectionData) return 0;

    let total = 0;

    if ("parts" in sectionData && sectionData.parts) {
      // Listening section
      sectionData.parts.forEach((part) => {
        part.test_heads?.forEach((group) => {
          if (group.question_type === "MCMA") {
            // For MCMA, each question counts based on number of correct answers
            group.questions?.forEach((question) => {
              // max_selections is stored directly on the question object
              const maxSelections = question.max_selections 
                ? (typeof question.max_selections === 'string' 
                    ? parseInt(question.max_selections) 
                    : question.max_selections)
                : (question.options?.length || 1);
              total += maxSelections;
            });
          } else {
            // Regular questions count as 1 each
            total += group.questions?.length || 0;
          }
        });
      });
    } else if ("passages" in sectionData && sectionData.passages) {
      // Reading section
      sectionData.passages.forEach((passage) => {
        passage.test_heads?.forEach((group) => {
          if (group.question_type === "MCMA") {
            // For MCMA, each question counts based on number of correct answers
            group.questions?.forEach((question) => {
              // max_selections is stored directly on the question object
              const maxSelections = question.max_selections 
                ? (typeof question.max_selections === 'string' 
                    ? parseInt(question.max_selections) 
                    : question.max_selections)
                : (question.options?.length || 1);
              total += maxSelections;
            });
          } else {
            // Regular questions count as 1 each
            total += group.questions?.length || 0;
          }
        });
      });
    }

    return total;
  };

  const totalQuestions = countTotalQuestions();
  const answeredCount = Object.keys(userAnswers).filter(
    (id) => userAnswers[parseInt(id)] && userAnswers[parseInt(id)].toString().trim() !== ""
  ).length;
  const showWarning = timeRemaining < 300; // 5 minutes

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // Get next section label
  const getNextSectionLabel = (): string => {
    if (!sectionData) return "Next Section";
    const nextSection = (sectionData as any).next_section_name;
    if (!nextSection) return "Finish Test";
    return `Next: ${nextSection.charAt(0).toUpperCase() + nextSection.slice(1)}`;
  };

  // Font size controls
  const selectFontSize = (index: number) => {
    setFontSizeIndex(index);
    setShowFontSizeDropdown(false);
    // Store font size in localStorage for persistence
    localStorage.setItem("exam-font-size", index.toString());
    // Trigger event to notify sections of font size change
    window.dispatchEvent(new CustomEvent("fontSizeChange", { 
      detail: { fontSize: fontSizes[index].class } 
    }));
  };

  // Clear highlights
  const clearHighlights = () => {
    if (!attemptId) return;
    
    // Build storage key based on current section
    let storageKey = currentSection.toLowerCase();
    
    // Get all localStorage keys that match the pattern for this attempt
    const highlightKey = `text-highlights-${attemptId}`;
    
    try {
      // Remove the entire highlights storage for this attempt
      localStorage.removeItem(highlightKey);
      
      // Trigger event to notify TextHighlighter components to clear visual highlights
      window.dispatchEvent(new CustomEvent("clearHighlights"));
      
      console.log('[HEADER] Cleared highlights for attempt:', attemptId);
    } catch (error) {
      console.error('[HEADER] Failed to clear highlights:', error);
    }
  };

  // Request fullscreen
  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  // Exit fullscreen
  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  // Check fullscreen state
  const checkFullscreenState = () => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    setIsFullscreen(isCurrentlyFullscreen);
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
    const savedFontSize = localStorage.getItem("exam-font-size");
    if (savedFontSize) {
      const index = parseInt(savedFontSize);
      if (index >= 0 && index < fontSizes.length) {
        setFontSizeIndex(index);
        // Defer event dispatch until after render is complete
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("fontSizeChange", { 
            detail: { fontSize: fontSizes[index].class } 
          }));
        }, 0);
      }
    }
  }, []);

  // Monitor fullscreen state
  useEffect(() => {
    checkFullscreenState();

    const handleFullscreenChange = () => {
      checkFullscreenState();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Don't show header on instructions page
  if (showInstructions) return null;

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 transition-colors duration-300">
      <div className="flex items-center justify-between">
        {/* Left: Controls */}
        <div className="flex items-center gap-2">
         
        </div>

        {/* Right: Timer, Next Button & Exit */}
        <div className="flex items-center gap-2">
           {/* Font Size Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-300"
              title="Change font size"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
              <span className="hidden sm:inline">{fontSizes[fontSizeIndex].label}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showFontSizeDropdown && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 transition-colors duration-300">
                {fontSizes.map((size, index) => (
                  <button
                    key={index}
                    onClick={() => selectFontSize(index)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300 first:rounded-t-lg last:rounded-b-lg ${
                      fontSizeIndex === index
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear Highlights Button (Reading/Listening only) */}
          {(currentSection === SectionName.READING || currentSection === SectionName.LISTENING) && (
            <button
              onClick={clearHighlights}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-300"
              title="Clear all highlights"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => {
              console.log("🖱️ Theme button clicked, current isDarkTheme:", isDarkTheme);
              toggleTheme();
            }}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300"
            title={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkTheme ? (
              // Sun icon for switching to light mode (shown in dark mode)
              <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              // Moon icon for switching to dark mode (shown in light mode)
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Fullscreen Button - Show when NOT in fullscreen */}
          {!isFullscreen && (
            <button
              onClick={requestFullscreen}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300"
              title="Enter fullscreen"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}

          {/* Exit Fullscreen Button - Show when IN fullscreen */}
          {/* {isFullscreen && (
            <button
              onClick={exitFullscreen}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300"
              title="Exit fullscreen"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )} */}
          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-colors duration-300 ${
              showWarning
                ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-mono font-semibold tabular-nums">
              {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Next Section Button */}
          <button
            onClick={() => handleNextSection(false)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-300"
          >
            {getNextSectionLabel()}
          </button>

          {/* Exit Button */}
          <button
            onClick={handleExit}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300"
            title="Exit test"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
