'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/manager/auth-client';
import { ThemeProvider } from '@/lib/manager/theme-context';
import { ManagerHeader } from './ManagerHeader';
import { ManagerSidebar } from './ManagerSidebar';
import { ToastProvider } from '../shared';
import { LoadingSpinner } from '../shared';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

export function ManagerLayout({ children }: ManagerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/manager/login') {
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }

    // Check authentication
    const checkAuth = () => {
      const authenticated = authClient.isAuthenticated();
      const isManager = authClient.isManager();

      if (!authenticated || !isManager) {
        // Only redirect if not already redirecting
        if (pathname !== '/manager/login') {
          router.replace('/manager/login');
        }
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-linear-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-950">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Don't wrap login page with layout
  if (pathname === '/manager/login') {
    return <>{children}</>;
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
        <ManagerSidebar sidebarOpen={sidebarOpen} onCloseSidebar={closeSidebar} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ManagerHeader sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
