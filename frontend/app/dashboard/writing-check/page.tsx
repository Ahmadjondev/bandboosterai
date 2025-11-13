import React from 'react';
import WritingChecker from '@/components/writing/WritingChecker';

/**
 * Writing Check Dashboard Page
 * 
 * Provides authenticated access to the BandBooster AI Writing Checker.
 * Students can submit essays and receive instant AI-powered feedback.
 */

export default function WritingCheckPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <WritingChecker />
    </div>
  );
}
