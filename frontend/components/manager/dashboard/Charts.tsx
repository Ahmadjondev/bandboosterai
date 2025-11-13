'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/lib/use-theme';

// Chart color palettes
const LIGHT_COLORS = {
  primary: '#f97316',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  grid: '#e5e7eb',
  text: '#374151',
};

const DARK_COLORS = {
  primary: '#fb923c',
  secondary: '#60a5fa',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  purple: '#a78bfa',
  pink: '#f472b6',
  cyan: '#22d3ee',
  grid: '#374151',
  text: '#d1d5db',
};

interface BaseChartProps {
  data: any[];
  loading?: boolean;
  className?: string;
}

// Trend Line Chart Component
interface TrendLineChartProps extends BaseChartProps {
  lines: Array<{
    dataKey: string;
    name: string;
    color?: keyof typeof LIGHT_COLORS;
  }>;
  xAxisKey: string;
}

export function TrendLineChart({
  data,
  lines,
  xAxisKey,
  loading,
  className,
}: TrendLineChartProps) {
  const { isDark } = useTheme();
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  if (loading) {
    return (
      <div className={`h-80 flex items-center justify-center ${className}`}>
        <div className="animate-pulse text-gray-400 dark:text-gray-600">
          Loading chart...
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320} className={className}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey={xAxisKey}
          stroke={colors.text}
          style={{ fontSize: '12px' }}
        />
        <YAxis stroke={colors.text} style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${colors.grid}`,
            borderRadius: '8px',
            color: colors.text,
          }}
        />
        <Legend wrapperStyle={{ color: colors.text }} />
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={colors[line.color || 'primary']}
            strokeWidth={2}
            dot={{ fill: colors[line.color || 'primary'], r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Bar Chart Component
interface ComparisonBarChartProps extends BaseChartProps {
  bars: Array<{
    dataKey: string;
    name: string;
    color?: keyof typeof LIGHT_COLORS;
  }>;
  xAxisKey: string;
}

export function ComparisonBarChart({
  data,
  bars,
  xAxisKey,
  loading,
  className,
}: ComparisonBarChartProps) {
  const { isDark } = useTheme();
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  if (loading) {
    return (
      <div className={`h-80 flex items-center justify-center ${className}`}>
        <div className="animate-pulse text-gray-400 dark:text-gray-600">
          Loading chart...
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320} className={className}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey={xAxisKey}
          stroke={colors.text}
          style={{ fontSize: '12px' }}
        />
        <YAxis stroke={colors.text} style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${colors.grid}`,
            borderRadius: '8px',
            color: colors.text,
          }}
        />
        <Legend wrapperStyle={{ color: colors.text }} />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={colors[bar.color || 'primary']}
            radius={[8, 8, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Pie Chart Component
interface DistributionPieChartProps extends BaseChartProps {
  dataKey: string;
  nameKey: string;
  colorScheme?: Array<keyof typeof LIGHT_COLORS>;
}

export function DistributionPieChart({
  data,
  dataKey,
  nameKey,
  colorScheme,
  loading,
  className,
}: DistributionPieChartProps) {
  const { isDark } = useTheme();
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const defaultScheme: Array<keyof typeof LIGHT_COLORS> = [
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
    'purple',
    'pink',
    'cyan',
  ];

  const scheme = colorScheme || defaultScheme;

  if (loading) {
    return (
      <div className={`h-80 flex items-center justify-center ${className}`}>
        <div className="animate-pulse text-gray-400 dark:text-gray-600">
          Loading chart...
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320} className={className}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) =>
            `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
          }
          labelLine={true}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[scheme[index % scheme.length]]}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${colors.grid}`,
            borderRadius: '8px',
            color: colors.text,
          }}
        />
        <Legend wrapperStyle={{ color: colors.text }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
