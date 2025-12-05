'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import BulkPracticesManager from '@/components/manager/practices/BulkPracticesManager';

const VALID_SECTIONS = ['listening', 'reading', 'writing', 'speaking'] as const;
type SectionType = typeof VALID_SECTIONS[number];

interface Props {
  params: Promise<{
    section: string;
  }>;
}

export default function BulkAddPracticesPage({ params }: Props) {
  const resolvedParams = use(params);
  const section = resolvedParams.section as SectionType;

  if (!VALID_SECTIONS.includes(section)) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <BulkPracticesManager sectionType={section} />
    </div>
  );
}
