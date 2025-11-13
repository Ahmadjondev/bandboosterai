'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Check,
  Image as ImageIcon,
  Calendar,
  Type,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import {
  formatDate,
  truncateText,
  debounce,
} from '@/lib/manager/utils';
import {
  LoadingSpinner,
  EmptyState,
  Modal,
  Pagination,
  useToast,
  createToastHelpers,
} from '@/components/manager/shared';
import type { WritingTask, PaginatedResponse } from '@/types/manager';

interface WritingTaskForm {
  task_type: 'TASK_1' | 'TASK_2';
  prompt: string;
  min_words: number;
  picture?: File | null;
  data?: any;
}

export default function WritingTasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<WritingTask[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'TASK_1' | 'TASK_2'>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTask, setCurrentTask] = useState<WritingTask | null>(null);

  // Form states
  const [formData, setFormData] = useState<WritingTaskForm>({
    task_type: 'TASK_1',
    prompt: '',
    min_words: 150,
    picture: null,
    data: null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);

  useEffect(() => {
    loadTasks(1);
  }, []);

  const loadTasks = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (filterType !== 'all') {
        params.task_type = filterType;
      }

      const data: any = await managerAPI.getWritingTasks(params);
      
      // Handle Django response format: {tasks: [...], pagination: {...}}
      setTasks(data.tasks || []);
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
      setError(err.message || 'Failed to load writing tasks');
      toast.error(err.message || 'Failed to load writing tasks');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      loadTasks(1);
    }, 500),
    [searchQuery, filterType]
  );

  useEffect(() => {
    if (searchQuery !== undefined) {
      debouncedSearch();
    }
  }, [searchQuery]);

  useEffect(() => {
    loadTasks(1);
  }, [filterType]);

  // Modal management
  const openCreateModal = () => {
    setIsEditMode(false);
    setCurrentTask(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (task: WritingTask) => {
    setIsEditMode(true);
    setCurrentTask(task);
    setFormData({
      task_type: task.task_type,
      prompt: task.prompt,
      min_words: task.min_words || (task.task_type === 'TASK_1' ? 150 : 250),
      picture: null,
      data: task.data,
    });
    setUploadedImagePreview(task.picture || null);
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      task_type: 'TASK_1',
      prompt: '',
      min_words: 150,
      picture: null,
      data: null,
    });
    setFormErrors({});
    setUploadedImagePreview(null);
  };

  const handleTaskTypeChange = (taskType: 'TASK_1' | 'TASK_2') => {
    setFormData({
      ...formData,
      task_type: taskType,
      min_words: taskType === 'TASK_1' ? 150 : 250,
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData({ ...formData, picture: file });
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, picture: null });
    setUploadedImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.task_type) {
      errors.task_type = 'Task type is required';
    }

    if (!formData.prompt || formData.prompt.trim() === '') {
      errors.prompt = 'Prompt is required';
    }

    if (!formData.min_words || formData.min_words < 1) {
      errors.min_words = 'Minimum words must be greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveTask = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('task_type', formData.task_type);
      formDataToSend.append('prompt', formData.prompt);
      formDataToSend.append('min_words', formData.min_words.toString());

      if (formData.picture instanceof File) {
        formDataToSend.append('picture', formData.picture);
      }

      if (formData.data) {
        formDataToSend.append('data', JSON.stringify(formData.data));
      }

      if (isEditMode && currentTask) {
        await managerAPI.updateWritingTask(currentTask.id, formDataToSend);
        toast.success('Task updated successfully');
      } else {
        await managerAPI.createWritingTask(formDataToSend);
        toast.success('Task created successfully');
      }

      closeModal();
      loadTasks(pagination?.current_page || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (taskId: number) => {
    setDeleteConfirmId(taskId);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const deleteTask = async (taskId: number) => {
    try {
      await managerAPI.deleteWritingTask(taskId);
      toast.success('Task deleted successfully');
      cancelDelete();
      loadTasks(pagination?.current_page || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  const taskTypeDisplay = {
    TASK_1: 'Task 1',
    TASK_2: 'Task 2',
  };

  if (loading && !tasks.length) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-linear-to-r from-primary to-primary/80 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Writing Tasks</h1>
              <p className="mt-1 text-white/80">Manage IELTS writing task prompts for Task 1 & Task 2</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary hover:bg-primary/5 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            Add Writing Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Search */}
          <div>
            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
              <Search className="h-4 w-4 mr-2 text-primary" />
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in prompts..."
                className="block w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Filter by Type */}
          <div>
            <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
              <Filter className="h-4 w-4 mr-2 text-primary" />
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              <option value="all">📝 All Tasks</option>
              <option value="TASK_1">📊 Task 1 (Report Writing)</option>
              <option value="TASK_2">✍️ Task 2 (Essay Writing)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-start">
            <div className="shrink-0">
              <div className="bg-red-100 rounded-full p-2">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-base font-semibold text-red-900">Oops! Something went wrong</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={() => loadTasks()}
                className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          icon="FileText"
          title="No writing tasks found"
          description="Get started by creating your first writing task and build your IELTS content library."
          actionText="Add Writing Task"
          onAction={openCreateModal}
        />
      )}

      {/* Tasks Grid */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="group bg-white rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-100 hover:border-primary"
            >
              {/* Image Preview */}
              {task.picture ? (
                <div className="relative h-52 bg-gray-200 overflow-hidden">
                  <img
                    src={task.picture}
                    alt={`Task ${task.task_type}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"></div>
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-gray-800">With Image</span>
                  </div>
                </div>
              ) : (
                <div className="relative h-52 bg-linear-to-br from-primary/80 to-primary flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <FileText className="h-20 w-20 text-white/30" />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
                      task.task_type === 'TASK_1'
                        ? 'bg-linear-to-r from-orange-500 to-cyan-500 text-white'
                        : 'bg-linear-to-r from-orange-500 to-red-500 text-white'
                    }`}
                  >
                    {taskTypeDisplay[task.task_type as 'TASK_1' | 'TASK_2']}
                  </span>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                    <Type className="h-3 w-3 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">{task.min_words || 0}+ words</span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-5 leading-relaxed line-clamp-3 min-h-15">
                  {truncateText(task.prompt, 120)}
                </p>

                <div className="flex items-center text-xs text-gray-500 mb-5 bg-gray-50 rounded-lg px-3 py-2">
                  <Calendar className="h-3 w-3 mr-2" />
                  {formatDate(task.created_at)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(task)}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-semibold bg-orange-50 text-primary hover:bg-orange-100 hover:border-orange-300 transition-all"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  {deleteConfirmId === task.id ? (
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-300 rounded-xl text-sm font-semibold text-white bg-linear-to-br from-red-600 to-red-700 hover:shadow-xl transition-all"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => confirmDelete(task.id)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-200 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
                {deleteConfirmId === task.id && (
                  <button
                    onClick={cancelDelete}
                    className="w-full mt-2 text-xs text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <Pagination
          currentPage={pagination.current_page}
          totalPages={pagination.total_pages}
          hasNext={!!pagination.next}
          hasPrevious={!!pagination.previous}
          onPageChange={(page) => loadTasks(page)}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        show={showModal}
        onClose={closeModal}
        title={isEditMode ? 'Edit Writing Task' : 'Add New Writing Task'}
        size="large"
        footer={
          <>
            <button
              onClick={closeModal}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-white text-gray-700 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={saveTask}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white font-semibold shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{saving ? 'Saving...' : isEditMode ? 'Update Task' : 'Create Task'}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTaskTypeChange('TASK_1')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.task_type === 'TASK_1'
                    ? 'border-primary bg-orange-50 text-primary'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold">Task 1</div>
                <div className="text-xs text-gray-600 mt-1">Report Writing</div>
              </button>
              <button
                type="button"
                onClick={() => handleTaskTypeChange('TASK_2')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.task_type === 'TASK_2'
                    ? 'border-primary bg-orange-50 text-primary'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold">Task 2</div>
                <div className="text-xs text-gray-600 mt-1">Essay Writing</div>
              </button>
            </div>
            {formErrors.task_type && (
              <p className="mt-1 text-sm text-red-600">{formErrors.task_type}</p>
            )}
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter the writing task prompt..."
            />
            {formErrors.prompt && <p className="mt-1 text-sm text-red-600">{formErrors.prompt}</p>}
          </div>

          {/* Minimum Words */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Words <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.min_words}
              onChange={(e) =>
                setFormData({ ...formData, min_words: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {formErrors.min_words && (
              <p className="mt-1 text-sm text-red-600">{formErrors.min_words}</p>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Image (Optional)
            </label>
            {uploadedImagePreview ? (
              <div className="relative">
                <img
                  src={uploadedImagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </label>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
