'use client';

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
  const sectionId = parseInt(params.sectionId as string);

  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [sectionId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await getSectionResult(sectionId);
      
      // Type assertion and validation
      const resultData = data as ResultData;
      
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Reading Practice Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {result.book.title} - {result.section.title}
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">
              Your Band Score
            </p>
            <p className={`text-7xl font-bold ${getBandScoreColor(Number(result.score))}`}>
              {Number(result.score).toFixed(1)}
            </p>
            <p className="text-xl text-gray-700 dark:text-gray-300 mt-4">
              {getEncouragementMessage(Number(result.score))}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Correct</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.correct_answers}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.total_questions}
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Accuracy</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Number(result.accuracy_percentage).toFixed(1)}%
              </p>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatTime(result.time_spent)}
              </p>
            </div>
          </div>
        </div>

        {/* Performance by Question Type */}
        {result.accuracy_by_type && Object.keys(result.accuracy_by_type).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Performance by Question Type</h3>
            <div className="space-y-3">
              {Object.entries(result.accuracy_by_type).map(([type, accuracy]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                        style={{ width: `${(accuracy * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[45px] text-right">
                      {Math.round(accuracy * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Answers Section */}
        {result.answer_groups && result.answer_groups.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📖</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detailed Answers Review</h2>
            </div>

            <div className="space-y-6">
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
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              📊 This is your <strong>attempt #{result.attempt_count}</strong> for this section.
              {result.attempt_count > 1 && ' Keep practicing to improve your score!'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => router.push(`/dashboard/practice/reading/${sectionId}`)}
            variant="primary"
          >
            Practice Again
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/books/${result.book.id}`)}
            variant="secondary"
          >
            Back to Book
          </Button>
          <Button
            onClick={() => router.push('/dashboard/books')}
            variant="secondary"
          >
            Browse Books
          </Button>
        </div>
      </div>
    </div>
  );
}
