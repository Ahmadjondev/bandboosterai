"use client";

import { SkillGap } from "@/lib/exam-api";
import { Target, AlertCircle, Clock } from "lucide-react";

interface SkillGapsWidgetProps {
  gaps: SkillGap[];
}

export default function SkillGapsWidget({ gaps }: SkillGapsWidgetProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800",
          text: "text-red-700 dark:text-red-300",
          badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
        };
      case "medium":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-900/20",
          border: "border-yellow-200 dark:border-yellow-800",
          text: "text-yellow-700 dark:text-yellow-300",
          badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
        };
      default:
        return {
          bg: "bg-green-50 dark:bg-green-900/20",
          border: "border-green-200 dark:border-green-800",
          text: "text-green-700 dark:text-green-300",
          badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-6 h-6 text-red-600 dark:text-red-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Skill Gaps Analysis
        </h2>
      </div>

      {gaps.length > 0 ? (
        <div className="space-y-4">
          {gaps.map((gap, index) => {
            const colors = getPriorityColor(gap.priority);
            const progressPercentage = (gap.current_score / gap.target_score) * 100;

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {gap.section}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.badge}`}>
                        {gap.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={colors.text}>
                        Current: <strong>{gap.current_score.toFixed(1)}</strong>
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Target: <strong>{gap.target_score.toFixed(1)}</strong>
                      </span>
                      <span className={colors.text}>
                        Gap: <strong>{gap.gap.toFixed(1)}</strong> points
                      </span>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-2 text-sm ${colors.text}">
                    <Clock className="w-4 h-4" />
                    <span>{gap.estimated_practice_needed} tests</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      gap.priority === "high" 
                        ? "bg-red-500" 
                        : gap.priority === "medium" 
                        ? "bg-yellow-500" 
                        : "bg-green-500"
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {Math.round(progressPercentage)}% of target
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Great job! You're meeting all your targets.
          </p>
        </div>
      )}
    </div>
  );
}
