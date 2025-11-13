'use client';

/**
 * WritingChecker Component
 * 
 * Full-featured IELTS Writing AI Checker with Grammarly-style inline highlighting.
 * Features:
 * - Essay input textarea
 * - Submit to AI for checking
 * - Real-time polling for results
 * - Inline error highlighting
 * - Sentence-by-sentence corrections
 * - Overall feedback and band score
 * - Corrected essay display
 */

import React, { useState } from 'react';
import InlineHighlighter, { ErrorLegend } from './InlineHighlighter';
import { writingCheckerApi, WritingCheckResponse, SentenceCorrection } from '@/lib/api-client';

interface WritingCheckerProps {
  initialEssay?: string;
  taskType?: 'Task 1' | 'Task 2';
}

const WritingChecker: React.FC<WritingCheckerProps> = ({
  initialEssay = '',
  taskType = 'Task 2',
}) => {
  const [essay, setEssay] = useState(initialEssay);
  const [selectedTaskType, setSelectedTaskType] = useState<'Task 1' | 'Task 2'>(taskType);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [result, setResult] = useState<WritingCheckResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'highlighted' | 'sentences' | 'corrected'>('highlighted');

  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!essay.trim()) {
      setError('Please enter your essay first');
      return;
    }

    setIsChecking(true);
    setError('');
    setResult(null);
    setProgress('Submitting essay...');

    try {
      // Submit essay for checking
      const submitResponse = await writingCheckerApi.checkWriting({
        essay: essay.trim(),
        task_type: selectedTaskType,
      });

      if (!submitResponse.data?.writing_attempt_id) {
        throw new Error('Failed to submit essay');
      }

      setProgress('AI is analyzing your essay...');

      // Poll for results
      const finalResult = await writingCheckerApi.pollWritingCheckResult(
        submitResponse.data.writing_attempt_id,
        (status) => {
          if (status === 'processing') {
            setProgress('AI is analyzing your essay...');
          }
        }
      );

      setResult(finalResult);
      setProgress('');
    } catch (err: any) {
      setError(err.message || 'Failed to check essay. Please try again.');
      setProgress('');
    } finally {
      setIsChecking(false);
    }
  };

  const handleClear = () => {
    setEssay('');
    setResult(null);
    setError('');
    setProgress('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          BandBooster AI Writing Checker
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Get instant feedback on your IELTS writing with AI-powered error highlighting
        </p>
      </div>

      {/* Task Type Selection */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setSelectedTaskType('Task 1')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            selectedTaskType === 'Task 1'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Task 1
        </button>
        <button
          onClick={() => setSelectedTaskType('Task 2')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            selectedTaskType === 'Task 2'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Task 2
        </button>
      </div>

      {/* Essay Input */}
      {!result && (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder={`Paste your ${selectedTaskType} essay here...`}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isChecking}
            />
            <div className="absolute bottom-4 right-4 text-sm text-gray-500">
              {wordCount} words
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {progress && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
              {progress}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isChecking || !essay.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isChecking ? 'Checking...' : 'Check My Writing'}
            </button>
            <button
              onClick={handleClear}
              disabled={isChecking}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && result.status === 'completed' && (
        <div className="space-y-6">
          {/* Band Score Card */}
          <div className="bg-linear-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Estimated Band Score</h2>
              <div className="text-5xl font-bold">{result.band_score || 'N/A'}</div>
            </div>
          </div>

          {/* Error Legend */}
          <ErrorLegend />

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('highlighted')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'highlighted'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Highlighted Essay
              </button>
              <button
                onClick={() => setActiveTab('sentences')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'sentences'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Corrections ({result.sentences?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('corrected')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'corrected'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Corrected Essay
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {activeTab === 'highlighted' && (
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                <InlineHighlighter text={result.inline || essay} className="text-lg" />
              </div>
            )}

            {activeTab === 'sentences' && (
              <div className="space-y-4">
                {result.sentences && result.sentences.length > 0 ? (
                  result.sentences.map((sentence: SentenceCorrection, index: number) => (
                    <div
                      key={index}
                      className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 space-y-2"
                    >
                      <div className="text-sm text-gray-500 font-medium">
                        Sentence {index + 1}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-semibold text-red-600">Original: </span>
                          <span className="text-gray-700">{sentence.original}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-green-600">
                            Corrected:{' '}
                          </span>
                          <span className="text-gray-700">{sentence.corrected}</span>
                        </div>
                        <div className="p-3 bg-blue-50 rounded">
                          <span className="text-sm font-semibold text-blue-700">
                            Explanation:{' '}
                          </span>
                          <span className="text-gray-700">{sentence.explanation}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No corrections needed!
                  </div>
                )}
              </div>
            )}

            {activeTab === 'corrected' && (
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200">
                <div className="whitespace-pre-wrap text-lg text-gray-700">
                  {result.corrected_essay || essay}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Feedback</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{result.summary}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => {
                setResult(null);
                setEssay('');
              }}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Check Another Essay
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Edit Current Essay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingChecker;
