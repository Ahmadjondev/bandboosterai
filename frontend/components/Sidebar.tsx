'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { classNames } from '@/lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faHouse,
  faChartLine,
  faCalendarDays,
  faTrophy,
  faChartBar,
  faFileLines,
  faGraduationCap,
  faBook,
  faHeadphones,
  faBookOpen,
  faPenNib,
  faMicrophone,
  faGem,
  faUser,
  faStar,
} from '@fortawesome/free-solid-svg-icons';

interface SidebarItemProps {
  href: string;
  icon: IconDefinition;
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
        <div
          className={classNames(
            'flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 cursor-not-allowed',
            'text-slate-400 dark:text-slate-600',
            isCollapsed && 'justify-center px-2'
          )}
          onClick={(e) => {
            // Prevent parent handlers from toggling sidebar when collapsed
            if (isCollapsed) e.stopPropagation();
          }}
        >
          <FontAwesomeIcon icon={icon} className="w-5 h-5 opacity-50" />
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
      prefetch={true}
      onClick={(e) => {
        // When the sidebar is collapsed, stop propagation so parent layout
        // click handlers (which might open/expand the sidebar) don't run.
        if (isCollapsed) e.stopPropagation();
      }}
      onMouseDown={(e) => {
        if (isCollapsed) e.stopPropagation();
      }}
      onKeyDown={(e) => {
        // Prevent parent key handlers from toggling collapse when using keyboard
        if (isCollapsed && (e.key === 'Enter' || e.key === ' ')) {
          e.stopPropagation();
        }
      }}
      className={classNames(
        'flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 relative group',
        isActive
          ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white '
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <FontAwesomeIcon icon={icon} className="w-5 h-5" />

      {!isCollapsed && (
        <>
          <span className="font-medium">{label}</span>
          {badge && (
            <span
              className={classNames(
                'ml-auto text-xs px-2 py-1 rounded-full font-semibold',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              )}
            >
              {badge}
            </span>
          )}
        </>
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
      icon: IconDefinition;
      label: string;
      badge?: string;
      comingSoon?: boolean;
    }>;
  }> = [
    {
      section: 'Main',
      items: [
        { href: '/dashboard', icon: faHouse, label: 'Dashboard' },
        { href: '/dashboard/analytics', icon: faChartLine, label: 'Analytics' },
        { href: '/dashboard/planner', icon: faCalendarDays, label: 'Study Planner', comingSoon: true },
        { href: '/dashboard/leaderboard', icon: faTrophy, label: 'Leaderboard' },
        { href: '/dashboard/my-tests', icon: faChartBar, label: 'My Tests' },
      ]
    },
    {
      section: 'IELTS Exams',
      items: [
        { href: '/dashboard/cd-exam', icon: faFileLines, label: 'CD IELTS Exam'},
        { href: '/dashboard/teacher-exams', icon: faGraduationCap, label: 'Exams', badge: 'NEW' }
      ]
    },
    {
      section: 'Practice',
      items: [
        { href: '/dashboard/books', icon: faBook, label: 'Practice Books', badge: 'NEW' },
        { href: '/practice/listening', icon: faHeadphones, label: 'Listening' },
        { href: '/practice/reading', icon: faBookOpen, label: 'Reading' },
        { href: '/practice/writing', icon: faPenNib, label: 'Writing' },
        { href: '/practice/speaking', icon: faMicrophone, label: 'Speaking' },
        { href: '/dashboard/resources', icon: faStar, label: 'Study Resources' }
      ]
    },
    {
      section: 'Account',
      items: [
        { href: '/dashboard/pricing', icon: faGem, label: 'Premium Plans', badge: 'PRO' },
        { href: '/dashboard/profile', icon: faUser, label: 'Profile' }
      ]
    }
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={classNames(
          'fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 ease-in-out',
          'flex flex-col',
          isCollapsed ? 'w-20' : 'w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',

          // ✅ Fix horizontal scroll
          isCollapsed && 'overflow-x-hidden'
        )}
      >
        {/* Logo */}
        <div
          className={classNames(
            'px-4 py-2 md:px-6 md:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center h-[57px] md:h-[57px]',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image src="/logo.png" alt="BandBooster Logo" width={40} height={40} />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  BandBooster
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Exam Portal</p>
              </div>
            </Link>
          )}

          {isCollapsed && (
            <Link href="/dashboard">
              <Image src="/logo.png" alt="BandBooster Logo" width={40} height={40} />
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={classNames(
            'flex-1 p-3 md:p-4 space-y-6 overflow-y-auto',
            isCollapsed && 'overflow-x-hidden' // 🔥 Key fix
          )}
        >
          {menuItems.map((section) => (
            <div key={section.section}>
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 px-4">
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
        {/* Bottom Controls 
        <div className="px-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onToggleCollapse}
            className={classNames(
              'hidden lg:flex items-center gap-3 w-full px-4 py-2 rounded-xl transition-all duration-200',
              'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              isCollapsed && 'justify-center'
            )}
          >
            <svg
              className={classNames(
                'w-5 h-5 transition-transform',
                isCollapsed && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!isCollapsed && <span className="font-medium">Collapse Sidebar</span>}
          </button>

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
        </div> */}
      </aside>
    </>
  );
}
