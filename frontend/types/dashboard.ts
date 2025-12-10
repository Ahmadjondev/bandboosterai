/**
 * Dashboard Types - Clean type definitions for the redesigned dashboard
 */

// Score band colors and levels
export type BandLevel = 'expert' | 'competent' | 'modest' | 'limited' | 'none';

export interface BandInfo {
  level: BandLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Quick action item for dashboard
export interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
  badge?: string;
}

// Section score with visual progress
export interface SectionScore {
  name: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  key: 'listening' | 'reading' | 'writing' | 'speaking';
  icon: string;
  score: number | null;
  bestScore: number | null;
  testsCount: number;
  targetScore: number;
  trend?: 'up' | 'down' | 'stable';
}

// Recent test item with all scores
export interface RecentTestItem {
  id: number;
  examName: string;
  examType: string;
  date: string;
  overallScore: number | null;
  listeningScore: number | null;
  readingScore: number | null;
  writingScore: number | null;
  speakingScore: number | null;
}

// Study streak data
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  thisWeek: number;
  thisMonth: number;
}

// User progress summary
export interface ProgressSummary {
  totalTests: number;
  currentScore: number | null;
  targetScore: number;
  progressPercentage: number;
  booksStarted: number;
  booksCompleted: number;
}

// Dashboard state
export interface DashboardState {
  progress: ProgressSummary;
  sections: SectionScore[];
  recentTests: RecentTestItem[];
  streak: StreakData;
  isLoading: boolean;
  error: string | null;
}

// Helper function to get band level from score
export function getBandLevel(score: number | null): BandLevel {
  if (score === null) return 'none';
  if (score >= 7.5) return 'expert';
  if (score >= 6.0) return 'competent';
  if (score >= 5.0) return 'modest';
  return 'limited';
}

// Get band info with colors
export function getBandInfo(score: number | null): BandInfo {
  const level = getBandLevel(score);
  
  const bandMap: Record<BandLevel, BandInfo> = {
    expert: {
      level: 'expert',
      label: 'Expert',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    },
    competent: {
      level: 'competent',
      label: 'Competent',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    modest: {
      level: 'modest',
      label: 'Modest',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
    },
    limited: {
      level: 'limited',
      label: 'Limited',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    none: {
      level: 'none',
      label: 'No Score',
      color: 'text-slate-400 dark:text-slate-500',
      bgColor: 'bg-slate-50 dark:bg-slate-900/20',
      borderColor: 'border-slate-200 dark:border-slate-700',
    },
  };
  
  return bandMap[level];
}

// Calculate progress percentage towards target
export function calculateProgress(current: number | null, target: number): number {
  if (current === null) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

// Format score display
export function formatScore(score: number | null): string {
  if (score === null) return '--';
  return score.toFixed(1);
}

// Format relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
