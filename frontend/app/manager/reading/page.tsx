/**
 * Reading Tests Management Page
 * Main page for managing reading passages, test heads, and questions
 */

import { ReadingTests } from '@/components/manager/reading/ReadingTests';

export default function ReadingTestsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="px-4 py-6 lg:px-8">
        <ReadingTests />
      </div>
    </div>
  );
}
