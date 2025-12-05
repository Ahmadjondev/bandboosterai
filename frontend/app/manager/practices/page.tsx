/**
 * Section Practices Management Page
 * Main page for managing section practices (reading, listening, writing, speaking)
 */

import { SectionPractices } from '@/components/manager/practices/SectionPractices';

export default function SectionPracticesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="px-4 py-6 lg:px-8">
        <SectionPractices />
      </div>
    </div>
  );
}
