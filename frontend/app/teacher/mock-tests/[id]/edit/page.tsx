'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MockTestForm from '@/components/teacher/MockTestForm';

export default function EditMockTestPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={`/teacher/mock-tests/${id}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Details
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Mock Test
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Update your mock test details and content
          </p>
        </div>
        
        <MockTestForm mode="edit" testId={parseInt(id)} />
      </div>
    </div>
  );
}
