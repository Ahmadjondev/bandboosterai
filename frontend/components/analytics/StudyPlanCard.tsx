"use client";

import { AnalyticsStudyPlan, StudyPlanDay } from "@/lib/exam-api";
import {
  Calendar,
  Clock,
  Target,
  CheckCircle2,
  Circle,
  BookOpen,
  Headphones,
  Pen,
  MessageCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  Zap,
  Medal,
} from "lucide-react";
import { useState } from "react";

interface StudyPlanCardProps {
  studyPlan: AnalyticsStudyPlan;
  onStartActivity?: (activity: string) => void;
}

const SECTION_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  reading: { icon: BookOpen, color: "emerald" },
  listening: { icon: Headphones, color: "blue" },
  writing: { icon: Pen, color: "purple" },
  speaking: { icon: MessageCircle, color: "amber" },
  vocabulary: { icon: Zap, color: "pink" },
  grammar: { icon: Target, color: "indigo" },
};

const DAY_COLORS = [
  "border-l-blue-500",
  "border-l-green-500",
  "border-l-purple-500",
  "border-l-amber-500",
  "border-l-pink-500",
  "border-l-cyan-500",
  "border-l-orange-500",
];

export default function StudyPlanCard({ studyPlan, onStartActivity }: StudyPlanCardProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const {
    weekly_plan,
    priority_sections,
    total_weekly_hours,
    next_milestone,
    plan_type,
  } = studyPlan;

  const getSectionIcon = (section: string) => {
    const normalizedType = section.toLowerCase();
    for (const [key, config] of Object.entries(SECTION_CONFIG)) {
      if (normalizedType.includes(key)) {
        return config.icon;
      }
    }
    return Target;
  };

  const getSectionColor = (section: string) => {
    const normalizedType = section.toLowerCase();
    for (const [key, config] of Object.entries(SECTION_CONFIG)) {
      if (normalizedType.includes(key)) {
        return config.color;
      }
    }
    return "gray";
  };

  const totalActivities = weekly_plan.reduce(
    (sum, day) => sum + day.activities.length,
    0
  );

  if (!weekly_plan || weekly_plan.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Study Plan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Personalized weekly schedule
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Complete more tests to unlock your personalized study plan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-linear-to-r from-indigo-500 to-purple-500 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI Study Plan</h3>
              <p className="text-sm text-white/80">{plan_type}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-sm">
              <Sparkles className="w-3.5 h-3.5" />
              AI Generated
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-2 bg-white/10 rounded-lg">
            <p className="text-2xl font-bold">{total_weekly_hours}h</p>
            <p className="text-xs text-white/70">Weekly Hours</p>
          </div>
          <div className="text-center p-2 bg-white/10 rounded-lg">
            <p className="text-2xl font-bold">{totalActivities}</p>
            <p className="text-xs text-white/70">Total Activities</p>
          </div>
          <div className="text-center p-2 bg-white/10 rounded-lg">
            <p className="text-2xl font-bold">{weekly_plan.length}</p>
            <p className="text-xs text-white/70">Days Planned</p>
          </div>
        </div>
      </div>

      {/* Priority Sections */}
      {priority_sections && priority_sections.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Priority Focus Areas
          </h4>
          <div className="flex flex-wrap gap-2">
            {priority_sections.map((area, idx) => {
              const color = getSectionColor(area);
              return (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded-full text-sm font-medium bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400`}
                >
                  {area}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Plan */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Weekly Schedule
        </h4>
        <div className="space-y-3">
          {weekly_plan.map((day, dayIdx) => {
            const isExpanded = expandedDay === dayIdx;
            const Icon = getSectionIcon(day.focus_section);
            const color = getSectionColor(day.focus_section);

            return (
              <div
                key={dayIdx}
                className={`border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden border-l-4 ${DAY_COLORS[dayIdx % DAY_COLORS.length]}`}
              >
                {/* Day Header */}
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : dayIdx)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                      <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {day.day}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {day.activities.length} activities • {day.duration_minutes} mins • {day.focus_section}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Day Activities */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 space-y-2 border-t border-gray-100 dark:border-gray-700">
                    {/* Goal */}
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Goal:</strong> {day.goal}
                      </p>
                    </div>
                    
                    {day.activities.map((activity, actIdx) => {
                      return (
                        <div
                          key={actIdx}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                              <Target className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {activity}
                            </p>
                          </div>
                          {onStartActivity && (
                            <button
                              onClick={() => onStartActivity(activity)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Start
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Milestone */}
      {next_milestone && (
        <div className="px-6 pb-6">
          <div className="p-4 bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Medal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                  Next Milestone
                </h5>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {next_milestone}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
