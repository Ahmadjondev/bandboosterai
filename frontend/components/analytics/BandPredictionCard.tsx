"use client";

import { AnalyticsBandPrediction } from "@/lib/exam-api";
import {
  Award,
  TrendingUp,
  Target,
  Clock,
  Sparkles,
  BookOpen,
  Headphones,
  Pen,
  MessageCircle,
  ChevronRight,
  Info,
} from "lucide-react";

interface BandPredictionCardProps {
  prediction: AnalyticsBandPrediction;
}

const SECTION_CONFIG = {
  reading: { icon: BookOpen, color: "emerald" },
  listening: { icon: Headphones, color: "blue" },
  writing: { icon: Pen, color: "purple" },
  speaking: { icon: MessageCircle, color: "amber" },
};

export default function BandPredictionCard({ prediction }: BandPredictionCardProps) {
  const {
    current_estimated_band,
    predicted_band,
    confidence_level,
    section_predictions,
    time_to_goal,
    recommendation,
  } = prediction;

  const getConfidenceColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
      case "medium":
        return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
    }
  };

  const getBandColor = (band: number | null) => {
    if (!band) return "text-gray-400";
    if (band >= 7.5) return "text-green-600 dark:text-green-400";
    if (band >= 6.5) return "text-blue-600 dark:text-blue-400";
    if (band >= 5.5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getImprovementArrow = (current: number | null, predicted: number | null) => {
    if (!current || !predicted) return null;
    const diff = predicted - current;
    if (diff > 0) {
      return (
        <span className="inline-flex items-center text-green-600 dark:text-green-400">
          <TrendingUp className="w-4 h-4 mr-1" />
          +{diff.toFixed(1)}
        </span>
      );
    }
    return null;
  };

  if (!current_estimated_band && !predicted_band) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Band Prediction</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered forecast</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Complete more tests to unlock your personalized band prediction
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-linear-to-r from-amber-500 to-orange-500 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Band Prediction</h3>
            <p className="text-sm text-white/80">AI-powered forecast</p>
          </div>
        </div>

        {/* Main Prediction */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80 mb-1">Current Estimated</p>
            <p className="text-4xl font-bold">{current_estimated_band?.toFixed(1) || "—"}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <ChevronRight className="w-6 h-6 animate-pulse" />
              <span className="text-xs text-white/70">{time_to_goal}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/80 mb-1">Predicted Band</p>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <p className="text-4xl font-bold">{predicted_band?.toFixed(1) || "—"}</p>
            </div>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="mt-4 flex items-center justify-center">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(confidence_level)}`}>
            {confidence_level} Confidence
          </span>
        </div>
      </div>

      {/* Section Predictions */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Section Predictions
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {(Object.entries(section_predictions) as [keyof typeof SECTION_CONFIG, { current: number | null; predicted: number | null }][]).map(
            ([section, data]) => {
              const config = SECTION_CONFIG[section];
              const Icon = config.icon;
              return (
                <div
                  key={section}
                  className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 text-${config.color}-600 dark:text-${config.color}-400`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {section}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-lg font-bold ${getBandColor(data.current)}`}>
                        {data.current?.toFixed(1) || "—"}
                      </span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className={`text-lg font-bold ${getBandColor(data.predicted)}`}>
                        {data.predicted?.toFixed(1) || "—"}
                      </span>
                    </div>
                    {getImprovementArrow(data.current, data.predicted)}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* Recommendation */}
        {recommendation && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  AI Recommendation
                </h5>
                <p className="text-sm text-blue-700 dark:text-blue-300">{recommendation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Time to Goal */}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>
            Estimated time to reach target: <strong>{time_to_goal}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
