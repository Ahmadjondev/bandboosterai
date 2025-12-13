/**
 * Timer Start Dialog Component
 * Shows instructions before starting reading/listening practice timer
 * User must click "Start" to begin the countdown
 * User can customize the timer duration before starting
 */

"use client";

import { useState } from "react";
import { Clock, BookOpen, Headphones, Play, Info, Lightbulb, Minus, Plus, RotateCcw } from "lucide-react";

interface TimerStartDialogProps {
  isOpen: boolean;
  onStart: (customDuration?: number) => void;
  sectionType: "reading" | "listening";
  duration: number; // in minutes (default duration)
  title?: string;
}

export default function TimerStartDialog({
  isOpen,
  onStart,
  sectionType,
  duration,
  title = "Practice Session",
}: TimerStartDialogProps) {
  const [customDuration, setCustomDuration] = useState(duration);
  
  if (!isOpen) return null;

  const isReading = sectionType === "reading";
  const Icon = isReading ? BookOpen : Headphones;
  const iconColor = isReading ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400";
  const bgColor = isReading ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-blue-100 dark:bg-blue-900/30";
  const borderColor = isReading ? "border-emerald-200 dark:border-emerald-800" : "border-blue-200 dark:border-blue-800";
  const lightBg = isReading ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-blue-50 dark:bg-blue-900/20";
  const buttonColor = isReading ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700";
  const accentColor = isReading ? "emerald" : "blue";

  const tips = isReading
    ? [
        "Skim the passage first to get the main idea",
        "Read questions before diving deep into the text",
        "Look for keywords that match between questions and passage",
        "Don't spend too much time on difficult questions",
      ]
    : [
        "Read the questions before the audio starts",
        "Focus on keywords and listen for synonyms",
        "Write answers as you hear them",
        "Use any extra time to review your answers",
      ];

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
    setCustomDuration(duration);
  };

  const handleStart = () => {
    // Pass custom duration only if it's different from default
    if (customDuration !== duration) {
      onStart(customDuration);
    } else {
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`${lightBg} px-6 py-5 border-b ${borderColor}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center`}>
              <Icon className={`w-7 h-7 ${iconColor}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {isReading ? "Reading Practice" : "Listening Practice"}
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
              {customDuration !== duration && (
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
                    : `bg-${accentColor}-100 dark:bg-${accentColor}-900/30 text-${accentColor}-600 dark:text-${accentColor}-400 hover:bg-${accentColor}-200 dark:hover:bg-${accentColor}-900/50`
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
                {customDuration !== duration && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Default: {duration} min
                  </p>
                )}
              </div>
              
              <button
                onClick={handleIncrease}
                disabled={customDuration >= 120}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  customDuration >= 120
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : `bg-${accentColor}-100 dark:bg-${accentColor}-900/30 text-${accentColor}-600 dark:text-${accentColor}-400 hover:bg-${accentColor}-200 dark:hover:bg-${accentColor}-900/50`
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className={`${lightBg} border ${borderColor} rounded-xl p-4`}>
            <div className="flex items-start gap-3">
              <Info className={`w-5 h-5 ${iconColor} mt-0.5 shrink-0`} />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-1">About the Timer</p>
                <p>
                  The timer will start when you click the button below. 
                  {isReading 
                    ? " You can pause it anytime, but try to simulate real exam conditions."
                    : " The audio will play automatically and the timer will track your progress."}
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
                Quick Tips
              </span>
            </div>
            <ul className="space-y-2">
              {tips.slice(0, 3).map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleStart}
            className={`w-full py-3.5 px-6 ${buttonColor} text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl active:scale-[0.98]`}
          >
            <Play className="w-5 h-5" fill="currentColor" />
            Start Timer
          </button>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
            Click to begin your {customDuration}-minute practice session
          </p>
        </div>
      </div>
    </div>
  );
}
