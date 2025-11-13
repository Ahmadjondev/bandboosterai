'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/manager/utils';

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  loading?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700',
    iconBg: 'bg-gray-100 dark:bg-gray-700',
    iconColor: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-600',
  },
  primary: {
    bg: 'bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10',
    iconBg: 'bg-primary/20 dark:bg-primary/30',
    iconColor: 'text-primary dark:text-primary-400',
    border: 'border-primary/20 dark:border-primary/30',
  },
  success: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-700',
  },
  warning: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-700',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-700',
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  variant = 'default',
  loading = false,
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.value === 0) {
      return <Minus className="h-4 w-4" />;
    }
    
    return trend.value > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    if (trend.value === 0) {
      return 'text-gray-500 dark:text-gray-400';
    }

    const isPositive = trend.isPositive !== undefined ? trend.isPositive : trend.value > 0;
    
    return isPositive
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border p-6',
          styles.bg,
          styles.border,
          'transition-all duration-200',
          className
        )}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-600 rounded" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-600 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-6',
        styles.bg,
        styles.border,
        'transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50',
        className
      )}
    >
      {/* Icon */}
      {Icon && (
        <div className="absolute top-6 right-6">
          <div
            className={cn(
              'p-3 rounded-xl',
              styles.iconBg,
              styles.iconColor,
              'transition-transform hover:scale-110'
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        {/* Title */}
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>

        {/* Value */}
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>

        {/* Trend & Subtitle */}
        <div className="flex items-center gap-3 text-sm">
          {trend && (
            <div className={cn('flex items-center gap-1 font-medium', getTrendColor())}>
              {getTrendIcon()}
              <span>
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-gray-500 dark:text-gray-400 font-normal">
                  {trend.label}
                </span>
              )}
            </div>
          )}

          {subtitle && !trend && (
            <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Decorative gradient overlay */}
      <div
        className={cn(
          'absolute -bottom-2 -right-2 w-24 h-24 rounded-full opacity-20 blur-2xl',
          variant === 'primary' && 'bg-primary',
          variant === 'success' && 'bg-green-500',
          variant === 'warning' && 'bg-yellow-500',
          variant === 'danger' && 'bg-red-500',
          variant === 'default' && 'bg-gray-400'
        )}
      />
    </div>
  );
}
