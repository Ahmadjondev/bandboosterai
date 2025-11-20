"use client";

import { Recommendation } from "@/lib/exam-api";
import { Lightbulb, AlertTriangle, Info, CheckCircle, ArrowRight } from "lucide-react";

interface RecommendationsWidgetProps {
  recommendations: Recommendation[];
}

export default function RecommendationsWidget({ recommendations }: RecommendationsWidgetProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case "medium":
        return <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20";
      case "medium":
        return "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      default:
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Study Recommendations
        </h2>
      </div>

      {recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getPriorityColor(recommendation.priority)}`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {getPriorityIcon(recommendation.priority)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {recommendation.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(
                        recommendation.priority
                      )}`}
                    >
                      {recommendation.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {recommendation.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {recommendation.action}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Complete more tests to get personalized study recommendations!
          </p>
        </div>
      )}
    </div>
  );
}
