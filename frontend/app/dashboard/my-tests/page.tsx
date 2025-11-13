'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getMyAttempts } from '@/lib/exam-api';
import type { TestAttemptHistory, ExamType, ExamStatus } from '@/types/exam';

export default function MyTestsPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<TestAttemptHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyAttempts();
      setAttempts(data);
    } catch (err: any) {
      console.error('Error loading attempts:', err);
      setError(err.message || 'Failed to load test attempts');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: ExamStatus) => {
    const badges = {
      NOT_STARTED: { label: 'Not Started', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
      IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
      COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
      SUBMITTED: { label: 'Completed', className: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' }
    };
    const badge = badges[status];
    return <span className={`px-2 py-1 rounded text-xs font-medium ${badge.className}`}>{badge.label}</span>;
  };

  const getExamTypeLabel = (examType: ExamType) => {
    const labels: Record<ExamType, string> = {
      LISTENING: 'Listening',
      READING: 'Reading',
      WRITING: 'Writing',
      SPEAKING: 'Speaking',
      LISTENING_READING: 'L + R',
      LISTENING_READING_WRITING: 'L + R + W',
      FULL_TEST: 'Full Test'
    };
    return labels[examType] || examType;
  };

  const getBandScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400 dark:text-slate-500';
    if (score >= 7) return 'text-green-600 dark:text-green-400';
    if (score >= 5.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAttemptClick = (attempt: TestAttemptHistory) => {
    if (attempt.status === 'COMPLETED' || attempt.status === 'SUBMITTED') {
      router.push(`/dashboard/results?attempt=${attempt.id}`);
    } else if (attempt.status === 'IN_PROGRESS') {
      router.push(`/exam/${attempt.id}`);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <h3 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">Failed to Load Tests</h3>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <button onClick={loadAttempts} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Try Again</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">My Tests</h1>
          <p className="text-slate-600 dark:text-slate-400">View all your practice test attempts</p>
        </div>

        {attempts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="text-4xl">📝</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No tests yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Start your IELTS preparation by taking your first test</p>
            <button onClick={() => router.push('/dashboard/cd-exam')} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
              Take Your First Test
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div key={attempt.id} onClick={() => handleAttemptClick(attempt)}
                className={`bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 transition-all ${(attempt.status === 'COMPLETED' || attempt.status === 'SUBMITTED' || attempt.status === 'IN_PROGRESS') ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md' : 'opacity-60'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{attempt.exam_title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs">{getExamTypeLabel(attempt.exam_type)}</span>
                      {getStatusBadge(attempt.status)}
                      <span className="text-slate-500 dark:text-slate-400">{formatDate(attempt.completed_at || attempt.started_at)}</span>
                    </div>
                  </div>

                  {(attempt.status === 'COMPLETED' || attempt.status === 'SUBMITTED') && attempt.overall_score !== null && (
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-3 text-sm">
                        {attempt.listening_score !== null && (
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">L</div>
                            <div className={`font-semibold ${getBandScoreColor(attempt.listening_score)}`}>{attempt.listening_score.toFixed(1)}</div>
                          </div>
                        )}
                        {attempt.reading_score !== null && (
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">R</div>
                            <div className={`font-semibold ${getBandScoreColor(attempt.reading_score)}`}>{attempt.reading_score.toFixed(1)}</div>
                          </div>
                        )}
                        {attempt.writing_score !== null && (
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">W</div>
                            <div className={`font-semibold ${getBandScoreColor(attempt.writing_score)}`}>{attempt.writing_score.toFixed(1)}</div>
                          </div>
                        )}
                        {attempt.speaking_score !== null && (
                          <div className="text-center">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">S</div>
                            <div className={`font-semibold ${getBandScoreColor(attempt.speaking_score)}`}>{attempt.speaking_score.toFixed(1)}</div>
                          </div>
                        )}
                      </div>

                      <div className="text-center pl-4 border-l border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Overall</div>
                        <div className={`text-2xl font-bold ${getBandScoreColor(attempt.overall_score)}`}>{attempt.overall_score.toFixed(1)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
