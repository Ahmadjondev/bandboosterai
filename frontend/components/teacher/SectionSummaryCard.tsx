'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SectionSummaryCardProps {
  section: string;
  score?: number;
  correctCount?: number;
  totalCount?: number;
  strength?: string;
}

export default function SectionSummaryCard({
  section,
  score,
  correctCount,
  totalCount,
  strength,
}: SectionSummaryCardProps) {
  const accuracy = totalCount && totalCount > 0 ? (correctCount! / totalCount) * 100 : 0;
  
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 7) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-blue-600 dark:text-blue-400';
    if (score >= 5) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            {section}
          </p>
          <div className="flex items-baseline gap-3">
            <p className={`text-3xl font-bold ${getScoreColor(score)}`}>
              {score ? score.toFixed(1) : '—'}
            </p>
            {correctCount !== undefined && totalCount !== undefined && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {correctCount}/{totalCount}
              </p>
            )}
          </div>
        </div>
        
        {strength && (
          <div className="flex items-center gap-1.5">
            {strength === 'Good' ? (
              <>
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  Strong
                </span>
              </>
            ) : strength === 'Needs improvement' ? (
              <>
                <TrendingDown className="h-5 w-5 text-orange-500" />
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                  Weak
                </span>
              </>
            ) : (
              <>
                <Minus className="h-5 w-5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Average
                </span>
              </>
            )}
          </div>
        )}
      </div>
      
      {accuracy > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Accuracy</span>
            <span className={`font-semibold ${
              accuracy >= 70 ? 'text-green-600' : accuracy >= 50 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {accuracy.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
