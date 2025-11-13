/**
 * Edit Passage Page
 */

import { PassageForm } from '@/components/manager/reading/PassageForm';

interface EditPassagePageProps {
  params: {
    id: string;
  };
}

export default function EditPassagePage({ params }: EditPassagePageProps) {
  return <PassageForm mode="edit" id={parseInt(params.id)} />;
}
