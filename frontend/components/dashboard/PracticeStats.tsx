"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Headphones, 
  BookOpen, 
  PenTool, 
  Mic, 
  ArrowRight, 
  Zap, 
  Trophy,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { getUserStats } from "@/lib/api/section-practice";
import type { UserStatsResponse, SectionStats } from "@/types/section-practice";

interface PracticeStatsProps {
  className?: string;
}

interface SectionCardProps {
  section: SectionStats;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

function SectionCard({ section, icon, color, bgColor, borderColor }: SectionCardProps) {
  // Use completed_attempts as the metric for progress
  const progressPercent = section.total_practices > 0 
    ? Math.min((section.completed_attempts / section.total_practices) * 100, 100)
    : 0;

  return (
    <Link
      href={`/practice?type=${section.section_type}`}
      className={`group block p-4 rounded-xl border ${borderColor} ${bgColor} hover:shadow-md transition-all`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 ${bgColor} rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
            {section.section_type.charAt(0) + section.section_type.slice(1).toLowerCase()}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {section.completed_attempts} of {section.total_practices} completed
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 ${color} opacity-0 group-hover:opacity-100 transition-opacity`} />
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            section.section_type === 'LISTENING' ? 'bg-blue-500' :
            section.section_type === 'READING' ? 'bg-emerald-500' :
            section.section_type === 'WRITING' ? 'bg-purple-500' : 'bg-orange-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Score Badge */}
      {section.best_score && (
        <div className="mt-3 flex items-center gap-1.5">
          <Trophy className="w-3 h-3 text-amber-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Best: <span className="font-semibold text-gray-900 dark:text-white">{section.best_score.toFixed(1)}</span>
          </span>
        </div>
      )}
    </Link>
  );
}

export default function PracticeStats({ className = "" }: PracticeStatsProps) {
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getUserStats();
        setStats(data);
      } catch (err) {
        setError("Failed to load practice stats");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const getSectionConfig = (sectionType: string) => {
    switch (sectionType) {
      case 'LISTENING':
        return {
          icon: <Headphones className="w-4 h-4" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-100 dark:border-blue-800/30',
        };
      case 'READING':
        return {
          icon: <BookOpen className="w-4 h-4" />,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          borderColor: 'border-emerald-100 dark:border-emerald-800/30',
        };
      case 'WRITING':
        return {
          icon: <PenTool className="w-4 h-4" />,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-100 dark:border-purple-800/30',
        };
      case 'SPEAKING':
        return {
          icon: <Mic className="w-4 h-4" />,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-100 dark:border-orange-800/30',
        };
      default:
        return {
          icon: <BookOpen className="w-4 h-4" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-100',
        };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !stats) {
    return null;
  }

  const totalCompleted = stats.overall.total_completed;
  const totalPractices = stats.sections.reduce((acc, s) => acc + s.total_practices, 0);
  const overallProgress = totalPractices > 0 
    ? Math.round((totalCompleted / totalPractices) * 100)
    : 0;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-linear-to-br from-blue-500 to-purple-500 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Practice Progress</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {totalCompleted} of {totalPractices} sections completed
              </p>
            </div>
          </div>
          <Link 
            href="/practice"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Overall Progress</span>
            <span className="font-medium text-gray-900 dark:text-white">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section Cards Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.sections.map((section) => {
            const config = getSectionConfig(section.section_type);
            return (
              <SectionCard
                key={section.section_type}
                section={section}
                icon={config.icon}
                color={config.color}
                bgColor={config.bgColor}
                borderColor={config.borderColor}
              />
            );
          })}
        </div>

        {/* Motivational CTA */}
        {totalCompleted < totalPractices && (
          <div className="mt-4 p-3 bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Keep going! 🔥
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Complete {totalPractices - totalCompleted} more sections to master all skills
                </p>
              </div>
              <Link
                href="/practice"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Practice
              </Link>
            </div>
          </div>
        )}

        {/* Completed State */}
        {totalCompleted === totalPractices && totalPractices > 0 && (
          <div className="mt-4 p-3 bg-linear-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  All sections completed! 🎉
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Great job on completing all practice sections
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
