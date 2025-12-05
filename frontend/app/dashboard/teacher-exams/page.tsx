'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Clock, 
  Users, 
  Lock, 
  Unlock,
  Search,
  KeyRound,
  Calendar,
  Trophy,
  Play,
  Eye,
  CheckCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Headphones,
  BookOpenCheck,
  PenTool,
  Mic
} from 'lucide-react';
import { studentTeacherExamApi } from '@/lib/student-teacher-api';
import type { TeacherExam } from '@/types/teacher';

export default function StudentTeacherExamsPage() {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await studentTeacherExamApi.getMyExams();
      setExams(data);
    } catch (error: any) {
      console.error('Failed to load exams:', error);
      console.error('Error details:', error?.message, error?.response);
      // Set empty array on error to show empty state
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!accessCode.trim()) return;

    try {
      setJoining(true);
      await studentTeacherExamApi.joinExam(accessCode);
      setShowJoinModal(false);
      setAccessCode('');
      await loadExams();
      alert('Successfully joined the exam!');
    } catch (error: any) {
      alert(error.message || 'Failed to join exam');
    } finally {
      setJoining(false);
    }
  };

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: exams.length,
    completed: exams.filter(e => e.my_attempt?.status === 'COMPLETED' || e.my_attempt?.status === 'GRADED').length,
    inProgress: exams.filter(e => e.my_attempt?.status === 'IN_PROGRESS').length,
    graded: exams.filter(e => e.my_attempt?.status === 'GRADED' && e.results_visible).length,
    avgScore: exams.filter(e => e.my_attempt?.overall_band).reduce((acc, e) => acc + (e.my_attempt?.overall_band || 0), 0) / (exams.filter(e => e.my_attempt?.overall_band).length || 1)
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header with gradient */}
      <div className="relative mb-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Trophy className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Teacher Exams</h1>
                  <p className="text-blue-100 mt-1">
                    Take exams assigned by your teachers and track your progress
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-semibold shadow-lg shadow-blue-900/20"
            >
              <KeyRound className="h-5 w-5" />
              Join with Code
            </button>
          </div>

          {/* Quick Stats */}
          {exams.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-blue-100">Total Exams</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-xs text-blue-100">Completed</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Star className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.graded}</p>
                    <p className="text-xs text-blue-100">Graded</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.graded > 0 ? stats.avgScore.toFixed(1) : '-'}</p>
                    <p className="text-xs text-blue-100">Avg. Band</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white shadow-sm"
          />
        </div>
      </div>

      {/* Exams Grid */}
      {filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-fit mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No exams found' : 'No exams available'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Join an exam using an access code provided by your teacher to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                <KeyRound className="h-5 w-5" />
                Join with Access Code
              </button>
            )}
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
                <KeyRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Join Exam</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter the access code provided by your teacher
                </p>
              </div>
            </div>

            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="Enter access code"
              className="w-full px-4 py-3.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-4 text-center text-lg font-mono tracking-wider"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinWithCode()}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setAccessCode('');
                }}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinWithCode}
                disabled={joining || !accessCode.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all font-medium"
              >
                {joining ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Joining...
                  </span>
                ) : (
                  'Join Exam'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ExamCardProps {
  exam: TeacherExam;
}

function ExamCard({ exam }: ExamCardProps) {
  const attempt = exam.my_attempt;
  const hasAttempt = !!attempt;
  const isCompleted = attempt?.status === 'COMPLETED' || attempt?.status === 'GRADED';
  const isGraded = attempt?.status === 'GRADED';
  const isInProgress = attempt?.status === 'IN_PROGRESS';
  const hasResults = isGraded && exam.results_visible && attempt?.overall_band;

  // Get status badge info
  const getStatusInfo = () => {
    if (!hasAttempt) {
      return { label: 'Not Started', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: BookOpen };
    }
    if (isInProgress) {
      return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock };
    }
    if (isGraded && exam.results_visible) {
      return { label: 'Graded', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle };
    }
    if (isCompleted) {
      return { label: 'Awaiting Grade', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock };
    }
    return { label: 'Unknown', color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Get gradient based on status
  const getGradient = () => {
    if (hasResults) return 'from-emerald-500 via-green-500 to-teal-500';
    if (isInProgress) return 'from-amber-500 via-orange-500 to-yellow-500';
    if (isCompleted) return 'from-blue-500 via-indigo-500 to-purple-500';
    return 'from-blue-500 via-purple-500 to-pink-500';
  };

  return (
    <Link href={`/dashboard/teacher-exams/${exam.id}`}>
      <div className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:border-transparent hover:-translate-y-1 transition-all duration-300">
        {/* Gradient Header */}
        <div className={`relative h-28 bg-gradient-to-r ${getGradient()} p-5`}>
          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
          
          {/* Status Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </div>
            
            <div className="flex items-center gap-1.5 text-white/80 text-xs">
              {exam.is_public ? (
                <>
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Private</span>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="relative z-10 mt-4 text-lg font-bold text-white line-clamp-1 group-hover:line-clamp-2">
            {exam.title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Results Banner - Show if graded with visible results */}
          {hasResults && (
            <div className="mb-4 -mx-5 -mt-5 px-5 py-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-b border-emerald-100 dark:border-emerald-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                    <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Overall Band</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {Number(attempt.overall_band).toFixed(1)}
                    </p>
                  </div>
                </div>
                
                {/* Mini Score Badges */}
                <div className="flex gap-1.5">
                  {attempt.listening_score && (
                    <div className="flex flex-col items-center px-2 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Headphones className="h-3 w-3 text-blue-500 mb-0.5" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{Number(attempt.listening_score).toFixed(1)}</span>
                    </div>
                  )}
                  {attempt.reading_score && (
                    <div className="flex flex-col items-center px-2 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <BookOpenCheck className="h-3 w-3 text-green-500 mb-0.5" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{Number(attempt.reading_score).toFixed(1)}</span>
                    </div>
                  )}
                  {attempt.writing_score && (
                    <div className="flex flex-col items-center px-2 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <PenTool className="h-3 w-3 text-purple-500 mb-0.5" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{Number(attempt.writing_score).toFixed(1)}</span>
                    </div>
                  )}
                  {attempt.speaking_score && (
                    <div className="flex flex-col items-center px-2 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                      <Mic className="h-3 w-3 text-orange-500 mb-0.5" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{Number(attempt.speaking_score).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* In Progress Banner */}
          {isInProgress && (
            <div className="mb-4 -mx-5 -mt-5 px-5 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-b border-amber-100 dark:border-amber-800/30">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></div>
                  <div className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></div>
                </div>
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Continue where you left off</span>
              </div>
            </div>
          )}

          {/* Awaiting Grade Banner */}
          {isCompleted && !isGraded && (
            <div className="mb-4 -mx-5 -mt-5 px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Submitted • Awaiting teacher review</span>
              </div>
            </div>
          )}

          {/* Description */}
          {exam.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
              {exam.description}
            </p>
          )}

          {/* Exam Details */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                <Users className="h-3.5 w-3.5 text-gray-500" />
              </div>
              <span className="truncate">{exam.teacher.full_name}</span>
            </div>
            
            {exam.duration_minutes && (
              <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <span>{exam.duration_minutes} minutes</span>
              </div>
            )}

            {exam.start_date && (
              <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <span>{new Date(exam.start_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className={`flex items-center justify-between font-semibold transition-colors ${
              hasResults 
                ? 'text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700' 
                : isInProgress
                  ? 'text-amber-600 dark:text-amber-400 group-hover:text-amber-700'
                  : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-700'
            }`}>
              <span>
                {hasResults ? 'View Results' : isInProgress ? 'Continue Exam' : isCompleted ? 'View Details' : 'Start Exam'}
              </span>
              {hasResults ? (
                <TrendingUp className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
              ) : isInProgress ? (
                <Play className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
              ) : (
                <Eye className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
              )}
            </div>
          </div>
        </div>

        {/* Decorative corner gradient */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>
      </div>
    </Link>
  );
}
