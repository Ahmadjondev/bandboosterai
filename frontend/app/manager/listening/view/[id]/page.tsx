/**
 * View Listening Part Page
 * Shows listening part details and test heads
 */

'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { managerAPI } from '@/lib/manager/api-client';
import { ListeningTestHeads } from '@/components/manager/listening/ListeningTestHeads';
import { LoadingSpinner } from '@/components/manager/shared';
import { ArrowLeft, Edit2, Headphones, Clock, FileText } from 'lucide-react';
import type { ListeningPart } from '@/types/manager';

interface ViewListeningPageProps {
  params: Promise<{ id: string }>;
}

export default function ViewListeningPage({ params }: ViewListeningPageProps) {
  const resolvedParams = use(params);
  const id = parseInt(resolvedParams.id, 10);
  const router = useRouter();
  
  const [listeningPart, setListeningPart] = useState<ListeningPart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListeningPart = async () => {
      try {
        const data = await managerAPI.getListeningPart(id);
        setListeningPart(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load listening part');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchListeningPart();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/manager/listening')}
              className="text-slate-600 hover:text-slate-900 transition-colors dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
                <Headphones className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {listeningPart?.title || 'Listening Part'}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Part {listeningPart?.part_number || 1}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/manager/listening/edit/${id}`)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Details
            </button>
          </div>
        </div>

        {/* Listening Part Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Listening Part Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Duration */}
            {listeningPart?.duration_seconds && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Duration</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {Math.floor(listeningPart.duration_seconds / 60)}:{(listeningPart.duration_seconds % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {listeningPart?.description && (
              <div className="md:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Description</p>
                    <p className="text-slate-700 dark:text-slate-300">{listeningPart.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audio Player */}
          {listeningPart?.audio_url && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Audio</p>
              <audio controls src={listeningPart.audio_url} className="w-full max-w-md" />
            </div>
          )}
        </div>

        {/* Test Heads Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <ListeningTestHeads
            listeningPartId={id}
            listeningPartTitle={listeningPart?.title}
            showBackButton={false}
          />
        </div>
      </div>
    </div>
  );
}
