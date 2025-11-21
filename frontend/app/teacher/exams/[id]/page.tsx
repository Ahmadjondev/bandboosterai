'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, TrendingUp, Award, AlertTriangle, Eye, Edit, Key, Copy, Calendar, Clock, BookOpen, CheckCircle2, Info, Rocket, AlertCircle } from 'lucide-react';
import { teacherExamApi } from '@/lib/teacher-api';
import type { TeacherExamDetail, ExamPerformanceSummary, TeacherExamAttempt } from '@/types/teacher';

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = parseInt(params.id as string);
  
  const [exam, setExam] = useState<TeacherExamDetail | null>(null);
  const [performance, setPerformance] = useState<ExamPerformanceSummary | null>(null);
  const [attempts, setAttempts] = useState<TeacherExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Helper function to safely format score (handles both string and number)
  const formatScore = (score: any): string => {
    if (score === null || score === undefined) return '-';
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    return isNaN(numScore) ? '-' : numScore.toFixed(1);
  };

  useEffect(() => {
    loadExamData();
  }, [examId]);

  const loadExamData = async () => {
    try {
      setLoading(true);
      const [examData, performanceData, attemptsData] = await Promise.all([
        teacherExamApi.getExam(examId),
        teacherExamApi.getExamPerformance(examId),
        teacherExamApi.getExamStudents(examId),
      ]);
      setExam(examData);
      setPerformance(performanceData);
      setAttempts(attemptsData);
    } catch (error) {
      console.error('Failed to load exam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyPinCode = () => {
    if (exam?.access_code) {
      navigator.clipboard.writeText(exam.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePublish = async () => {
    if (!confirm('Publish this exam? Students will be able to join using the PIN code.')) return;
    
    try {
      setPublishing(true);
      await teacherExamApi.publishExam(examId);
      // Reload exam data to get updated status
      await loadExamData();
    } catch (error) {
      console.error('Failed to publish exam:', error);
      alert('Failed to publish exam');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exam || !performance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Exam not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link
            href="/teacher/exams"
            className="inline-flex items-center gap-2 text-blue-100 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Exams</span>
          </Link>

          {/* Title & Description */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
            {exam.description && (
              <p className="text-blue-100">{exam.description}</p>
            )}
          </div>

          {/* Draft Alert */}
          {exam.status === 'DRAFT' && (
            <div className="bg-yellow-500/90 backdrop-blur-sm rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Exam is in Draft Mode</h3>
                  <p className="text-sm text-white/90 mb-3">
                    This exam is not yet published. Students cannot join until you publish it.
                  </p>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Rocket className="h-4 w-4" />
                    {publishing ? 'Publishing...' : 'Publish Exam Now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PIN Code Card - Prominent */}
          {exam.access_code && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Key className="h-5 w-5 text-blue-100" />
                <h2 className="text-lg font-semibold">Access PIN Code</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4 inline-block">
                    <span className="text-4xl font-bold tracking-wider font-mono">
                      {exam.access_code}
                    </span>
                  </div>
                </div>
                <button
                  onClick={copyPinCode}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5" />
                      <span className="text-sm font-medium">Copy PIN</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-blue-100 mt-3">
                {exam.status === 'PUBLISHED' ? (
                  <>Share this PIN with students to allow them to access the exam</>
                ) : (
                  <>⚠️ Publish the exam first before sharing this PIN with students</>
                )}
              </p>
            </div>
          )}

          {/* Essential Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-100" />
                <p className="text-sm text-blue-100">Students</p>
              </div>
              <p className="text-2xl font-bold">{performance.total_students || attempts.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-blue-100" />
                <p className="text-sm text-blue-100">Completed</p>
              </div>
              <p className="text-2xl font-bold">{performance.completed_count}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-100" />
                <p className="text-sm text-blue-100">Avg Score</p>
              </div>
              <p className="text-2xl font-bold">{formatScore(performance.average_scores.overall)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-100" />
                <p className="text-sm text-blue-100">Status</p>
              </div>
              <p className="text-xl font-bold">{exam.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Exam Details Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <BookOpen className="h-4 w-4" />
              <span className="font-medium">Mock Test:</span>
              <span className="text-gray-900 dark:text-white">{exam.mock_exam?.title || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Created:</span>
              <span className="text-gray-900 dark:text-white">{formatDate(exam.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Updated:</span>
              <span className="text-gray-900 dark:text-white">{formatDate(exam.updated_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Visibility:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                exam.is_public 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {exam.is_public ? 'Public' : 'Private'}
              </span>
            </div>
            {exam.status === 'DRAFT' && (
              <div className="ml-auto">
                <Link
                  href={`/teacher/exams/${examId}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Edit className="h-4 w-4" />
                  Edit Exam
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Average Scores */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Section Performance
              </h2>
              <div className="space-y-4">
                {[
                  { name: 'Listening', score: performance.average_scores.listening, color: 'blue' },
                  { name: 'Reading', score: performance.average_scores.reading, color: 'green' },
                  { name: 'Writing', score: performance.average_scores.writing, color: 'purple' },
                  { name: 'Speaking', score: performance.average_scores.speaking, color: 'orange' },
                ].map((section) => (
                  <div key={section.name}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {section.name}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatScore(section.score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`bg-${section.color}-600 h-2 rounded-full transition-all`}
                        style={{ width: `${((typeof section.score === 'string' ? parseFloat(section.score) : section.score) / 9) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Results Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Student Results
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        L
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        R
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        W
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        S
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Overall
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {attempt.student.full_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatScore(attempt.listening_score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatScore(attempt.reading_score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatScore(attempt.writing_score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatScore(attempt.speaking_score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-lg font-bold text-blue-600">
                            {formatScore(attempt.overall_band)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            attempt.status === 'GRADED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            attempt.status === 'COMPLETED' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {attempt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Link
                            href={`/teacher/attempts/${attempt.id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">View</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attempts.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No student attempts yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Score Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Score Distribution
              </h2>
              <div className="space-y-3">
                {Object.entries(performance.score_distribution).map(([range, count]) => (
                  <div key={range} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{range}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Top Performers
              </h2>
              <div className="space-y-3">
                {performance.top_performers.slice(0, 5).map((performer, index) => (
                  <div key={performer.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {performer.student}
                      </span>
                    </div>
                    <span className="font-bold text-green-600">{formatScore(performer.score)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Performers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Need Attention
              </h2>
              <div className="space-y-3">
                {performance.low_performers.slice(0, 5).map((performer) => (
                  <div key={performer.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {performer.student}
                    </span>
                    <span className="font-bold text-orange-600">{formatScore(performer.score)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
