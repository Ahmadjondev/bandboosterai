import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge CSS class names with Tailwind CSS support
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 * @param inputs - Class names, objects, or arrays
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Utility function to merge CSS class names conditionally
 * @param classes - Array of class names or conditional class objects
 * @returns Merged class string
 */
export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format a date to a human-readable string
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format a duration in minutes to hours and minutes
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Calculate IELTS band score from raw score
 * @param score - Raw score
 * @param maxScore - Maximum possible score
 * @returns IELTS band score (0-9)
 */
export function calculateBandScore(score: number, maxScore: number): number {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 89) return 9.0;
  if (percentage >= 82) return 8.5;
  if (percentage >= 75) return 8.0;
  if (percentage >= 68) return 7.5;
  if (percentage >= 60) return 7.0;
  if (percentage >= 52) return 6.5;
  if (percentage >= 43) return 6.0;
  if (percentage >= 34) return 5.5;
  if (percentage >= 25) return 5.0;
  if (percentage >= 16) return 4.5;
  if (percentage >= 10) return 4.0;
  return 3.5;
}

/**
 * Delay execution for a specified time
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
