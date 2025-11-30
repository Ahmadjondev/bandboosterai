'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { getAttempt, formatTime } from '@/lib/api/section-practice';
import type { GetAttemptResponse } from '@/types/section-practice';

export default function PracticeResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = Number(params.attemptId);

  const [data, setData] = useState<GetAttemptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAttempt(attemptId);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Results not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { attempt, practice } = data;
  const isCompleted = attempt.status === 'COMPLETED';
  const accuracy = attempt.total_questions > 0
    ? Math.round((attempt.correct_answers / attempt.total_questions) * 100)
    : 0;

  // Determine performance level
  let performanceLevel: 'excellent' | 'good' | 'fair' | 'needsWork' = 'needsWork';
  let performanceMessage = '';
  let performanceColor = '';

  if (attempt.score !== null) {
    if (attempt.score >= 7.5) {
      performanceLevel = 'excellent';
      performanceMessage = 'Excellent performance! Keep up the great work!';
      performanceColor = 'text-green-600 dark:text-green-400';
    } else if (attempt.score >= 6.0) {
      performanceLevel = 'good';
      performanceMessage = 'Good job! You\'re on the right track.';
      performanceColor = 'text-blue-600 dark:text-blue-400';
    } else if (attempt.score >= 5.0) {
      performanceLevel = 'fair';
      performanceMessage = 'Keep practicing to improve your score.';
      performanceColor = 'text-yellow-600 dark:text-yellow-400';
    } else {
      performanceLevel = 'needsWork';
      performanceMessage = 'More practice will help you improve!';
      performanceColor = 'text-orange-600 dark:text-orange-400';
    }
  }

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

        {/* Results Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-green-500 to-emerald-600 p-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Practice Complete!</h1>
            <p className="text-white/80">{practice.title}</p>
          </div>

          {/* Score Display */}
          <div className="p-8">
            {isCompleted && attempt.score != null ? (
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="text-6xl font-bold text-gray-900 dark:text-white">
                    {Number(attempt.score).toFixed(1)}
                  </span>
                  <span className="text-2xl text-gray-500 dark:text-gray-400">/9.0</span>
                </div>
                <p className={`text-lg font-medium ${performanceColor}`}>
                  {performanceMessage}
                </p>
              </div>
            ) : (
              <div className="text-center mb-8">
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  {attempt.status === 'ABANDONED' ? 'Practice was abandoned' : 'Results pending...'}
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attempt.correct_answers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Correct</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <XCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attempt.total_questions - attempt.correct_answers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Incorrect</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <Target className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {accuracy}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatTime(attempt.time_spent_seconds)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Time</p>
              </div>
            </div>

            {/* AI Feedback (for Writing/Speaking) */}
            {attempt.ai_feedback && (
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  AI Feedback
                </h3>
                <p className="text-blue-800 dark:text-blue-200">{attempt.ai_feedback}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/practice/detail/${practice.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </Link>
              <Link
                href={`/practice/${practice.section_type.toLowerCase()}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                More Practice
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Section Practice Home
          </Link>
        </div>
      </div>
    </div>
  );
}
