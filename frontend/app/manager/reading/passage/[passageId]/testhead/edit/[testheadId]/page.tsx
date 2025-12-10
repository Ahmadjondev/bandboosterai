/**
 * Edit TestHead Page
 * Page for editing an existing question group (testhead) for a reading passage
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QuestionBuilder } from '@/components/manager/question-builder';
import { managerAPI } from '@/lib/manager';
import { LoadingSpinner } from '@/components/manager/shared';
import type { ReadingPassage } from '@/types/manager';

export default function EditTestHeadPage() {
  const params = useParams();
  const router = useRouter();
  const passageId = parseInt(params.passageId as string);
  const testheadId = parseInt(params.testheadId as string);

  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPassage = async () => {
      try {
        const data = await managerAPI.getReadingPassage(passageId);
        setPassage(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load passage');
      } finally {
        setLoading(false);
      }
    };

    if (passageId) {
      fetchPassage();
    }
  }, [passageId]);

  const handleSaveSuccess = () => {
    router.push(`/manager/reading/view/${passageId}`);
  };

  const handleCancel = () => {
    router.push(`/manager/reading/view/${passageId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
          <p className="text-rose-800 dark:text-rose-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <QuestionBuilder
        testHeadId={testheadId}
        passageId={passageId}
        passageTitle={passage?.title}
        onSaveSuccess={handleSaveSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
