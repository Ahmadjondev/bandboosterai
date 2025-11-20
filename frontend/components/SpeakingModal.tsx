import React from 'react';
import { SpeakingResults } from '@/types/results';

interface SpeakingModalProps {
  results: SpeakingResults;
  onClose: () => void;
}

export function SpeakingModal({ results, onClose }: SpeakingModalProps) {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'criteria' | 'pronunciation'>('overview');

  const getCriteriaLabel = (key: string): string => {
    const labels: Record<string, string> = {
      fluency_and_coherence: 'Fluency & Coherence',
      lexical_resource: 'Lexical Resource',
      grammatical_range_and_accuracy: 'Grammatical Range & Accuracy',
      pronunciation: 'Pronunciation',
    };
    return labels[key] || key;
  };

  const getCriteriaIcon = (key: string): string => {
    const icons: Record<string, string> = {
      fluency_and_coherence: '🗣️',
      lexical_resource: '📚',
      grammatical_range_and_accuracy: '✍️',
      pronunciation: '🎤',
    };
    return icons[key] || '📊';
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🗣️</span>
              <div>
                <h2 className="text-2xl font-bold">Speaking Results</h2>
                <p className="text-sm text-orange-100 mt-1">Detailed IELTS Speaking Assessment</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-orange-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('criteria')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'criteria'
                  ? 'bg-white text-orange-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Detailed Criteria
            </button>
            <button
              onClick={() => setActiveTab('pronunciation')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'pronunciation'
                  ? 'bg-white text-orange-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Pronunciation Tips
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 text-center border border-orange-200 dark:border-orange-800">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {results.overall_band_score ? results.overall_band_score.toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Overall Band</div>
                </div>
                {results.criteria && (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {results.criteria.fluency_and_coherence?.toFixed(1) || '—'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Fluency</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {results.criteria.lexical_resource?.toFixed(1) || '—'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Vocabulary</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {results.criteria.pronunciation?.toFixed(1) || '—'}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Pronunciation</div>
                    </div>
                  </>
                )}
              </div>

              {/* Overall Feedback */}
              {results.feedback?.overall_feedback && (
                <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">💬</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">Overall Assessment</h4>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {results.feedback.overall_feedback}
                  </p>
                </div>
              )}

              {/* Strengths and Areas for Improvement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Strengths */}
                {results.feedback?.strengths && results.feedback.strengths.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                      <span className="text-xl">✓</span>
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {results.feedback.strengths.map((strength: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {results.feedback?.areas_for_improvement && results.feedback.areas_for_improvement.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                      <span className="text-xl">⚠</span>
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {results.feedback.areas_for_improvement.map((area: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                          <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Criteria Tab */}
          {activeTab === 'criteria' && (
            <div className="space-y-6">
              {results.feedback && Object.entries(results.feedback).map(([key, value]: [string, any]) => {
                if (!value || typeof value !== 'object' || !value.score) return null;
                
                return (
                  <div key={key} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCriteriaIcon(key)}</span>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                            {getCriteriaLabel(key)}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {value.score.toFixed(1)}
                            </span>
                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-[200px]">
                              <div 
                                className="h-full bg-orange-600 dark:bg-orange-500 rounded-full transition-all"
                                style={{ width: `${(value.score / 9) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {value.feedback}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pronunciation Tab */}
          {activeTab === 'pronunciation' && (
            <div className="space-y-6">
              {/* Pronunciation Score */}
              {results.feedback?.pronunciation && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎤</span>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">Pronunciation Score</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Overall pronunciation assessment</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {results.feedback.pronunciation.score.toFixed(1)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {results.feedback.pronunciation.feedback}
                  </p>
                </div>
              )}

              {/* Specific Words to Practice */}
              {results.feedback?.pronunciation_improvements?.specific_words && 
               results.feedback.pronunciation_improvements.specific_words.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                  <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                    <span className="text-xl">🔤</span>
                    Words to Practice
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {results.feedback.pronunciation_improvements.specific_words.map((word: string, idx: number) => (
                      <span 
                        key={idx}
                        className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-lg text-sm font-medium"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Phonetic Tips */}
              {results.feedback?.pronunciation_improvements?.phonetic_tips && 
               results.feedback.pronunciation_improvements.phonetic_tips.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    Phonetic Tips
                  </h4>
                  <ul className="space-y-3">
                    {results.feedback.pronunciation_improvements.phonetic_tips.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5 font-bold">{idx + 1}.</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Practice Exercises */}
              {results.feedback?.pronunciation_improvements?.practice_exercises && 
               results.feedback.pronunciation_improvements.practice_exercises.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-5">
                  <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                    <span className="text-xl">💪</span>
                    Practice Exercises
                  </h4>
                  <ul className="space-y-3">
                    {results.feedback.pronunciation_improvements.practice_exercises.map((exercise: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-purple-800 dark:text-purple-200">
                        <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                        <span>{exercise}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!results.overall_band_score && (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
              <div className="text-6xl mb-4">🎤</div>
              <p className="text-slate-900 dark:text-white font-semibold mb-2">No Speaking Data Available</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Complete the speaking section to see your results here
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
