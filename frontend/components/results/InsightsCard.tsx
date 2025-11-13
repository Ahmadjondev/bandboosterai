'use client';

import React from 'react';
import { Insights } from '@/types/results';

interface InsightsCardProps {
  insights: Insights;
}

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
      <div className="bg-linear-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <span>💡</span>
          Performance Insights
        </h3>
        <p className="text-white/90 text-sm mt-1">
          Personalized analysis of your strengths and areas for improvement
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Strengths */}
        {insights.strengths && insights.strengths.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">💪</span>
              Your Strengths
            </h4>
            <div className="space-y-3">
              {insights.strengths.map((strength, index) => (
                <div
                  key={index}
                  className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-green-900 dark:text-green-100">
                      {strength.category}
                    </h5>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600"
                          style={{ width: `${strength.accuracy * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-green-700 dark:text-green-300">
                        {(strength.accuracy * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-200">{strength.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {insights.weaknesses && insights.weaknesses.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Areas to Improve
            </h4>
            <div className="space-y-3">
              {insights.weaknesses.map((weakness, index) => (
                <div
                  key={index}
                  className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-amber-900 dark:text-amber-100">
                      {weakness.category}
                    </h5>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-600"
                          style={{ width: `${weakness.accuracy * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                        {(weakness.accuracy * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                    💡 Improvement Tip:
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">{weakness.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No insights */}
        {(!insights.strengths || insights.strengths.length === 0) &&
          (!insights.weaknesses || insights.weaknesses.length === 0) && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🤔</div>
              <p className="text-slate-600 dark:text-slate-400">
                Not enough data to generate insights. Complete more sections to get personalized
                feedback.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
