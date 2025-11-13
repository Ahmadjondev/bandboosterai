'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/manager/utils';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Alert({
  type = 'info',
  message,
  dismissible = false,
  onDismiss,
}: AlertProps) {
  const [show, setShow] = React.useState(true);

  const handleDismiss = () => {
    setShow(false);
    onDismiss?.();
  };

  if (!show) return null;

  const config = {
    success: {
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-800 dark:text-green-300',
      Icon: CheckCircle,
    },
    error: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-800 dark:text-red-300',
      Icon: XCircle,
    },
    warning: {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-800 dark:text-yellow-300',
      Icon: AlertTriangle,
    },
    info: {
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-800 dark:text-blue-300',
      Icon: Info,
    },
  };

  const { bgColor, textColor, Icon } = config[type];

  return (
    <div className={cn('rounded-md p-4 mb-4 border transition-colors', bgColor, textColor, 
      type === 'success' ? 'border-green-200 dark:border-green-800' : 
      type === 'error' ? 'border-red-200 dark:border-red-800' :
      type === 'warning' ? 'border-yellow-200 dark:border-yellow-800' :
      'border-blue-200 dark:border-blue-800'
    )}>
      <div className="flex">
        <div className="shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className="-mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex focus:outline-none hover:opacity-70 transition-opacity"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
