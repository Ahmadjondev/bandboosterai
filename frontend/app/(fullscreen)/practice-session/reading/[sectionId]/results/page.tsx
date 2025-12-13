'use client';

/**
 * Unified Reading Results Page
 * Supports both book sections (numeric IDs) and section practices (UUIDs)
 * URL: /practice-session/reading/[sectionId]/results
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { getSectionResult } from '@/lib/api/books';

interface Answer {
  question_number: number;
  question_text: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  passage?: string;
  question_type?: string;
  is_mcma?: boolean;
  mcma_score?: string;
  mcma_breakdown?: string[];
}

interface AnswerGroup {
  id: number;
  title: string;
  test_head: string;
  question_type: string;
  answers: Answer[];
}

interface ResultData {
  score: number;
  correct_answers: number;
  total_questions: number;
  accuracy_percentage: number;
  time_spent: number;
  attempt_count: number;
  answer_groups?: AnswerGroup[];
  accuracy_by_type?: { [key: string]: number };
  section: {
    id: number;
    title: string;
    order: number;
  };
  book: {
    id: number;
    title: string;
  };
}

export default function ReadingResultsPage() {
  const params = useParams();
  const router = useRouter();
  
  // Support both numeric IDs (book sections) and UUIDs (section practices)
  const sectionIdParam = params.sectionId as string;
  const isUUID = sectionIdParam.includes('-');
  const sectionId: number | string = isUUID ? sectionIdParam : parseInt(sectionIdParam);

  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPractice, setIsPractice] = useState(isUUID);

  useEffect(() => {
    loadResults();
  }, [sectionIdParam]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await getSectionResult(sectionId) as ResultData;
      
      // Check if this is from section practice
      if (data?.book?.id === 0) {
        setIsPractice(true);
      }
      
      // Type assertion and validation
      const resultData = data;
      
      // Validate that we have valid data
      if (!resultData || resultData.score === null || resultData.score === undefined) {
        throw new Error('Invalid result data received');
      }
      
      setResult(resultData);
    } catch (err: any) {
      console.error('Error loading results:', err);
      // Show error state instead of trying to render null data
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getBandScoreColor = (score: number) => {
    if (score >= 8.0) return 'text-green-600 dark:text-green-400';
    if (score >= 7.0) return 'text-blue-600 dark:text-blue-400';
    if (score >= 6.0) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 5.0) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getEncouragementMessage = (score: number) => {
    if (score >= 8.5) return 'Outstanding! You have excellent command of the language! 🌟';
    if (score >= 8.0) return 'Excellent work! You have very good command of the language! 🎉';
    if (score >= 7.0) return 'Great job! You have good command of the language! 👏';
    if (score >= 6.0) return 'Good effort! You have competent command of the language. Keep practicing! 💪';
    if (score >= 5.0) return 'Keep going! You have modest command. More practice will help! 📚';
    return 'Don\'t give up! Practice regularly to improve your skills! 🚀';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">No Results Found</h3>
          <p className="text-red-600 dark:text-red-300 mb-4">Could not load your results.</p>
          <Button onClick={() => router.push('/dashboard/books')}>
            Back to Books
          </Button>
        </div>
      </div>
    );
  }

  // Calculate stats for conditional display
  const incorrectAnswers = result.total_questions - result.correct_answers;
  const hasTimeSpent = result.time_spent > 0;
  const statsCount = hasTimeSpent ? 4 : 3;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Section with Score */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 dark:from-emerald-600 dark:via-emerald-700 dark:to-teal-800">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
        
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-16 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => isPractice ? router.push('/practice') : router.push(`/dashboard/books/${result.book.id}`)}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to {isPractice ? 'Practice' : 'Book'}</span>
          </button>

          {/* Title & Badge */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-4">
              <span>📖</span>
              <span>Reading Practice Complete</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {result.section.title}
            </h1>
            <p className="text-emerald-100">{result.book.title}</p>
          </div>

          {/* Score Circle */}
          <div className="flex justify-center mt-8">
            <div className="relative">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col items-center justify-center">
                <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Band Score</span>
                <span className={`text-5xl sm:text-6xl font-bold ${getBandScoreColor(Number(result.score))}`}>
                  {Number(result.score).toFixed(1)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">out of 9.0</span>
              </div>
              {/* Decorative ring */}
              <div className="absolute -inset-2 rounded-full border-4 border-white/20 pointer-events-none"></div>
            </div>
          </div>

          {/* Encouragement */}
          <p className="text-center text-white/90 text-lg mt-6 max-w-md mx-auto">
            {getEncouragementMessage(Number(result.score))}
          </p>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 100V50C240 83.3333 480 100 720 100C960 100 1200 83.3333 1440 50V100H0Z" className="fill-gray-50 dark:fill-gray-950"/>
          </svg>
        </div>
      </div>

      {/* Stats Cards - Floating overlap */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className={`grid grid-cols-${statsCount === 3 ? '3' : '2'} sm:grid-cols-${statsCount} gap-3 sm:gap-4`}>
          {/* Correct */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-5 text-center hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">{result.correct_answers}</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Correct</p>
          </div>

          {/* Incorrect */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-5 text-center hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-red-600 dark:text-red-400">{incorrectAnswers}</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Incorrect</p>
          </div>

          {/* Accuracy */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-5 text-center hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">{Number(result.accuracy_percentage).toFixed(0)}%</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Accuracy</p>
          </div>

          {/* Time Spent - Only show if > 0 */}
          {hasTimeSpent && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-5 text-center hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-purple-600 dark:text-purple-400">{formatTime(result.time_spent)}</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">Time</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Performance by Question Type */}
        {result.accuracy_by_type && Object.keys(result.accuracy_by_type).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Performance by Question Type
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {Object.entries(result.accuracy_by_type).map(([type, accuracy]) => {
                const percentage = Math.round(accuracy * 100);
                const getColorClass = (pct: number) => {
                  if (pct >= 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-900/30' };
                  if (pct >= 60) return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30' };
                  if (pct >= 40) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', light: 'bg-amber-100 dark:bg-amber-900/30' };
                  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', light: 'bg-red-100 dark:bg-red-900/30' };
                };
                const colors = getColorClass(percentage);
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{type}</span>
                      <span className={`text-sm font-bold ${colors.text} ${colors.light} px-2 py-0.5 rounded-full`}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bg} transition-all duration-700 ease-out rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Answers Section */}
        {result.answer_groups && result.answer_groups.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Answer Review
              </h3>
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Correct
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span> Incorrect
                </span>
              </div>
            </div>
            <div className="p-5 space-y-6">
              {result.answer_groups.map((group) => (
                <div key={group.id}>
                  {/* Group Header */}
                  <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{group.title}</h4>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {group.answers.filter((a) => a.is_correct).length}/{group.answers.length} correct
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{group.question_type}</p>
                  </div>
                  
                  {/* Answers */}
                  <div className="space-y-3">
                    {group.answers.map((answer) => (
                      <div
                        key={answer.question_number}
                        className={`flex items-start gap-4 p-4 rounded-lg border ${
                          answer.is_correct
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
                            : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
                        }`}
                      >
                        {/* Question Number Badge */}
                        <div
                          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            answer.is_correct 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}
                        >
                          {answer.question_number}
                        </div>

                        {/* Answer Content */}
                        <div className="flex-1 min-w-0">
                          {/* Question Text */}
                          {answer.question_text && (
                            <p className="text-sm text-gray-900 dark:text-white mb-3 font-medium">
                              {answer.question_text}
                            </p>
                          )}

                          {/* Answers */}
                          <div className="space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium">Your answer:</span>
                              <span className={`font-semibold ${
                                answer.is_correct
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}>
                                {answer.user_answer || 'No answer'}
                              </span>
                            </div>
                            {!answer.is_correct && (
                              <div className="flex items-start gap-2 text-sm">
                                <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium">Correct answer:</span>
                                <span className="text-green-700 dark:text-green-300 font-semibold">
                                  {answer.correct_answer}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* MCMA Breakdown */}
                          {answer.is_mcma && answer.mcma_breakdown && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Selection Details:</p>
                              <ul className="space-y-1">
                                {answer.mcma_breakdown.map((item: string, idx: number) => (
                                  <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Status Icon */}
                        <div className="shrink-0">
                          {answer.is_correct ? (
                            <span className="text-green-500 text-xl">✓</span>
                          ) : (
                            <span className="text-red-500 text-xl">✗</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attempt History */}
        {result.attempt_count > 1 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
              <span className="text-lg">🔄</span>
            </div>
            <div>
              <p className="text-blue-800 dark:text-blue-200 font-medium text-sm">
                Attempt #{result.attempt_count}
              </p>
              <p className="text-blue-600 dark:text-blue-300 text-xs">
                Practice makes perfect!
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-8">
          <button
            onClick={() => router.push(`/practice-session/reading/${sectionIdParam}`)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Practice Again
          </button>
          {isPractice ? (
            <button
              onClick={() => router.push('/practice')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              More Practice
            </button>
          ) : (
            <button
              onClick={() => router.push(`/dashboard/books/${result.book.id}`)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Back to Book
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
