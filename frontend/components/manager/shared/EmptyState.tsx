'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

interface EmptyStateProps {
  icon?: keyof typeof Icons;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'Inbox',
  title = 'No data found',
  description = '',
  actionText = '',
  onAction,
}: EmptyStateProps) {
  const Icon = Icons[icon] as LucideIcon;

  return (
    <div className="text-center py-12">
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400" />}
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {actionText && onAction && (
        <div className="mt-6">
          <button
            onClick={onAction}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
}
