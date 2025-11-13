'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { classNames } from '@/lib/utils';

interface SidebarItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string;
  comingSoon?: boolean;
  isCollapsed: boolean;
}

function SidebarItem({ href, icon, label, badge, comingSoon, isCollapsed }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (comingSoon) {
    return (
      <div className="relative group">
        <div className={classNames(
          'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-not-allowed',
          'text-slate-400 dark:text-slate-600',
          isCollapsed && 'justify-center px-2'
        )}>
          <span className="text-xl opacity-50">{icon}</span>
          {!isCollapsed && (
            <>
              <span className="font-medium opacity-50">{label}</span>
              <span className="ml-auto text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Soon
              </span>
            </>
          )}
        </div>
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
            {label}
            <span className="ml-2 text-xs opacity-70">(Soon)</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={classNames(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group',
        isActive
          ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <span className="text-xl">{icon}</span>
      {!isCollapsed && (
        <>
          <span className="font-medium">{label}</span>
          {badge && (
            <span className={classNames(
              'ml-auto text-xs px-2 py-1 rounded-full font-semibold',
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            )}>
              {badge}
            </span>
          )}
        </>
      )}
      {isActive && !isCollapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
      )}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {label}
          {badge && <span className="ml-2 text-xs opacity-70">{badge}</span>}
        </div>
      )}
    </Link>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const menuItems: Array<{
    section: string;
    items: Array<{
      href: string;
      icon: string;
      label: string;
      badge?: string;
      comingSoon?: boolean;
    }>;
  }> = [
    { section: 'Main', items: [
      { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
      { href: '/dashboard/cd-exam', icon: '📝', label: 'CD IELTS Exam', badge: 'NEW' },
      { href: '/dashboard/books', icon: '📚', label: 'Practice Books', badge: 'NEW' },
    ]},
    { section: 'Tests', items: [
      { href: '/dashboard/my-tests', icon: '📊', label: 'My Tests' },
    ]},
    { section: 'Tools', items: [
      { href: '/dashboard/analytics', icon: '📈', label: 'Analytics', comingSoon: true },
      { href: '/dashboard/planner', icon: '📅', label: 'Study Planner', comingSoon: true },
      { href: '/dashboard/leaderboard', icon: '🏆', label: 'Leaderboard' },
      { href: '/dashboard/resources', icon: '�', label: 'Study Resources' },
    ]},
    { section: 'Account', items: [
      { href: '/dashboard/profile', icon: '👤', label: 'Profile' },
    ]},
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={classNames(
          'fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 ease-in-out',
          'flex flex-col',
          isCollapsed ? 'w-20' : 'w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={classNames(
          'p-6 border-b border-slate-200 dark:border-slate-800 flex items-center',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image 
                src="/logo.svg" 
                alt="BandBooster Logo" 
                width={40} 
                height={40}
                className="w-10 h-10"
              />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  BandBooster
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Exam Portal</p>
              </div>
            </Link>
          )}
          
          {isCollapsed && (
            <Link href="/dashboard" className="flex items-center justify-center">
              <Image 
                src="/logo.svg" 
                alt="BandBooster Logo" 
                width={40} 
                height={40}
                className="w-10 h-10"
              />
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {menuItems.map((section) => (
            <div key={section.section}>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-4">
                  {section.section}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                    comingSoon={item.comingSoon}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          {/* Collapse button - desktop only */}
          <button
            onClick={onToggleCollapse}
            className={classNames(
              'hidden lg:flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200',
              'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={classNames('w-5 h-5 transition-transform', isCollapsed && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!isCollapsed && <span className="font-medium">Collapse Sidebar</span>}
          </button>

          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className={classNames(
              'lg:hidden flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200',
              'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium">Close Menu</span>
          </button>
        </div>

        {/* Progress Card */}
        {/* {!isCollapsed && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Your Progress</p>
                  <p className="text-xs opacity-90">Keep it up!</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="opacity-90">Tests Taken</span>
                <span className="font-bold">0</span>
              </div>
            </div>
          </div>
        )} */}
      </aside>
    </>
  );
}
