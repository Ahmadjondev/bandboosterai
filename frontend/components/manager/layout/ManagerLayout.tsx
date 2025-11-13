'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/manager/auth-client';
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
      <div className="flex items-center justify-center h-screen bg-linear-to-br from-slate-50 via-slate-50 to-slate-100">
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
      <div className="flex h-screen overflow-hidden bg-linear-to-br from-slate-50 via-slate-50 to-slate-100">
        <ManagerSidebar sidebarOpen={sidebarOpen} onCloseSidebar={closeSidebar} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ManagerHeader sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
