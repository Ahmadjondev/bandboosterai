"use client";

/**
 * Speaking Practice Results Page
 * Shows detailed AI evaluation results for a speaking practice attempt
 */

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Home,
  ArrowLeft,
  Volume2,
  MessageCircle,
  BookOpen,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Mic,
  Clock,
  RotateCcw,
} from "lucide-react";
import {
  getSpeakingResult,
  type SpeakingEvaluation,
  type SpeakingResultResponse,
} from "@/lib/api/section-practice";

export default function SpeakingResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptUuid = params.attemptUuid as string;

  const [result, setResult] = useState<SpeakingResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [attemptUuid]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSpeakingResult(attemptUuid);
      setResult(data);
    } catch (err) {
      console.error("Failed to load results:", err);
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getBandColor = (score: number): string => {
    if (score >= 7) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 6) return "text-blue-600 dark:text-blue-400";
    if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getBandBgColor = (score: number): string => {
    if (score >= 7) return "from-emerald-500 to-teal-600";
    if (score >= 6) return "from-blue-500 to-indigo-600";
    if (score >= 5) return "from-yellow-500 to-orange-600";
    return "from-red-500 to-rose-600";
  };

  const getBandLabel = (score: number): string => {
    if (score >= 8) return "Expert";
    if (score >= 7) return "Very Good";
    if (score >= 6) return "Competent";
    if (score >= 5) return "Modest";
    if (score >= 4) return "Limited";
    return "Basic";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-red-800 dark:text-red-200 font-bold text-xl mb-2">
            Failed to Load Results
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-6">{error || "Results not found"}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadResults}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              href="/practice"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
            >
              Go Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const eval_ = result.evaluation;
  const overallBand = result.score ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/practice/speaking"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Speaking Results</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{result.practice_title}</p>
            </div>
          </div>
          <Link
            href="/practice"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Practice
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Overall Score Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
          <div
            className={`bg-gradient-to-r ${getBandBgColor(overallBand)} p-8 text-white text-center`}
          >
            <p className="text-lg opacity-90 mb-2">Overall Band Score</p>
            <div className="text-7xl font-bold mb-2">{overallBand.toFixed(1)}</div>
            <p className="text-xl font-medium opacity-90 mb-4">{getBandLabel(overallBand)}</p>
            <div className="flex items-center justify-center gap-4 text-sm opacity-75">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(result.time_spent_seconds)} total time</span>
              </div>
              {result.completed_at && (
                <div>
                  •{" "}
                  {new Date(result.completed_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Criteria Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            {[
              { key: "fluency_and_coherence", label: "Fluency & Coherence", icon: MessageCircle },
              { key: "lexical_resource", label: "Lexical Resource", icon: BookOpen },
              { key: "grammatical_range_and_accuracy", label: "Grammar", icon: CheckCircle },
              { key: "pronunciation", label: "Pronunciation", icon: Volume2 },
            ].map(({ key, label, icon: Icon }) => {
              const criterion = eval_?.[key as keyof SpeakingEvaluation] as
                | { score: number; feedback: string }
                | undefined;
              const score = criterion?.score ?? 0;

              return (
                <div
                  key={key}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center"
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${getBandColor(score)}`} />
                  <div className={`text-2xl font-bold ${getBandColor(score)}`}>
                    {score.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Azure Pronunciation Scores */}
        {result.azure_scores && (result.azure_scores.pronunciation > 0 || result.azure_scores.fluency > 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-500" />
              Speech Analysis Scores
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  key: "pronunciation",
                  label: "Pronunciation",
                  value: result.azure_scores.pronunciation,
                },
                { key: "fluency", label: "Fluency", value: result.azure_scores.fluency },
                { key: "accuracy", label: "Accuracy", value: result.azure_scores.accuracy },
              ].map(({ key, label, value }) => (
                <div key={key} className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-2">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className={
                          value >= 70
                            ? "text-emerald-500"
                            : value >= 50
                              ? "text-yellow-500"
                              : "text-red-500"
                        }
                        strokeDasharray={`${(value / 100) * 220} 220`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {Math.round(value)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Feedback */}
        {result.overall_feedback && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-500" />
              Overall Feedback
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {result.overall_feedback}
            </p>
          </div>
        )}

        {/* Detailed Criteria Feedback */}
        {eval_ && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Detailed Criteria Feedback
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[
                {
                  key: "fluency_and_coherence",
                  label: "Fluency & Coherence",
                  icon: MessageCircle,
                  color: "text-blue-500",
                },
                {
                  key: "lexical_resource",
                  label: "Lexical Resource",
                  icon: BookOpen,
                  color: "text-purple-500",
                },
                {
                  key: "grammatical_range_and_accuracy",
                  label: "Grammatical Range & Accuracy",
                  icon: CheckCircle,
                  color: "text-green-500",
                },
                {
                  key: "pronunciation",
                  label: "Pronunciation",
                  icon: Volume2,
                  color: "text-orange-500",
                },
              ].map(({ key, label, icon: Icon, color }) => {
                const criterion = eval_[key as keyof SpeakingEvaluation] as
                  | { score: number; feedback: string }
                  | undefined;
                if (!criterion) return null;

                return (
                  <div key={key} className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${color}`} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
                      </div>
                      <span className={`text-xl font-bold ${getBandColor(criterion.score)}`}>
                        {criterion.score.toFixed(1)}
                      </span>
                    </div>
                    {criterion.feedback && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {criterion.feedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transcripts */}
        {result.transcripts && result.transcripts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-red-500" />
                Your Responses
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {result.transcripts.map((transcript, idx) => (
                <div key={idx} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {transcript.question_key || `Question ${idx + 1}`}
                    </span>
                    {transcript.pronunciation_score !== undefined && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Pronunciation: {Math.round(transcript.pronunciation_score)}%
                      </span>
                    )}
                  </div>
                  {transcript.question_text && (
                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                      Q: {transcript.question_text}
                    </p>
                  )}
                  {transcript.transcript && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <p className="text-gray-600 dark:text-gray-400 text-sm italic">
                        &ldquo;{transcript.transcript}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/practice/speaking"
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Practice More Speaking
          </Link>
          <Link
            href="/practice"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            All Practice
          </Link>
        </div>
      </div>
    </div>
  );
}
