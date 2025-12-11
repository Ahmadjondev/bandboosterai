'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  FileText,
  Plus,
  Search,
  Copy,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
  AlertCircle,
  Loader2,
  RefreshCw,
  Link2,
  QrCode,
} from 'lucide-react';
import { classroomApi } from '@/lib/classroom-api';
import type { ClassroomList } from '@/types/classroom';
import CreateClassroomModal from '@/components/classroom/CreateClassroomModal';

export default function ClassroomListPage() {
  const [classrooms, setClassrooms] = useState<ClassroomList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await classroomApi.list();
      setClassrooms(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClassrooms();
    setRefreshing(false);
  };

  const handleCopyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleToggleInvites = async (classroomId: number) => {
    try {
      const result = await classroomApi.toggleInvites(classroomId);
      setClassrooms(prev =>
        prev.map(c =>
          c.id === classroomId ? { ...c, invite_enabled: result.invite_enabled } : c
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle invites');
    }
  };

  const handleClassroomCreated = () => {
    setShowCreateModal(false);
    loadClassrooms();
  };

  const filteredClassrooms = classrooms.filter(classroom =>
    classroom.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 mx-auto" />
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute inset-0 mx-auto" />
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading your classrooms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Classrooms
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadClassrooms}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            My Classrooms
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage your classes, assign exams, and track student progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Create Classroom
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search classrooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredClassrooms.length === 0 && !searchQuery && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Classrooms Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Create your first classroom to start assigning exams and tracking student progress.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Create Your First Classroom
          </button>
        </div>
      )}

      {/* Search No Results */}
      {filteredClassrooms.length === 0 && searchQuery && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Classrooms Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No classrooms match &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Classroom Grid */}
      {filteredClassrooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClassrooms.map((classroom) => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              onCopyInvite={handleCopyInvite}
              onToggleInvites={handleToggleInvites}
              copiedCode={copiedCode}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateClassroomModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleClassroomCreated}
        />
      )}
    </div>
  );
}

interface ClassroomCardProps {
  classroom: ClassroomList;
  onCopyInvite: (code: string) => void;
  onToggleInvites: (id: number) => void;
  copiedCode: string | null;
}

function ClassroomCard({ classroom, onCopyInvite, onToggleInvites, copiedCode }: ClassroomCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href={`/teacher/classroom/${classroom.id}`}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
            >
              {classroom.name}
            </Link>
            {classroom.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {classroom.description}
              </p>
            )}
          </div>
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <Link
                    href={`/teacher/classroom/${classroom.id}`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    View Classroom
                  </Link>
                  <button
                    onClick={() => {
                      onToggleInvites(classroom.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {classroom.invite_enabled ? 'Disable' : 'Enable'} Invites
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-5 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
            {classroom.student_count}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
            {classroom.assignment_count}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Assignments</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
            {classroom.pending_grading}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">To Grade</p>
        </div>
      </div>

      {/* Invite Code Section */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-mono ${
                classroom.invite_enabled
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-500 line-through'
              }`}
            >
              {classroom.invite_code}
            </span>
            {classroom.invite_enabled ? (
              <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                Active
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">
                Disabled
              </span>
            )}
          </div>
          <button
            onClick={() => onCopyInvite(classroom.invite_code)}
            disabled={!classroom.invite_enabled}
            className={`p-1.5 rounded-lg transition-colors ${
              classroom.invite_enabled
                ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            {copiedCode === classroom.invite_code ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 pb-5 flex gap-2">
        <Link
          href={`/teacher/classroom/${classroom.id}`}
          className="flex-1 px-3 py-2 text-center text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          Open Classroom
        </Link>
        <Link
          href={`/teacher/classroom/${classroom.id}/assign`}
          className="flex-1 px-3 py-2 text-center text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
        >
          New Assignment
        </Link>
      </div>
    </div>
  );
}
