'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Users, 
  Calendar,
  MoreHorizontal,
  Archive,
  Globe,
  Lock,
  BarChart3,
  TrendingUp,
  Copy,
  Settings,
  ChevronDown,
  Sparkles,
  GraduationCap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { teacherExamApi, teacherDashboardApi } from '@/lib/teacher-api';
import type { TeacherExam, ExamAnalytics } from '@/types/teacher';

type ViewMode = 'grid' | 'table';

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [examAnalytics, setExamAnalytics] = useState<ExamAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [actionMenuOpen, setActionMenuOpen] = useState<number | null>(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const [examsData, analyticsData] = await Promise.all([
        teacherExamApi.getExams(),
        teacherDashboardApi.getExamAnalytics(),
      ]);
      setExams(examsData);
      setExamAnalytics(analyticsData);
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

  const getAnalyticsForExam = (examId: number) => {
    return examAnalytics.find(a => a.id === examId);
  };

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

  const handlePublish = async (id: number) => {
    try {
      await teacherExamApi.publishExam(id);
      await loadExams();
    } catch (error) {
      console.error('Failed to publish exam:', error);
      alert('Failed to publish exam');
    }
  };

  const handleUnpublish = async (id: number) => {
    try {
      await teacherExamApi.unpublishExam(id);
      await loadExams();
    } catch (error) {
      console.error('Failed to unpublish exam:', error);
      alert('Failed to unpublish exam');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await teacherExamApi.toggleExamStatus(id);
      await loadExams();
    } catch (error) {
      console.error('Failed to toggle exam status:', error);
      alert('Failed to toggle exam status');
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await teacherExamApi.archiveExam(id);
      await loadExams();
    } catch (error) {
      console.error('Failed to archive exam:', error);
      alert('Failed to archive exam');
    }
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 mx-auto"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute inset-0 mx-auto"></div>
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading exams...</p>
        </div>
      </div>
    );
  }

  // Stats
  const stats = {
    total: exams.length,
    draft: exams.filter(e => e.status === 'DRAFT').length,
    published: exams.filter(e => e.status === 'PUBLISHED').length,
    archived: exams.filter(e => e.status === 'ARCHIVED').length,
    totalAttempts: exams.reduce((sum, e) => sum + (e.total_attempts || 0), 0),
    totalStudents: exams.reduce((sum, e) => sum + (e.assigned_students_count || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden relative">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-400/10 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">My Exams</h1>
              </div>
              <p className="text-purple-100 text-lg">
                Create, manage, and track your IELTS exams
              </p>
            </div>
            <Link
              href="/teacher/exams/create"
              className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all shadow-lg"
            >
              <PlusCircle className="h-5 w-5" />
              Create New Exam
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-8">
            <StatBadge label="Total" value={stats.total} icon={<FileText className="h-4 w-4" />} />
            <StatBadge label="Draft" value={stats.draft} icon={<Clock className="h-4 w-4" />} highlight="gray" />
            <StatBadge label="Published" value={stats.published} icon={<CheckCircle2 className="h-4 w-4" />} highlight="green" />
            <StatBadge label="Archived" value={stats.archived} icon={<Archive className="h-4 w-4" />} highlight="orange" />
            <StatBadge label="Students" value={stats.totalStudents} icon={<Users className="h-4 w-4" />} />
            <StatBadge label="Attempts" value={stats.totalAttempts} icon={<BarChart3 className="h-4 w-4" />} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters & Search */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="flex-1 w-full lg:max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search exams by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                {[
                  { id: 'all', label: 'All', icon: FileText },
                  { id: 'DRAFT', label: 'Draft', icon: Clock },
                  { id: 'PUBLISHED', label: 'Published', icon: CheckCircle2 },
                  { id: 'ARCHIVED', label: 'Archived', icon: Archive },
                ].map((status) => {
                  const Icon = status.icon;
                  return (
                    <button
                      key={status.id}
                      onClick={() => setStatusFilter(status.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        statusFilter === status.id
                          ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{status.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={loadExams}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredExams.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  analytics={getAnalyticsForExam(exam.id)}
                  onDelete={handleDelete}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onToggleStatus={handleToggleStatus}
                  onArchive={handleArchive}
                  onCopyCode={copyAccessCode}
                />
              ))}
            </div>
          ) : (
            <ExamsTable
              exams={filteredExams}
              analytics={examAnalytics}
              onDelete={handleDelete}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onToggleStatus={handleToggleStatus}
              onArchive={handleArchive}
              onCopyCode={copyAccessCode}
            />
          )
        ) : (
          <EmptyState
            hasFilters={searchQuery !== '' || statusFilter !== 'all'}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        )}
      </div>
    </div>
  );
}

// Stat Badge Component
interface StatBadgeProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: 'green' | 'orange' | 'gray';
}

function StatBadge({ label, value, icon, highlight }: StatBadgeProps) {
  const bgClass = highlight === 'green' 
    ? 'bg-green-500/20' 
    : highlight === 'orange' 
    ? 'bg-orange-500/20' 
    : highlight === 'gray'
    ? 'bg-gray-500/20'
    : 'bg-white/10';

  return (
    <div className={`p-3 rounded-xl backdrop-blur-sm ${bgClass}`}>
      <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

// Exam Card Component
interface ExamCardProps {
  exam: TeacherExam;
  analytics?: ExamAnalytics;
  onDelete: (id: number, title: string) => void;
  onPublish: (id: number) => void;
  onUnpublish: (id: number) => void;
  onToggleStatus: (id: number) => void;
  onArchive: (id: number) => void;
  onCopyCode: (code: string) => void;
}

function ExamCard({ exam, analytics, onDelete, onPublish, onUnpublish, onToggleStatus, onArchive, onCopyCode }: ExamCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  
  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggleStatus(exam.id);
    } finally {
      setToggling(false);
    }
  };
  
  const statusConfig = {
    DRAFT: { 
      bg: 'bg-gray-100 dark:bg-gray-700', 
      text: 'text-gray-700 dark:text-gray-300',
      icon: Clock,
      dot: 'bg-gray-400',
    },
    PUBLISHED: { 
      bg: 'bg-green-100 dark:bg-green-900/30', 
      text: 'text-green-700 dark:text-green-400',
      icon: CheckCircle2,
      dot: 'bg-green-500',
    },
    ARCHIVED: { 
      bg: 'bg-orange-100 dark:bg-orange-900/30', 
      text: 'text-orange-700 dark:text-orange-400',
      icon: Archive,
      dot: 'bg-orange-500',
    },
  };
  
  const config = statusConfig[exam.status];
  const StatusIcon = config.icon;

  const getScoreColor = (score?: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 7) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 6) return 'text-green-600 dark:text-green-400';
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group">
      {/* Header with gradient based on status */}
      <div className={`h-2 ${
        exam.status === 'PUBLISHED' 
          ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
          : exam.status === 'DRAFT'
          ? 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500'
          : 'bg-gradient-to-r from-orange-400 to-amber-500'
      }`} />
      
      <div className="p-5">
        {/* Top Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Link 
              href={`/teacher/exams/${exam.id}`} 
              className="block hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {exam.title}
              </h3>
            </Link>
            {exam.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                {exam.description}
              </p>
            )}
          </div>
          
          {/* Actions Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <Link
                    href={`/teacher/exams/${exam.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Link>
                  {exam.status === 'DRAFT' && (
                    <>
                      <Link
                        href={`/teacher/exams/${exam.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Link>
                      <button
                        onClick={() => { onPublish(exam.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Publish
                      </button>
                    </>
                  )}
                  {exam.status === 'PUBLISHED' && (
                    <>
                      <button
                        onClick={() => { onUnpublish(exam.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Clock className="h-4 w-4" />
                        Unpublish (Draft)
                      </button>
                      <button
                        onClick={() => { onArchive(exam.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                    </>
                  )}
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => { onDelete(exam.id, exam.title); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Toggle & Access */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {exam.is_public ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                <Globe className="h-3 w-3" />
                Public
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full">
                <Lock className="h-3 w-3" />
                Private
              </span>
            )}
            
            {exam.access_code && (
              <button
                onClick={() => onCopyCode(exam.access_code!)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                title="Click to copy"
              >
                <Copy className="h-3 w-3" />
                {exam.access_code}
              </button>
            )}
          </div>
          
          {/* Publish/Draft Toggle */}
          {exam.status !== 'ARCHIVED' && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                exam.status === 'PUBLISHED'
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={exam.status === 'PUBLISHED' ? 'Click to unpublish' : 'Click to publish'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  exam.status === 'PUBLISHED' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              <span className="sr-only">
                {exam.status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </span>
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {exam.assigned_students_count || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Students</div>
          </div>
          <div className="text-center border-x border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {exam.total_attempts || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Attempts</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div className={`text-xl font-bold ${getScoreColor(analytics?.average_score)}`}>
              {analytics?.average_score ? Number(analytics.average_score).toFixed(1) : '-'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Avg Score</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(exam.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
          
          <Link
            href={`/teacher/exams/${exam.id}`}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            View
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Exams Table Component
interface ExamsTableProps {
  exams: TeacherExam[];
  analytics: ExamAnalytics[];
  onDelete: (id: number, title: string) => void;
  onPublish: (id: number) => void;
  onUnpublish: (id: number) => void;
  onToggleStatus: (id: number) => void;
  onArchive: (id: number) => void;
  onCopyCode: (code: string) => void;
}

function ExamsTable({ exams, analytics, onDelete, onPublish, onUnpublish, onToggleStatus, onArchive, onCopyCode }: ExamsTableProps) {
  const getAnalytics = (id: number) => analytics.find(a => a.id === id);
  
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      case 'ARCHIVED':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Exam
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Access
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Students
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Attempts
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Avg Score
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {exams.map((exam) => {
              const examAnalytics = getAnalytics(exam.id);
              return (
                <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/teacher/exams/${exam.id}`} className="block hover:text-indigo-600 transition-colors">
                      <div className="font-medium text-gray-900 dark:text-white">{exam.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {exam.description || 'No description'}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(exam.status)}`}>
                        {exam.status}
                      </span>
                      {exam.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => onToggleStatus(exam.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                            exam.status === 'PUBLISHED'
                              ? 'bg-green-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          title={exam.status === 'PUBLISHED' ? 'Click to unpublish' : 'Click to publish'}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                              exam.status === 'PUBLISHED' ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {exam.is_public ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                        <Globe className="h-3.5 w-3.5" />
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Lock className="h-3.5 w-3.5" />
                        Private
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {exam.assigned_students_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {exam.total_attempts || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {examAnalytics?.average_score ? (
                      <span className={`text-lg font-bold ${
                        Number(examAnalytics.average_score) >= 6.5 ? 'text-emerald-600' :
                        Number(examAnalytics.average_score) >= 5.5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Number(examAnalytics.average_score).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/teacher/exams/${exam.id}`}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {exam.status === 'DRAFT' && (
                        <Link
                          href={`/teacher/exams/${exam.id}/edit`}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => onDelete(exam.id, exam.title)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
      <div className="w-20 h-20 mx-auto mb-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
        <FileText className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {hasFilters ? 'No exams found' : 'No exams yet'}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {hasFilters 
          ? 'Try adjusting your filters or search query to find what you\'re looking for.'
          : 'Create your first exam to start assigning tests to your students.'
        }
      </p>
      {hasFilters ? (
        <button
          onClick={onClearFilters}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          Clear Filters
        </button>
      ) : (
        <Link
          href="/teacher/exams/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-lg"
        >
          <PlusCircle className="h-5 w-5" />
          Create Your First Exam
        </Link>
      )}
    </div>
  );
}
