'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { getUserAttempts } from '@/lib/payments';
import type { User } from '@/types/auth';
import type { UserAttempts } from '@/types/payment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faBolt,
  faWallet,
  faBell,
  faUser,
  faRightFromBracket,
  faChalkboardTeacher,
  faPenNib,
  faMicrophone,
  faBook,
  faHeadphones,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
  user: User | null;
  onMenuClick: () => void;
}

export function Navbar({ user, onMenuClick }: NavbarProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAttemptsDropdown, setShowAttemptsDropdown] = useState(false);
  const [attempts, setAttempts] = useState<UserAttempts | null>(null);

  // Refs for click-outside handling
  const userMenuRef = useRef<HTMLDivElement>(null);
  const attemptsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      getUserAttempts()
        .then(setAttempts)
        .catch(console.error);
    }
  }, [user]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (attemptsRef.current && !attemptsRef.current.contains(event.target as Node)) {
        setShowAttemptsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const totalAttempts = attempts 
    ? attempts.writing_attempts + attempts.speaking_attempts + attempts.reading_attempts + attempts.listening_attempts
    : 0;

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-3 py-2 h-14">
        {/* Left side - Menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
        </button>

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* Right side - Actions & User */}
        <div className="flex items-center gap-2">
          {/* Attempts Display */}
          {user && attempts && (
            <div className="relative" ref={attemptsRef}>
              <button
                onClick={() => setShowAttemptsDropdown(!showAttemptsDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <FontAwesomeIcon icon={faBolt} className="w-3.5 h-3.5" />
                <span>{totalAttempts}</span>
                <FontAwesomeIcon icon={faChevronDown} className="w-2.5 h-2.5 opacity-70" />
              </button>

              {/* Attempts Dropdown */}
              {showAttemptsDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-purple-600">
                    <p className="font-medium text-white text-sm">Your Attempts</p>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faPenNib} className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Writing</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{attempts.writing_attempts}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faMicrophone} className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Speaking</span>
                      </div>
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{attempts.speaking_attempts}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faBook} className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Reading</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{attempts.reading_attempts}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faHeadphones} className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Listening</span>
                      </div>
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{attempts.listening_attempts}</span>
                    </div>
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowAttemptsDropdown(false);
                        router.push('/dashboard/pricing');
                      }}
                      className="w-full py-2 px-3 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
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
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium">
              <FontAwesomeIcon icon={faWallet} className="w-3.5 h-3.5" />
              <span>{Number(user.balance).toLocaleString('en-US')} UZS</span>
            </div>
          )}

          {/* Teacher/Manager Room Button */}
          {user && (user.role === 'TEACHER' || user.role === 'MANAGER') && (
            <button
              onClick={() => router.push(user.role === 'TEACHER' ? '/teacher' : '/manager')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 transition-colors"
            >
              <FontAwesomeIcon icon={faChalkboardTeacher} className="w-3.5 h-3.5" />
              <span>{user.role === 'TEACHER' ? 'Teacher' : 'Manager'}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <FontAwesomeIcon icon={faChevronDown} className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400 hidden sm:block" />
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/dashboard/profile');
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-gray-400" />
                    <span>Profile</span>
                  </button>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
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
