"use client";

import MockTestForm from '@/components/manager/mock-tests/MockTestForm';
import { use } from 'react';

interface EditMockTestPageProps {
  params: {
    id: string;
  };
}

export default function EditMockTestPage({ params }: EditMockTestPageProps) {
  // `params` may be a Promise in client components; unwrap it with React.use()
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const resolvedParams = use(params as unknown as Promise<EditMockTestPageProps['params']>) as EditMockTestPageProps['params'];
  const testId = parseInt(resolvedParams.id, 10);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <MockTestForm mode="edit" testId={testId} />
    </div>
  );
}
