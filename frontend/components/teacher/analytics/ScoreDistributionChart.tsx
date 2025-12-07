'use client';

interface ScoreDistributionChartProps {
  distribution: {
    '0-4.5': number;
    '5.0-5.5': number;
    '6.0-6.5': number;
    '7.0-7.5': number;
    '8.0-9.0': number;
  };
}

export function ScoreDistributionChart({ distribution }: ScoreDistributionChartProps) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  
  const bands = [
    { label: '0-4.5', value: distribution['0-4.5'], color: 'bg-red-500' },
    { label: '5.0-5.5', value: distribution['5.0-5.5'], color: 'bg-orange-500' },
    { label: '6.0-6.5', value: distribution['6.0-6.5'], color: 'bg-yellow-500' },
    { label: '7.0-7.5', value: distribution['7.0-7.5'], color: 'bg-green-500' },
    { label: '8.0-9.0', value: distribution['8.0-9.0'], color: 'bg-emerald-500' },
  ];

  const maxValue = Math.max(...bands.map(b => b.value), 1);

  return (
    <div className="space-y-3">
      {bands.map((band) => {
        const percentage = total > 0 ? (band.value / total) * 100 : 0;
        const barWidth = total > 0 ? (band.value / maxValue) * 100 : 0;
        
        return (
          <div key={band.label} className="flex items-center gap-3">
            <div className="w-16 text-sm font-medium text-gray-600 dark:text-gray-400">
              {band.label}
            </div>
            <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <div
                className={`h-full ${band.color} transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${barWidth}%` }}
              >
                {band.value > 0 && (
                  <span className="text-xs font-semibold text-white">
                    {band.value}
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 text-right text-sm text-gray-500 dark:text-gray-400">
              {percentage.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
