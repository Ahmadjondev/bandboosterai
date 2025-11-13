"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import BooksMotivationWidget from "@/components/BooksMotivationWidget";
import { getDashboardStats, type DashboardStats } from "@/lib/exam-api";
import { BookOpen, Clock, Target, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !stats) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600 dark:text-red-400">{error || "Unknown error occurred"}</p>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, section_stats, recent_tests } = stats;
  const sections = [
    { key: "listening" as const, name: "Listening", icon: "🎧" },
    { key: "reading" as const, name: "Reading", icon: "📖" },
    { key: "writing" as const, name: "Writing", icon: "✍️" },
    { key: "speaking" as const, name: "Speaking", icon: "🗣️" },
  ];

  const getBandScoreColor = (score: number | null) => {
    if (score === null) return "text-slate-400 dark:text-slate-500";
    if (score >= 7) return "text-green-600 dark:text-green-400";
    if (score >= 5.5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your IELTS preparation progress
            </p>
          </div>
          <Link
            href="/dashboard/tests"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Take New Test
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Total Tests"
            value={overview.total_tests}
            bgColor="bg-blue-50 dark:bg-blue-900/20"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={<Target className="w-6 h-6" />}
            label="Current Score"
            value={overview.current_score?.toFixed(1) || "--"}
            subtitle={`Target: ${overview.target_score}`}
            bgColor="bg-purple-50 dark:bg-purple-900/20"
            iconColor="text-purple-600 dark:text-purple-400"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Overall Progress"
            value={`${overview.overall_progress}%`}
            bgColor="bg-green-50 dark:bg-green-900/20"
            iconColor="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Study Streak"
            value={overview.streak_days}
            subtitle={`${overview.tests_this_week} tests this week`}
            bgColor="bg-orange-50 dark:bg-orange-900/20"
            iconColor="text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* Books Motivation Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <BooksMotivationWidget />
          </div>
          
          {/* Section Performance */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Section Performance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map(({ key, name, icon }) => {
              const sectionData = section_stats[key];
              const score = sectionData.average_score?.toFixed(1) || "--";
              const progress = sectionData.progress;
              const gap = sectionData.average_score 
                ? (overview.target_score - sectionData.average_score).toFixed(1)
                : "--";
              
              // Color based on score relative to target
              let progressColor = "bg-red-500";
              if (sectionData.average_score) {
                if (sectionData.average_score >= overview.target_score) {
                  progressColor = "bg-green-500";
                } else if (sectionData.average_score >= 5.0) {
                  progressColor = "bg-yellow-500";
                }
              }

              return (
                <div key={key} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sectionData.tests_count} {sectionData.tests_count === 1 ? "test" : "tests"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {score}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Gap: {gap}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {progress}% of target
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tests */}
        {recent_tests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Tests
              </h2>
              <Link
                href="/dashboard/my-tests"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {recent_tests.slice(0, 5).map((test) => (
                <Link
                  key={test.id}
                  href={`/dashboard/results?attempt=${test.id}`}
                  className="block bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {test.exam_name}
                        </h3>
                        <span className="px-2 py-1 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                          Completed
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {new Date(test.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {/* <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs">
                          {test.exam_type}
                        </span> */}
                        
                      </div>
                    </div>

                    {test.overall_score !== null && (
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3 text-sm">
                          {test.listening_score !== null && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">L</div>
                              <div className={`font-semibold ${getBandScoreColor(test.listening_score)}`}>
                                {test.listening_score.toFixed(1)}
                              </div>
                            </div>
                          )}
                          {test.reading_score !== null && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">R</div>
                              <div className={`font-semibold ${getBandScoreColor(test.reading_score)}`}>
                                {test.reading_score.toFixed(1)}
                              </div>
                            </div>
                          )}
                          {test.writing_score !== null && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">W</div>
                              <div className={`font-semibold ${getBandScoreColor(test.writing_score)}`}>
                                {test.writing_score.toFixed(1)}
                              </div>
                            </div>
                          )}
                          {test.speaking_score !== null && (
                            <div className="text-center">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">S</div>
                              <div className={`font-semibold ${getBandScoreColor(test.speaking_score)}`}>
                                {test.speaking_score.toFixed(1)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-center pl-4 border-l border-slate-200 dark:border-slate-700">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Overall</div>
                          <div className={`text-2xl font-bold ${getBandScoreColor(test.overall_score)}`}>
                            {test.overall_score.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            title="Practice Tests"
            description="Take full-length IELTS mock exams"
            href="/dashboard/tests"
            buttonText="Start Test"
          />
          <ActionCard
            title="Test History"
            description="Review your past test performances"
            href="/dashboard/history"
            buttonText="View History"
          />
          <ActionCard
            title="Study Materials"
            description="Access preparation resources"
            href="/dashboard/materials"
            buttonText="Explore"
          />
        </div> */}
      </div>
    </DashboardLayout>
  );
}

// Helper Components
function StatCard({
  icon,
  label,
  value,
  subtitle,
  bgColor,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-6 border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${iconColor}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  buttonText,
}: {
  title: string;
  description: string;
  href: string;
  buttonText: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      <Link
        href={href}
        className="inline-block px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
      >
        {buttonText}
      </Link>
    </div>
  );
}
