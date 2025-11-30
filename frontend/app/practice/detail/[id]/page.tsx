'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Clock,
  Target,
  Trophy,
  Play,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  getSectionPracticeDetail,
  getDifficultyColor,
  formatTime,
} from '@/lib/api/section-practice';
import type { SectionPracticeDetail, SectionPracticeAttempt } from '@/types/section-practice';

const sectionIcons = {
  LISTENING: Headphones,
  READING: BookOpen,
  WRITING: PenTool,
  SPEAKING: Mic,
};

const sectionColors = {
  LISTENING: {
    gradient: 'from-blue-500 to-cyan-500',
    light: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  READING: {
    gradient: 'from-green-500 to-emerald-500',
    light: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    button: 'bg-green-600 hover:bg-green-700',
  },
  WRITING: {
    gradient: 'from-purple-500 to-pink-500',
    light: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
  SPEAKING: {
    gradient: 'from-orange-500 to-amber-500',
    light: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-700',
  },
};

export default function PracticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const practiceId = params.id as string;

  const [practice, setPractice] = useState<SectionPracticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPractice();
  }, [practiceId]);

  const loadPractice = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSectionPracticeDetail(Number(practiceId));
      setPractice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load practice');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!practice) return;

    // For reading, navigate to unified reading page
    if (practice.section_type === 'READING') {
      router.push(`/practice-session/reading/${practice.uuid}`);
      return;
    }

    // For listening, navigate to unified listening page
    if (practice.section_type === 'LISTENING') {
      router.push(`/practice-session/listening/${practice.uuid}`);
      return;
    }

    // For writing and speaking, redirect to the router page which shows "coming soon"
    router.push(`/practice-session/${practice.uuid}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                Loading practice details...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !practice) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Failed to load
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Practice not found'}</p>
              <button
                onClick={loadPractice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Icon = sectionIcons[practice.section_type];
  const colors = sectionColors[practice.section_type];
  const hasAttempts = practice.user_attempts.length > 0;
  const bestAttempt = practice.user_attempts.find(
    (a) => a.status === 'COMPLETED' && a.score !== null
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href={`/practice/${practice.section_type.toLowerCase()}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {practice.section_type_display} Practice
        </Link>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className={`bg-linear-to-r ${colors.gradient} p-6 text-white`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{practice.title}</h1>
                <div className="flex items-center gap-3 text-white/80">
                  <span className="capitalize">{practice.section_type_display}</span>
                  <span>•</span>
                  <span>{practice.difficulty_display}</span>
                </div>
              </div>
              {practice.is_free && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  Free
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Description */}
            {practice.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {practice.description}
              </p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {practice.duration}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Minutes</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <Target className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {practice.total_questions}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Questions</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {bestAttempt?.score != null ? Number(bestAttempt.score).toFixed(1) : '-'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              className={`w-full py-4 ${colors.button} text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors`}
            >
              <Play className="w-5 h-5" />
              {hasAttempts ? 'Start New Attempt' : 'Start Practice'}
            </button>
          </div>
        </div>

        {/* Previous Attempts */}
        {hasAttempts && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Previous Attempts
            </h2>
            <div className="space-y-3">
              {practice.user_attempts.map((attempt) => (
                <AttemptCard key={attempt.id} attempt={attempt} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AttemptCard({ attempt }: { attempt: SectionPracticeAttempt }) {
  const isCompleted = attempt.status === 'COMPLETED';
  const statusColors = {
    COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    IN_PROGRESS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    ABANDONED: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(attempt.started_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{formatTime(attempt.time_spent_seconds)}</span>
              {isCompleted && (
                <>
                  <span>•</span>
                  <span>
                    {attempt.correct_answers}/{attempt.total_questions} correct
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCompleted && attempt.score != null && (
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {Number(attempt.score).toFixed(1)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Band Score</p>
            </div>
          )}
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[attempt.status]}`}
          >
            {attempt.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}
