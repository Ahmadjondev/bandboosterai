/**
 * Create Listening Part Page
 */

import ListeningForm from '@/components/manager/listening/ListeningForm';

export default function CreateListeningPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="px-4 py-6 lg:px-8">
        <ListeningForm mode="create" />
      </div>
    </div>
  );
}
