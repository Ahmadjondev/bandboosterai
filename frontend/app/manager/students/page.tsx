'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  FileText,
  Upload,
  Search,
  ChevronDown,
  X,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
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
  const [sortBy, setSortBy] = useState('date_joined');
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);

  // Form data
  const [studentForm, setStudentForm] = useState<StudentForm>({
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    is_active: true,
  });

  // Bulk add
  const [bulkStudents, setBulkStudents] = useState('');
  const [bulkAddErrors, setBulkAddErrors] = useState<string[]>([]);

  // Excel upload
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelUploadResults, setExcelUploadResults] = useState<any>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);

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
      setPagination(data.pagination || {
        current_page: page,
        total_pages: 1,
        next: null,
        previous: null,
      });
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
  const openAddModal = () => {
    setEditingStudent(null);
    setStudentForm({
      first_name: '',
      last_name: '',
      phone: '',
      password: '',
      is_active: true,
    });
    setFormErrors({});
    setShowAddModal(true);
  };

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
    setShowAddModal(false);
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

  const openBulkAddModal = () => {
    setBulkStudents('');
    setBulkAddErrors([]);
    setShowBulkAddModal(true);
  };

  const closeBulkAddModal = () => {
    setShowBulkAddModal(false);
    setBulkStudents('');
    setBulkAddErrors([]);
  };

  const openExcelUploadModal = () => {
    setExcelFile(null);
    setExcelUploadResults(null);
    setShowExcelUploadModal(true);
  };

  const closeExcelUploadModal = () => {
    setShowExcelUploadModal(false);
    setExcelFile(null);
    setExcelUploadResults(null);
    if (excelUploadResults && excelUploadResults.created > 0) {
      loadStudents(pagination?.current_page || 1);
    }
  };

  // CRUD operations
  const saveStudent = async () => {
    setFormErrors({});
    setSubmitting(true);

    try {
      if (editingStudent) {
        await managerAPI.updateStudent(editingStudent.id, studentForm);
        toast.success('Student updated successfully');
      } else {
        await managerAPI.createStudent(studentForm);
        toast.success('Student added successfully');
      }

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

  const processBulkAdd = async () => {
    setBulkAddErrors([]);
    setSubmitting(true);

    try {
      const lines = bulkStudents.trim().split('\n');
      const studentsData = lines.map((line) => {
        const parts = line.split('|').map((p) => p.trim());
        return {
          first_name: parts[0] || '',
          last_name: parts[1] || '',
          email: parts[2] || '',
          phone: parts[3] || '',
          password: parts[4] || 'password123',
        };
      });

      const result = await managerAPI.bulkCreateStudents({ students: studentsData });

      if (result.created > 0) {
        toast.success(`${result.created} student(s) added successfully`);
      }

      if (result.errors && result.errors.length > 0) {
        setBulkAddErrors(result.errors);
      } else {
        closeBulkAddModal();
        loadStudents(1);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add students');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0]);
      setExcelUploadResults(null);
    }
  };

  const uploadExcelFile = async () => {
    if (!excelFile) return;

    setUploadingExcel(true);
    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      const result = await managerAPI.uploadStudentsExcel(formData);
      setExcelUploadResults(result);

      if (result.created > 0) {
        toast.success(`${result.created} student(s) imported successfully`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setUploadingExcel(false);
    }
  };

  const downloadExcelTemplate = async () => {
    try {
      await managerAPI.downloadExcelTemplate();
      toast.success('Template downloaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download template');
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
      <div className="bg-linear-to-r from-primary to-primary/80 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <Users className="h-7 w-7" />
              </div>
              Students Management
            </h1>
            <p className="mt-2 text-white/80">Manage student accounts and track their progress</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openExcelUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-all duration-200 text-white shadow-lg"
            >
              <FileText className="h-4 w-4" />
              Excel Upload
            </button>
            <button
              onClick={openBulkAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg font-medium transition-all duration-200 border border-white/20"
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary hover:bg-primary/5 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <UserPlus className="h-4 w-4" />
              Add Student
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Enhanced Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search Students</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Search by name, email, or phone..."
                className="block w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <div className="relative">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as any)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="all">All Students</option>
                <option value="active">✓ Active Only</option>
                <option value="inactive">✕ Inactive Only</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Enhanced Sort By */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-white"
              >
                <option value="date_joined">📅 Date Joined</option>
                <option value="first_name">👤 First Name</option>
                <option value="last_name">👤 Last Name</option>
                <option value="email">📧 Email</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading students</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
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
              : 'Get started by adding your first student'
          }
          actionText={!searchQuery ? 'Add Student' : undefined}
          onAction={!searchQuery ? openAddModal : undefined}
        />
      )}

      {/* Enhanced Students Table */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary/80 to-primary flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {getInitials(student.first_name, student.last_name)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
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
                        <div className="font-semibold text-gray-900">
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
                          onClick={() => toggleStudentActive(student)}
                          className="text-gray-400 hover:text-primary transition-colors"
                          title={student.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {student.is_active ? (
                            <ToggleRight className="h-5 w-5" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(student)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteStudent(student)}
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
              hasNext={!!pagination.next}
              hasPrevious={!!pagination.previous}
              onPageChange={(page) => loadStudents(page)}
            />
          )}
        </div>
      )}

      {/* Add/Edit Student Modal */}
      <Modal
        show={showAddModal || showEditModal}
        onClose={closeStudentModal}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
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
              <span>{submitting ? 'Saving...' : editingStudent ? 'Update Student' : 'Add Student'}</span>
            </button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentForm.first_name}
                onChange={(e) => setStudentForm({ ...studentForm, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              {formErrors.first_name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={studentForm.last_name}
                onChange={(e) => setStudentForm({ ...studentForm, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              {formErrors.last_name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
              )}
            </div>
          </div>

          {!editingStudent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={(studentForm as any).email || ''}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value } as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={studentForm.phone}
              onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {formErrors.phone && <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>}
          </div>

          {!editingStudent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>
          )}

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

      {/* Bulk Add Modal */}
      <Modal
        show={showBulkAddModal}
        onClose={closeBulkAddModal}
        title="Bulk Import Students"
        size="large"
        footer={
          <>
            <button
              onClick={closeBulkAddModal}
              className="px-5 py-2.5 rounded-lg bg-white text-gray-700 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 hover:bg-gray-50 transition-all"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={processBulkAdd}
              disabled={submitting || !bulkStudents.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Processing...' : 'Import Students'}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Format Instructions</h4>
            <p className="text-sm text-blue-800 mb-2">
              Enter one student per line in the following format:
            </p>
            <code className="block text-xs bg-blue-100 text-blue-900 p-2 rounded font-mono">
              FirstName | LastName | Email | Phone | Password
            </code>
            <p className="text-xs text-blue-700 mt-2">
              Example: John | Doe | john@example.com | 1234567890 | password123
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Data</label>
            <textarea
              value={bulkStudents}
              onChange={(e) => setBulkStudents(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
              placeholder="John | Doe | john@example.com | 1234567890 | password123&#10;Jane | Smith | jane@example.com | 0987654321 | password456"
            />
          </div>

          {bulkAddErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Errors:</h4>
              <ul className="space-y-1 text-sm text-red-800">
                {bulkAddErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* Excel Upload Modal */}
      <Modal
        show={showExcelUploadModal}
        onClose={closeExcelUploadModal}
        title="Import Students from Excel"
        size="medium"
        footer={
          <>
            <button
              onClick={closeExcelUploadModal}
              className="px-5 py-2.5 rounded-lg bg-white text-gray-700 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 hover:bg-gray-50 transition-all"
              disabled={uploadingExcel}
            >
              {excelUploadResults ? 'Close' : 'Cancel'}
            </button>
            {!excelUploadResults && (
              <button
                onClick={uploadExcelFile}
                disabled={uploadingExcel || !excelFile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white font-semibold shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {uploadingExcel ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                  </>
                )}
              </button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {!excelUploadResults ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Instructions</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download the Excel template</li>
                  <li>Fill in student information</li>
                  <li>Upload the completed file</li>
                </ol>
              </div>

              <div>
                <button
                  onClick={downloadExcelTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download Excel Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {excelFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: <span className="font-medium">{excelFile.name}</span>
                  </p>
                )}
              </div>
            </>
          ) : (
            <div
              className={`rounded-lg p-4 ${
                excelUploadResults.created > 0 && excelUploadResults.failed === 0
                  ? 'bg-green-50 border border-green-200'
                  : excelUploadResults.created > 0 && excelUploadResults.failed > 0
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex gap-4">
                <div className="shrink-0">
                  <div
                    className={`p-2 rounded-lg ${
                      excelUploadResults.created > 0 && excelUploadResults.failed === 0
                        ? 'bg-green-500'
                        : excelUploadResults.created > 0 && excelUploadResults.failed > 0
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  >
                    {excelUploadResults.created > 0 ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-base font-bold mb-2 ${
                      excelUploadResults.created > 0 && excelUploadResults.failed === 0
                        ? 'text-green-900'
                        : excelUploadResults.created > 0 && excelUploadResults.failed > 0
                        ? 'text-yellow-900'
                        : 'text-red-900'
                    }`}
                  >
                    Upload Results
                  </h3>
                  <div
                    className={`text-sm mb-2 ${
                      excelUploadResults.created > 0 && excelUploadResults.failed === 0
                        ? 'text-green-800'
                        : excelUploadResults.created > 0 && excelUploadResults.failed > 0
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}
                  >
                    <p className="font-semibold">✓ Created: {excelUploadResults.created} students</p>
                    {excelUploadResults.failed > 0 && (
                      <p className="font-semibold">✗ Failed: {excelUploadResults.failed} students</p>
                    )}
                  </div>

                  {excelUploadResults.errors && excelUploadResults.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold text-sm mb-2">Errors:</p>
                      <ul className="space-y-1 text-sm">
                        {excelUploadResults.errors.map((error: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="font-bold mt-0.5">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
