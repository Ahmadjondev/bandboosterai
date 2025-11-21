'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  BookOpen, 
  ClipboardCheck, 
  Users, 
  LogOut,
  Menu,
  X,
  FileText
} from 'lucide-react';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and is a teacher
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'TEACHER') {
          router.push('/login');
          return;
        }
        setUser(parsedUser);
      } else {
        router.push('/login');
        return;
      }
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/teacher',
      icon: LayoutDashboard,
      current: pathname === '/teacher',
    },
    {
      name: 'My Exams',
      href: '/teacher/exams',
      icon: BookOpen,
      current: pathname?.startsWith('/teacher/exams'),
    },
    {
      name: 'Mock Tests',
      href: '/teacher/mock-tests',
      icon: FileText,
      current: pathname?.startsWith('/teacher/mock-tests'),
    },
    {
      name: 'Grading',
      href: '/teacher/grading',
      icon: ClipboardCheck,
      current: pathname === '/teacher/grading',
    },
    {
      name: 'Students',
      href: '/teacher/students',
      icon: Users,
      current: pathname === '/teacher/students',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        >
          {sidebarOpen ? (
            <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="h-10 w-10 bg-linear-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Teacher Panel</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">BandBooster</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    item.current
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                  {user?.first_name?.[0] || user?.username?.[0] || 'T'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.first_name || user?.username || 'Teacher'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {children}
      </div>
    </div>
  );
}
