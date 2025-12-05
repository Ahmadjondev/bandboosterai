'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { authClient } from '@/lib/manager/auth-client';
import { ThemeToggle } from '@/components/manager/shared/ThemeToggle';
import { cn } from '@/lib/manager/utils';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function ManagerHeader({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get user info from authClient
    const user = authClient.getCurrentUser();
    if (user) {
      setUserInfo({
        name: user.first_name || user.username,
        email: user.email,
        role: user.role === 'MANAGER' ? 'Super Admin' : 'Manager',
      });
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showUserMenu && !showNotifications) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (showNotifications && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };

    // Use setTimeout to avoid the click that opened the dropdown from immediately closing it
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu, showNotifications]);

  const handleLogout = async () => {
    await authClient.logout();
    router.push('/manager/login');
  };

  if (!userInfo) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 backdrop-blur-xl shadow-sm transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left side - Menu & Logo */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={onToggleSidebar}
              className={cn(
                'xl:hidden p-2 rounded-lg transition-all duration-200',
                'text-gray-600 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-primary/20'
              )}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Brand - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  Manager Panel
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  IELTS Mock System
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  'relative p-2 rounded-lg transition-all duration-200',
                  'text-gray-600 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No new notifications
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {notifications.map((notification, index) => (
                          <li
                            key={index}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {notification.message}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
                aria-label="User menu"
              >
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center">
                  <span className="text-sm font-medium dark:text-white text-gray-700">
                    {userInfo.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {userInfo.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {userInfo.role}
                  </p>
                </div>
                <ChevronDown className="hidden md:block h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {userInfo.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {userInfo.email}
                    </p>
                    <span className="inline-flex mt-2 items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-400">
                      {userInfo.role}
                    </span>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/manager/profile');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/manager/settings');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                  </div>

                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
