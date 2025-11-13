/**
 * Test Heads Management Component
 * Manage question groups (test heads) for reading passages
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Trash2, HelpCircle } from 'lucide-react';
import { getTestHeads, deleteTestHead } from '@/lib/api/reading';
import type { TestHead } from '@/types/reading';
import { LoadingSpinner, EmptyState } from '@/components/manager/shared';

interface TestHeadsProps {
  passageId: number;
  passageTitle?: string;
}

export function TestHeads({ passageId, passageTitle }: TestHeadsProps) {
  const router = useRouter();
  const [testHeads, setTestHeads] = useState<TestHead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTestHeads();
  }, [passageId]);

  const fetchTestHeads = async () => {
    setLoading(true);
    try {
      const response = await getTestHeads({ passage_id: passageId });
      setTestHeads(response.testheads || []);
    } catch (error) {
      console.error('Error fetching test heads:', error);
      alert('Failed to load test heads');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this test head?')) return;

    try {
      await deleteTestHead(id);
      await fetchTestHeads();
    } catch (error) {
      console.error('Error deleting test head:', error);
      alert('Failed to delete test head');
    }
  };

  const handleBack = () => {
    router.push('/manager/reading');
  };

  const handleCreate = () => {
    router.push(`/manager/reading/passage/${passageId}/testhead/create`);
  };

  const handleEdit = (id: number) => {
    router.push(`/manager/reading/passage/${passageId}/testhead/edit/${id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBack}
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Test Heads</h1>
            {passageTitle && (
              <p className="text-sm text-slate-600 mt-1">For passage: {passageTitle}</p>
            )}
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Test Head
          </button>
        </div>
      </div>

      {/* Test Heads List */}
      {testHeads.length === 0 ? (
        <EmptyState
          icon="HelpCircle"
          title="No test heads yet"
          description="Create your first test head to add questions to this passage"
          actionText="Create First Test Head"
          onAction={handleCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testHeads.map((testHead) => (
            <div
              key={testHead.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{testHead.title}</h3>
                    <span className="text-xs text-slate-500 uppercase">
                      {testHead.question_type}
                    </span>
                  </div>
                </div>
              </div>

              {testHead.description && (
                <p className="text-sm text-slate-600 mb-4">{testHead.description}</p>
              )}

              <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                <span>{testHead.question_count || 0} questions</span>
                <span className="text-xs">
                  {new Date(testHead.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleEdit(testHead.id)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(testHead.id)}
                  className="px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
