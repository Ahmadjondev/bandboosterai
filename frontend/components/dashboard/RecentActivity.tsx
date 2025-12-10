"use client";

import Link from "next/link";
import { Clock, ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { formatRelativeTime, formatScore, getBandInfo } from "@/types/dashboard";

interface RecentTest {
  id: number;
  exam_name: string;
  exam_type: string;
  date: string;
  overall_score: number | null;
  listening_score: number | null;
  reading_score: number | null;
  writing_score: number | null;
  speaking_score: number | null;
}

interface RecentActivityProps {
  tests: RecentTest[];
  maxItems?: number;
}

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  const bandInfo = getBandInfo(score);
  
  return (
    <div className="text-center shrink-0">
      <div className="text-[10px] text-gray-400 dark:text-slate-500 mb-0.5 uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-sm font-semibold ${bandInfo.color}`}>
        {formatScore(score)}
      </div>
    </div>
  );
}

function TestCard({ test }: { test: RecentTest }) {
  const bandInfo = getBandInfo(test.overall_score);
  const hasDetailedScores = test.listening_score !== null || 
                            test.reading_score !== null || 
                            test.writing_score !== null || 
                            test.speaking_score !== null;

  return (
    <Link
      href={`/dashboard/results?attempt=${test.id}`}
      className="group block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
    >
      {/* Mobile & Tablet Layout */}
      <div className="flex flex-col gap-3 lg:hidden">
        {/* Top Row: Score + Info */}
        <div className="flex items-center gap-3">
          {/* Overall Score Circle */}
          <div className={`relative w-12 h-12 rounded-full ${bandInfo.bgColor} ${bandInfo.borderColor} border-2 flex items-center justify-center shrink-0`}>
            <span className={`text-base font-bold ${bandInfo.color}`}>
              {formatScore(test.overall_score)}
            </span>
          </div>

          {/* Test Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {test.exam_name}
              </h3>
              <span className="shrink-0 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-medium flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Done
              </span>
            </div>
            
            <div className="flex items-center text-xs text-gray-500 dark:text-slate-400">
              <Clock className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate">{formatRelativeTime(test.date)}</span>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
        </div>

        {/* Bottom Row: Section Scores */}
        {hasDetailedScores && (
          <div className="flex items-center justify-between px-2 py-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <ScoreBadge score={test.listening_score} label="L" />
            <ScoreBadge score={test.reading_score} label="R" />
            <ScoreBadge score={test.writing_score} label="W" />
            <ScoreBadge score={test.speaking_score} label="S" />
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center gap-4">
        {/* Overall Score Circle */}
        <div className={`relative w-14 h-14 rounded-full ${bandInfo.bgColor} ${bandInfo.borderColor} border-2 flex items-center justify-center shrink-0`}>
          <span className={`text-lg font-bold ${bandInfo.color}`}>
            {formatScore(test.overall_score)}
          </span>
        </div>

        {/* Test Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {test.exam_name}
            </h3>
            <span className="shrink-0 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(test.date)}
            </span>
          </div>
        </div>

        {/* Section Scores */}
        {hasDetailedScores && (
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <ScoreBadge score={test.listening_score} label="L" />
            <ScoreBadge score={test.reading_score} label="R" />
            <ScoreBadge score={test.writing_score} label="W" />
            <ScoreBadge score={test.speaking_score} label="S" />
          </div>
        )}

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
      </div>
    </Link>
  );
}

export default function RecentActivity({ tests, maxItems = 5 }: RecentActivityProps) {
  const displayTests = tests.slice(0, maxItems);

  if (tests.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Tests Yet
          </h3>
          <p className="text-gray-500 dark:text-slate-400 mb-4">
            Start your first test to see your progress here
          </p>
          <Link
            href="/dashboard/cd-exam"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Take Your First Test
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        {tests.length > maxItems && (
          <Link 
            href="/dashboard/my-tests"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View All ({tests.length}) <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Test List */}
      <div className="space-y-3">
        {displayTests.map((test) => (
          <TestCard key={test.id} test={test} />
        ))}
      </div>

      {/* View All Footer */}
      {tests.length > maxItems && (
        <Link
          href="/dashboard/my-tests"
          className="block text-center py-3 text-sm text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          See all {tests.length} tests →
        </Link>
      )}
    </div>
  );
}
