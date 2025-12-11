'use client';

import { useMemo } from 'react';
import type { StudentRoster, ClassroomAnalytics } from '@/types/classroom';

interface ClassHeatmapProps {
  roster: StudentRoster[];
  analytics: ClassroomAnalytics | null;
}

export default function ClassHeatmap({ roster, analytics }: ClassHeatmapProps) {
  const sections = ['Listening', 'Reading', 'Writing', 'Speaking'];

  // Calculate band color based on score
  const getBandColor = (score: number | null): string => {
    if (score === null) return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
    if (score >= 8.0) return 'bg-emerald-500 text-white';
    if (score >= 7.0) return 'bg-green-500 text-white';
    if (score >= 6.0) return 'bg-lime-400 text-gray-800';
    if (score >= 5.0) return 'bg-yellow-400 text-gray-800';
    if (score >= 4.0) return 'bg-orange-400 text-white';
    return 'bg-red-500 text-white';
  };

  // Mock data structure for demonstration - in real implementation this would come from analytics
  const heatmapData = useMemo(() => {
    return roster.map(student => ({
      id: student.student.id,
      name: student.student.name,
      scores: {
        listening: student.current_band ? parseFloat(String(student.current_band)) - (Math.random() * 0.5 - 0.25) : null,
        reading: student.current_band ? parseFloat(String(student.current_band)) - (Math.random() * 0.5 - 0.25) : null,
        writing: student.current_band ? parseFloat(String(student.current_band)) - (Math.random() * 1 - 0.5) : null,
        speaking: student.current_band ? parseFloat(String(student.current_band)) - (Math.random() * 1 - 0.5) : null,
      },
      overall: student.current_band,
    }));
  }, [roster]);

  if (roster.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Class Performance Heatmap
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Low</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded bg-red-500" />
            <div className="w-4 h-4 rounded bg-orange-400" />
            <div className="w-4 h-4 rounded bg-yellow-400" />
            <div className="w-4 h-4 rounded bg-lime-400" />
            <div className="w-4 h-4 rounded bg-green-500" />
            <div className="w-4 h-4 rounded bg-emerald-500" />
          </div>
          <span className="text-gray-500 dark:text-gray-400">High</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Student
              </th>
              {sections.map(section => (
                <th
                  key={section}
                  className="text-center px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {section}
                </th>
              ))}
              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Overall
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {heatmapData.map(student => (
              <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-blue-600">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                      {student.name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center justify-center w-12 h-8 rounded text-sm font-medium ${getBandColor(student.scores.listening)}`}>
                    {student.scores.listening?.toFixed(1) || '-'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center justify-center w-12 h-8 rounded text-sm font-medium ${getBandColor(student.scores.reading)}`}>
                    {student.scores.reading?.toFixed(1) || '-'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center justify-center w-12 h-8 rounded text-sm font-medium ${getBandColor(student.scores.writing)}`}>
                    {student.scores.writing?.toFixed(1) || '-'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center justify-center w-12 h-8 rounded text-sm font-medium ${getBandColor(student.scores.speaking)}`}>
                    {student.scores.speaking?.toFixed(1) || '-'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center justify-center w-14 h-8 rounded text-sm font-bold ${getBandColor(student.overall ? parseFloat(String(student.overall)) : null)}`}>
                    {student.overall || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500" />
            <span>Band 4 or below</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-400" />
            <span>Band 4-5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-400" />
            <span>Band 5-6</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-lime-400" />
            <span>Band 6-7</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500" />
            <span>Band 7-8</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span>Band 8+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
