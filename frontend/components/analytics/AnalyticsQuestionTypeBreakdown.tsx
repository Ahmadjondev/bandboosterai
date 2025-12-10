"use client";

import { AnalyticsSkillBreakdown } from "@/lib/exam-api";
import {
  BookOpen,
  Headphones,
  Pen,
  MessageCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
} from "lucide-react";
import { useState } from "react";

interface AnalyticsQuestionTypeBreakdownProps {
  skills: AnalyticsSkillBreakdown;
}

const SECTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  reading: {
    icon: BookOpen,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  listening: {
    icon: Headphones,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  writing: {
    icon: Pen,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  speaking: {
    icon: MessageCircle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
};

interface QuestionTypeStat {
  type: string;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  average_time?: number;
  trend?: "up" | "down" | "stable" | string;
}

export default function AnalyticsQuestionTypeBreakdown({
  skills,
}: AnalyticsQuestionTypeBreakdownProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("reading");

  // Extract question type stats from skills data
  const getQuestionTypeStats = (section: string): QuestionTypeStat[] => {
    const sectionData = skills[section as keyof AnalyticsSkillBreakdown];
    if (!sectionData || typeof sectionData !== 'object' || !('question_types' in sectionData)) return [];
    
    const questionTypes = sectionData.question_types as Record<string, { accuracy: number; attempts: number; trend: string }>;
    if (!questionTypes) return [];
    
    return Object.entries(questionTypes).map(([type, data]) => ({
      type,
      total_questions: data.attempts || 0,
      correct_answers: Math.round((data.accuracy / 100) * (data.attempts || 0)),
      accuracy: data.accuracy || 0,
      trend: data.trend,
    }));
  };

  // Get overall accuracy for a section
  const getSectionAccuracy = (section: string): number => {
    const sectionData = skills[section as keyof AnalyticsSkillBreakdown];
    if (!sectionData || typeof sectionData !== 'object') return 0;
    if ('overall_accuracy' in sectionData) return sectionData.overall_accuracy;
    if ('overall_score' in sectionData && sectionData.overall_score) {
      return (sectionData.overall_score / 9) * 100;
    }
    return 0;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600 dark:text-green-400";
    if (accuracy >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAccuracyBgColor = (accuracy: number) => {
    if (accuracy >= 80) return "bg-green-500";
    if (accuracy >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatQuestionType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Check which sections have question types data
  const sections = Object.keys(SECTION_CONFIG).filter((s) => {
    const sectionData = skills[s as keyof AnalyticsSkillBreakdown];
    return sectionData && typeof sectionData === 'object' && 'question_types' in sectionData;
  });

  if (sections.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <Layers className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Question Type Analysis
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Performance breakdown by question type
            </p>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No question type data available yet.</p>
          <p className="text-sm mt-1">Complete more tests to see detailed breakdowns.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Question Type Analysis
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Performance breakdown by question type across all sections
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {sections.map((section) => {
          const config = SECTION_CONFIG[section];
          const Icon = config.icon;
          const stats = getQuestionTypeStats(section);
          const isExpanded = expandedSection === section;
          const sectionAccuracy = getSectionAccuracy(section);
          const avgAccuracy =
            stats.length > 0
              ? Math.round(stats.reduce((sum, s) => sum + s.accuracy, 0) / stats.length)
              : sectionAccuracy;

          return (
            <div key={section}>
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                      {section}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stats.length} question type{stats.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-2">
                    <span className={`text-lg font-bold ${getAccuracyColor(avgAccuracy)}`}>
                      {Math.round(avgAccuracy)}%
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg Accuracy</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 dark:bg-gray-900/50">
                  {stats.length === 0 ? (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      No question type data for this section yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stats
                        .sort((a, b) => b.total_questions - a.total_questions)
                        .map((stat, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatQuestionType(stat.type)}
                                </span>
                                {stat.trend && getTrendIcon(stat.trend)}
                              </div>
                              <span className={`text-lg font-bold ${getAccuracyColor(stat.accuracy)}`}>
                                {stat.accuracy}%
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                              <div
                                className={`h-full ${getAccuracyBgColor(stat.accuracy)} rounded-full transition-all`}
                                style={{ width: `${stat.accuracy}%` }}
                              />
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-gray-600 dark:text-gray-400">
                                  {stat.correct_answers}/{stat.total_questions} correct
                                </span>
                              </div>
                              {stat.average_time && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {stat.average_time}s avg time
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Recommendations based on accuracy */}
                            {stat.accuracy < 60 && (
                              <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                                💡 Focus on practicing this question type to improve your score
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Tip: Focus on question types with{" "}
            <span className="text-red-600 dark:text-red-400 font-medium">&lt;60% accuracy</span>
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-500 dark:text-gray-400">≥80%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-gray-500 dark:text-gray-400">60-79%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-500 dark:text-gray-400">&lt;60%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
