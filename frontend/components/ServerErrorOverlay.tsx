"use client";

import React from 'react';
import { useNotification } from '@/lib/notification-context';
import { ServerErrorPage } from './ServerErrorPage';

export function ServerErrorOverlay() {
  const { serverError, dismissServerError } = useNotification();

  if (!serverError) return null;

  const handleRetry = () => {
    dismissServerError();
    // Reload the page to retry
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-9999 bg-white dark:bg-gray-900">
      <ServerErrorPage
        statusCode={serverError.statusCode}
        message={serverError.message}
        onRetry={handleRetry}
      />
    </div>
  );
}
