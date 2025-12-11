'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import { useAuth } from '@/components/AuthProvider';

interface PracticeClientLayoutProps {
  children: React.ReactNode;
}

export function PracticeClientLayout({ children }: PracticeClientLayoutProps) {
  const { user, loading: isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar - persists across page navigations */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* Main content area */}
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        {/* Navbar - persists across page navigations */}
        <Navbar user={user} onMenuClick={toggleSidebar} />

        {/* Email Verification Banner */}
        {user && user.is_verified === false && (
          <div className="px-4 pt-4">
            <EmailVerificationBanner email={user.email} />
          </div>
        )}

        {/* Page content - only this changes on navigation */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
