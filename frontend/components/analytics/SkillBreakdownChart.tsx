"use client";

import { AnalyticsSkillBreakdown } from "@/lib/exam-api";
import {
  Brain,
  BookOpen,
  Headphones,
  Pen,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { useState } from "react";

interface SkillBreakdownChartProps {
  skills: AnalyticsSkillBreakdown;
}

const SECTION_CONFIG = {
  reading: {
    key: "reading" as const,
    name: "Reading",
    icon: BookOpen,
    color: "emerald",
    colorHex: "#10b981",
  },
  listening: {
    key: "listening" as const,
    name: "Listening",
    icon: Headphones,
    color: "blue",
    colorHex: "#3b82f6",
  },
  writing: {
    key: "writing" as const,
    name: "Writing",
    icon: Pen,
    color: "purple",
    colorHex: "#a855f7",
  },
  speaking: {
    key: "speaking" as const,
    name: "Speaking",
    icon: MessageCircle,
    color: "amber",
    colorHex: "#f59e0b",
  },
};

type SectionKey = keyof typeof SECTION_CONFIG;

export default function SkillBreakdownChart({ skills }: SkillBreakdownChartProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("reading");

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600 dark:text-green-400";
    if (accuracy >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAccuracyBg = (accuracy: number) => {
    if (accuracy >= 80) return "bg-green-500";
    if (accuracy >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Get section data
  const sectionData = activeSection === "reading" || activeSection === "listening"
    ? skills[activeSection]
    : null;

  const writingData = skills.writing;
  const speakingData = skills.speaking;

  const config = SECTION_CONFIG[activeSection];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Skill Breakdown</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Detailed analysis by question type and criteria
            </p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {(Object.entries(SECTION_CONFIG) as [SectionKey, typeof SECTION_CONFIG.reading][]).map(
          ([key, section]) => {
            const SectionIcon = section.icon;
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? `text-${section.color}-600 dark:text-${section.color}-400 border-b-2 border-${section.color}-500 bg-white dark:bg-gray-800`
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <SectionIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.name}</span>
              </button>
            );
          }
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Reading/Listening Question Type Analysis */}
        {(activeSection === "reading" || activeSection === "listening") && sectionData && (
          <div className="space-y-6">
            {/* Overall Accuracy */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Icon className="w-6 h-6" style={{ color: config.colorHex }} />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall Accuracy</p>
                  <p className={`text-2xl font-bold ${getAccuracyColor(sectionData.overall_accuracy)}`}>
                    {sectionData.overall_accuracy.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  {sectionData.strengths.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-3 h-3" />
                      {sectionData.strengths.length} strengths
                    </span>
                  )}
                  {sectionData.weaknesses.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                      <XCircle className="w-3 h-3" />
                      {sectionData.weaknesses.length} weaknesses
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Question Types */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Question Types</h4>
              {Object.entries(sectionData.question_types).map(([type, data]) => (
                <div
                  key={type}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {type}
                      </span>
                      {getTrendIcon(data.trend)}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getAccuracyBg(data.accuracy)}`}
                        style={{ width: `${data.accuracy}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${getAccuracyColor(data.accuracy)}`}>
                      {data.accuracy.toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {data.attempts} attempts
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Strengths</h4>
                </div>
                {sectionData.strengths.length > 0 ? (
                  <ul className="space-y-2">
                    {sectionData.strengths.map((strength, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Keep practicing to identify your strengths!
                  </p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h4 className="font-semibold text-red-800 dark:text-red-200">Areas to Improve</h4>
                </div>
                {sectionData.weaknesses.length > 0 ? (
                  <ul className="space-y-2">
                    {sectionData.weaknesses.map((weakness, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {weakness}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Great job! No major weaknesses identified.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Writing Criteria Breakdown */}
        {activeSection === "writing" && (
          <div className="space-y-6">
            {writingData ? (
              <>
                {/* Overall & Task Scores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                    <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Overall</p>
                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                      {writingData.overall_score?.toFixed(1) || "—"}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Task 1</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {writingData.task_scores.task1?.toFixed(1) || "—"}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Task 2</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {writingData.task_scores.task2?.toFixed(1) || "—"}
                    </p>
                  </div>
                </div>

                {/* Criteria Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Criteria Breakdown
                  </h4>
                  {Object.entries(writingData.criteria_breakdown).map(([criteria, score]) => (
                    <div key={criteria} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{criteria}</span>
                        <span className={`text-sm font-bold ${getAccuracyColor((score / 9) * 100)}`}>
                          {score.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${getAccuracyBg((score / 9) * 100)}`}
                          style={{ width: `${(score / 9) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Improvement Areas */}
                {writingData.improvement_areas.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                        Areas to Improve
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {writingData.improvement_areas.map((area, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Pen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Complete writing tests to see your skill breakdown</p>
              </div>
            )}
          </div>
        )}

        {/* Speaking Criteria Breakdown */}
        {activeSection === "speaking" && (
          <div className="space-y-6">
            {speakingData ? (
              <>
                {/* Overall & Part Scores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">Overall</p>
                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                      {speakingData.overall_score?.toFixed(1) || "—"}
                    </p>
                  </div>
                  {["part1", "part2", "part3"].map((part) => (
                    <div key={part} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 capitalize">
                        {part.replace("part", "Part ")}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {speakingData.part_scores[part as keyof typeof speakingData.part_scores]?.toFixed(1) || "—"}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Criteria Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Criteria Breakdown
                  </h4>
                  {Object.entries(speakingData.criteria_breakdown).map(([criteria, score]) => (
                    <div key={criteria} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{criteria}</span>
                        <span className={`text-sm font-bold ${getAccuracyColor((score / 9) * 100)}`}>
                          {score.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${getAccuracyBg((score / 9) * 100)}`}
                          style={{ width: `${(score / 9) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Improvement Areas */}
                {speakingData.improvement_areas.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                        Areas to Improve
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {speakingData.improvement_areas.map((area, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Complete speaking tests to see your skill breakdown</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
