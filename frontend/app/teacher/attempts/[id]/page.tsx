'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { teacherAttemptApi, teacherFeedbackApi } from '@/lib/teacher-api';
import type { StudentResult, GradeAttemptData, CreateFeedbackData } from '@/types/teacher';

export default function AttemptDetailPage() {
  const params = useParams();
  const attemptId = parseInt(params.id as string);
  
  const [result, setResult] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Helper function to safely format score (handles both string and number)
  const formatScore = (score: any): string => {
    if (score === null || score === undefined) return '-';
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    return isNaN(numScore) ? '-' : numScore.toFixed(1);
  };
  
  const [gradeData, setGradeData] = useState<GradeAttemptData>({
    listening_score: undefined,
    reading_score: undefined,
    writing_score: undefined,
    speaking_score: undefined,
    strengths: [],
    weaknesses: [],
  });

  const [feedbackData, setFeedbackData] = useState<CreateFeedbackData>({
    attempt: attemptId,
    feedback_type: 'GENERAL',
    comment: '',
    is_visible_to_student: true,
  });

  useEffect(() => {
    loadAttemptData();
  }, [attemptId]);

  const loadAttemptData = async () => {
    try {
      setLoading(true);
      const data = await teacherAttemptApi.getAttemptAnalysis(attemptId);
      setResult(data);
      
      // Pre-fill grade data with existing scores
      setGradeData({
        listening_score: data.attempt.listening_score || undefined,
        reading_score: data.attempt.reading_score || undefined,
        writing_score: data.attempt.writing_score || undefined,
        speaking_score: data.attempt.speaking_score || undefined,
        strengths: data.attempt.strengths || [],
        weaknesses: data.attempt.weaknesses || [],
      });
    } catch (error) {
      console.error('Failed to load attempt data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setGrading(true);
      await teacherAttemptApi.gradeAttempt(attemptId, gradeData);
      await loadAttemptData();
      alert('Grades saved successfully!');
    } catch (error: any) {
      console.error('Failed to save grades:', error);
      alert(error.message || 'Failed to save grades');
    } finally {
      setGrading(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await teacherFeedbackApi.createFeedback(feedbackData);
      setShowFeedbackForm(false);
      setFeedbackData({
        attempt: attemptId,
        feedback_type: 'GENERAL',
        comment: '',
        is_visible_to_student: true,
      });
      await loadAttemptData();
      alert('Feedback added successfully!');
    } catch (error: any) {
      console.error('Failed to add feedback:', error);
      alert(error.message || 'Failed to add feedback');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Attempt not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/teacher/exams/${result.attempt.exam.id}`}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {result.student.full_name}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {result.attempt.exam.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Scores */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Section Scores
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(result.section_analysis).map(([section, data]) => (
                  <div key={section} className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mb-2">
                      {section}
                    </p>
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {formatScore(data.score)}
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      {data.strength === 'Good' ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">Strong</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 text-orange-500" />
                          <span className="text-xs text-orange-600 dark:text-orange-400">Weak</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {result.attempt.overall_band && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Band Score</p>
                  <p className="text-5xl font-bold text-blue-600">{formatScore(result.attempt.overall_band)}</p>
                </div>
              )}
            </div>

            {/* Grading Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Update Scores
              </h2>
              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Listening
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="9"
                      step="0.5"
                      value={gradeData.listening_score || ''}
                      onChange={(e) => setGradeData({
                        ...gradeData,
                        listening_score: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reading
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="9"
                      step="0.5"
                      value={gradeData.reading_score || ''}
                      onChange={(e) => setGradeData({
                        ...gradeData,
                        reading_score: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Writing
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="9"
                      step="0.5"
                      value={gradeData.writing_score || ''}
                      onChange={(e) => setGradeData({
                        ...gradeData,
                        writing_score: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Speaking
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="9"
                      step="0.5"
                      value={gradeData.speaking_score || ''}
                      onChange={(e) => setGradeData({
                        ...gradeData,
                        speaking_score: e.target.value ? parseFloat(e.target.value) : undefined
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={grading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-5 w-5" />
                  {grading ? 'Saving...' : 'Save Scores'}
                </button>
              </form>
            </div>

            {/* Teacher Feedback */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Teacher Feedback
                </h2>
                <button
                  onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  Add Feedback
                </button>
              </div>

              {showFeedbackForm && (
                <form onSubmit={handleFeedbackSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Feedback Type
                    </label>
                    <select
                      value={feedbackData.feedback_type}
                      onChange={(e) => setFeedbackData({
                        ...feedbackData,
                        feedback_type: e.target.value as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="GENERAL">General</option>
                      <option value="LISTENING">Listening</option>
                      <option value="READING">Reading</option>
                      <option value="WRITING">Writing</option>
                      <option value="SPEAKING">Speaking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Comment
                    </label>
                    <textarea
                      required
                      value={feedbackData.comment}
                      onChange={(e) => setFeedbackData({
                        ...feedbackData,
                        comment: e.target.value
                      })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Write your feedback here..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Submit Feedback
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFeedbackForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {result.attempt.teacher_feedbacks && result.attempt.teacher_feedbacks.length > 0 ? (
                  result.attempt.teacher_feedbacks.map((feedback) => (
                    <div key={feedback.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                          {feedback.feedback_type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{feedback.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No feedback yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attempt Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Attempt Info
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="font-medium text-gray-900 dark:text-white">{result.attempt.status}</p>
                </div>
                {result.attempt.started_at && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Started</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(result.attempt.started_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {result.attempt.submitted_at && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Submitted</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(result.attempt.submitted_at).toLocaleString()}
                    </p>
                  </div>
                )}
                {result.attempt.duration_minutes && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {result.attempt.duration_minutes} minutes
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recommendations
              </h2>
              <ul className="space-y-2">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-blue-600">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strengths & Weaknesses */}
            {(result.attempt.strengths && result.attempt.strengths.length > 0) ||
             (result.attempt.weaknesses && result.attempt.weaknesses.length > 0) ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {result.attempt.strengths && result.attempt.strengths.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                      Strengths
                    </h3>
                    <ul className="space-y-1">
                      {result.attempt.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                          • {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.attempt.weaknesses && result.attempt.weaknesses.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2">
                      Weaknesses
                    </h3>
                    <ul className="space-y-1">
                      {result.attempt.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                          • {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
