'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Search, Filter, Eye, Edit, Trash2, CheckCircle2, Clock, FileText, Users, Calendar } from 'lucide-react';
import { teacherExamApi } from '@/lib/teacher-api';
import type { TeacherExam } from '@/types/teacher';

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await teacherExamApi.getExams();
      setExams(data);
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) return;
    
    try {
      await teacherExamApi.deleteExam(id);
      await loadExams();
    } catch (error) {
      console.error('Failed to delete exam:', error);
      alert('Failed to delete exam');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Stats
  const stats = {
    total: exams.length,
    draft: exams.filter(e => e.status === 'DRAFT').length,
    published: exams.filter(e => e.status === 'PUBLISHED').length,
    archived: exams.filter(e => e.status === 'ARCHIVED').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">My Exams</h1>
              <p className="mt-2 text-blue-100">
                Create and manage your exams
              </p>
            </div>
            <Link
              href="/teacher/exams/create"
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-lg"
            >
              <PlusCircle className="h-5 w-5" />
              Create Exam
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-blue-100">Total Exams</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{stats.draft}</div>
              <div className="text-sm text-blue-100">Drafts</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{stats.published}</div>
              <div className="text-sm text-blue-100">Published</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold">{stats.archived}</div>
              <div className="text-sm text-blue-100">Archived</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Exams Grid */}
        {filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No exams found' : 'No exams yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first exam to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                href="/teacher/exams/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="h-5 w-5" />
                Create Exam
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ExamCardProps {
  exam: TeacherExam;
  onDelete: (id: number, title: string) => void;
}

function ExamCard({ exam, onDelete }: ExamCardProps) {
  // Status configuration with icons
  const statusConfig: Record<string, { bg: string; icon: any }> = {
    DRAFT: { bg: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: Clock },
    PUBLISHED: { bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
    ARCHIVED: { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: FileText },
  };
  
  const StatusIcon = statusConfig[exam.status]?.icon || FileText;
  const formattedDate = new Date(exam.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all group">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <Link href={`/teacher/exams/${exam.id}`} className="block group-hover:text-blue-600 transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1">
                {exam.title}
              </h3>
            </Link>
            {exam.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {exam.description}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${statusConfig[exam.status]?.bg || 'bg-gray-100 text-gray-800'}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {exam.status}
          </span>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-1">
              <Users className="h-3.5 w-3.5" />
              Students
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {exam.assigned_students_count || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Attempts</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {exam.total_attempts || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Completed</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {exam.completed_attempts || 0}
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <Calendar className="h-3.5 w-3.5" />
          <span>Created {formattedDate}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/exams/${exam.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Eye className="h-4 w-4" />
            View
          </Link>
          {exam.status === 'DRAFT' && (
            <Link
              href={`/teacher/exams/${exam.id}/edit`}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          )}
          {exam.status !== 'ARCHIVED' && (
            <button
              onClick={() => onDelete(exam.id, exam.title)}
              className="flex items-center justify-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete exam"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
