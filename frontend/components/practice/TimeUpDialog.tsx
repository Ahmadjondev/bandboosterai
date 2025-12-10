/**
 * Time Up Dialog Component
 * Modal dialog that appears when practice time expires
 * Forces user to submit their answers
 */

"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, CheckCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeUpDialogProps {
  isOpen: boolean;
  onSubmit: () => void;
  submitting?: boolean;
  answeredCount: number;
  totalQuestions: number;
  sectionType: string;
}

export default function TimeUpDialog({
  isOpen,
  onSubmit,
  submitting = false,
  answeredCount,
  totalQuestions,
  sectionType,
}: TimeUpDialogProps) {
  const [countdown, setCountdown] = useState(10);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  // Auto-submit countdown
  useEffect(() => {
    if (!isOpen || submitting || autoSubmitting) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAutoSubmitting(true);
          onSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, submitting, autoSubmitting, onSubmit]);

  // Reset countdown when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(10);
      setAutoSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;
  const completionPercentage = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header with warning stripe */}
        <div className="bg-gradient-to-r from-red-500 to-amber-500 px-6 py-4">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-full">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Time's Up!</h2>
              <p className="text-sm text-white/80">
                Your {sectionType.toLowerCase()} practice time has ended
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Progress Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Questions Answered
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {answeredCount} / {totalQuestions}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  completionPercentage === 100
                    ? "bg-green-500"
                    : completionPercentage >= 70
                    ? "bg-blue-500"
                    : completionPercentage >= 40
                    ? "bg-amber-500"
                    : "bg-red-500"
                )}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            
            {/* Status Message */}
            <div className="mt-3 flex items-center gap-2">
              {completionPercentage === 100 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    All questions answered!
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    {unansweredCount} question{unansweredCount !== 1 ? "s" : ""} left unanswered
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Info Message */}
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Your answers will be automatically submitted in{" "}
            <span className="font-bold text-red-500">{countdown}</span> seconds.
            <br />
            Click the button below to submit now.
          </p>

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            disabled={submitting || autoSubmitting}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-white transition-all",
              submitting || autoSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            )}
          >
            {submitting || autoSubmitting ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Now
              </>
            )}
          </button>
        </div>

        {/* Animated border effect */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />
      </div>
    </div>
  );
}
