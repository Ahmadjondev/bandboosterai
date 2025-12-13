/**
 * Audio Start Dialog Component
 * Shows instructions before starting listening practice
 * User must click "Start" to begin audio playback
 * User can customize the timer duration before starting
 */

"use client";

import { useState } from "react";
import { Clock, Minus, Plus, RotateCcw } from "lucide-react";

interface AudioStartDialogProps {
  isOpen: boolean;
  onStart: (customDuration?: number) => void;
  partTitle?: string;
  defaultDuration?: number; // in minutes
}

export default function AudioStartDialog({
  isOpen,
  onStart,
  partTitle = "Listening Practice",
  defaultDuration = 30, // Default 30 minutes for listening
}: AudioStartDialogProps) {
  const [customDuration, setCustomDuration] = useState(defaultDuration);
  
  if (!isOpen) return null;

  const handleDecrease = () => {
    if (customDuration > 5) {
      setCustomDuration(prev => prev - 5);
    }
  };

  const handleIncrease = () => {
    if (customDuration < 120) {
      setCustomDuration(prev => prev + 5);
    }
  };

  const handleReset = () => {
    setCustomDuration(defaultDuration);
  };

  const handleStart = () => {
    // Pass custom duration only if it's different from default
    if (customDuration !== defaultDuration) {
      onStart(customDuration);
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-5 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 00-5.656 5.656m0 0A9 9 0 015.586 8.464M12 12v.01"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {partTitle}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Listening Practice
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Timer Customization */}
          <div className="py-4 px-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timer Duration</span>
              </div>
              {customDuration !== defaultDuration && (
                <button 
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleDecrease}
                disabled={customDuration <= 5}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  customDuration <= 5
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                }`}
              >
                <Minus className="w-5 h-5" />
              </button>
              
              <div className="text-center min-w-[100px]">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {customDuration}
                </span>
                <span className="text-lg text-gray-600 dark:text-gray-400 ml-1.5">
                  min
                </span>
                {customDuration !== defaultDuration && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Default: {defaultDuration} min
                  </p>
                )}
              </div>
              
              <button
                onClick={handleIncrease}
                disabled={customDuration >= 120}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  customDuration >= 120
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Instructions
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>The audio will start automatically when you click "Start"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>You can pause, play, and seek through the audio using the controls</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Answer all questions while listening or after the audio ends</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <svg
                className="w-5 h-5 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                <strong className="font-semibold">Tip:</strong> Read the questions before starting
                the audio to know what to listen for.
              </span>
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleStart}
            className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Start Listening Practice
          </button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
            Click to begin your {customDuration}-minute practice session
          </p>
        </div>
      </div>
    </div>
  );
}
