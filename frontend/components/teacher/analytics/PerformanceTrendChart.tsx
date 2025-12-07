'use client';

interface PerformanceTrendChartProps {
  trends: Array<{
    period: string;
    average_score: number;
    attempts_count: number;
  }>;
}

export function PerformanceTrendChart({ trends }: PerformanceTrendChartProps) {
  if (trends.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        No trend data available yet
      </div>
    );
  }

  const maxScore = Math.max(...trends.map(t => t.average_score), 9);
  const minScore = Math.min(...trends.map(t => t.average_score), 0);
  const maxAttempts = Math.max(...trends.map(t => t.attempts_count), 1);

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-48 flex items-end gap-2">
        {trends.map((trend, index) => {
          const barHeight = ((trend.average_score - minScore) / (maxScore - minScore)) * 100;
          const opacity = 0.5 + (trend.attempts_count / maxAttempts) * 0.5;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-36">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {trend.average_score.toFixed(1)}
                </div>
                <div
                  className="w-full max-w-12 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-500"
                  style={{ 
                    height: `${Math.max(barHeight, 10)}%`,
                    opacity 
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center truncate w-full">
                {trend.period}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {trend.attempts_count} test{trend.attempts_count !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Bar height = Average Score</span>
        <span>•</span>
        <span>Bar opacity = Number of tests</span>
      </div>
    </div>
  );
}
