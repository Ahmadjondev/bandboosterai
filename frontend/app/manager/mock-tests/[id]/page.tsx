'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { managerAPI } from '@/lib/manager';
import type { MockTest, MockTestStatistics, RecentAttempt } from '@/types/manager/mock-tests';
import { LoadingSpinner, Alert, StatsCard, Badge, Modal } from '@/components/manager/shared';

interface MockTestDetailPageProps {
  params: {
    id: string;
  };
}

export default function MockTestDetailPage({ params }: MockTestDetailPageProps) {
  const router = useRouter();
  // `params` may be a Promise in client components; unwrap it with React's `use` hook.
  // See: https://nextjs.org/docs/messages/sync-dynamic-apis
  // Note: `use` will suspend while the promise resolves.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const resolvedParams = use(params as unknown as Promise<MockTestDetailPageProps['params']>) as MockTestDetailPageProps['params'];
  const testId = parseInt(resolvedParams.id, 10);

  const [test, setTest] = useState<MockTest | null>(null);
  const [statistics, setStatistics] = useState<MockTestStatistics | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTestDetails();
  }, [testId]);

  const loadTestDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await managerAPI.getMockTest(testId);
      setTest(response.test);
      setStatistics(response.statistics);
      setRecentAttempts(response.recent_attempts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load test details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!test) return;
    try {
      await managerAPI.toggleMockTestStatus(test.id);
      loadTestDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle test status');
    }
  };

  const handleDelete = async () => {
    if (!test) return;
    setDeleting(true);
    try {
      await managerAPI.deleteMockTest(test.id);
      router.push('/manager/mock-tests');
    } catch (err: any) {
      alert(err.message || 'Failed to delete test');
      setDeleting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'HARD':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !test) {
    return (
      <div className="p-6">
        <Alert type="error" message={error || 'Test not found'} />
        <Link
          href="/manager/mock-tests"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          ← Back to Mock Tests
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/manager/mock-tests"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
        >
          ← Back to Mock Tests
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{test.title}</h1>
            {test.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">{test.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/manager/mock-tests/${test.id}/edit`}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleToggleStatus}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
            >
              {test.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => setDeleteModal(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                test.is_active
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {test.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {test.exam_type_display}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Difficulty:
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(
                test.difficulty
              )}`}
            >
              {test.difficulty_display}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {test.duration_minutes} minutes
            </span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              title="Total Attempts"
              value={statistics.total_attempts ?? 0}
              variant="primary"
            />
            <StatsCard
              title="Avg Score"
              value={
                statistics.average_score !== null && statistics.average_score !== undefined
                  ? statistics.average_score.toFixed(1)
                  : '-'
              }
              variant="success"
            />
            <StatsCard
              title="Highest Score"
              value={
                statistics.highest_score !== null && statistics.highest_score !== undefined
                  ? statistics.highest_score.toFixed(1)
                  : '-'
              }
              variant="success"
            />
            <StatsCard
              title="Lowest Score"
              value={
                statistics.lowest_score !== null && statistics.lowest_score !== undefined
                  ? statistics.lowest_score.toFixed(1)
                  : '-'
              }
              variant="warning"
            />
          </div>
        </div>
      )}

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Reading Passages */}
        {test.reading_passages && test.reading_passages.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-blue-600 mr-2">📖</span>
              Reading Passages ({test.reading_passages.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {test.reading_passages.map((passage) => (
                <div
                  key={passage.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {passage.title}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      Passage {passage.passage_number}
                    </div>
                    <div>
                      <Badge text={passage.difficulty} color="blue" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listening Parts */}
        {test.listening_parts && test.listening_parts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-green-600 mr-2">🎧</span>
              Listening Parts ({test.listening_parts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {test.listening_parts.map((part) => (
                <div
                  key={part.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">{part.title}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="text-gray-600 dark:text-gray-400">Part {part.part_number}</div>
                    <div className="text-gray-600 dark:text-gray-400">{part.duration} min</div>
                    <div>
                      <Badge text={part.difficulty} color="green" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Writing Tasks */}
        {test.writing_tasks && test.writing_tasks.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-purple-600 mr-2">✍️</span>
              Writing Tasks ({test.writing_tasks.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {test.writing_tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {task.task_type_display}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {task.prompt}
                  </p>
                  <div>
                    <Badge text={task.difficulty} color="purple" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Speaking Topics */}
        {test.speaking_topics && test.speaking_topics.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-orange-600 mr-2">🗣️</span>
              Speaking Topics ({test.speaking_topics.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {test.speaking_topics.map((topic) => (
                <div
                  key={topic.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {topic.speaking_type_display}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{topic.topic}</p>
                  {topic.question && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 italic line-clamp-2">
                      "{topic.question}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Attempts */}
      {recentAttempts && recentAttempts.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Attempts
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentAttempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {attempt.student_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(attempt.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {attempt.overall_score !== null && attempt.overall_score !== undefined ? (
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {attempt.overall_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          attempt.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {attempt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <Modal show={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Mock Test">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{test.title}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
