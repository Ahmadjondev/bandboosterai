'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  X,
  Edit2,
  Trash2,
  Power,
  Eye,
  Filter,
  SortAsc,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import {
  formatRelativeTime,
  getInitials,
  debounce,
  formatPhoneNumber,
  isValidEmail,
} from '@/lib/manager/utils';
import {
  LoadingSpinner,
  EmptyState,
  Modal,
  Pagination,
  useToast,
  createToastHelpers,
} from '@/components/manager/shared';
import type { Student, StudentForm, PaginatedResponse } from '@/types/manager';

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState('-date_joined');
  const [error, setError] = useState<string | null>(null);

  // Modal states (edit-only)
  const [showEditModal, setShowEditModal] = useState(false);

  // Form data
  const [studentForm, setStudentForm] = useState<StudentForm>({
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    is_active: true,
  });

  // Edit mode
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);

  useEffect(() => {
    loadStudents(1);
  }, [filterActive, sortBy]);

  const loadStudents = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (filterActive !== 'all') {
        params.active = filterActive === 'active' ? 'true' : 'false';
      }

      if (sortBy) {
        params.sort = sortBy;
      }

      const data: any = await managerAPI.getStudents(params);
      
      // Handle Django response format: {students: [...], pagination: {...}}
      setStudents(data.students || data.results || []);
      setPagination(
        data.pagination || {
          current_page: page,
          total_pages: 1,
          total_items: 0,
          has_next: false,
          has_previous: false,
        }
      );
    } catch (err: any) {
      if (err.message === 'Authentication required' || err.message === 'Redirecting to login') {
        return;
      }
      setError(err.message || 'Failed to load students');
      toast.error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      loadStudents(1);
    }, 500),
    [searchQuery, filterActive, sortBy]
  );

  useEffect(() => {
    if (searchQuery !== undefined) {
      debouncedSearch();
    }
  }, [searchQuery]);

  // Modal management
  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      first_name: student.first_name,
      last_name: student.last_name,
      phone: student.phone || '',
      password: '',
      is_active: student.is_active,
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const closeStudentModal = () => {
    setShowEditModal(false);
    setEditingStudent(null);
    setStudentForm({
      first_name: '',
      last_name: '',
      phone: '',
      password: '',
      is_active: true,
    });
    setFormErrors({});
  };


  // CRUD operations
  const saveStudent = async () => {
    setFormErrors({});
    setSubmitting(true);

    try {
      if (!editingStudent) {
        toast.error('No student selected for editing');
        setSubmitting(false);
        return;
      }

      await managerAPI.updateStudent(editingStudent.id, studentForm);
      toast.success('Student updated successfully');

      closeStudentModal();
      loadStudents(pagination?.current_page || 1);
    } catch (err: any) {
      if (err.response?.data) {
        setFormErrors(err.response.data);
      } else {
        toast.error(err.message || 'Failed to save student');
      }
    } finally {
      setSubmitting(false);
    }
  };

  

  const toggleStudentActive = async (student: Student) => {
    try {
      await managerAPI.toggleStudentActive(student.id);
      toast.success(`Student ${student.is_active ? 'deactivated' : 'activated'} successfully`);
      loadStudents(pagination?.current_page || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update student status');
    }
  };

  const deleteStudent = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}?`)) {
      return;
    }

    try {
      await managerAPI.deleteStudent(student.id);
      toast.success('Student deleted successfully');
      loadStudents(pagination?.current_page || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete student');
    }
  };

  if (loading && !students.length) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header Section */}
  <div className="bg-linear-to-r from-primary to-primary/80 rounded-xl shadow-lg p-6 text-white dark:from-slate-700 dark:to-slate-900 dark:text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-700 dark:text-amber-50">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <Users className="h-7 w-7" />
              </div>
              Students Management
            </h1>
            <p className="mt-2 text-gray-700 dark:text-amber-50">Manage student accounts and track their progress</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Add Student removed - legacy create flow disabled */}
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Enhanced Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700  dark:text-amber-50 mb-2 ">Search Students</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Search by name, email, or phone..."
                className="block w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-white dark:bg-slate-800 dark:text-gray-100 dark:placeholder-gray-400 dark:border-slate-700"
              />
              {searchQuery && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      loadStudents(1);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700  dark:text-amber-50 mb-2">Status</label>
            <div className="relative">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as any)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 appearance-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700"
              >
                <option value="all">All Students</option>
                <option value="active">✓ Active Only</option>
                <option value="inactive">✕ Inactive Only</option>
              </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                  </div>
            </div>
          </div>

          {/* Enhanced Sort By */}
          <div>
            <label className="block text-sm font-semibold text-gray-700  dark:text-amber-50 mb-2">Sort By</label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 appearance-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700"
              >
                <option value="date_joined">📅 Date Joined</option>
                <option value="first_name">👤 First Name</option>
                <option value="last_name">👤 Last Name</option>
                <option value="email">📧 Email</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading students</h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && students.length === 0 && (
        <EmptyState
          icon="Users"
          title="No students found"
          description={
            searchQuery
              ? 'No students match your search criteria'
              : 'There are no students yet.'
          }
        />
      )}

      {/* Enhanced Students Table */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary/80 to-primary flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-amber-50">
                              {getInitials(student.first_name, student.last_name)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {student.phone ? formatPhoneNumber(student.phone) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {student.is_active ? '✓ Active' : '✕ Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRelativeTime(student.date_joined)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-semibold text-gray-700  dark:text-amber-50">
                          {student.completed_tests_count || 0} tests
                        </div>
                        <div className="text-gray-500">
                          {student.average_score ? `Avg: ${student.average_score}` : 'No scores'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStudentActive(student); }}
                          className="text-gray-400 hover:text-primary transition-colors"
                          title={student.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(student); }}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteStudent(student); }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.total_pages}
              hasNext={!!pagination.has_next}
              hasPrevious={!!pagination.has_previous}
              onPageChange={(page) => loadStudents(page)}
            />
          )}
        </div>
      )}

      {/* Add/Edit Student Modal */}
      <Modal
        show={showEditModal}
        onClose={closeStudentModal}
        title={'Edit Student'}
        size="medium"
        footer={
          <>
            <button
              type="button"
              onClick={closeStudentModal}
              className="px-5 py-2.5 rounded-lg bg-white text-gray-700 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 hover:bg-gray-50 transition-all"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={saveStudent}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Saving...' : 'Update Student'}</span>
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentForm.first_name}
                onChange={(e) => setStudentForm({ ...studentForm, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700"
                required
              />
              {formErrors.first_name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentForm.last_name}
                onChange={(e) => setStudentForm({ ...studentForm, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700"
                required
              />
              {formErrors.last_name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
              )}
            </div>
          </div>

          {/* Email (create-only) removed from edit form */}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Phone</label>
            <input
              type="tel"
              value={studentForm.phone}
              onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700"
            />
            {formErrors.phone && <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>}
          </div>

          {/* Password (create-only) removed from edit form */}

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={studentForm.is_active}
              onChange={(e) => setStudentForm({ ...studentForm, is_active: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">Active</label>
          </div>
        </form>
      </Modal>

      
    </div>
  );
}
