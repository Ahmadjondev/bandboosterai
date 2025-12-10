"use client";

import Link from "next/link";
import { 
  Play, 
  BookOpen, 
  PenTool, 
  History, 
  BarChart2, 
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Play;
  gradient: string;
  iconBg: string;
}

const quickActions: QuickActionItem[] = [
  {
    id: "full-test",
    title: "Full Mock Test",
    description: "Take a complete IELTS simulation",
    href: "/dashboard/cd-exam",
    icon: Play,
    gradient: "from-blue-500 to-indigo-600",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: "practice-books",
    title: "Practice Books",
    description: "Study with Cambridge materials",
    href: "/dashboard/books",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    id: "writing-check",
    title: "Writing Check",
    description: "Get AI feedback on your essays",
    href: "/dashboard/writing-check",
    icon: PenTool,
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
  },
  {
    id: "my-tests",
    title: "Test History",
    description: "Review your past attempts",
    href: "/dashboard/my-tests",
    icon: History,
    gradient: "from-amber-500 to-orange-600",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
  },
];

interface QuickActionsProps {
  hasActiveAttempt?: boolean;
  activeAttemptId?: number;
}

export default function QuickActions({ hasActiveAttempt, activeAttemptId }: QuickActionsProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Quick Actions
        </h2>
        <Link 
          href="/dashboard/resources"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          All Resources <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Resume Test Banner (if active attempt exists) */}
      {hasActiveAttempt && activeAttemptId && (
        <Link
          href={`/exam/${activeAttemptId}`}
          className="block bg-linear-to-r from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">Continue Your Test</p>
                <p className="text-sm text-white/80">You have an unfinished exam</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="group relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all"
          >
            <div className={`inline-flex p-2.5 rounded-xl ${action.iconBg} mb-3`}>
              <action.icon className={`w-5 h-5 bg-linear-to-br ${action.gradient} bg-clip-text text-transparent`} style={{ color: action.gradient.includes('blue') ? '#3b82f6' : action.gradient.includes('emerald') ? '#10b981' : action.gradient.includes('violet') ? '#8b5cf6' : '#f59e0b' }} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {action.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {action.description}
            </p>
            {/* Hover indicator */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* Additional Features Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/analytics"
          className="flex items-center gap-4 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
        >
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <BarChart2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Detailed Analytics
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Deep dive into your performance
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
        </Link>

        <Link
          href="/dashboard/teacher-exams"
          className="flex items-center gap-4 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-all group"
        >
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Teacher Exams
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Assigned tests from teachers
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
