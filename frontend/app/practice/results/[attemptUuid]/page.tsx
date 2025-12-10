'use client';

/**
 * Enhanced Practice Results Page
 * Features: Animated score reveal, detailed breakdown, performance insights
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  RotateCcw,
  Home,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Award,
  Medal,
  Star,
  Zap,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import { getAttempt, formatTime } from '@/lib/api/section-practice';
import type { GetAttemptResponse } from '@/types/section-practice';
import { cn } from '@/lib/utils';

// Animated counter hook
function useAnimatedCounter(
  target: number,
  duration: number = 1500,
  delay: number = 0
) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startAnimation = () => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function: easeOutExpo
        const easeOut = 1 - Math.pow(2, -10 * progress);
        setCount(target * easeOut);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCount(target);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, duration, delay]);

  return count;
}

// Circular progress component
function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color,
  delay = 0,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  delay?: number;
}) {
  const [progress, setProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / max) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setProgress(value);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
    </div>
  );
}

// Performance badge component
function PerformanceBadge({ level }: { level: string }) {
  const badges = {
    excellent: {
      icon: Trophy,
      label: 'Excellent',
      color: 'bg-gradient-to-r from-yellow-400 to-amber-500',
      glow: 'shadow-amber-500/30',
    },
    good: {
      icon: Medal,
      label: 'Good',
      color: 'bg-gradient-to-r from-blue-400 to-blue-600',
      glow: 'shadow-blue-500/30',
    },
    fair: {
      icon: Star,
      label: 'Keep Going',
      color: 'bg-gradient-to-r from-purple-400 to-purple-600',
      glow: 'shadow-purple-500/30',
    },
    needsWork: {
      icon: Zap,
      label: 'Practice More',
      color: 'bg-gradient-to-r from-orange-400 to-orange-600',
      glow: 'shadow-orange-500/30',
    },
  };

  const badge = badges[level as keyof typeof badges] || badges.needsWork;
  const Icon = badge.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium shadow-lg',
        badge.color,
        badge.glow
      )}
    >
      <Icon className="w-5 h-5" />
      <span>{badge.label}</span>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  value,
  label,
  suffix = '',
  color,
  isTime = false,
  delay = 0,
}: {
  icon: typeof CheckCircle;
  value: number;
  label: string;
  suffix?: string;
  color: 'green' | 'red' | 'blue' | 'purple';
  isTime?: boolean;
  delay?: number;
}) {
  const animatedValue = useAnimatedCounter(isTime ? 0 : value, 1500, delay);

  const colorClasses = {
    green: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    red: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  };

  const iconBgClasses = {
    green: 'bg-green-100 dark:bg-green-900/30',
    red: 'bg-red-100 dark:bg-red-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-5 text-center transition-all hover:scale-105',
        colorClasses[color]
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3',
          iconBgClasses[color]
        )}
      >
        <Icon className={cn('w-6 h-6', `text-${color}-500`)} />
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">
        {isTime ? formatTime(value) : Math.round(animatedValue)}
        {suffix}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

// Insight Card Component
function InsightCard({
  icon: Icon,
  title,
  value,
  positive,
}: {
  icon: typeof TrendingUp;
  title: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          positive
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
        <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function PracticeResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptUuid = params.attemptUuid as string;

  const [data, setData] = useState<GetAttemptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadResults();
  }, [attemptUuid]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAttempt(attemptUuid);
      setData(response);

      // Show confetti for excellent performance
      if (response.attempt.score && response.attempt.score >= 7.5) {
        setTimeout(() => setShowConfetti(true), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 animate-pulse">
            Calculating your results...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Results not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { attempt, practice } = data;
  const isCompleted = attempt.status === 'COMPLETED';
  const accuracy =
    attempt.total_questions > 0
      ? Math.round((attempt.correct_answers / attempt.total_questions) * 100)
      : 0;

  // Determine performance level
  let performanceLevel: 'excellent' | 'good' | 'fair' | 'needsWork' = 'needsWork';
  let performanceMessage = '';

  if (attempt.score !== null) {
    if (attempt.score >= 7.5) {
      performanceLevel = 'excellent';
      performanceMessage = 'Outstanding! You\'ve mastered this section!';
    } else if (attempt.score >= 6.0) {
      performanceLevel = 'good';
      performanceMessage = 'Great work! You\'re making excellent progress.';
    } else if (attempt.score >= 5.0) {
      performanceLevel = 'fair';
      performanceMessage = 'Good effort! Keep practicing to improve.';
    } else {
      performanceLevel = 'needsWork';
      performanceMessage = 'Don\'t give up! Practice makes perfect.';
    }
  }

  // Get band color
  const getBandColor = (score: number) => {
    if (score >= 8) return '#10b981'; // emerald
    if (score >= 7) return '#22c55e'; // green
    if (score >= 6) return '#3b82f6'; // blue
    if (score >= 5) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const scoreColor = attempt.score ? getBandColor(attempt.score) : '#6b7280';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#fbbf24', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'][
                  Math.floor(Math.random() * 5)
                ],
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href={`/practice/${practice.section_type.toLowerCase()}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to {practice.section_type_display} Practice
        </Link>

        {/* Main Results Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Animated Header */}
          <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 text-center text-white overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2 animate-pulse delay-500" />
            </div>

            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                  Practice Complete
                </span>
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              <h1 className="text-3xl font-bold mb-2">{practice.title}</h1>
              <p className="text-white/70 text-sm">{practice.section_type_display} Section</p>
            </div>
          </div>

          {/* Score Section */}
          <div className="p-8">
            {isCompleted && attempt.score != null ? (
              <div className="text-center mb-8">
                {/* Circular Score Display */}
                <div className="relative inline-block mb-6">
                  <CircularProgress
                    value={attempt.score}
                    max={9}
                    size={160}
                    strokeWidth={12}
                    color={scoreColor}
                    delay={300}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">
                      {Number(attempt.score).toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/ 9.0</span>
                  </div>
                </div>

                {/* Performance Badge */}
                <div className="mb-4">
                  <PerformanceBadge level={performanceLevel} />
                </div>

                <p className="text-lg text-gray-600 dark:text-gray-400">{performanceMessage}</p>
              </div>
            ) : (
              <div className="text-center mb-8 py-8">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  {attempt.status === 'ABANDONED'
                    ? 'Practice was abandoned'
                    : 'Results pending...'}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={CheckCircle}
                value={attempt.correct_answers}
                label="Correct"
                color="green"
                delay={400}
              />
              <StatCard
                icon={XCircle}
                value={attempt.total_questions - attempt.correct_answers}
                label="Incorrect"
                color="red"
                delay={600}
              />
              <StatCard
                icon={Target}
                value={accuracy}
                label="Accuracy"
                suffix="%"
                color="blue"
                delay={800}
              />
              <StatCard
                icon={Clock}
                value={attempt.time_spent_seconds}
                label="Time"
                isTime
                color="purple"
                delay={1000}
              />
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Questions Answered
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {attempt.correct_answers} / {attempt.total_questions}
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(attempt.correct_answers / attempt.total_questions) * 100}%` }}
                />
              </div>
            </div>

            {/* AI Feedback (for Writing/Speaking) */}
            {attempt.ai_feedback && (
              <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      AI Feedback
                    </h3>
                    <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                      {attempt.ai_feedback}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Insights */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <InsightCard
                icon={TrendingUp}
                title="Performance"
                value={performanceLevel === 'excellent' || performanceLevel === 'good' ? 'Above Average' : 'Keep Practicing'}
                positive={performanceLevel === 'excellent' || performanceLevel === 'good'}
              />
              <InsightCard
                icon={BarChart3}
                title="Accuracy Rate"
                value={accuracy >= 70 ? 'Strong' : accuracy >= 50 ? 'Moderate' : 'Needs Work'}
                positive={accuracy >= 70}
              />
              <InsightCard
                icon={BookOpen}
                title="Completion"
                value="100%"
                positive={true}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/practice/detail/${practice.uuid}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              >
                <RotateCcw className="w-5 h-5" />
                Practice Again
              </Link>
              <Link
                href={`/practice/${practice.section_type.toLowerCase()}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border-2 border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:-translate-y-0.5"
              >
                More Practice
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
          >
            <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Back to Section Practice Home
          </Link>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}