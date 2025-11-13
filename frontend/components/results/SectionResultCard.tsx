'use client';

import React from 'react';
import { ListeningResults, ReadingResults } from '@/types/results';
import { SectionName } from '@/types/exam';

interface SectionResultCardProps {
  section: SectionName;
  results: ListeningResults | ReadingResults;
  onViewDetails: () => void;
}

export function SectionResultCard({ section, results, onViewDetails }: SectionResultCardProps) {
  const sectionIcons: Record<SectionName, string> = {
    [SectionName.LISTENING]: '🎧',
    [SectionName.READING]: '📖',
    [SectionName.WRITING]: '✍️',
    [SectionName.SPEAKING]: '🗣️',
  };

  const sectionColors: Record<SectionName, string> = {
    [SectionName.LISTENING]: 'from-blue-500 to-cyan-600',
    [SectionName.READING]: 'from-green-500 to-emerald-600',
    [SectionName.WRITING]: 'from-purple-500 to-pink-600',
    [SectionName.SPEAKING]: 'from-orange-500 to-red-600',
  };

  const accuracy = (results.correct_answers / results.total_questions) * 100;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className={`bg-linear-to-r ${sectionColors[section]} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{sectionIcons[section]}</span>
            <div>
              <h3 className="text-2xl font-bold capitalize">{section}</h3>
              <p className="text-white/90 text-sm">Band Score: {results.band_score.toFixed(1)}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{results.band_score.toFixed(1)}</div>
            <div className="text-white/80 text-xs">IELTS Band</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {results.correct_answers}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {results.total_questions}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {accuracy.toFixed(0)}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Accuracy</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>Progress</span>
            <span>{results.correct_answers} / {results.total_questions}</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full bg-linear-to-r ${sectionColors[section]} transition-all duration-500`}
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        {/* Question Type Breakdown */}
        {'accuracy_by_type' in results && Object.keys(results.accuracy_by_type).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Performance by Question Type
            </h4>
            <div className="space-y-2">
              {Object.entries(results.accuracy_by_type).map(([type, acc]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-linear-to-r ${sectionColors[section]}`}
                        style={{ width: `${acc * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white w-12 text-right">
                      {(acc * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part Breakdown (Listening only) */}
        {'accuracy_by_part' in results && Object.keys(results.accuracy_by_part).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Performance by Part
            </h4>
            <div className="space-y-2">
              {Object.entries(results.accuracy_by_part).map(([part, acc]) => (
                <div key={part} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{part}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-linear-to-r ${sectionColors[section]}`}
                        style={{ width: `${acc * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white w-12 text-right">
                      {(acc * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Details Button */}
        <button
          onClick={onViewDetails}
          className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors duration-200"
        >
          View Detailed Answers
        </button>
      </div>
    </div>
  );
}
