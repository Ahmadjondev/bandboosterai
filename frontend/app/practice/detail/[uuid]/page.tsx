'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Clock,
  Target,
  Trophy,
  Play,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Lock,
  Zap,
  Crown,
} from 'lucide-react';
import {
  getSectionPracticeDetail,
  getDifficultyColor,
  formatTime,
  checkPracticeAccess,
  type PracticeAccessResponse,
} from '@/lib/api/section-practice';
import type { SectionPracticeDetail, SectionPracticeAttempt } from '@/types/section-practice';

// Helper types for content
interface ReadingPassageInfo {
  passage_number: number;
  title?: string;
  word_count?: number;
}

interface ListeningPartInfo {
  part_number: number;
  title?: string;
}

const sectionIcons = {
  LISTENING: Headphones,
  READING: BookOpen,
  WRITING: PenTool,
  SPEAKING: Mic,
};

const sectionColors = {
  LISTENING: {
    gradient: 'from-blue-500 to-cyan-500',
    light: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  READING: {
    gradient: 'from-green-500 to-emerald-500',
    light: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    button: 'bg-green-600 hover:bg-green-700',
  },
  WRITING: {
    gradient: 'from-purple-500 to-pink-500',
    light: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
  SPEAKING: {
    gradient: 'from-orange-500 to-amber-500',
    light: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-700',
  },
};

export default function PracticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const practiceUuid = params.uuid as string;

  const [practice, setPractice] = useState<SectionPracticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Access state
  const [accessInfo, setAccessInfo] = useState<PracticeAccessResponse | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);

  useEffect(() => {
    loadPractice();
  }, [practiceUuid]);

  const loadPractice = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSectionPracticeDetail(practiceUuid);
      setPractice(data);
      
      // Check access for premium content
      if (!data.is_free) {
        setAccessLoading(true);
        try {
          const access = await checkPracticeAccess(practiceUuid);
          setAccessInfo(access);
        } catch (accessErr) {
          console.error('Failed to check access:', accessErr);
          // Default to no access if check fails
          setAccessInfo({
            has_access: false,
            requires_payment: true,
            attempts_remaining: 0,
            is_free: false,
            reason: 'Failed to check access',
            practice_uuid: practiceUuid,
            practice_title: data.title,
            section_type: data.section_type,
          });
        } finally {
          setAccessLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load practice');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!practice) return;

    let targetUrl = `/practice-session/${practice.uuid}`;

    // Determine the target URL based on section type
    if (practice.section_type === 'READING') {
      targetUrl = `/practice-session/reading/${practice.uuid}`;
    } else if (practice.section_type === 'LISTENING') {
      targetUrl = `/practice-session/listening/${practice.uuid}`;
    } else if (practice.section_type === 'SPEAKING') {
      targetUrl = `/practice-session/speaking/${practice.uuid}`;
    } else if (practice.section_type === 'WRITING') {
      targetUrl = `/practice-session/writing/${practice.uuid}`;
    }

    // Use router.push with a fallback to window.location for network issues
    try {
      router.push(targetUrl);
      // Set a timeout to fallback to direct navigation if RSC fails
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
          window.location.href = targetUrl;
        }
      }, 3000);
    } catch {
      // Fallback to direct navigation on any error
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      }
    }
  };

  const handleContinue = () => {
    if (!practice) return;

    let targetUrl = `/practice-session/${practice.uuid}`;

    // Determine the target URL based on section type
    if (practice.section_type === 'READING') {
      targetUrl = `/practice-session/reading/${practice.uuid}`;
    } else if (practice.section_type === 'LISTENING') {
      targetUrl = `/practice-session/listening/${practice.uuid}`;
    } else if (practice.section_type === 'SPEAKING') {
      targetUrl = `/practice-session/speaking/${practice.uuid}`;
    } else if (practice.section_type === 'WRITING') {
      targetUrl = `/practice-session/writing/${practice.uuid}`;
    }

    // Use router.push with a fallback to window.location for network issues
    try {
      router.push(targetUrl);
      // Set a timeout to fallback to direct navigation if RSC fails
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
          window.location.href = targetUrl;
        }
      }, 3000);
    } catch {
      // Fallback to direct navigation on any error
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                Loading practice details...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !practice) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Failed to load
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Practice not found'}</p>
              <button
                onClick={loadPractice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const Icon = sectionIcons[practice.section_type];
  const colors = sectionColors[practice.section_type];
  const hasAttempts = practice.user_attempts.length > 0;
  const bestAttempt = practice.user_attempts.find(
    (a) => a.status === 'COMPLETED' && a.score !== null
  );
  
  // Check for in-progress attempt
  const inProgressAttempt = practice.user_attempts.find(
    (a) => a.status === 'IN_PROGRESS'
  );
  
  // Get speaking-specific info
  const speakingContent = practice.section_type === 'SPEAKING' ? practice.content as {
    id: number;
    topic: string;
    speaking_type: string;
    speaking_type_display: string;
    questions: Array<{ id: number; question_text: string; order: number }>;
  } | null : null;
  const speakingPartNumber = speakingContent ? parseInt(speakingContent.speaking_type.split('_')[1]) : null;

  // Get writing-specific info  
  const writingContent = practice.section_type === 'WRITING' ? practice.content as {
    id: number;
    task_type: 'TASK_1' | 'TASK_2';
    task_type_display: string;
    prompt: string;
    image_url: string | null;
    min_words: number;
  } | null : null;
  const writingTaskNumber = writingContent?.task_type === 'TASK_1' ? 1 : writingContent?.task_type === 'TASK_2' ? 2 : null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href={`/practice/${practice.section_type.toLowerCase()}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {practice.section_type_display} Practice
        </Link>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className={`bg-linear-to-r ${colors.gradient} p-6 text-white`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{(practice?.content as any)?.topic ?? practice.title}</h1>
                <div className="flex items-center gap-3 text-white/80">
                  <span className="capitalize">{practice.section_type_display}</span>
                  <span>•</span>
                  <span>{practice.difficulty_display}</span>
                </div>
              </div>
              {practice.is_free && (
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  Free
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Description */}
            {practice.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {practice.description}
              </p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                {practice.section_type === 'SPEAKING' && speakingPartNumber ? (
                  <>
                    <Mic className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      Part {speakingPartNumber}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Speaking</p>
                  </>
                ) : practice.section_type === 'READING' && (practice.content as ReadingPassageInfo)?.passage_number ? (
                  <>
                    <BookOpen className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      Passage {(practice.content as ReadingPassageInfo).passage_number}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reading</p>
                  </>
                ) : practice.section_type === 'LISTENING' && (practice.content as ListeningPartInfo)?.part_number ? (
                  <>
                    <Headphones className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      Part {(practice.content as ListeningPartInfo).part_number}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Listening</p>
                  </>
                ) : (
                  <>
                    <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {practice.duration}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Minutes</p>
                  </>
                )}
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {practice.duration}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Minutes</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {bestAttempt?.score != null ? Number(bestAttempt.score).toFixed(1) : '-'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
              </div>
            </div>

            {/* Reading-specific info */}
            {practice.section_type === 'READING' && (practice.content as ReadingPassageInfo) && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 text-xs font-bold rounded-full">
                    Passage {(practice.content as ReadingPassageInfo).passage_number}
                  </span>
                  {(practice.content as ReadingPassageInfo).title && (
                    <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                      {(practice.content as ReadingPassageInfo).title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {(practice.content as ReadingPassageInfo).word_count && (
                    <span>~{(practice.content as ReadingPassageInfo).word_count} words</span>
                  )}
                  <span>• Timed practice</span>
                </div>
              </div>
            )}

            {/* Listening-specific info */}
            {practice.section_type === 'LISTENING' && (practice.content as ListeningPartInfo) && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                    Part {(practice.content as ListeningPartInfo).part_number}
                  </span>
                  {(practice.content as ListeningPartInfo).title && (
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      {(practice.content as ListeningPartInfo).title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>Audio included</span>
                  <span>• One-time playback</span>
                </div>
              </div>
            )}

            {/* Speaking-specific info */}
            {practice.section_type === 'SPEAKING' && speakingContent && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 text-xs font-bold rounded-full">
                    Part {speakingPartNumber}
                  </span>
                  <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                    {speakingContent.speaking_type_display}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Topic: <span className="font-medium text-gray-900 dark:text-white">{speakingContent.topic}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {speakingContent.questions?.length || 0} question(s) • AI evaluation included
                </p>
              </div>
            )}

            {/* Writing-specific info */}
            {practice.section_type === 'WRITING' && writingContent && (
              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">
                    Task {writingTaskNumber}
                  </span>
                  <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                    {writingContent.task_type_display}
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Prompt:</p>
                  <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                    {writingContent.prompt}
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>Min. {writingContent.min_words} words</span>
                  {writingContent.image_url && <span>• Has visual</span>}
                  <span>• AI evaluation included</span>
                </div>
              </div>
            )}

            {/* Continue In-Progress Attempt Button */}
            {inProgressAttempt && (
              <button
                onClick={handleContinue}
                className="w-full py-4 mb-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Continue In-Progress Attempt
              </button>
            )}

            {/* Premium Access Info Card */}
            {!practice.is_free && accessInfo && (
              <div className={`mb-4 p-4 rounded-xl border ${
                accessInfo.has_access 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              }`}>
                <div className="flex items-center gap-3">
                  {accessInfo.has_access ? (
                    <>
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                        {accessInfo.is_unlimited ? (
                          <Crown className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">
                          {accessInfo.is_unlimited 
                            ? 'Unlimited Access' 
                            : `${accessInfo.attempts_remaining} attempt${accessInfo.attempts_remaining !== 1 ? 's' : ''} remaining`
                          }
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {accessInfo.reason}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
                        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-amber-700 dark:text-amber-300">
                          Premium Content
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {accessInfo.reason}
                        </p>
                      </div>
                      <Link
                        href="/pricing"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Get Access
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Loading access check */}
            {!practice.is_free && accessLoading && (
              <div className="mb-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent"></div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Checking access...</p>
                </div>
              </div>
            )}

            {/* Start Button - conditionally rendered based on access */}
            {practice.is_free || (accessInfo?.has_access && !accessLoading) ? (
              <button
                onClick={handleStart}
                className={`w-full py-4 ${colors.button} text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors`}
              >
                <Play className="w-5 h-5" />
                {hasAttempts ? 'Start New Attempt' : 'Start Practice'}
              </button>
            ) : !accessLoading && accessInfo && !accessInfo.has_access ? (
              <button
                disabled
                className="w-full py-4 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Lock className="w-5 h-5" />
                Unlock to Practice
              </button>
            ) : (
              <button
                disabled
                className="w-full py-4 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
                Loading...
              </button>
            )}
          </div>
        </div>

        {/* Previous Attempts */}
        {hasAttempts && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Previous Attempts
            </h2>
            <div className="space-y-3">
              {practice.user_attempts.map((attempt) => (
                <AttemptCard key={attempt.uuid} attempt={attempt} sectionType={practice.section_type} practiceUuid={practice.uuid} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface AttemptCardProps {
  attempt: SectionPracticeAttempt;
  sectionType: string;
  practiceUuid: string;
}

function AttemptCard({ attempt, sectionType, practiceUuid }: AttemptCardProps) {
  const router = useRouter();
  const isCompleted = attempt.status === 'COMPLETED';
  const isInProgress = attempt.status === 'IN_PROGRESS';
  const statusColors = {
    COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    IN_PROGRESS: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    ABANDONED: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
  };

  // Helper function to navigate with fallback for RSC fetch failures
  const navigateWithFallback = (targetUrl: string) => {
    try {
      router.push(targetUrl);
      // Set a timeout to fallback to direct navigation if RSC fails
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
          window.location.href = targetUrl;
        }
      }, 3000);
    } catch {
      // Fallback to direct navigation on any error
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      }
    }
  };
  
  const handleViewResults = () => {
    let targetUrl = `/practice/results/${attempt.uuid}`;
    if (sectionType === 'SPEAKING') {
      targetUrl = `/practice-session/speaking/results/${attempt.uuid}`;
    } else if (sectionType === 'WRITING') {
      targetUrl = `/practice-session/writing/results/${attempt.uuid}`;
    }
    navigateWithFallback(targetUrl);
  };

  const handleContinue = () => {
    let targetUrl = `/practice-session/${practiceUuid}`;
    if (sectionType === 'READING') {
      targetUrl = `/practice-session/reading/${practiceUuid}`;
    } else if (sectionType === 'LISTENING') {
      targetUrl = `/practice-session/listening/${practiceUuid}`;
    } else if (sectionType === 'SPEAKING') {
      targetUrl = `/practice-session/speaking/${practiceUuid}`;
    } else if (sectionType === 'WRITING') {
      targetUrl = `/practice-session/writing/${practiceUuid}`;
    }
    navigateWithFallback(targetUrl);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : isInProgress ? (
            <RefreshCw className="w-5 h-5 text-yellow-500" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(attempt.started_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{formatTime(attempt.time_spent_seconds)}</span>
              {isCompleted && (
                <>
                  <span>•</span>
                  <span>
                    {attempt.correct_answers}/{attempt.total_questions} correct
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isInProgress && (
            <button
              onClick={handleContinue}
              className="px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors flex items-center gap-1"
            >
              Continue
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {isCompleted && (
            <>
              <button
                onClick={handleViewResults}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center gap-1"
              >
                View Results
                <ArrowRight className="w-3 h-3" />
              </button>
              {attempt.score != null && (
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {Number(attempt.score).toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Band Score</p>
                </div>
              )}
            </>
          )}
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[attempt.status]}`}
          >
            {attempt.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}
