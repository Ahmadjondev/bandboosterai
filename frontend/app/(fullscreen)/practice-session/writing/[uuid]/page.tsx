'use client';

/**
 * Writing Practice Page
 * Complete writing practice flow with AI evaluation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Edit,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Send,
  Loader2,
  Image as ImageIcon,
  Info,
} from 'lucide-react';
import {
  getSectionPracticeDetail,
  startPractice,
  submitWriting,
} from '@/lib/api/section-practice';
import PracticeTimer from '@/components/practice/PracticeTimer';
import TimeUpDialog from '@/components/practice/TimeUpDialog';
import type { SectionPracticeDetail, WritingTaskContent } from '@/types/section-practice';

// Default duration in minutes for writing (Task 1: 20 min, Task 2: 40 min)
const DEFAULT_TASK1_DURATION = 20;
const DEFAULT_TASK2_DURATION = 40;

export default function WritingPracticePage() {
  const params = useParams();
  const router = useRouter();
  const practiceUuid = params.uuid as string;

  // Practice data
  const [practice, setPractice] = useState<SectionPracticeDetail | null>(null);
  const [attemptUuid, setAttemptUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Writing state
  const [response, setResponse] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load practice data
  useEffect(() => {
    loadPractice();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [practiceUuid]);

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime]);

  const loadPractice = async () => {
    try {
      setLoading(true);
      const data = await getSectionPracticeDetail(practiceUuid);

      if (data.section_type !== 'WRITING') {
        setError('This is not a writing practice');
        return;
      }

      setPractice(data);

      // Check for existing in-progress attempt or start new one
      const existingAttempt = data.user_attempts?.find(
        (a: { status: string }) => a.status === 'IN_PROGRESS'
      );
      if (existingAttempt) {
        setAttemptUuid(existingAttempt.uuid);
      } else {
        // Start new practice attempt
        const attemptResponse = await startPractice(practiceUuid);
        setAttemptUuid(attemptResponse.attempt.uuid);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load practice';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update word count when response changes
  const handleResponseChange = useCallback((text: string) => {
    setResponse(text);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer handlers
  const handleTimerStart = useCallback(() => {
    setIsTimerRunning(true);
  }, []);

  const handleTimerPause = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const handleTimeUp = useCallback(() => {
    setIsTimerRunning(false);
    setShowTimeUpDialog(true);
  }, []);

  const handleSubmit = async (skipConfirm = false) => {
    if (!attemptUuid) return;

    // Get writing task from content
    const writingTask = practice?.content as WritingTaskContent | null;
    const minWordsRequired = writingTask?.min_words || 150;

    if (!skipConfirm && wordCount < minWordsRequired) {
      const confirmed = window.confirm(
        `Your response has ${wordCount} words, which is below the minimum requirement of ${minWordsRequired} words. Are you sure you want to submit?`
      );
      if (!confirmed) return;
    }

    try {
      setSubmitting(true);
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      const result = await submitWriting(attemptUuid, {
        response,
        time_spent: timeSpent,
      });

      // Navigate to results page
      router.push(`/practice-session/writing/results/${result.attempt_uuid}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit writing';
      alert(errorMessage);
      setSubmitting(false);
    }
  };

  const handleTimeUpSubmit = useCallback(() => {
    handleSubmit(true);
  }, [attemptUuid, practice, response, startTime]);

  const handleExit = () => {
    const confirmed = window.confirm(
      'Are you sure you want to exit? Your progress will not be saved.'
    );
    if (confirmed) {
      router.push('/practice');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading writing practice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/practice')}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Back to Practice
          </button>
        </div>
      </div>
    );
  }

  // Get writing task content from practice
  const writingTask = practice?.content as WritingTaskContent | null;
  const minWords = writingTask?.min_words || 150;
  const taskType = writingTask?.task_type || 'TASK_2';
  const isTask1 = taskType === 'TASK_1';

  // Get timer duration based on task type
  const timerDuration = (practice?.duration_minutes || (isTask1 ? DEFAULT_TASK1_DURATION : DEFAULT_TASK2_DURATION)) * 60;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Time Up Dialog */}
      <TimeUpDialog
        isOpen={showTimeUpDialog}
        onSubmit={handleTimeUpSubmit}
        submitting={submitting}
        answeredCount={response.trim() ? 1 : 0}
        totalQuestions={1}
        sectionType="Writing"
      />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExit}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Edit className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 dark:text-white">
                  {practice?.title || 'Writing Practice'}
                </h1>
                <p className="text-sm text-gray-500">
                  {taskType === 'TASK_1' ? 'Task 1' : 'Task 2'} • {practice?.difficulty || 'Medium'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Countdown Timer */}
            <PracticeTimer
              duration={timerDuration}
              isRunning={isTimerRunning}
              onStart={handleTimerStart}
              onPause={handleTimerPause}
              onTimeUp={handleTimeUp}
              showControls={true}
              size="md"
            />

            {/* Word Count */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                wordCount >= minWords
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">
                {wordCount} / {minWords} words
              </span>
              {wordCount >= minWords && <CheckCircle className="w-4 h-4" />}
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleSubmit()}
              disabled={submitting || !response.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Task Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
              <h2 className="font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                {isTask1 ? 'Writing Task 1' : 'Writing Task 2'}
              </h2>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                {isTask1
                  ? 'Describe the visual information in at least 150 words.'
                  : 'Write an essay of at least 250 words.'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Task Image for Task 1 */}
              {isTask1 && writingTask?.image_url && (
                <div className="mb-6">
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img
                      src={writingTask.image_url}
                      alt="Task 1 visual"
                      className="w-full h-auto max-h-[400px] object-contain bg-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    Analyze the visual information above
                  </p>
                </div>
              )}

              {/* Task Prompt */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {writingTask?.prompt || 'No prompt available.'}
                </p>
              </div>

              {/* Tips */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4" />
                  Tips
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  {isTask1 ? (
                    <>
                      <li>• Describe the key features and trends</li>
                      <li>• Make comparisons where relevant</li>
                      <li>• Use appropriate vocabulary for describing data</li>
                      <li>• Aim for 150+ words in 20 minutes</li>
                    </>
                  ) : (
                    <>
                      <li>• Plan your essay structure before writing</li>
                      <li>• Include an introduction, body paragraphs, and conclusion</li>
                      <li>• Support your arguments with examples</li>
                      <li>• Aim for 250+ words in 40 minutes</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Writing Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Your Response</h2>
              <p className="text-sm text-gray-500 mt-1">
                Write your response below. AI will evaluate your writing.
              </p>
            </div>

            <div className="flex-1 p-4">
              <textarea
                ref={textareaRef}
                value={response}
                onChange={(e) => handleResponseChange(e.target.value)}
                placeholder="Start writing your response here..."
                className="w-full h-full min-h-[400px] p-4 border border-gray-200 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                disabled={submitting}
                autoFocus
              />
            </div>

            {/* Word Count Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {wordCount < minWords ? (
                    <span className="text-orange-600 dark:text-orange-400">
                      {minWords - wordCount} more words needed
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Minimum word count reached
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {wordCount} words
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    wordCount >= minWords ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min((wordCount / minWords) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
