'use client';

import React, { useState } from 'react';
import { WritingResults } from '@/types/results';

interface WritingResultCardProps {
  results: WritingResults;
}

export function WritingResultCard({ results }: WritingResultCardProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  const toggleTask = (taskId: number) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const getCriteriaLabel = (key: string): string => {
    const labels: Record<string, string> = {
      task_response_or_achievement: 'Task Response / Achievement',
      coherence_and_cohesion: 'Coherence & Cohesion',
      lexical_resource: 'Lexical Resource',
      grammatical_range_and_accuracy: 'Grammatical Range & Accuracy',
    };
    return labels[key] || key;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-purple-500 to-pink-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">✍️</span>
            <div>
              <h3 className="text-2xl font-bold">Writing</h3>
              <p className="text-white/90 text-sm">
                {results.overall_band_score
                  ? `Band Score: ${results.overall_band_score.toFixed(1)}`
                  : 'Evaluation Pending'}
              </p>
            </div>
          </div>
          {results.overall_band_score && (
            <div className="text-right">
              <div className="text-3xl font-bold">{results.overall_band_score.toFixed(1)}</div>
              <div className="text-white/80 text-xs">IELTS Band</div>
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="p-6 space-y-4">
        {results.tasks.map((task) => (
          <div
            key={task.id}
            className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
          >
            {/* Task Header */}
            <button
              onClick={() => toggleTask(task.id)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                  {task.task_type.includes('1') ? '1' : '2'}
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {task.task_type}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <span>{task.word_count} words</span>
                    <span>•</span>
                    {task.evaluation_status === 'COMPLETED' ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Band {task.band?.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        {task.evaluation_status === 'IN_PROGRESS' ? 'Evaluating...' : 'Pending Evaluation'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  expandedTaskId === task.id ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Task Details (Expanded) */}
            {expandedTaskId === task.id && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                {task.evaluation_status === 'COMPLETED' ? (
                  <div className="space-y-4">
                    {/* Criteria Scores */}
                    {task.criteria && Object.keys(task.criteria).length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          Scoring Criteria
                        </h5>
                        <div className="space-y-2">
                          {Object.entries(task.criteria).map(([key, value]) => {
                            if (value === null) return null;
                            return (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {getCriteriaLabel(key)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-linear-to-r from-purple-500 to-pink-600"
                                      style={{ width: `${(value / 9) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-slate-900 dark:text-white w-8">
                                    {value.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Feedback */}
                    {task.feedback && (
                      <div className="space-y-3">
                        {task.feedback.strengths && task.feedback.strengths.length > 0 && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <h6 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                              ✓ Strengths
                            </h6>
                            <ul className="space-y-1">
                              {task.feedback.strengths.map((item: string, idx: number) => (
                                <li key={idx} className="text-sm text-green-800 dark:text-green-200">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {task.feedback.weaknesses && task.feedback.weaknesses.length > 0 && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <h6 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                              ⚠ Areas to Improve
                            </h6>
                            <ul className="space-y-1">
                              {task.feedback.weaknesses.map((item: string, idx: number) => (
                                <li key={idx} className="text-sm text-amber-800 dark:text-amber-200">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {task.feedback.suggestions && task.feedback.suggestions.length > 0 && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h6 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                              💡 Suggestions
                            </h6>
                            <ul className="space-y-1">
                              {task.feedback.suggestions.map((item: string, idx: number) => (
                                <li key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* User Answer */}
                    {task.user_answer && (
                      <div>
                        <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Your Answer
                        </h6>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {task.user_answer}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">⏳</div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {task.evaluation_status === 'IN_PROGRESS'
                        ? 'Your writing is being evaluated by our AI examiner...'
                        : 'Your writing will be evaluated soon. Check back later for detailed feedback.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {results.tasks.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-slate-600 dark:text-slate-400">No writing tasks completed</p>
          </div>
        )}
      </div>
    </div>
  );
}
