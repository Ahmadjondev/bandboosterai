/**
 * View Passage with Test Heads
 */

'use client';

import { useEffect, useState } from 'react';
import { getReadingPassage } from '@/lib/api/reading';
import { TestHeads } from '@/components/manager/reading/TestHeads';
import { LoadingSpinner } from '@/components/manager/shared';

interface ViewPassagePageProps {
  params: {
    id: string;
  };
}

export default function ViewPassagePage({ params }: ViewPassagePageProps) {
  const [passageTitle, setPassageTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const passageId = parseInt(params.id);

  useEffect(() => {
    const fetchPassage = async () => {
      try {
        const response = await getReadingPassage(passageId);
        setPassageTitle(response.passage.title);
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
