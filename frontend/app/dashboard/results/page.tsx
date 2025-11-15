'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TestResults } from '@/types/results';
import { getTestResults } from '@/lib/exam-api';
import InlineHighlighter, { ErrorLegend } from '@/components/writing/InlineHighlighter';

// Helper to strip custom inline tags like <g>, <v>, <s>, <p>
const stripInlineTags = (input?: string | null) => {
  if (!input) return '';
  try {
    return input.replace(/<(?:g|v|s|p)>(.*?)<\/(?:g|v|s|p)>/g, '$1');
  } catch (err) {
    return input;
  }
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptId = searchParams.get('attempt');

  const [results, setResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showListeningModal, setShowListeningModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showWritingModal, setShowWritingModal] = useState(false);
  
  // (writing AI results are shown inside the Writing dialog/modal)

  useEffect(() => {
    if (attemptId) {
      loadResults(attemptId);
    } else {
      setIsLoading(false);
    }
  }, [attemptId]);

  // Load results and poll for AI updates if writing section exists
  const loadResults = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTestResults(id);
      setResults(data);
      
      // writing AI results are loaded as part of the main results response and
      // will be shown from the Writing dialog when the user clicks "View Details"
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
      console.error('Error loading results:', err);
    } finally {
      setIsLoading(false);
    }
  };
  


  const getBandColor = (band: number): string => {
    if (band >= 8.5) return 'from-purple-500 to-pink-500';
    if (band >= 7.0) return 'from-green-500 to-emerald-500';
    if (band >= 6.0) return 'from-blue-500 to-cyan-500';
    if (band >= 5.0) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getBandLabel = (band: number): string => {
    if (band >= 8.5) return 'Expert';
    if (band >= 7.0) return 'Good';
    if (band >= 6.0) return 'Competent';
    if (band >= 5.0) return 'Modest';
    return 'Limited';
  };

  const calculateOverallBand = (): number | null => {
    if (!results) return null;
    const scores: number[] = [];
    
    // Check listening section
    if (results.sections.listening?.band_score !== undefined && results.sections.listening?.band_score !== null) {
      scores.push(results.sections.listening.band_score);
    }
    
    // Check reading section
    if (results.sections.reading?.band_score !== undefined && results.sections.reading?.band_score !== null) {
      scores.push(results.sections.reading.band_score);
    }
    
    // Check writing section
    if (results.sections.writing?.overall_band_score !== undefined && results.sections.writing?.overall_band_score !== null) {
      scores.push(results.sections.writing.overall_band_score);
    }
    
    // Check speaking section
    if (results.sections.speaking?.overall_band_score !== undefined && results.sections.speaking?.overall_band_score !== null) {
      scores.push(results.sections.speaking.overall_band_score);
    }
    
    if (scores.length === 0) return null;
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average * 2) / 2;
  };

  const getCircleProgress = (band: number): number => {
    return (band / 9) * 100; // Convert band score (0-9) to percentage
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading results...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !results) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <span className="text-6xl">❌</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {error || 'Unable to Load Results'}
            </h3>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const overallBand = calculateOverallBand();
  const sections = results.sections;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Official IELTS-Style Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden mb-8">
            {/* Top Red Bar (IELTS Brand Color) */}
            <div className="h-2 bg-linear-to-r from-blue-600 via-blue-500 to-blue-600"></div>
            
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                {/* Left Side - IELTS Branding */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="shrink-0">
                      <div className="w-16 h-16 rounded-full bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-2xl">📊</span>
                      </div>
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        IELTS Test Report Form
                      </h1>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        International English Language Testing System
                      </p>
                    </div>
                  </div>
                  
                  {/* Exam Details */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-24">
                        Test Type:
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {results.exam_title}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-24">
                        Test Date:
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {new Date(results.completed_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-24">
                        Duration:
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {results.duration_minutes} minutes
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-24">
                        Candidate ID:
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                        #{results.attempt_id.toString().padStart(6, '0')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Overall Band Score */}
                {(
                  <div className="shrink-0">
                    <div className="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl p-6 border-2 border-slate-200 dark:border-slate-700 text-center min-w-[180px]">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Overall Band Score
                      </div>
                      <div className={`text-6xl font-bold mb-2 bg-linear-to-br ${getBandColor(overallBand || 0.0)} bg-clip-text text-transparent`}>
                        {overallBand?.toFixed(1) || '0.0'}
                      </div>
                      <div className="inline-block px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-full">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                          {getBandLabel(overallBand || 0.0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Section Results */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-linear-to-b from-red-600 to-red-700 rounded-full"></div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                Test Scores by Section
              </h2>
            </div>

            {/* All Section Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {/* Listening Section */}
              {sections.listening && (
                <SectionCard
                  title="Listening"
                  icon="🎧"
                  score={sections.listening.band_score}
                  correctAnswers={sections.listening.correct_answers}
                  totalQuestions={sections.listening.total_questions}
                  color="blue"
                  onViewDetails={() => setShowListeningModal(true)}
                  isSquare
                />
              )}

              {/* Reading Section */}
              {sections.reading && (
                <SectionCard
                  title="Reading"
                  icon="📖"
                  score={sections.reading.band_score}
                  correctAnswers={sections.reading.correct_answers}
                  totalQuestions={sections.reading.total_questions}
                  color="green"
                  onViewDetails={() => setShowReadingModal(true)}
                  isSquare
                />
              )}

              {/* Writing Section */}
              {sections.writing && (
                <SectionCard
                  title="Writing"
                  icon="✍️"
                  score={sections.writing.overall_band_score || 0}
                  color="purple"
                  onViewDetails={() => setShowWritingModal(true)}
                  isSquare
                  isPending={!sections.writing.overall_band_score}
                />
              )}

              {/* Speaking Section */}
              {sections.speaking && sections.speaking.overall_band_score && (
                <SectionCard
                  title="Speaking"
                  icon="🗣️"
                  score={sections.speaking.overall_band_score}
                  color="orange"
                  isSquare
                />
              )}
            </div>
          </div>

          {/* Performance Insights */}
          {(results.insights?.strengths || results.insights?.weaknesses) && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="border-b border-slate-200 dark:border-slate-700 p-6 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-linear-to-b from-blue-600 to-blue-700 rounded-full"></div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                      Performance Analysis
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Detailed breakdown by question type and skill area
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                {/* Strengths Section */}
                {results.insights.strengths && results.insights.strengths.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">✓</span>
                      <h4 className="text-lg font-bold text-green-700 dark:text-green-400">
                        Strong Areas
                      </h4>
                      <span className="ml-auto text-sm font-medium text-slate-600 dark:text-slate-400">
                        {results.insights.strengths.length} {results.insights.strengths.length === 1 ? 'area' : 'areas'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {results.insights.strengths.map((strength, index) => {
                        // Parse accuracy - handle both string ("75%") and number (0.75) formats
                        let accuracy = 0;
                        const strengthAccuracy = strength.accuracy as any;
                        if (typeof strengthAccuracy === 'string') {
                          accuracy = parseFloat(strengthAccuracy.replace('%', '')) || 0;
                        } else if (typeof strengthAccuracy === 'number') {
                          // If it's already a percentage (>1), use as is, otherwise convert from decimal
                          accuracy = strengthAccuracy > 1 ? strengthAccuracy : strengthAccuracy * 100;
                        }
                        
                        return (
                          <div 
                            key={index} 
                            className="group relative bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-lg p-4 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h5 className="text-sm font-semibold text-slate-900 dark:text-white flex-1">
                                {strength.area || strength.category}
                              </h5>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <div className="w-16 h-1.5 bg-green-100 dark:bg-green-900/30 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-600 dark:bg-green-500 rounded-full transition-all"
                                      style={{ width: `${accuracy}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-green-700 dark:text-green-400 min-w-[35px] text-right">
                                    {Math.round(accuracy)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {strength.tip}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Weaknesses Section */}
                {results.insights.weaknesses && results.insights.weaknesses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">⚠</span>
                      <h4 className="text-lg font-bold text-amber-700 dark:text-amber-400">
                        Areas for Improvement
                      </h4>
                      <span className="ml-auto text-sm font-medium text-slate-600 dark:text-slate-400">
                        {results.insights.weaknesses.length} {results.insights.weaknesses.length === 1 ? 'area' : 'areas'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {results.insights.weaknesses.map((weakness, index) => {
                        console.log(weakness);  
                        // Parse accuracy - handle both string ("0%") and number formats
                        let accuracy = 0;
                        const weaknessAccuracy = weakness.accuracy as any;
                        if (typeof weaknessAccuracy === 'string') {
                          accuracy = parseFloat(weaknessAccuracy.replace('%', '')) || 0;
                        } else if (typeof weaknessAccuracy === 'number') {
                          accuracy = weaknessAccuracy * 100; // Convert decimal to percentage
                        }
                        console.log('Parsed accuracy:', accuracy);
                        
                        const getColorClass = (acc: number) => {
                          if (acc >= 70) return { bg: 'bg-yellow-50/50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-800/50', bar: 'bg-yellow-600 dark:bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' };
                          if (acc >= 40) return { bg: 'bg-orange-50/50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800/50', bar: 'bg-orange-600 dark:bg-orange-500', text: 'text-orange-700 dark:text-orange-400' };
                          return { bg: 'bg-red-50/50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800/50', bar: 'bg-red-600 dark:bg-red-500', text: 'text-red-700 dark:text-red-400' };
                        };
                        const colors = getColorClass(accuracy);
                        
                        return (
                          <div 
                            key={index} 
                            className={`group relative ${colors.bg} border ${colors.border} rounded-lg p-4 hover:shadow-md transition-all`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h5 className="text-sm font-semibold text-slate-900 dark:text-white flex-1">
                                {weakness.area || weakness.category}
                              </h5>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${colors.bar} rounded-full transition-all`}
                                      style={{ width: `${accuracy}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-bold ${colors.text} min-w-[35px] text-right`}>
                                    {Math.round(accuracy)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {weakness.tip}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!results.insights.strengths || results.insights.strengths.length === 0) && 
                 (!results.insights.weaknesses || results.insights.weaknesses.length === 0) && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📈</div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Complete more questions to see your performance analysis
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Writing AI feedback is shown inside the Writing modal when viewing task details */}
        </div>
      </div>

      {/* Listening Modal */}
      {showListeningModal && sections.listening && (
        <SectionModal
          title="Listening Results"
          icon="🎧"
          results={sections.listening}
          onClose={() => setShowListeningModal(false)}
        />
      )}

      {/* Reading Modal */}
      {showReadingModal && sections.reading && (
        <SectionModal
          title="Reading Results"
          icon="📖"
          results={sections.reading}
          onClose={() => setShowReadingModal(false)}
        />
      )}

      {/* Writing Modal */}
      {showWritingModal && sections.writing && (
        <WritingModal
          results={sections.writing}
          onClose={() => setShowWritingModal(false)}
        />
      )}
    </DashboardLayout>
  );
}

// Ring Chart Component
function RingChart({ score, progress, label, color }: any) {
  const radius = 70;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getStrokeColor = () => {
    if (color.includes('purple')) return '#a855f7';
    if (color.includes('green')) return '#10b981';
    if (color.includes('blue')) return '#3b82f6';
    if (color.includes('yellow')) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="dark:stroke-slate-700"
        />
        {/* Progress circle */}
        <circle
          stroke={getStrokeColor()}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold text-slate-900 dark:text-white">
          {score.toFixed(1)}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}

// Section Card Component
function SectionCard({ title, icon, score, correctAnswers, totalQuestions, color, onViewDetails, isSquare, isPending }: any) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-red-500',
  };

  // Compact square layout for all sections
  const containerClass = isSquare
    ? 'bg-white dark:bg-slate-800 rounded-xl border border-slate-600 p-3 hover:shadow-lg transition-shadow flex flex-col aspect-square w-full max-w-[200px]'
    : 'bg-white dark:bg-slate-800 rounded-xl border border-slate-600 p-4 hover:shadow-xl transition-shadow flex flex-col';

  const iconClass = isSquare ? 'text-xl' : 'text-3xl';
  const scoreClass = isSquare ? 'text-2xl' : 'text-3xl';

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-center mb-2">
        <div className={iconClass}>{icon}</div>
      </div>

      <h3 className={`font-bold text-slate-900 dark:text-white text-center mb-2 ${isSquare ? 'text-sm' : 'text-lg'}`}>{title}</h3>

      {isPending ? (
        <div className="text-center mb-3">
          <div className={`font-bold text-amber-600 dark:text-amber-400 mb-1 ${isSquare ? 'text-xl' : 'text-2xl'}`}>⏳</div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Evaluating...</p>
        </div>
      ) : (
        <div className={`${scoreClass} font-bold text-center mb-3 bg-linear-to-r ${colorClasses[color as keyof typeof colorClasses]} bg-clip-text text-transparent`}>
          {score.toFixed(1)}
        </div>
      )}

      {correctAnswers !== undefined && totalQuestions !== undefined && (
        <>
          <p className="text-center text-slate-600 dark:text-slate-400 text-xs mb-3">
            {correctAnswers}/{totalQuestions} ({Math.round((correctAnswers / totalQuestions) * 100)}%)
          </p>

          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className={`text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-xs transition-colors text-center ${isSquare ? 'mt-auto' : 'mt-auto'}`}
            >
              View Details →
            </button>
          )}
        </>
      )}

      {(correctAnswers === undefined || totalQuestions === undefined) && onViewDetails && (
        <div className="grow flex items-end">
          <button
            onClick={onViewDetails}
            className="w-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-xs transition-colors text-center"
          >
            View Details →
          </button>
        </div>
      )}
    </div>
  );
}

// Section Modal Component
function SectionModal({ title, icon, results, onClose }: any) {
  // Group answers by part or passage
  const groupAnswersByPartOrPassage = () => {
    const grouped: { [key: string]: any[] } = {};
    
    results.answer_groups.forEach((group: any) => {
      group.answers.forEach((answer: any) => {
        const key = answer.part || answer.passage || 'Other';
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push({
          ...answer,
          question_type: answer.question_type || group.question_type || 'N/A'
        });
      });
    });
    
    // Sort answers by question number within each group
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.question_number - b.question_number);
    });
    
    return grouped;
  };

  const groupedAnswers = groupAnswersByPartOrPassage();

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
        <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <h2 className="text-2xl font-bold">{title}</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {results.band_score.toFixed(1)}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Band Score</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {results.correct_answers}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Correct</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {results.total_questions - results.correct_answers}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Incorrect</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {Math.round((results.correct_answers / results.total_questions) * 100)}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Accuracy</div>
            </div>
          </div>

          {/* Performance Grid - Part/Passage and Question Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Performance by Part/Passage */}
            {(results.accuracy_by_part || results.accuracy_by_passage) && (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">
                  {results.accuracy_by_part ? 'By Part' : 'By Passage'}
                </h4>
                <div className="space-y-2">
                  {Object.entries(results.accuracy_by_part || results.accuracy_by_passage || {}).map(([key, accuracy]: any) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{key}</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {Math.round(accuracy * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance by Question Type */}
            {results.accuracy_by_type && (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">
                  By Question Type
                </h4>
                <div className="space-y-2">
                  {Object.entries(results.accuracy_by_type).map(([key, accuracy]: any) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{key}</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {Math.round(accuracy * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* All Answers Grouped by Part/Passage */}
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Answers</h3>
            <div className="space-y-6">
              {Object.entries(groupedAnswers).map(([partKey, answers]: any) => (
                <div key={partKey}>
                  {/* Part/Passage Header */}
                  <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{partKey}</h4>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {answers.filter((a: any) => a.is_correct).length}/{answers.length} correct
                      </span>
                    </div>
                  </div>
                  
                  {/* Answers in minimalist style */}
                  <div className="space-y-2">
                    {answers.map((answer: any) => (
                      <div
                        key={answer.question_number}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          answer.is_correct
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
                            : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
                        }`}
                      >
                        {/* Question Number Badge */}
                        <div
                          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
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
                            <p className="text-xs text-slate-900 dark:text-white mb-2 font-medium">
                              {answer.question_text}
                            </p>
                          )}

                          {/* Question Type Badge
                          {answer.question_type && (
                            <div className="mb-2">
                              <span className="inline-block px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] text-slate-700 dark:text-slate-300">
                                {answer.question_type}
                              </span>
                            </div>
                          )} */}

                          {/* Answers */}
                          <div className="space-y-1">
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-slate-500 dark:text-slate-400 shrink-0">You:</span>
                              <span className={`font-medium ${
                                answer.is_correct
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}>
                                {answer.user_answer || 'No answer'}
                              </span>
                            </div>
                            {!answer.is_correct && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-slate-500 dark:text-slate-400 shrink-0">Correct:</span>
                                <span className="text-green-700 dark:text-green-300 font-medium">
                                  {answer.correct_answer}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* MCMA Breakdown */}
                          {answer.is_mcma && answer.mcma_breakdown && (
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <ul className="space-y-0.5">
                                {answer.mcma_breakdown.map((item: string, idx: number) => (
                                  <li key={idx} className="text-[10px] text-slate-600 dark:text-slate-400">
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
                            <span className="text-green-500 text-sm">✓</span>
                          ) : (
                            <span className="text-red-500 text-sm">✗</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Writing Modal Component
function WritingModal({ results, onClose }: any) {
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  const toggleTask = (taskId: number) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const getCriteriaLabel = (key: string): string => {
    const labels: Record<string, string> = {
      task_response_or_achievement: 'Task Achievement / Response',
      coherence_and_cohesion: 'Coherence & Cohesion',
      lexical_resource: 'Lexical Resource',
      grammatical_range_and_accuracy: 'Grammatical Range & Accuracy',
    };
    return labels[key] || key;
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
        <div className="bg-purple-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✍️</span>
            <h2 className="text-2xl font-bold">Writing Results</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overall Band Score */}
          {results.overall_band_score && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6 text-center">
              <div className="text-sm text-purple-900 dark:text-purple-100 mb-1">Overall Writing Band Score</div>
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                {results.overall_band_score.toFixed(1)}
              </div>
            </div>
          )}

          {/* AI Evaluation Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  AI-Powered Evaluation
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This writing is evaluated by AI, which provides detailed feedback based on IELTS criteria. 
                  Evaluation typically takes a few minutes. Results may vary slightly from human examiners.
                </p>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-4">
            {results.tasks.map((task: any) => {
              const hasAi = Boolean(
                task.ai_band_score !== undefined && task.ai_band_score !== null ||
                task.ai_inline ||
                (task.ai_sentences && task.ai_sentences.length > 0) ||
                task.ai_corrected_essay ||
                task.ai_summary
              );

              return (
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
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg">
                      {task.task_type.includes('1') ? '1' : '2'}
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {task.task_type}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <span>{task.word_count || 0} words</span>
                        { (task.evaluation_status === 'COMPLETED' && (task.band_score || task.ai_band_score)) ? (
                          <>
                            <span>•</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              Band {Number(task.band_score ?? task.ai_band_score).toFixed(1)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400">
                              {task.evaluation_status === 'PROCESSING' ? 'Evaluating...' : (hasAi ? 'AI Results Available' : 'Pending Evaluation')}
                            </span>
                          </>
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
                  <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                    {(hasAi || (task.evaluation_status === 'COMPLETED' && task.band_score)) ? (
                      <div className="space-y-6">
                        {/* User Answer */}
                        {task.user_answer && (
                          <div>
                            <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Your Answer
                            </h6>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700">
                              {task.user_answer}
                            </div>
                          </div>
                        )}

                        {/* AI Evaluation Results (from backend) */}
                        {(task.ai_inline || task.ai_sentences || task.ai_corrected_essay || task.ai_summary || task.ai_band_score) && (
                          <div className="space-y-4">
                            <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI Evaluation</h5>

                            {/* Band Score (AI estimate) */}
                            {task.ai_band_score !== undefined && task.ai_band_score !== null && (
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg inline-block">
                                  <div className="text-xs text-purple-900 dark:text-purple-100">AI Estimated Band</div>
                                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Number(task.ai_band_score).toFixed(1)}</div>
                                </div>

                                {/* Condensed IELTS criteria row (horizontal) shown next to AI band when available */}
                                {task.criteria && Object.values(task.criteria).some((v: any) => v !== null && v !== undefined) && (
                                  <div className="mt-3 sm:mt-0 flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                                    {['task_response_or_achievement','coherence_and_cohesion','lexical_resource','grammatical_range_and_accuracy'].map((k) => {
                                      const v = task.criteria?.[k];
                                      if (v === null || v === undefined) return (
                                        <div key={k} />
                                      );
                                      return (
                                        <div key={k} className="flex flex-col bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                                          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mb-1">{getCriteriaLabel(k)}</div>
                                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-linear-to-r from-purple-500 to-pink-600" style={{ width: `${(v/9)*100}%` }} />
                                          </div>
                                          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-2 text-right">{Number(v).toFixed(1)}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Inline highlighted suggestions (if available) */}
                            {task.ai_inline && (
                              <div>
                                <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Highlighted Suggestions</h6>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto text-sm">
                                  <InlineHighlighter text={task.ai_inline} sentences={task.ai_sentences} />
                                  <div className="mt-3">
                                    <ErrorLegend />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Sentence-level feedback */}
                            {task.ai_sentences && Array.isArray(task.ai_sentences) && task.ai_sentences.length > 0 && (
                              <div>
                                <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sentence-level Corrections</h6>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                                  <ul className="list-disc pl-5 space-y-3">
                                    {task.ai_sentences.map((s: any, idx: number) => (
                                      <li key={idx} className="text-slate-700 dark:text-slate-300">
                                        {/* Render corrected sentence (fallback to original) and optional explanation */}
                                        <div className="font-medium text-sm text-slate-900 dark:text-white">
                                          {stripInlineTags(s.corrected ?? s.original)}
                                        </div>
                                        {s.explanation && (
                                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                            {stripInlineTags(s.explanation)}
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {/* Corrected essay (if provided) */}
                            {task.ai_corrected_essay && (
                              <div>
                                <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Corrected Essay</h6>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                                  {task.ai_corrected_essay}
                                </div>
                              </div>
                            )}

                            {/* Short summary */}
                            {task.ai_summary && (
                              <div>
                                <h6 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">AI Summary</h6>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                                  {task.ai_summary}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-5xl mb-3">⏳</div>
                        <p className="text-slate-900 dark:text-white font-medium mb-2">
                          {task.evaluation_status === 'PROCESSING' ? 'AI Evaluation in Progress' : 'Awaiting Evaluation'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {task.evaluation_status === 'PROCESSING'
                            ? 'Your writing is being carefully analyzed by our AI examiner. This typically takes 2-5 minutes.'
                            : 'Your writing will be evaluated soon. Please check back later for detailed feedback and band scores.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            })}

            {results.tasks.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-slate-600 dark:text-slate-400">No writing tasks found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <ResultsContent />
    </Suspense>
  );
}
