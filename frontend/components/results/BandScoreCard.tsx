'use client';

import React from 'react';

interface BandScoreCardProps {
  band: number;
  label: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BandScoreCard({ band, label, subtitle, size = 'md' }: BandScoreCardProps) {
  const getBandColor = (score: number): string => {
    if (score >= 8.5) return 'bg-linear-to-br from-purple-500 to-pink-600';
    if (score >= 7.0) return 'bg-linear-to-br from-green-500 to-emerald-600';
    if (score >= 6.0) return 'bg-linear-to-br from-blue-500 to-cyan-600';
    if (score >= 5.0) return 'bg-linear-to-br from-yellow-500 to-orange-600';
    return 'bg-linear-to-br from-red-500 to-rose-600';
  };

  const getBandLabel = (score: number): string => {
    if (score >= 8.5) return 'Expert';
    if (score >= 7.0) return 'Good';
    if (score >= 6.0) return 'Competent';
    if (score >= 5.0) return 'Modest';
    return 'Limited';
  };

  const sizeClasses = {
    sm: {
      container: 'w-20 h-20',
      text: 'text-2xl',
      label: 'text-sm',
    },
    md: {
      container: 'w-28 h-28',
      text: 'text-4xl',
      label: 'text-base',
    },
    lg: {
      container: 'w-40 h-40',
      text: 'text-6xl',
      label: 'text-lg',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${classes.container} ${getBandColor(band)} rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-200`}
      >
        <div className="text-white font-bold text-center">
          <div className={classes.text}>{band.toFixed(1)}</div>
          <div className="text-xs opacity-90">{getBandLabel(band)}</div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className={`font-semibold text-slate-900 dark:text-white ${classes.label}`}>
          {label}
        </div>
        {subtitle && (
          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
