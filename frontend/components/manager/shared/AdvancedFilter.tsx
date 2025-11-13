'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, SortAsc, SortDesc, Download } from 'lucide-react';
import { cn } from '@/lib/manager/utils';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  searchPlaceholder?: string;
  statusOptions?: FilterOption[];
  sortOptions?: FilterOption[];
  showDateRange?: boolean;
  showExport?: boolean;
  customFilters?: React.ReactNode;
}

export interface FilterValues {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  dateFrom: string;
  dateTo: string;
  [key: string]: any;
}

interface AdvancedFilterProps {
  config: FilterConfig;
  onFilterChange: (filters: FilterValues) => void;
  onExport?: () => void;
  loading?: boolean;
}

export function AdvancedFilter({
  config,
  onFilterChange,
  onExport,
  loading = false,
}: AdvancedFilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    status: '',
    sortBy: config.sortOptions?.[0]?.value || '',
    sortOrder: 'desc',
    dateFrom: '',
    dateTo: '',
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSortOrder = () => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const clearFilters = () => {
    const clearedFilters: FilterValues = {
      search: '',
      status: '',
      sortBy: config.sortOptions?.[0]?.value || '',
      sortOrder: 'desc',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(clearedFilters);
  };

  const hasActiveFilters = 
    filters.search || 
    filters.status || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4 transition-colors">
      {/* Search and Quick Actions Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={config.searchPlaceholder || 'Search...'}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors',
              'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
              'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
              'focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            disabled={loading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all',
              'font-medium text-sm',
              showFilters
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600',
              hasActiveFilters && !showFilters && 'ring-2 ring-primary/20'
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {[filters.search, filters.status, filters.dateFrom, filters.dateTo]
                  .filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Export Button */}
          {config.showExport && onExport && (
            <button
              onClick={onExport}
              disabled={loading}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all',
                'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                'border-gray-300 dark:border-gray-600',
                'hover:bg-gray-50 dark:hover:bg-gray-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'font-medium text-sm'
              )}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            {config.statusOptions && config.statusOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border transition-colors',
                    'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
                    'text-gray-900 dark:text-white',
                    'focus:ring-2 focus:ring-primary/20 focus:border-primary'
                  )}
                >
                  <option value="">All Status</option>
                  {config.statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort By */}
            {config.sortOptions && config.sortOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg border transition-colors',
                      'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
                      'text-gray-900 dark:text-white',
                      'focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    )}
                  >
                    {config.sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={toggleSortOrder}
                    className={cn(
                      'px-3 py-2 rounded-lg border transition-colors',
                      'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
                      'text-gray-700 dark:text-gray-300',
                      'hover:bg-gray-50 dark:hover:bg-gray-600'
                    )}
                    title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {filters.sortOrder === 'asc' ? (
                      <SortAsc className="h-5 w-5" />
                    ) : (
                      <SortDesc className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Date Range */}
            {config.showDateRange && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className={cn(
                        'w-full pl-10 pr-3 py-2 rounded-lg border transition-colors',
                        'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
                        'text-gray-900 dark:text-white',
                        'focus:ring-2 focus:ring-primary/20 focus:border-primary'
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className={cn(
                        'w-full pl-10 pr-3 py-2 rounded-lg border transition-colors',
                        'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600',
                        'text-gray-900 dark:text-white',
                        'focus:ring-2 focus:ring-primary/20 focus:border-primary'
                      )}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Custom Filters */}
          {config.customFilters && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {config.customFilters}
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-2">
              <button
                onClick={clearFilters}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg',
                  'text-sm font-medium text-gray-600 dark:text-gray-400',
                  'hover:text-gray-900 dark:hover:text-white',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors'
                )}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
