'use client';

/**
 * Practice Session Router Page
 * Redirects to the unified reading/listening pages based on section type
 * URL: /practice-session/[uuid]
 * 
 * For Reading: Redirects to /practice-session/reading/[uuid]
 * For Listening: Redirects to /practice-session/listening/[uuid]
 * For Writing/Speaking: Shows a message (not yet implemented)
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSectionPracticeDetail } from '@/lib/api/section-practice';
import { EmailNotVerifiedError } from '@/lib/api-client';
import type { SectionPracticeDetail } from '@/types/section-practice';

export default function PracticeSessionRouterPage() {
  const params = useParams();
  const router = useRouter();
  const practiceUuid = params.uuid as string;

  const [practice, setPractice] = useState<SectionPracticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPracticeAndRedirect();
  }, [practiceUuid]);

  const loadPracticeAndRedirect = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSectionPracticeDetail(practiceUuid);
      setPractice(data);

      // Redirect based on section type
      if (data.section_type === 'READING') {
        router.replace(`/practice-session/reading/${practiceUuid}`);
        return;
      }

      if (data.section_type === 'LISTENING') {
        router.replace(`/practice-session/listening/${practiceUuid}`);
        return;
      }

      // For Writing/Speaking, show a not-implemented message
      // These could be handled differently in the future
      setLoading(false);
    } catch (err: any) {
      if (err instanceof EmailNotVerifiedError) {
        router.push('/verify-email');
        return;
      }
      setError(err?.message || 'Failed to load practice');
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading practice...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !practice) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {error || 'Practice not found'}
          </p>
          <button
            onClick={() => router.push('/practice')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Writing/Speaking not yet implemented message
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              practice.section_type === 'WRITING'
                ? 'bg-purple-100 dark:bg-purple-900/30'
                : 'bg-orange-100 dark:bg-orange-900/30'
            }`}
          >
            <span className="text-2xl">
              {practice.section_type === 'WRITING' && '✍️'}
              {practice.section_type === 'SPEAKING' && '🎤'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {practice.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {practice.section_type_display} Practice
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
          <p className="text-yellow-800 dark:text-yellow-200 text-center">
            {practice.section_type === 'WRITING' 
              ? 'Writing practice with AI feedback is coming soon!'
              : 'Speaking practice with recording is coming soon!'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {practice.duration}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Minutes</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {practice.total_questions}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Questions</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {practice.difficulty_display}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Difficulty</p>
          </div>
        </div>

        <button
          onClick={() => router.push('/practice')}
          className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Go Back to Practice
        </button>
      </div>
    </div>
  );
}
