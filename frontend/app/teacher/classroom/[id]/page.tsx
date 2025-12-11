'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  Copy,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Plus,
  UserMinus,
  Mail,
  Search,
  Clock,
  Target,
  TrendingUp,
  Edit2,
  Trash2,
  MoreVertical,
  Eye,
  Calendar,
} from 'lucide-react';
import { classroomApi, bundleApi } from '@/lib/classroom-api';
import type { ClassroomDetail, StudentRoster, AssignmentBundleList, ClassroomAnalytics } from '@/types/classroom';
import ClassHeatmap from '@/components/classroom/ClassHeatmap';

type TabType = 'roster' | 'assignments' | 'analytics' | 'settings';

export default function ClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = Number(params.id);

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [roster, setRoster] = useState<StudentRoster[]>([]);
  const [bundles, setBundles] = useState<AssignmentBundleList[]>([]);
  const [analytics, setAnalytics] = useState<ClassroomAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('roster');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (classroomId) {
      loadClassroomData();
    }
  }, [classroomId]);

  const loadClassroomData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load classroom details first
      const classroomData = await classroomApi.get(classroomId);
      setClassroom(classroomData);

      // Load other data in parallel
      const [rosterData, bundlesData] = await Promise.all([
        classroomApi.roster(classroomId),
        bundleApi.list({ classroom: classroomId }),
      ]);

      setRoster(rosterData);
      setBundles(bundlesData);

      // Load analytics separately as it might be slower
      try {
        const analyticsData = await classroomApi.analytics(classroomId);
        setAnalytics(analyticsData);
      } catch {
        // Analytics might not be available for new classrooms
        setAnalytics(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load classroom data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClassroomData();
    setRefreshing(false);
  };

  const handleCopyInvite = async () => {
    if (!classroom) return;
    try {
      await navigator.clipboard.writeText(classroom.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = classroom.invite_code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRemoveStudent = async (studentId: number, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this classroom?`)) {
      return;
    }
    try {
      await classroomApi.removeStudent(classroomId, studentId);
      setRoster(prev => prev.filter(s => s.student.id !== studentId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove student');
    }
  };

  const handleToggleInvites = async () => {
    if (!classroom) return;
    try {
      const result = await classroomApi.toggleInvites(classroomId);
      setClassroom(prev => prev ? { ...prev, invite_enabled: result.invite_enabled } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle invites');
    }
  };

  const handleRegenerateCode = async () => {
    if (!confirm('Regenerating the invite code will invalidate the current code. Continue?')) {
      return;
    }
    try {
      const result = await classroomApi.regenerateInvite(classroomId);
      setClassroom(prev => prev ? { ...prev, invite_code: result.invite_code } : null);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate code');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 mx-auto" />
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute inset-0 mx-auto" />
          </div>
          <p className="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Classroom
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Classroom not found'}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => router.push('/teacher/classroom')}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Back to Classrooms
            </button>
            <button
              onClick={loadClassroomData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'roster', label: 'Roster', icon: Users, count: roster.length },
    { id: 'assignments', label: 'Assignments', icon: FileText, count: bundles.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-5">
          {/* Back & Actions */}
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/teacher/classroom"
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Classrooms
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href={`/teacher/classroom/${classroomId}/assign`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                New Assignment
              </Link>
            </div>
          </div>

          {/* Classroom Info */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <GraduationCap className="h-7 w-7 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {classroom.name}
              </h1>
              {classroom.description && (
                <p className="mt-0.5 text-gray-600 dark:text-gray-400 line-clamp-1">
                  {classroom.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Target className="h-4 w-4" />
                  Target: Band {classroom.target_band}
                </span>
                <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Users className="h-4 w-4" />
                  {roster.length} students
                </span>
              </div>
            </div>

            {/* Invite Code */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span className="text-sm text-gray-500 dark:text-gray-400">Invite Code:</span>
              <code className={`font-mono font-semibold ${classroom.invite_enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'}`}>
                {classroom.invite_code}
              </code>
              <button
                onClick={handleCopyInvite}
                disabled={!classroom.invite_enabled}
                className={`p-1.5 rounded transition-colors ${
                  classroom.invite_enabled
                    ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title="Copy invite code"
              >
                {copiedCode ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {'count' in tab && tab.count !== undefined && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'roster' && (
          <RosterTab
            roster={roster}
            classroomId={classroomId}
            onRemoveStudent={handleRemoveStudent}
          />
        )}
        {activeTab === 'assignments' && (
          <AssignmentsTab
            bundles={bundles}
            classroomId={classroomId}
            onRefresh={loadClassroomData}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab analytics={analytics} roster={roster} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            classroom={classroom}
            onToggleInvites={handleToggleInvites}
            onRegenerateCode={handleRegenerateCode}
            onUpdate={() => loadClassroomData()}
          />
        )}
      </div>
    </div>
  );
}

// ===== Roster Tab =====
interface RosterTabProps {
  roster: StudentRoster[];
  classroomId: number;
  onRemoveStudent: (studentId: number, studentName: string) => void;
}

function RosterTab({ roster, classroomId, onRemoveStudent }: RosterTabProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoster = roster.filter(
    (item) =>
      item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (roster.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Students Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Share the invite code with your students to let them join this classroom.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Band
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Completed
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pending
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRoster.map((item) => (
                <tr key={item.student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {item.student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.student.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.student.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {item.current_band || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {item.completed_assignments}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {item.pending_assignments}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.enrolled_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onRemoveStudent(item.student.id, item.student.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Remove student"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== Assignments Tab =====
interface AssignmentsTabProps {
  bundles: AssignmentBundleList[];
  classroomId: number;
  onRefresh: () => void;
}

function AssignmentsTab({ bundles, classroomId, onRefresh }: AssignmentsTabProps) {
  const router = useRouter();

  const handleDeleteBundle = async (bundleId: number, bundleTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${bundleTitle}"?`)) {
      return;
    }
    try {
      await bundleApi.delete(bundleId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete assignment');
    }
  };

  if (bundles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Assignments Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create your first assignment bundle to start evaluating your students.
        </p>
        <Link
          href={`/teacher/classroom/${classroomId}/assign`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          Create Assignment
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
      case 'PUBLISHED':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'CLOSED':
        return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Assignment Bundles
        </h2>
        <Link
          href={`/teacher/classroom/${classroomId}/assign`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          New Assignment
        </Link>
      </div>

      {/* Bundles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {bundle.title}
                </h3>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(bundle.status)}`}>
                  {bundle.status}
                </span>
              </div>
              <div className="relative">
                <button
                  onClick={() => handleDeleteBundle(bundle.id, bundle.title)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center py-3 border-y border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {bundle.item_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Items</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {bundle.assigned_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Assigned</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {bundle.completed_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
              </div>
            </div>

            {bundle.due_date && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                Due: {new Date(bundle.due_date).toLocaleDateString()}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Link
                href={`/teacher/classroom/${classroomId}/bundle/${bundle.id}`}
                className="flex-1 px-3 py-2 text-center text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                View Details
              </Link>
              {bundle.status === 'DRAFT' && (
                <Link
                  href={`/teacher/classroom/${classroomId}/assign?edit=${bundle.id}`}
                  className="flex-1 px-3 py-2 text-center text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Edit
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== Analytics Tab =====
interface AnalyticsTabProps {
  analytics: ClassroomAnalytics | null;
  roster: StudentRoster[];
}

function AnalyticsTab({ analytics, roster }: AnalyticsTabProps) {
  if (!analytics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Analytics Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Analytics will appear once students complete assignments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.average_band?.toFixed(1) || 'N/A'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Class Average</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.completion_rate}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.total_submissions}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Submissions</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.pending_grading}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Grading</p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Heatmap */}
      <ClassHeatmap roster={roster} analytics={analytics} />

      {/* Section Breakdown */}
      {analytics.section_averages && Object.keys(analytics.section_averages).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Section Averages
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.section_averages).map(([section, avg]) => (
              <div key={section} className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mb-1">
                  {section}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(avg as number).toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Settings Tab =====
interface SettingsTabProps {
  classroom: ClassroomDetail;
  onToggleInvites: () => void;
  onRegenerateCode: () => void;
  onUpdate: () => void;
}

function SettingsTab({ classroom, onToggleInvites, onRegenerateCode, onUpdate }: SettingsTabProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this classroom? This action cannot be undone.')) {
      return;
    }
    try {
      setDeleting(true);
      await classroomApi.delete(classroom.id);
      router.push('/teacher/classroom');
    } catch (err: any) {
      alert(err.message || 'Failed to delete classroom');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Invite Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Invite Settings
        </h3>

        <div className="space-y-4">
          {/* Toggle Invites */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Enable Invitations
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Allow new students to join using the invite code
              </p>
            </div>
            <button
              onClick={onToggleInvites}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                classroom.invite_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  classroom.invite_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Current Code */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Current Invite Code
                </p>
                <code className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {classroom.invite_code}
                </code>
              </div>
              <button
                onClick={onRegenerateCode}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
              >
                <RefreshCw className="h-4 w-4 inline mr-1" />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4">
          Danger Zone
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Deleting this classroom will remove all student enrollments and assignments.
          This action cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete Classroom'}
        </button>
      </div>
    </div>
  );
}
