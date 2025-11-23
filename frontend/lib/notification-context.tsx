"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setGlobalNotificationHandler } from './api-client';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // in milliseconds, undefined means persistent
}

export interface ServerError {
  statusCode: number;
  message?: string;
  timestamp: number;
}

interface NotificationContextType {
  notifications: Notification[];
  serverError: ServerError | null;
  showNotification: (message: string, type: NotificationType, duration?: number) => void;
  showServerError: (statusCode?: number) => void;
  dismissServerError: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SERVER_ERROR_THRESHOLD = 2; // Show full page after 2 errors in 30 seconds
const SERVER_ERROR_WINDOW = 30000; // 30 seconds

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const [errorHistory, setErrorHistory] = useState<number[]>([]); // timestamps

  const showNotification = useCallback((
    message: string,
    type: NotificationType = 'info',
    duration?: number
  ) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, type, message, duration };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss if duration is set
    if (duration) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
  }, []);

  const showServerError = useCallback((statusCode?: number) => {
    const now = Date.now();
    
    // Clean up old errors outside the window
    const recentErrors = errorHistory.filter(ts => now - ts < SERVER_ERROR_WINDOW);
    const newHistory = [...recentErrors, now];
    setErrorHistory(newHistory);
    
    // If too many errors in short time, show full error page
    if (newHistory.length >= SERVER_ERROR_THRESHOLD) {
      const message = statusCode === 503
        ? 'The service is temporarily unavailable. Please try again in a few moments.'
        : statusCode === 0
        ? 'Unable to connect to the server. Please check your internet connection.'
        : 'The server is temporarily unavailable.';
      
      setServerError({
        statusCode: statusCode || 500,
        message,
        timestamp: now,
      });
      setErrorHistory([]); // Reset after showing page
    } else {
      // Show banner for first error
      const message = statusCode === 503
        ? 'The server is temporarily unavailable. Please try again in a few moments.'
        : statusCode === 0
        ? 'Connection lost. Trying to reconnect...'
        : 'The server is temporarily unavailable.';

      showNotification(message, 'error', 10000); // Auto-dismiss after 10s
    }
  }, [errorHistory, showNotification]);

  const dismissServerError = useCallback(() => {
    setServerError(null);
    setErrorHistory([]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Register the server error handler with the API client on mount
  useEffect(() => {
    setGlobalNotificationHandler(showServerError);
    
    // Cleanup on unmount
    return () => {
      setGlobalNotificationHandler(null);
    };
  }, [showServerError]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        serverError,
        showNotification,
        showServerError,
        dismissServerError,
        dismissNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
