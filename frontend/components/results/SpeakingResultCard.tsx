'use client';

import React from 'react';
import { SpeakingResults } from '@/types/results';

interface SpeakingResultCardProps {
  results: SpeakingResults;
}

export function SpeakingResultCard({ results }: SpeakingResultCardProps) {
  const getCriteriaLabel = (key: string): string => {
    const labels: Record<string, string> = {
      fluency_and_coherence: 'Fluency & Coherence',
      lexical_resource: 'Lexical Resource',
      grammatical_range_and_accuracy: 'Grammatical Range & Accuracy',
      pronunciation: 'Pronunciation',
    };
    return labels[key] || key;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-orange-500 to-red-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🗣️</span>
            <div>
              <h3 className="text-2xl font-bold">Speaking</h3>
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

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Parts Overview */}
        {results.parts && results.parts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Speaking Parts
            </h4>
            <div className="space-y-2">
              {results.parts.map((part) => (
                <div
                  key={part.speaking_type}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {part.part_display}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{part.topic}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {part.has_audio ? (
                      <span className="text-green-600 dark:text-green-400 text-sm">
                        ✓ Recorded
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">No audio</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Criteria Scores */}
        {results.overall_band_score && results.criteria && Object.keys(results.criteria).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Scoring Criteria
            </h4>
            <div className="space-y-2">
              {Object.entries(results.criteria).map(([key, value]) => {
                if (value === null) return null;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {getCriteriaLabel(key)}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-orange-500 to-red-600"
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
        {results.feedback && Object.keys(results.feedback).length > 0 && (
          <div className="space-y-3">
            {results.feedback.strengths && results.feedback.strengths.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h5 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                  ✓ Strengths
                </h5>
                <ul className="space-y-1">
                  {results.feedback.strengths.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-green-800 dark:text-green-200">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.feedback.weaknesses && results.feedback.weaknesses.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h5 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  ⚠ Areas to Improve
                </h5>
                <ul className="space-y-1">
                  {results.feedback.weaknesses.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-amber-800 dark:text-amber-200">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.feedback.suggestions && results.feedback.suggestions.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  💡 Suggestions
                </h5>
                <ul className="space-y-1">
                  {results.feedback.suggestions.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* No Evaluation Message */}
        {!results.overall_band_score && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-slate-600 dark:text-slate-400">
              {results.parts?.some((p) => p.has_audio)
                ? 'Your speaking test is being evaluated. Check back later for detailed feedback.'
                : 'No speaking recordings available. Speaking section was not completed.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
