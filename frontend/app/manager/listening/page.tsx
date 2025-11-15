/**
 * Manager Listening Page
 * Renders the React ListeningTests component
 */

import { ListeningTests } from '@/components/manager/listening/ListeningTests';

export default function ListeningPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary/30 dark:selection:bg-primary/40">
      <div className="px-4 py-6 lg:px-8">
        <ListeningTests />
      </div>
    </div>
  );
}
