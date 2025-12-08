'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Headphones,
  Edit3,
  Mic,
  GraduationCap,
  Calendar,
  Settings,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  Tag,
  Library,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/manager/utils';

interface ManagerSidebarProps {
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/manager',
    icon: LayoutDashboard,
  },
  {
    label: 'Students',
    href: '/manager/students',
    icon: Users,
    badge: 'NEW',
  },
  {
    label: 'Books',
    href: '/manager/books',
    icon: BookOpen,
  },
  {
    label: 'AI Generator',
    href: '/manager/ai-generator',
    icon: Sparkles,
    badge: 'AI',
  },
  {
    label: 'Test Content',
    href: '#',
    icon: FileText,
    children: [
      { label: 'Reading', href: '/manager/reading', icon: BookOpen },
      { label: 'Listening', href: '/manager/listening', icon: Headphones },
      { label: 'Writing', href: '/manager/writing', icon: Edit3 },
      { label: 'Speaking', href: '/manager/speaking', icon: Mic },
    ],
  },
  {
    label: 'Section Practices',
    href: '#',
    icon: Library,
    children: [
      { label: 'Listening', href: '/manager/practices/listening', icon: Headphones },
      { label: 'Reading', href: '/manager/practices/reading', icon: BookOpen },
      { label: 'Writing', href: '/manager/practices/writing', icon: Edit3 },
      { label: 'Speaking', href: '/manager/practices/speaking', icon: Mic },
    ],
  },
  {
    label: 'Mock Tests',
    href: '/manager/mock-tests',
    icon: GraduationCap,
  },
  {
    label: 'Scheduled Exams',
    href: '/manager/exams',
    icon: Calendar,
  },
  {
    label: 'Promo Codes',
    href: '/manager/promo-codes',
    icon: Tag,
  },
  {
    label: 'AI Config',
    href: '/manager/ai-config',
    icon: Brain,
    badge: 'AI',
  },
  {
    label: 'Settings',
    href: '/manager/settings',
    icon: Settings,
  },
];

export function ManagerSidebar({
  sidebarOpen,
  onCloseSidebar,
}: ManagerSidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Test Content': true,
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const isActive = (href: string) => {
    if (href === '/manager') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const NavLink = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = hasChildren && expandedSections[item.label];
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleSection(item.label)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'group'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {/* Children */}
          {isExpanded && (
            <div className="mt-1 space-y-1 ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              {item.children!.map((child) => (
                <NavLink key={child.href} item={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        onClick={onCloseSidebar}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150',
          'text-sm font-medium',
          active
            ? 'bg-primary text-gray-700 dark:text-white shadow-xs shadow-primary/30 border dark:border-amber-50 border-gray-700'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
          'group'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', active && 'dark:text-white text-gray-700')} />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-bold',
            active
              ? 'bg-white/20 text-white'
              : 'bg-primary/10 text-primary dark:bg-primary/20'
          )}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity xl:hidden"
          onClick={onCloseSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 flex flex-col',
          'bg-white dark:bg-gray-900',
          'border-r border-gray-200 dark:border-gray-800',
          'shadow-xl',
          'transition-transform duration-300 ease-in-out',
          'xl:static xl:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/manager"
            className="flex items-center gap-3 group"
            onClick={onCloseSidebar}
          >
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">
                Manager
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                IELTS System
              </p>
            </div>
          </Link>

          {/* Close button (mobile only) */}
          <button
            onClick={onCloseSidebar}
            className="xl:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {navigation.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20">
            <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">
              IELTS Manager v2.0
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Full system control
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
