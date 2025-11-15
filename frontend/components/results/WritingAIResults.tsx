/**
 * WritingAIResults Component
 * 
 * Displays AI-powered writing feedback with inline error highlighting,
 * sentence corrections, band score, and overall feedback.
 * Integrated into exam results page after exam completion.
 */

'use client';

import React, { useState } from 'react';
import InlineHighlighter, { ErrorLegend } from '@/components/writing/InlineHighlighter';
import type { SentenceCorrection } from '@/lib/api-client';

interface WritingResult {
  id: number;
  task_type: string;
  task_type_display: string;
  prompt: string;
  answer_text: string;
  evaluation_status: string;
  ai_inline?: string;
  ai_sentences?: SentenceCorrection[];
  ai_summary?: string;
  ai_band_score?: string;
  ai_corrected_essay?: string;
}

interface WritingAIResultsProps {
  writingResults: WritingResult[];
  isProcessing?: boolean;
}

export default function WritingAIResults({ writingResults, isProcessing = false }: WritingAIResultsProps) {
  const [selectedTask, setSelectedTask] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'highlighted' | 'sentences' | 'corrected'>('highlighted');

  if (!writingResults || writingResults.length === 0) {
    return null;
  }

  const currentResult = writingResults[selectedTask];
  const isCompleted = currentResult?.evaluation_status === 'COMPLETED';
  const isFailed = currentResult?.evaluation_status === 'FAILED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <span className="text-4xl">✍️</span>
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-1">AI Writing Feedback</h2>
            <p className="text-purple-100 text-sm">
              Powered by BandBooster AI • Gemini-based analysis
            </p>
          </div>
        </div>
      </div>

      {/* Task Selector */}
      {writingResults.length > 1 && (
        <div className="flex gap-3">
          {writingResults.map((result, index) => (
            <button
              key={result.id}
              onClick={() => {
                setSelectedTask(index);
                setActiveTab('highlighted');
              }}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all ${
                selectedTask === index
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{result.task_type_display}</span>
                {result.evaluation_status === 'COMPLETED' && (
                  <span className="text-2xl">✓</span>
                )}
                {result.evaluation_status === 'PROCESSING' && (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Processing State */}
      {(isProcessing || currentResult?.evaluation_status === 'PROCESSING') && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg mb-1">
                AI is analyzing your essay...
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This typically takes 10-30 seconds. Your feedback will appear here automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failed State */}
      {isFailed && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
              <span className="text-white text-2xl">⚠️</span>
            </div>
            <div>
              <h3 className="font-bold text-red-900 dark:text-red-100 text-lg mb-1">
                AI Check Failed
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                We couldn't analyze your essay. Please contact support if this persists.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completed Results */}
      {isCompleted && (
        <>
          {/* Band Score Card */}
          {currentResult.ai_band_score && currentResult.ai_band_score !== 'N/A' && (
            <div className="bg-linear-to-r from-blue-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Estimated Band Score</h3>
                <div className="text-6xl font-bold">{currentResult.ai_band_score}</div>
                <p className="text-sm text-white/80 mt-2">
                  {currentResult.task_type_display} • AI-generated estimate
                </p>
              </div>
            </div>
          )}

          {/* Error Legend */}
          <ErrorLegend />

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('highlighted')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'highlighted'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Highlighted Essay
              </button>
              <button
                onClick={() => setActiveTab('sentences')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'sentences'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Corrections ({currentResult.ai_sentences?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('corrected')}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'corrected'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Corrected Essay
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {activeTab === 'highlighted' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
                <InlineHighlighter
                  text={currentResult.ai_inline || currentResult.answer_text}
                  className="text-lg leading-relaxed"
                />
              </div>
            )}

            {activeTab === 'sentences' && (
              <div className="space-y-4">
                {currentResult.ai_sentences && currentResult.ai_sentences.length > 0 ? (
                  currentResult.ai_sentences.map((sentence, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3"
                    >
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Sentence {index + 1}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            Original:{' '}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {sentence.original}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            Corrected:{' '}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {sentence.corrected}
                          </span>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                            Explanation:{' '}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {sentence.explanation}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <span className="text-4xl mb-3 block">✓</span>
                    <p className="text-lg font-medium">No corrections needed!</p>
                    <p className="text-sm mt-2">Your essay appears to be well-written.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'corrected' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
                <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                  {currentResult.ai_corrected_essay || currentResult.answer_text}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {currentResult.ai_summary && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Overall Feedback
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {currentResult.ai_summary}
              </p>
            </div>
          )}

          {/* Task Prompt Reference */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3">
              Task Question
            </h4>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {currentResult.prompt}
            </p>
          </div>
        </>
      )}

      {/* Pending State */}
      {currentResult?.evaluation_status === 'PENDING' && !isProcessing && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-400 flex items-center justify-center shrink-0">
              <span className="text-white text-2xl">⏳</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">
                AI Check Not Started
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your essay will be analyzed shortly. Please refresh the page in a moment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
