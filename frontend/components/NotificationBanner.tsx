"use client";

import React from 'react';
import { useNotification, type Notification } from '@/lib/notification-context';
import { X, AlertTriangle, Info, CheckCircle } from 'lucide-react';

export function NotificationBanner() {
  const { notifications, dismissNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const { type, message } = notification;

  const styles = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-600 dark:text-red-400',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: Info,
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-600 dark:text-green-400',
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <div
      className={`
        ${style.bg} ${style.border} ${style.text}
        border rounded-lg shadow-lg p-4
        animate-in slide-in-from-right duration-300
        flex items-start gap-3
      `}
      role="alert"
    >
      <Icon className={`h-5 w-5 ${style.iconColor} shrink-0 mt-0.5`} />
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button
        onClick={onDismiss}
        className={`
          ${style.iconColor} hover:opacity-70 transition-opacity
          shrink-0 -mr-1 -mt-1
        `}
        aria-label="Dismiss notification"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
