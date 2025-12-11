'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  User,
  Clock,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Loader2,
  Save,
  Send,
  PenTool,
  Mic,
  FileText,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Target,
  ThumbsUp,
  ThumbsDown,
  Copy,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import { gradingApi } from '@/lib/classroom-api';
import type { StudentAssignment, GradingSubmission } from '@/types/classroom';

interface BandCriteria {
  task_achievement: number;
  coherence_cohesion: number;
  lexical_resource: number;
  grammatical_accuracy: number;
}

export default function GradingInterfacePage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = Number(params.submissionId);

  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Grading state
  const [overallBand, setOverallBand] = useState<number>(6.0);
  const [criteria, setCriteria] = useState<BandCriteria>({
    task_achievement: 6.0,
    coherence_cohesion: 6.0,
    lexical_resource: 6.0,
    grammatical_accuracy: 6.0,
  });
  const [feedback, setFeedback] = useState('');
  const [useAiFeedback, setUseAiFeedback] = useState(false);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Current item index for multi-item assignments
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  useEffect(() => {
    loadAssignment();
  }, [submissionId]);

  useEffect(() => {
    // Auto-calculate overall band from criteria
    const avg = (
      criteria.task_achievement +
      criteria.coherence_cohesion +
      criteria.lexical_resource +
      criteria.grammatical_accuracy
    ) / 4;
    // Round to nearest 0.5
    setOverallBand(Math.round(avg * 2) / 2);
  }, [criteria]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gradingApi.detail(submissionId);
      setAssignment(data);

      // If AI feedback exists, pre-fill
      if (data.ai_feedback) {
        setFeedback(data.ai_feedback);
        setUseAiFeedback(true);
      }
      if (data.ai_band_score) {
        setOverallBand(data.ai_band_score);
      }
      if (data.ai_criteria_scores) {
        setCriteria({
          task_achievement: data.ai_criteria_scores.task_achievement || 6.0,
          coherence_cohesion: data.ai_criteria_scores.coherence_cohesion || 6.0,
          lexical_resource: data.ai_criteria_scores.lexical_resource || 6.0,
          grammatical_accuracy: data.ai_criteria_scores.grammatical_accuracy || 6.0,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await gradingApi.grade(submissionId, {
        band_score: overallBand,
        criteria_scores: criteria,
        feedback,
        is_draft: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitGrade = async () => {
    if (!confirm('Submit this grade? The student will be notified.')) return;

    setSaving(true);
    try {
      await gradingApi.grade(submissionId, {
        band_score: overallBand,
        criteria_scores: criteria,
        feedback,
        is_draft: false,
      });
      router.push('/teacher/classroom/grading');
    } catch (err: any) {
      alert(err.message || 'Failed to submit grade');
    } finally {
      setSaving(false);
    }
  };

  const handleAudioPlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setAudioProgress(progress);
  };

  const handleAudioReset = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setAudioProgress(0);
  };

  const copyAiFeedback = () => {
    if (assignment?.ai_feedback) {
      navigator.clipboard.writeText(assignment.ai_feedback);
    }
  };

  const getBandColor = (band: number) => {
    if (band >= 8) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
    if (band >= 7) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (band >= 6) return 'text-lime-600 bg-lime-100 dark:bg-lime-900/30';
    if (band >= 5) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    if (band >= 4) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const currentItem = assignment?.items?.[currentItemIndex];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Submission
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link
            href="/teacher/classroom/grading"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/teacher/classroom/grading"
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Grade Submission
                </h1>
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {assignment.student?.name || 'Unknown Student'}
                  </span>
                  {assignment.bundle && (
                    <span>• {assignment.bundle.title}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Saved
                </span>
              )}
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
              <button
                onClick={handleSubmitGrade}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Grade
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Split-Screen Content */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6 p-4 lg:p-6">
          {/* Left: Student Submission */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Student Submission
              </h2>
              {assignment.items && assignment.items.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                    disabled={currentItemIndex === 0}
                    className="p-1 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm">
                    {currentItemIndex + 1} / {assignment.items.length}
                  </span>
                  <button
                    onClick={() => setCurrentItemIndex(Math.min(assignment.items!.length - 1, currentItemIndex + 1))}
                    disabled={currentItemIndex === (assignment.items?.length || 1) - 1}
                    className="p-1 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
              {currentItem?.content_type === 'WRITING_TASK' && (
                <>
                  {/* Writing Task Info */}
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {currentItem.content_title}
                    </h3>
                    {currentItem.writing_prompt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentItem.writing_prompt}
                      </p>
                    )}
                  </div>

                  {/* Student Answer */}
                  <div className="prose dark:prose-invert max-w-none">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Student&apos;s Response ({currentItem.writing_answer?.split(/\s+/).length || 0} words)
                    </h4>
                    <div className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                      {currentItem.writing_answer || 'No response submitted'}
                    </div>
                  </div>
                </>
              )}

              {currentItem?.content_type === 'SPEAKING_TOPIC' && (
                <>
                  {/* Speaking Topic Info */}
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {currentItem.content_title}
                    </h3>
                    {currentItem.speaking_prompt && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentItem.speaking_prompt}
                      </p>
                    )}
                  </div>

                  {/* Audio Player */}
                  {currentItem.speaking_audio_url && (
                    <div className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <audio
                        ref={audioRef}
                        src={currentItem.speaking_audio_url}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                      />

                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleAudioPlayPause}
                          className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5 ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-100"
                              style={{ width: `${audioProgress}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleAudioReset}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          <RotateCcw className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: Grading Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mt-6 lg:mt-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Grading Panel
              </h2>
            </div>

            <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto space-y-6">
              {/* AI Feedback Banner */}
              {assignment.ai_feedback && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
                      <Sparkles className="h-4 w-4" />
                      AI Feedback Available
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyAiFeedback}
                        className="p-1.5 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg"
                        title="Copy AI feedback"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <span className={`px-2 py-0.5 text-sm font-medium rounded-full ${getBandColor(assignment.ai_band_score || 6)}`}>
                        Band {assignment.ai_band_score}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300 line-clamp-3">
                    {assignment.ai_feedback}
                  </p>
                  <button
                    onClick={() => {
                      setFeedback(assignment.ai_feedback || '');
                      setUseAiFeedback(true);
                    }}
                    className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Use AI feedback
                  </button>
                </div>
              )}

              {/* Overall Band Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Overall Band Score
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="9"
                    step="0.5"
                    value={overallBand}
                    onChange={(e) => setOverallBand(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className={`px-3 py-1.5 text-lg font-bold rounded-lg ${getBandColor(overallBand)}`}>
                    {overallBand.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Criteria Scores */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Criteria Breakdown
                </label>
                <div className="space-y-4">
                  {[
                    { key: 'task_achievement', label: 'Task Achievement' },
                    { key: 'coherence_cohesion', label: 'Coherence & Cohesion' },
                    { key: 'lexical_resource', label: 'Lexical Resource' },
                    { key: 'grammatical_accuracy', label: 'Grammatical Range & Accuracy' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-4">
                      <span className="w-40 text-sm text-gray-600 dark:text-gray-400">
                        {label}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="9"
                        step="0.5"
                        value={criteria[key as keyof BandCriteria]}
                        onChange={(e) =>
                          setCriteria((prev) => ({
                            ...prev,
                            [key]: parseFloat(e.target.value),
                          }))
                        }
                        className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="w-12 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        {criteria[key as keyof BandCriteria].toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Feedback for Student
                  </span>
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write detailed feedback for the student..."
                  rows={6}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                />
              </div>

              {/* Quick Feedback Buttons */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quick Insert:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Good use of vocabulary',
                    'Work on paragraph structure',
                    'Improve grammar accuracy',
                    'Expand on your ideas',
                    'Strong introduction',
                  ].map((text) => (
                    <button
                      key={text}
                      onClick={() => setFeedback((prev) => prev + (prev ? '\n' : '') + text)}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      + {text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
