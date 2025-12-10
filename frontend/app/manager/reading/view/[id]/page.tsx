/**
 * View Passage with Test Heads
 */

'use client';

import { use, useEffect, useState } from 'react';
import { managerAPI } from '@/lib/manager';
import { TestHeads } from '@/components/manager/reading/TestHeads';
import { LoadingSpinner } from '@/components/manager/shared';

interface ViewPassagePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ViewPassagePage({ params }: ViewPassagePageProps) {
  const resolvedParams = use(params);
  const [passageTitle, setPassageTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const passageId = parseInt(resolvedParams.id);

  useEffect(() => {
    const fetchPassage = async () => {
      try {
        const response = await managerAPI.getReadingPassage(passageId);
        setPassageTitle(response.title || '');
      } catch (error) {
        console.error('Error fetching passage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPassage();
  }, [passageId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return <TestHeads passageId={passageId} passageTitle={passageTitle} />;
}
