/**
 * Edit TestHead Page for Listening
 * Page for editing an existing question group (testhead) for a listening part
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QuestionBuilder } from '@/components/manager/question-builder';
import { managerAPI } from '@/lib/manager';
import { LoadingSpinner } from '@/components/manager/shared';
import type { ListeningPart } from '@/types/manager';

export default function EditListeningTestHeadPage() {
  const params = useParams();
  const router = useRouter();
  const listeningPartId = parseInt(params.listeningPartId as string);
  const testheadId = parseInt(params.testheadId as string);

  const [listeningPart, setListeningPart] = useState<ListeningPart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListeningPart = async () => {
      try {
        const data = await managerAPI.getListeningPart(listeningPartId);
        setListeningPart(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load listening part');
      } finally {
        setLoading(false);
      }
    };

    if (listeningPartId) {
      fetchListeningPart();
    }
  }, [listeningPartId]);

  const handleSaveSuccess = () => {
    router.push(`/manager/listening/view/${listeningPartId}`);
  };

  const handleCancel = () => {
    router.push(`/manager/listening/view/${listeningPartId}`);
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
        listeningPartId={listeningPartId}
        listeningPartTitle={listeningPart?.title}
        onSaveSuccess={handleSaveSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
