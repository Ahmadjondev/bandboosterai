'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { managerAPI } from '@/lib/manager';
import type { BookSection } from '@/types/books';
import SectionFormComponent from '@/components/manager/books/SectionForm';
import { LoadingSpinner, Alert } from '@/components/manager/shared';

export default function EditSectionPage() {
  const params = useParams();
  const sectionId = parseInt(params.id as string);
  const [section, setSection] = useState<BookSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSection = async () => {
      try {
        const data = await managerAPI.getSection(sectionId);
        setSection(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load section');
      } finally {
        setLoading(false);
      }
    };

    fetchSection();
  }, [sectionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Alert type="error" message={error || 'Section not found'} />
      </div>
    );
  }

  return <SectionFormComponent sectionId={sectionId} initialData={section} />;
}
