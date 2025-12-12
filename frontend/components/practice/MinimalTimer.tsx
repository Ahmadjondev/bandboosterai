/**
 * Practice Timer Component - Minimalist Design
 * Compact countdown timer that shows a modal when clicked
 * Shows time remaining and triggers callback when time is up
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface MinimalTimerProps {
  /** Duration in seconds */
  duration: number;
  /** Whether the timer should be running */
  isRunning: boolean;
  /** Callback when timer starts */
  onStart?: () => void;
  /** Callback when timer pauses */
  onPause?: () => void;
  /** Callback when time is up */
  onTimeUp: () => void;
  /** Callback when timer is clicked (to show modal) */
  onTimerClick?: () => void;
  /** Whether timer has been started at least once */
  hasStarted?: boolean;
  /** Warning threshold in seconds (default: 120) */
  warningThreshold?: number;
  /** Danger threshold in seconds (default: 60) */
  dangerThreshold?: number;
  /** Section type for styling */
  sectionType?: "reading" | "listening";
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function MinimalTimer({
  duration,
  isRunning: externalIsRunning,
  onStart,
  onPause,
  onTimeUp,
  onTimerClick,
  hasStarted = false,
  warningThreshold = 120,
  dangerThreshold = 60,
  sectionType = "reading",
}: MinimalTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(externalIsRunning);
  const timeUpCalledRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with external running state
  useEffect(() => {
    setIsRunning(externalIsRunning);
  }, [externalIsRunning]);

  // Timer countdown effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            if (!timeUpCalledRef.current) {
              timeUpCalledRef.current = true;
              setTimeout(() => onTimeUp(), 0);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onTimeUp]);

  // Reset timeUpCalled when duration changes
  useEffect(() => {
    timeUpCalledRef.current = false;
    setTimeRemaining(duration);
  }, [duration]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      setIsRunning(false);
      onPause?.();
    } else {
      setIsRunning(true);
      onStart?.();
    }
  }, [isRunning, onStart, onPause]);

  const handleTimerClick = useCallback(() => {
    if (!hasStarted && onTimerClick) {
      onTimerClick();
    }
  }, [hasStarted, onTimerClick]);

  // Determine color based on time remaining and section type
  const getColors = () => {
    if (timeRemaining <= dangerThreshold) {
      return {
        text: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        ring: "ring-red-500/20",
      };
    }
    if (timeRemaining <= warningThreshold) {
      return {
        text: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/20",
        border: "border-amber-200 dark:border-amber-800",
        ring: "ring-amber-500/20",
      };
    }
    if (sectionType === "reading") {
      return {
        text: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        border: "border-emerald-200 dark:border-emerald-700",
        ring: "ring-emerald-500/20",
      };
    }
    return {
      text: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-700",
      ring: "ring-blue-500/20",
    };
  };

  const colors = getColors();

  // Calculate progress for the subtle indicator
  const progress = (timeRemaining / duration) * 100;

  // If timer hasn't started, show clickable prompt
  if (!hasStarted) {
    return (
      <button
        onClick={handleTimerClick}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
          "hover:ring-2 hover:ring-offset-1",
          colors.bg,
          colors.border,
          colors.ring
        )}
      >
        <Clock className={cn("w-4 h-4", colors.text)} />
        <span className={cn("font-mono text-sm font-semibold", colors.text)}>
          {formatTime(duration)}
        </span>
        <Play className={cn("w-3.5 h-3.5", colors.text)} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all overflow-hidden",
        colors.bg,
        colors.border
      )}
    >
      {/* Progress bar background */}
      <div
        className="absolute inset-0 opacity-20 transition-all duration-1000"
        style={{
          width: `${progress}%`,
          backgroundColor: timeRemaining <= dangerThreshold 
            ? "#ef4444" 
            : timeRemaining <= warningThreshold 
              ? "#f59e0b" 
              : sectionType === "reading" 
                ? "#10b981" 
                : "#3b82f6",
        }}
      />

      {/* Timer icon */}
      <Clock className={cn("w-4 h-4 relative z-10", colors.text)} />

      {/* Time display */}
      <span
        className={cn(
          "font-mono text-sm font-bold tabular-nums relative z-10",
          colors.text,
          timeRemaining <= dangerThreshold && isRunning && "animate-pulse"
        )}
      >
        {formatTime(timeRemaining)}
      </span>

      {/* Play/Pause button */}
      <button
        onClick={handleToggle}
        className={cn(
          "p-1 rounded transition-colors relative z-10",
          "hover:bg-black/5 dark:hover:bg-white/10",
          colors.text
        )}
        title={isRunning ? "Pause timer" : "Resume timer"}
      >
        {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// Export elapsed time hook for tracking actual time spent
export function useElapsedTime(isRunning: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      const interval = setInterval(() => {
        if (startTimeRef.current) {
          const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedSeconds(accumulatedRef.current + currentElapsed);
        }
      }, 1000);
      return () => {
        if (startTimeRef.current) {
          accumulatedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
        }
        clearInterval(interval);
      };
    }
  }, [isRunning]);

  return elapsedSeconds;
}
