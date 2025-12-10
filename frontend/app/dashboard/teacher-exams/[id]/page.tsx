'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Play,
  CheckCircle,
  Lock,
  Unlock,
  Info,
  Trophy,
  Star,
  Target,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { studentTeacherExamApi } from '@/lib/student-teacher-api';
import type { TeacherExam, TeacherExamAttempt } from '@/types/teacher';

export default function StudentExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = parseInt(params.id as string);

  const [exam, setExam] = useState<TeacherExam | null>(null);
  const [attempt, setAttempt] = useState<TeacherExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  // Check if exam can be started based on start_date
  const examStatus = useMemo(() => {
    if (!exam) return { canStart: false, message: '' };
    
    const now = new Date();
    
    if (exam.start_date) {
      const startDate = new Date(exam.start_date);
      if (now < startDate) {
        return {
          canStart: false,
          isNotStarted: true,
          startDate,
          message: `Exam starts on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        };
      }
    }
    
    if (exam.end_date) {
      const endDate = new Date(exam.end_date);
      if (now > endDate) {
        return {
          canStart: false,
          isEnded: true,
          endDate,
          message: `Exam ended on ${endDate.toLocaleDateString()}`
        };
      }
    }
    
    return { canStart: true, message: '' };
  }, [exam]);

  // Countdown timer for exams that haven't started yet
  useEffect(() => {
    if (!examStatus.isNotStarted || !examStatus.startDate) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = examStatus.startDate!.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown(null);
        // Refresh exam data when countdown reaches zero
        loadExamData();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [examStatus.isNotStarted, examStatus.startDate]);

  useEffect(() => {
    loadExamData();
  }, [examId]);

  const loadExamData = async () => {
    try {
      setLoading(true);
      const [examData, attemptData] = await Promise.all([
        studentTeacherExamApi.getExamDetail(examId),
        studentTeacherExamApi.getMyAttempt(examId).catch(() => null),
      ]);
      setExam(examData);
      setAttempt(attemptData);
    } catch (error) {
      console.error('Failed to load exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    // Double-check start time before allowing
    if (!examStatus.canStart) {
      alert(examStatus.message);
      return;
    }

    if (!confirm('Are you ready to start this exam? Make sure you have enough time to complete it.')) return;

    try {
      setStarting(true);
      const newAttempt = await studentTeacherExamApi.startExam(examId);
      // Navigate to exam taking interface with attempt UUID
      if (newAttempt.uuid) {
        router.push(`/exam/${newAttempt.uuid}`);
      } else {
        alert('Failed to get exam attempt ID');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to start exam');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Exam not found</p>
        </div>
      </div>
    );
  }

  const hasAttempt = !!attempt;
  const isCompleted = attempt?.status === 'COMPLETED' || attempt?.status === 'GRADED';
  const isGraded = attempt?.status === 'GRADED';
  console.log("exam.results_visible", exam.results_visible)
  console.log("isGraded", isGraded)
  const canViewResults = isGraded && exam?.results_visible;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/teacher-exams"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Exams
        </Link>

        <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-blue-100 text-sm mb-2">
                {exam.is_public ? (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Public Exam</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Private Exam</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
              {exam.description && (
                <p className="text-blue-100 text-lg">{exam.description}</p>
              )}
            </div>

            {hasAttempt && (
              <div className="ml-4">
                {canViewResults ? (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                    <Star className="h-8 w-8 mx-auto mb-2" />
                    <div className="text-3xl font-bold">
                      {attempt.overall_band ? Number(attempt.overall_band).toFixed(1) : '-'}
                    </div>
                    <div className="text-sm text-blue-100">Overall Band</div>
                  </div>
                ) : isCompleted ? (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Completed</div>
                  </div>
                ) : (
                  <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4">
                    <Clock className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">In Progress</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exam Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Exam Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={<User />} label="Teacher" value={exam.teacher.full_name} />
              {exam.duration_minutes && (
                <InfoItem
                  icon={<Clock />}
                  label="Duration"
                  value={`${exam.duration_minutes} minutes`}
                />
              )}
              {exam.start_date && (
                <InfoItem
                  icon={<Calendar />}
                  label="Start Date"
                  value={new Date(exam.start_date).toLocaleDateString()}
                />
              )}
              {exam.end_date && (
                <InfoItem
                  icon={<Calendar />}
                  label="End Date"
                  value={new Date(exam.end_date).toLocaleDateString()}
                />
              )}
            </div>
          </div>

          {/* Attempt Status / Results */}
          {hasAttempt && canViewResults && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Your Results
              </h2>

              {/* Section Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <ScoreCard label="Listening" score={attempt.listening_score} />
                <ScoreCard label="Reading" score={attempt.reading_score} />
                <ScoreCard label="Writing" score={attempt.writing_score} />
                <ScoreCard label="Speaking" score={attempt.speaking_score} />
              </div>

              {/* Overall Band */}
              {attempt.overall_band && (
                <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 text-center mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Band Score</p>
                  <p className="text-5xl font-bold text-blue-600">{Number(attempt.overall_band).toFixed(1)}</p>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              {((attempt.strengths && attempt.strengths.length > 0) || 
                (attempt.weaknesses && attempt.weaknesses.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attempt.strengths && attempt.strengths.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Strengths
                      </h3>
                      <ul className="space-y-1">
                        {attempt.strengths.map((strength, index) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {attempt.weaknesses && attempt.weaknesses.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Areas to Improve
                      </h3>
                      <ul className="space-y-1">
                        {attempt.weaknesses.map((weakness, index) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-orange-500">•</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* View Detailed Results */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href={`/dashboard/results?attempt=${attempt.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Trophy className="h-5 w-5" />
                  View Detailed Results
                </Link>
              </div>
            </div>
          )}

          {hasAttempt && !canViewResults && isCompleted && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
              <CheckCircle className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Exam Submitted
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {isGraded && !exam.results_visible
                  ? 'Your exam has been graded. Results will be visible when your teacher makes them available.'
                  : 'Your exam has been submitted and is waiting for teacher evaluation.'}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>

            {!hasAttempt ? (
              <>
                {/* Show countdown or start button */}
                {examStatus.isNotStarted ? (
                  <div className="text-center py-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-4">
                      <Timer className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                        Exam hasn&apos;t started yet
                      </p>
                      {countdown && (
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-300 font-mono">
                          {countdown}
                        </div>
                      )}
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        {examStatus.message}
                      </p>
                    </div>
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl cursor-not-allowed font-semibold"
                    >
                      <Lock className="h-5 w-5" />
                      Wait for Start Time
                    </button>
                  </div>
                ) : examStatus.isEnded ? (
                  <div className="text-center py-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4">
                      <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                        Exam has ended
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {examStatus.message}
                      </p>
                    </div>
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl cursor-not-allowed font-semibold"
                    >
                      <Lock className="h-5 w-5" />
                      Exam Closed
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartExam}
                    disabled={starting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                  >
                    <Play className="h-5 w-5" />
                    {starting ? 'Starting...' : 'Start Exam'}
                  </button>
                )}
              </>
            ) : attempt?.status === 'IN_PROGRESS' && attempt?.uuid ? (
              <Link
                href={`/exam/${attempt.uuid}`}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                <Play className="h-5 w-5" />
                Continue Exam
              </Link>
            ) : canViewResults ? (
              <Link
                href={`/dashboard/results?attempt=${attempt.id}`}
                className="block w-full text-center px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
              >
                View Full Results
              </Link>
            ) : isCompleted ? (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Exam submitted, awaiting grading
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Exam status unknown
                </p>
              </div>
            )}
          </div>

          {/* Exam Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Settings
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${exam.auto_grade_listening ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Auto-grade Listening: {exam.auto_grade_listening ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${exam.auto_grade_reading ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-gray-700 dark:text-gray-300">
                  Auto-grade Reading: {exam.auto_grade_reading ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        <p className="font-medium text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

interface ScoreCardProps {
  label: string;
  score?: number | null;
}

function ScoreCard({ label, score }: ScoreCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-blue-600">
        {score !== null && score !== undefined ? Number(score).toFixed(1) : '-'}
      </p>
    </div>
  );
}
