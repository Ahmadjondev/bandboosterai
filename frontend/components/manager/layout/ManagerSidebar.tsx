'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Users,
  BookOpen,
  Headphones,
  Edit3,
  Mic,
  Package,
  Calendar,
  Layers,
  Cpu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/manager/utils';

interface ManagerSidebarProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

export function ManagerSidebar({
  sidebarOpen,
  onCloseSidebar,
}: ManagerSidebarProps) {
  const pathname = usePathname();
  const [sections, setSections] = useState({
    overview: true,
    users: true,
    tests: true,
    mockTests: true,
  });

  const toggleSection = (section: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <div className="h-screen">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm transition-opacity xl:hidden"
          onClick={onCloseSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'h-screen fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white shadow-2xl border-r border-gray-200 transition-transform duration-300 xl:static xl:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="navigation"
        aria-label="Manager navigation"
      >
        {/* Logo Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-gray-200 bg-linear-to-r from-primary/5 to-transparent">
          <Link
            href="/manager"
            className="flex items-center gap-3 group flex-1"
            onClick={onCloseSidebar}
          >
            <div className="relative h-10 w-10 rounded-xl flex items-center justify-center bg-linear-to-br from-primary via-primary to-primary/80 shadow-lg shadow-primary/20 ring-2 ring-primary/30 group-hover:ring-primary/50 transition-all duration-300 group-hover:scale-110">
              <Activity className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-gray-900 group-hover:text-primary transition-colors">
                Manager
              </span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Admin Panel
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onCloseSidebar}
            className="xl:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
          {/* Overview Section */}
          <div>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-400"></span>
              Overview
            </p>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/manager"
                  onClick={onCloseSidebar}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                    isActive('/manager') && !pathname.includes('/')
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                      isActive('/manager') && !pathname.includes('/')
                        ? 'bg-primary/20'
                        : 'bg-gray-100 group-hover:bg-primary/10'
                    )}
                  >
                    <Activity
                      className={cn(
                        'w-4 h-4',
                        isActive('/manager') && !pathname.includes('/')
                          ? 'text-primary'
                          : 'text-gray-500'
                      )}
                    />
                  </div>
                  <span>Dashboard</span>
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Users Section */}
          <div>
            <button
              onClick={() => toggleSection('users')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-gray-600 transition-colors"></span>
                <Users className="w-3.5 h-3.5" />
                Users
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-300',
                  sections.users ? 'rotate-180' : ''
                )}
              />
            </button>
            {sections.users && (
              <ul className="mt-1 space-y-0.5 pl-3 border-l border-gray-200">
                <li>
                  <Link
                    href="/manager/students"
                    onClick={onCloseSidebar}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                      isActive('/manager/students')
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        isActive('/manager/students')
                          ? 'bg-primary/20'
                          : 'bg-gray-100 group-hover:bg-primary/10'
                      )}
                    >
                      <Users
                        className={cn(
                          'w-4 h-4',
                          isActive('/manager/students')
                            ? 'text-primary'
                            : 'text-gray-500'
                        )}
                      />
                    </div>
                    <span>Students</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* Test Management Section */}
          <div>
            <button
              onClick={() => toggleSection('tests')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-gray-600 transition-colors"></span>
                <Layers className="w-3.5 h-3.5" />
                Test Management
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-300',
                  sections.tests ? 'rotate-180' : ''
                )}
              />
            </button>
            {sections.tests && (
              <ul className="mt-1 space-y-0.5 pl-3 border-l border-gray-200">
                <li>
                  <Link
                    href="/manager/reading-tests"
                    onClick={onCloseSidebar}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                      isActive('/manager/reading-tests')
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        isActive('/manager/reading-tests')
                          ? 'bg-primary/20'
                          : 'bg-gray-100 group-hover:bg-primary/10'
                      )}
                    >
                      <BookOpen
                        className={cn(
                          'w-4 h-4',
                          isActive('/manager/reading-tests')
                            ? 'text-primary'
                            : 'text-gray-500'
                        )}
                      />
                    </div>
                    <span>Reading</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/manager/listening-tests"
                    onClick={onCloseSidebar}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                      isActive('/manager/listening-tests')
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        isActive('/manager/listening-tests')
                          ? 'bg-primary/20'
                          : 'bg-gray-100 group-hover:bg-primary/10'
                      )}
                    >
                      <Headphones
                        className={cn(
                          'w-4 h-4',
                          isActive('/manager/listening-tests')
                            ? 'text-primary'
                            : 'text-gray-500'
                        )}
                      />
                    </div>
                    <span>Listening</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/manager/writing-tasks"
                    onClick={onCloseSidebar}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                      isActive('/manager/writing-tasks')
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        isActive('/manager/writing-tasks')
                          ? 'bg-primary/20'
                          : 'bg-gray-100 group-hover:bg-primary/10'
                      )}
                    >
                      <Edit3
                        className={cn(
                          'w-4 h-4',
                          isActive('/manager/writing-tasks')
                            ? 'text-primary'
                            : 'text-gray-500'
                        )}
                      />
                    </div>
                    <span>Writing</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/manager/speaking-topics"
                    onClick={onCloseSidebar}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                      isActive('/manager/speaking-topics')
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        isActive('/manager/speaking-topics')
                          ? 'bg-primary/20'
                          : 'bg-gray-100 group-hover:bg-primary/10'
                      )}
                    >
                      <Mic
                        className={cn(
                          'w-4 h-4',
                          isActive('/manager/speaking-topics')
                            ? 'text-primary'
                            : 'text-gray-500'
                        )}
                      />
                    </div>
                    <span>Speaking</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li className="mt-3 pt-3 border-t border-gray-200">
                  <Link
                    href="/manager/ai-generator"
                    onClick={onCloseSidebar}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                      isActive('/manager/ai-generator')
                        ? 'bg-linear-to-r from-purple-50 to-indigo-50 text-purple-700 ring-2 ring-purple-200'
                        : 'text-gray-700 hover:bg-linear-to-r hover:from-purple-50/50 hover:to-indigo-50/50 hover:text-purple-600'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-all relative overflow-hidden',
                        isActive('/manager/ai-generator')
                          ? 'bg-linear-to-br from-purple-100 to-indigo-100'
                          : 'bg-gray-100 group-hover:bg-linear-to-br group-hover:from-purple-50 group-hover:to-indigo-50'
                      )}
                    >
                      <Cpu
                        className={cn(
                          'w-4 h-4 relative z-10',
                          isActive('/manager/ai-generator')
                            ? 'text-purple-600'
                            : 'text-gray-500 group-hover:text-purple-500'
                        )}
                      />
                      {isActive('/manager/ai-generator') && (
                        <div className="absolute inset-0 bg-linear-to-br from-purple-400/10 to-indigo-400/10 animate-pulse"></div>
                      )}
                    </div>
                    <span className="flex items-center gap-1.5">
                      AI Generator
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase tracking-wide">
                        New
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* Mock Test Builder Section */}
          <div>
            <button
              onClick={() => toggleSection('mockTests')}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-gray-600 transition-colors"></span>
                <Package className="w-3.5 h-3.5" />
                Mock Test Builder
              </span>
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-300',
                  sections.mockTests ? 'rotate-180' : ''
                )}
              />
            </button>
            {sections.mockTests && (
              <ul className="mt-1 space-y-0.5 pl-3 border-l border-gray-200">
                <li>
                  <Link
                    href="/manager/mock-tests"
                    onClick={onCloseSidebar}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                      isActive('/manager/mock-tests')
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        isActive('/manager/mock-tests')
                          ? 'bg-primary/20'
                          : 'bg-gray-100 group-hover:bg-primary/10'
                      )}
                    >
                      <Package
                        className={cn(
                          'w-4 h-4',
                          isActive('/manager/mock-tests')
                            ? 'text-primary'
                            : 'text-gray-500'
                        )}
                      />
                    </div>
                    <span>Mock Tests</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/manager/exams"
                    onClick={onCloseSidebar}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
                      isActive('/manager/exams')
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                        isActive('/manager/exams')
                          ? 'bg-primary/20'
                          : 'bg-gray-100 group-hover:bg-primary/10'
                      )}
                    >
                      <Calendar
                        className={cn(
                          'w-4 h-4',
                          isActive('/manager/exams')
                            ? 'text-primary'
                            : 'text-gray-500'
                        )}
                      />
                    </div>
                    <span>Scheduled Exams</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </nav>
      </aside>
    </div>
  );
}
