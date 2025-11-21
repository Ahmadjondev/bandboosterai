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
  Eye
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
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header with gradient */}
      <div className="relative mb-8 bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Teacher Exams</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Take exams assigned by your teachers and track your progress
          </p>
        </div>
      </div>

      {/* Search and Join */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
        >
          <KeyRound className="h-5 w-5" />
          Join with Access Code
        </button>
      </div>

      {/* Exams Grid */}
      {filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No exams available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery ? 'No exams match your search' : 'Join an exam using an access code to get started'}
          </p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <KeyRound className="h-5 w-5" />
            Join with Code
          </button>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <KeyRound className="h-6 w-6 text-blue-600" />
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
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-4"
              onKeyPress={(e) => e.key === 'Enter' && handleJoinWithCode()}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setAccessCode('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinWithCode}
                disabled={joining || !accessCode.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {joining ? 'Joining...' : 'Join Exam'}
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
  return (
    <Link href={`/dashboard/teacher-exams/${exam.id}`}>
      <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300">
        {/* Header with gradient */}
        <div className="relative h-32 bg-linear-to-br from-blue-500 to-purple-600 p-6">
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-white/90 text-sm mb-2">
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
            <h3 className="text-xl font-bold text-white truncate">
              {exam.title}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {exam.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
              {exam.description}
            </p>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Users className="h-4 w-4 text-gray-400" />
              <span>{exam.teacher.full_name}</span>
            </div>
            
            {exam.duration_minutes && (
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{exam.duration_minutes} minutes</span>
              </div>
            )}

            {exam.start_date && (
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{new Date(exam.start_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300">
              <span>View Details</span>
              <Eye className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
