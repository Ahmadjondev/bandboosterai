/**
 * Create Passage Page
 */

import { PassageForm } from '@/components/manager/reading/PassageForm';

export default function CreatePassagePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="px-4 py-6 lg:px-8">
        <PassageForm mode="create" />
      </div>
    </div>
  );
}
