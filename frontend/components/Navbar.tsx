'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { logoutUser } from '@/lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { getUserAttempts } from '@/lib/payments';
import type { User } from '@/types/auth';
import type { UserAttempts } from '@/types/payment';

interface NavbarProps {
  user: User | null;
  onMenuClick: () => void;
}

export function Navbar({ user, onMenuClick }: NavbarProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAttemptsDropdown, setShowAttemptsDropdown] = useState(false);
  const [attempts, setAttempts] = useState<UserAttempts | null>(null);

  useEffect(() => {
    if (user) {
      getUserAttempts()
        .then(setAttempts)
        .catch(console.error);
    }
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const totalAttempts = attempts 
    ? attempts.writing_attempts + attempts.speaking_attempts + attempts.reading_attempts + attempts.listening_attempts
    : 0;

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-4 py-2 md:px-6 md:py-3 h-[57px] md:h-[57px]">
        {/* Left side - Menu button */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo and title */}
          <div className="flex items-center gap-3">
          
            <div className="hidden lg:block">
            
            </div>
          </div>
        </div>

        {/* Right side - Actions & User */}
        <div className="flex items-center gap-3">
          {/* Attempts Display */}
          {user && attempts && (
            <div className="relative">
              <button
                onClick={() => setShowAttemptsDropdown(!showAttemptsDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="hidden sm:inline">{totalAttempts} Attempts</span>
                <span className="sm:hidden">{totalAttempts}</span>
              </button>

              {/* Attempts Dropdown */}
              {showAttemptsDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-purple-500 to-indigo-600">
                    <h3 className="font-semibold text-white">Your Attempts</h3>
                    <p className="text-sm text-white/80">Use attempts for premium content</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-500 rounded-lg text-white text-sm">✍️</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Writing</span>
                      </div>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{attempts.writing_attempts}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 flex items-center justify-center bg-purple-500 rounded-lg text-white text-sm">🎤</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Speaking</span>
                      </div>
                      <span className="font-bold text-purple-600 dark:text-purple-400">{attempts.speaking_attempts}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 flex items-center justify-center bg-emerald-500 rounded-lg text-white text-sm">📖</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reading</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{attempts.reading_attempts}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 flex items-center justify-center bg-amber-500 rounded-lg text-white text-sm">🎧</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Listening</span>
                      </div>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{attempts.listening_attempts}</span>
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setShowAttemptsDropdown(false);
                        router.push('/dashboard/pricing');
                      }}
                      className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm"
                    >
                      Get More Attempts
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Balance Display */}
          {user && user.balance !== undefined && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-linear-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{Number(user.balance).toLocaleString('en-US')} UZS</span>
            </div>
          )}

          {/* Teacher Room Button */}
          {user && user.role === 'TEACHER' && (
            <button
              onClick={() => router.push('/teacher')}
              className="hidden sm:flex items-center gap-2 px-4 py-1 rounded-md bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Teacher Room</span>
            </button>
          )}
          {/* Manager Room Button */}
          {user && user.role === 'MANAGER' && (
            <button
              onClick={() => router.push('/manager')}
              className="hidden sm:flex items-center gap-2 px-4 py-1 rounded-md bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Manager Room</span>
            </button>
          )}

          {/* Quick Actions */}
          {/* <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:scale-105 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>New Test</span>
          </button> */}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                </div>
                <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                  <p className="text-sm">No new notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role?.toLowerCase()}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => router.push('/dashboard/profile')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <span>👤</span>
                    <span>Profile</span>
                  </button>
                  {/* <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <span>⚙️</span>
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/help')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <span>❓</span>
                    <span>Help & Support</span>
                  </button> */}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
