'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Calendar,
  Clock,
  Target,
  Award,
  BookOpen,
} from 'lucide-react';
import { studentTeacherExamApi } from '@/lib/student-teacher-api';
import type { TeacherExamAttemptDetail } from '@/types/teacher';

export default function StudentResultPage() {
  const params = useParams();
  const examId = parseInt(params.id as string);

  const [attempt, setAttempt] = useState<TeacherExamAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResult();
  }, [examId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      // First get the attempt
      const attemptData = await studentTeacherExamApi.getMyAttempt(examId);
      if (attemptData) {
        // Then get detailed result
        const detailData = await studentTeacherExamApi.getAttemptResult(attemptData.id);
        setAttempt(detailData);
      }
    } catch (error) {
      console.error('Failed to load result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No results available yet</p>
          <Link
            href={`/dashboard/teacher-exams/${examId}`}
            className="inline-block mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Exam
          </Link>
        </div>
      </div>
    );
  }

  const getSectionStrength = (score?: number | null): { label: string; color: string } => {
    if (score === null || score === undefined) return { label: 'Not graded', color: 'gray' };
    if (score >= 7.0) return { label: 'Excellent', color: 'green' };
    if (score >= 6.0) return { label: 'Good', color: 'blue' };
    if (score >= 5.0) return { label: 'Average', color: 'yellow' };
    return { label: 'Needs improvement', color: 'orange' };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/teacher-exams/${examId}`}
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Exam
        </Link>

        <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Your Results</h1>
              <p className="text-blue-100">{attempt.exam.title}</p>
            </div>
          </div>

          {attempt.overall_band && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mt-6 text-center">
              <p className="text-blue-100 mb-2">Overall Band Score</p>
              <p className="text-6xl font-bold">{Number(attempt.overall_band).toFixed(1)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Scores */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Section Performance
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Listening', score: attempt.listening_score, icon: '🎧' },
                { name: 'Reading', score: attempt.reading_score, icon: '📖' },
                { name: 'Writing', score: attempt.writing_score, icon: '✍️' },
                { name: 'Speaking', score: attempt.speaking_score, icon: '🗣️' },
              ].map((section) => {
                const strength = getSectionStrength(section.score);
                return (
                  <div
                    key={section.name}
                    className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{section.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {section.name}
                          </h3>
                          <p className={`text-sm text-${strength.color}-600 dark:text-${strength.color}-400`}>
                            {strength.label}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-blue-600">
                          {section.score !== null && section.score !== undefined
                            ? Number(section.score).toFixed(1)
                            : '-'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">out of 9.0</p>
                      </div>
                    </div>

                    {section.score !== null && section.score !== undefined && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`bg-${strength.color}-500 h-2 rounded-full transition-all`}
                          style={{ width: `${(section.score / 9) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          {((attempt.strengths && attempt.strengths.length > 0) ||
            (attempt.weaknesses && attempt.weaknesses.length > 0)) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Performance Analysis
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {attempt.strengths && attempt.strengths.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-600 dark:text-green-400">
                        Strengths
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {attempt.strengths.map((strength, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                        >
                          <div className="shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            ✓
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {strength}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {attempt.weaknesses && attempt.weaknesses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingDown className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold text-orange-600 dark:text-orange-400">
                        Areas to Improve
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {attempt.weaknesses.map((weakness, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                        >
                          <div className="shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            !
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {weakness}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Teacher Feedback */}
          {attempt.teacher_feedbacks && attempt.teacher_feedbacks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Teacher Feedback
              </h2>

              <div className="space-y-4">
                {attempt.teacher_feedbacks
                  .filter((feedback) => feedback.is_visible_to_student)
                  .map((feedback) => (
                    <div
                      key={feedback.id}
                      className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                          {feedback.feedback_type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{feedback.comment}</p>
                      {feedback.feedback_type === 'WRITING' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                          {feedback.task_achievement !== null && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Task Achievement</p>
                              <p className="text-lg font-bold text-blue-600">{feedback.task_achievement}</p>
                            </div>
                          )}
                          {feedback.coherence_cohesion !== null && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Coherence</p>
                              <p className="text-lg font-bold text-blue-600">{feedback.coherence_cohesion}</p>
                            </div>
                          )}
                          {feedback.lexical_resource !== null && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Vocabulary</p>
                              <p className="text-lg font-bold text-blue-600">{feedback.lexical_resource}</p>
                            </div>
                          )}
                          {feedback.grammatical_range !== null && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Grammar</p>
                              <p className="text-lg font-bold text-blue-600">{feedback.grammatical_range}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {feedback.feedback_type === 'SPEAKING' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                          {feedback.pronunciation !== null && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Pronunciation</p>
                              <p className="text-lg font-bold text-blue-600">{feedback.pronunciation}</p>
                            </div>
                          )}
                          {feedback.fluency_coherence !== null && (
                            <div className="text-center">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Fluency</p>
                              <p className="text-lg font-bold text-blue-600">{feedback.fluency_coherence}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attempt Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Attempt Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Submitted</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {attempt.submitted_at
                      ? new Date(attempt.submitted_at).toLocaleString()
                      : 'Not submitted'}
                  </p>
                </div>
              </div>
              {attempt.duration_minutes && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {attempt.duration_minutes} minutes
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="font-medium text-gray-900 dark:text-white">{attempt.status}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Badge */}
          {attempt.overall_band && (
            <div className="bg-linear-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-white text-center">
              <Award className="h-12 w-12 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-1">
                {attempt.overall_band >= 7.0
                  ? 'Excellent Performance!'
                  : attempt.overall_band >= 6.0
                  ? 'Good Job!'
                  : 'Keep Practicing!'}
              </h3>
              <p className="text-sm text-white/90">
                {attempt.overall_band >= 7.0
                  ? 'You\'re doing great! Keep it up!'
                  : attempt.overall_band >= 6.0
                  ? 'Solid performance. Room for improvement!'
                  : 'Practice makes perfect. Don\'t give up!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
