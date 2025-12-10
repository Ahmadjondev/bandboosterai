"use client";

import { AnalyticsWeaknessAnalysis, AnalyticsWeakness } from "@/lib/exam-api";
import {
  AlertTriangle,
  Target,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  Zap,
  BookOpen,
  Headphones,
  Pen,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface WeaknessAnalysisCardProps {
  weaknesses: AnalyticsWeaknessAnalysis;
}

const PRIORITY_CONFIG = {
  high: {
    color: "red",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-200 dark:border-red-800",
    label: "High Priority",
  },
  medium: {
    color: "amber",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-200 dark:border-amber-800",
    label: "Medium Priority",
  },
  low: {
    color: "blue",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-200 dark:border-blue-800",
    label: "Low Priority",
  },
};

const SECTION_ICONS = {
  Reading: BookOpen,
  Listening: Headphones,
  Writing: Pen,
  Speaking: MessageCircle,
};

export default function WeaknessAnalysisCard({ weaknesses }: WeaknessAnalysisCardProps) {
  const [expandedWeakness, setExpandedWeakness] = useState<string | null>(null);

  if (!weaknesses.weaknesses || weaknesses.weaknesses.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weakness Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered insights</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
            <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            You're doing great!
          </h4>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            No significant weaknesses detected. Keep practicing to maintain your skills!
          </p>
        </div>
      </div>
    );
  }

  // Group weaknesses by priority
  const highPriority = weaknesses.weaknesses.filter((w) => w.priority === "high");
  const mediumPriority = weaknesses.weaknesses.filter((w) => w.priority === "medium");
  const lowPriority = weaknesses.weaknesses.filter((w) => w.priority === "low");

  const toggleExpand = (id: string) => {
    setExpandedWeakness(expandedWeakness === id ? null : id);
  };

  const WeaknessItem = ({ weakness, index }: { weakness: AnalyticsWeakness; index: number }) => {
    const config = PRIORITY_CONFIG[weakness.priority];
    const id = `${weakness.section}-${weakness.weakness_type}-${index}`;
    const isExpanded = expandedWeakness === id;
    const SectionIcon = SECTION_ICONS[weakness.section as keyof typeof SECTION_ICONS] || Target;
    const gap = weakness.target_score - weakness.current_score;

    return (
      <div
        className={`rounded-xl border ${config.borderColor} overflow-hidden transition-all duration-200`}
      >
        <button
          onClick={() => toggleExpand(id)}
          className={`w-full p-4 ${config.bgColor} flex items-start gap-3 text-left`}
        >
          <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20`}>
            <SectionIcon className={`w-5 h-5 ${config.textColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-semibold ${config.textColor}`}>
                {weakness.weakness_type}
              </h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.textColor}`}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{weakness.section}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {weakness.current_score.toFixed(1)}
              </span>
              <TrendingUp className={`w-4 h-4 ${config.textColor}`} />
              <span className={`text-lg font-bold ${config.textColor}`}>
                {weakness.target_score.toFixed(1)}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {gap.toFixed(1)} points gap
            </p>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>

        {isExpanded && weakness.improvement_tips.length > 0 && (
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
                Improvement Tips
              </h5>
            </div>
            <ul className="space-y-2">
              {weakness.improvement_tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weakness Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {weaknesses.weaknesses.length} areas identified
            </p>
          </div>
        </div>
        {weaknesses.overall_weakest_section && (
          <div className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400">Focus on</p>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {weaknesses.overall_weakest_section}
            </p>
          </div>
        )}
      </div>

      {/* Priority Focus */}
      {weaknesses.priority_focus && weaknesses.priority_focus.length > 0 && (
        <div className="mb-6 p-4 bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200">
              Priority Focus Areas
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {weaknesses.priority_focus.map((focus, i) => (
              <span
                key={i}
                className="px-3 py-1 text-sm bg-white dark:bg-gray-800 rounded-full text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700"
              >
                {focus}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {/* High Priority */}
        {highPriority.length > 0 && (
          <div className="space-y-2">
            {highPriority.map((weakness, i) => (
              <WeaknessItem key={`high-${i}`} weakness={weakness} index={i} />
            ))}
          </div>
        )}

        {/* Medium Priority */}
        {mediumPriority.length > 0 && (
          <div className="space-y-2">
            {mediumPriority.map((weakness, i) => (
              <WeaknessItem key={`medium-${i}`} weakness={weakness} index={i} />
            ))}
          </div>
        )}

        {/* Low Priority */}
        {lowPriority.length > 0 && (
          <div className="space-y-2">
            {lowPriority.map((weakness, i) => (
              <WeaknessItem key={`low-${i}`} weakness={weakness} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/dashboard/resources"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <Zap className="w-4 h-4" />
          Practice Weak Areas
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
