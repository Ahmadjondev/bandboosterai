/**
 * Practice Timer Component
 * Countdown timer with circular progress indicator
 * Shows time remaining and triggers callback when time is up
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Play, Pause, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PracticeTimerProps {
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
  /** Whether to show play/pause controls */
  showControls?: boolean;
  /** Warning threshold in seconds (default: 60) */
  warningThreshold?: number;
  /** Danger threshold in seconds (default: 30) */
  dangerThreshold?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Current elapsed time in seconds (for resuming) */
  initialElapsed?: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function PracticeTimer({
  duration,
  isRunning: externalIsRunning,
  onStart,
  onPause,
  onTimeUp,
  showControls = true,
  warningThreshold = 120,
  dangerThreshold = 60,
  size = "md",
  initialElapsed = 0,
}: PracticeTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(Math.max(0, duration - initialElapsed));
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
    setTimeRemaining(Math.max(0, duration - initialElapsed));
  }, [duration, initialElapsed]);

  const handleToggle = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      onPause?.();
    } else {
      setIsRunning(true);
      onStart?.();
    }
  }, [isRunning, onStart, onPause]);

  // Calculate progress percentage
  const progress = (timeRemaining / duration) * 100;

  // Determine color based on time remaining
  const getColorClass = () => {
    if (timeRemaining <= dangerThreshold) return "text-red-500 dark:text-red-400";
    if (timeRemaining <= warningThreshold) return "text-amber-500 dark:text-amber-400";
    return "text-blue-600 dark:text-blue-400";
  };

  const getProgressColor = () => {
    if (timeRemaining <= dangerThreshold) return "#ef4444";
    if (timeRemaining <= warningThreshold) return "#f59e0b";
    return "#3b82f6";
  };

  const getBgColor = () => {
    if (timeRemaining <= dangerThreshold) return "bg-red-50 dark:bg-red-900/20";
    if (timeRemaining <= warningThreshold) return "bg-amber-50 dark:bg-amber-900/20";
    return "bg-blue-50 dark:bg-blue-900/20";
  };

  // Size configurations
  const sizeConfig = {
    sm: { container: "px-2 py-1", text: "text-sm", icon: 14, ring: 32, stroke: 3 },
    md: { container: "px-3 py-1.5", text: "text-base", icon: 16, ring: 40, stroke: 3 },
    lg: { container: "px-4 py-2", text: "text-lg", icon: 20, ring: 48, stroke: 4 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * ((config.ring - config.stroke) / 2);
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border transition-colors",
        getBgColor(),
        timeRemaining <= dangerThreshold
          ? "border-red-200 dark:border-red-800"
          : timeRemaining <= warningThreshold
          ? "border-amber-200 dark:border-amber-800"
          : "border-blue-200 dark:border-blue-800",
        config.container
      )}
    >
      {/* Circular Progress Ring */}
      <div className="relative" style={{ width: config.ring, height: config.ring }}>
        <svg
          className="transform -rotate-90"
          width={config.ring}
          height={config.ring}
        >
          {/* Background circle */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={(config.ring - config.stroke) / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={(config.ring - config.stroke) / 2}
            fill="none"
            stroke={getProgressColor()}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {timeRemaining <= dangerThreshold ? (
            <AlertTriangle size={config.icon * 0.6} className={getColorClass()} />
          ) : (
            <Clock size={config.icon * 0.6} className={getColorClass()} />
          )}
        </div>
      </div>

      {/* Time Display */}
      <div className="flex flex-col">
        <span
          className={cn(
            "font-mono font-bold tabular-nums",
            getColorClass(),
            config.text,
            timeRemaining <= dangerThreshold && isRunning && "animate-pulse"
          )}
        >
          {formatTime(timeRemaining)}
        </span>
        {timeRemaining <= warningThreshold && timeRemaining > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timeRemaining <= dangerThreshold ? "Hurry up!" : "Time running out"}
          </span>
        )}
      </div>

      {/* Play/Pause Control */}
      {showControls && (
        <button
          onClick={handleToggle}
          className={cn(
            "ml-1 p-1.5 rounded-md transition-colors",
            "hover:bg-gray-200/50 dark:hover:bg-gray-700/50",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            getColorClass()
          )}
          title={isRunning ? "Pause timer" : "Start timer"}
        >
          {isRunning ? <Pause size={config.icon} /> : <Play size={config.icon} />}
        </button>
      )}
    </div>
  );
}

// Hook for managing timer state
export function usePracticeTimer(durationMinutes: number) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const startTimer = useCallback(() => {
    setIsTimerRunning(true);
    setTimerStarted(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsTimerRunning(true);
  }, []);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setTimerStarted(false);
    setElapsedSeconds(0);
  }, []);

  // Track elapsed time
  useEffect(() => {
    if (isTimerRunning) {
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTimerRunning]);

  return {
    duration: durationMinutes * 60,
    isTimerRunning,
    timerStarted,
    elapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  };
}
