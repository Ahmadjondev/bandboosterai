'use client';

/**
 * Writing Practice Results Page
 * Displays AI evaluation with detailed feedback
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Home,
  RotateCcw,
  Award,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { getWritingResult } from '@/lib/api/section-practice';
import type { WritingResultResponse } from '@/types/section-practice';

export default function WritingResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptUuid = params.attemptUuid as string;

  const [result, setResult] = useState<WritingResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['criteria', 'corrections'])
  );

  useEffect(() => {
    loadResult();
  }, [attemptUuid]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const data = await getWritingResult(attemptUuid);
      setResult(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load results';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getBandScoreColor = (score: number | null): string => {
    if (!score) return 'text-gray-500';
    if (score >= 7) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-blue-600 dark:text-blue-400';
    if (score >= 5) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCriterionColor = (score: number | null): string => {
    if (!score) return 'bg-gray-100 dark:bg-gray-700';
    if (score >= 7) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 6) return 'bg-blue-100 dark:bg-blue-900/30';
    if (score >= 5) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your results...</p>
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

  if (!result) return null;

  const { evaluation, submission, task, practice } = result;
  const criteria = evaluation.criteria;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/practice')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="font-semibold text-gray-900 dark:text-white">
                  Writing Results
                </h1>
                <p className="text-sm text-gray-500">{practice.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/practice-session/writing/${practice.uuid}`)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => router.push('/practice')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                <Home className="w-4 h-4" />
                <span>Practice Home</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Score Overview */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">Overall Band Score</p>
              <div className="flex items-center gap-3">
                <span className="text-5xl font-bold">
                  {evaluation.overall_band_score?.toFixed(1) || 'N/A'}
                </span>
                <Award className="w-10 h-10 text-orange-200" />
              </div>
              {!result.has_ai_evaluation && (
                <p className="text-orange-200 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  AI evaluation unavailable
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <p className="text-orange-100 text-xs">Word Count</p>
                <p className="text-xl font-semibold flex items-center justify-end gap-1">
                  <FileText className="w-4 h-4" />
                  {submission.word_count} / {task.min_words}
                </p>
              </div>
              <div>
                <p className="text-orange-100 text-xs">Time Spent</p>
                <p className="text-xl font-semibold flex items-center justify-end gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(submission.time_spent_seconds)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Criteria Scores */}
        {result.has_ai_evaluation && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('criteria')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Criteria Scores
                </h2>
              </div>
              {expandedSections.has('criteria') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('criteria') && (
              <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                {[
                  { key: 'task_response_or_achievement', label: 'Task Response' },
                  { key: 'coherence_and_cohesion', label: 'Coherence & Cohesion' },
                  { key: 'lexical_resource', label: 'Lexical Resource' },
                  { key: 'grammatical_range_and_accuracy', label: 'Grammar' },
                ].map(({ key, label }) => {
                  const score = criteria[key as keyof typeof criteria];
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-lg ${getCriterionColor(score)}`}
                    >
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {label}
                      </p>
                      <p className={`text-2xl font-bold ${getBandScoreColor(score)}`}>
                        {score?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AI Feedback Summary */}
        {evaluation.feedback_summary && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">AI Feedback</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300">{evaluation.feedback_summary}</p>
          </div>
        )}

        {/* Inline Corrections */}
        {result.has_ai_evaluation && evaluation.inline_corrections && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('corrections')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Your Essay with Corrections
                </h2>
              </div>
              {expandedSections.has('corrections') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('corrections') && (
              <div className="p-4 pt-0">
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                      g
                    </span>
                    Grammar
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      v
                    </span>
                    Vocabulary
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                      s
                    </span>
                    Spelling
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                      p
                    </span>
                    Punctuation
                  </span>
                </div>

                {/* Essay with inline corrections */}
                <div
                  className="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: evaluation.inline_corrections
                      .replace(/<g>/g, '<span class="bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200 px-1 rounded">')
                      .replace(/<\/g>/g, '</span>')
                      .replace(/<v>/g, '<span class="bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 px-1 rounded">')
                      .replace(/<\/v>/g, '</span>')
                      .replace(/<s>/g, '<span class="bg-yellow-200 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200 px-1 rounded">')
                      .replace(/<\/s>/g, '</span>')
                      .replace(/<p>/g, '<span class="bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 px-1 rounded">')
                      .replace(/<\/p>/g, '</span>')
                      .replace(/\n/g, '<br>'),
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Sentence Feedback */}
        {evaluation.sentence_feedback && evaluation.sentence_feedback.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('sentences')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Sentence-by-Sentence Feedback ({evaluation.sentence_feedback.length})
                </h2>
              </div>
              {expandedSections.has('sentences') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('sentences') && (
              <div className="p-4 pt-0 space-y-4">
                {evaluation.sentence_feedback.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2"
                  >
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Original:</p>
                      <p className="text-gray-700 dark:text-gray-300 line-through">
                        {item.original}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                        Corrected:
                      </p>
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        {item.corrected}
                      </p>
                    </div>
                    {item.explanation && (
                      <div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                          Explanation:
                        </p>
                        <p className="text-blue-700 dark:text-blue-300 text-sm">
                          {item.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Corrected Essay */}
        {result.has_ai_evaluation && evaluation.corrected_essay && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('corrected')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Corrected Essay
                </h2>
              </div>
              {expandedSections.has('corrected') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('corrected') && (
              <div className="p-4 pt-0">
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {evaluation.corrected_essay}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Error Message */}
        {result.ai_error && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mt-6">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">AI Evaluation Note</p>
            </div>
            <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">
              {result.ai_error}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
