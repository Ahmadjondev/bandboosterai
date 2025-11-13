'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mic,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Check,
  Calendar,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  ListPlus,
  Minus,
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
import type { SpeakingTopic, PaginatedResponse } from '@/types/manager';

interface SpeakingTopicForm {
  speaking_type: 'PART_1' | 'PART_2' | 'PART_3';
  topic: string;
  question: string;
  cue_card?: string[] | null;
}

export default function SpeakingTopicsPage() {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'PART_1' | 'PART_2' | 'PART_3'>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<SpeakingTopic | null>(null);

  // Form states
  const [formData, setFormData] = useState<SpeakingTopicForm>({
    speaking_type: 'PART_1',
    topic: '',
    question: '',
    cue_card: null,
  });
  const [cueCardPoints, setCueCardPoints] = useState<string[]>(['', '', '', '']);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);

  useEffect(() => {
    loadTopics(1);
  }, []);

  const loadTopics = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (filterType !== 'all') {
        params.speaking_type = filterType;
      }

      const data: any = await managerAPI.getSpeakingTopics(params);
      
      // Handle Django response format: {topics: [...], pagination: {...}}
      setTopics(data.topics || []);
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
      setError(err.message || 'Failed to load speaking topics');
      toast.error(err.message || 'Failed to load speaking topics');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      loadTopics(1);
    }, 500),
    [searchQuery, filterType]
  );

  useEffect(() => {
    if (searchQuery !== undefined) {
      debouncedSearch();
    }
  }, [searchQuery]);

  useEffect(() => {
    loadTopics(1);
  }, [filterType]);

  // Modal management
  const openCreateModal = () => {
    setIsEditMode(false);
    setCurrentTopic(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (topic: SpeakingTopic) => {
    setIsEditMode(true);
    setCurrentTopic(topic);
    setFormData({
      speaking_type: topic.speaking_type,
      topic: topic.topic,
      question: topic.question || '',
      cue_card: topic.cue_card,
    });

    // Load cue card points if available
    if (topic.cue_card && Array.isArray(topic.cue_card)) {
      const points = [...topic.cue_card];
      while (points.length < 4) {
        points.push('');
      }
      setCueCardPoints(points);
    } else {
      setCueCardPoints(['', '', '', '']);
    }

    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      speaking_type: 'PART_1',
      topic: '',
      question: '',
      cue_card: null,
    });
    setCueCardPoints(['', '', '', '']);
    setFormErrors({});
  };

  const addCueCardPoint = () => {
    setCueCardPoints([...cueCardPoints, '']);
  };

  const removeCueCardPoint = (index: number) => {
    if (cueCardPoints.length > 1) {
      setCueCardPoints(cueCardPoints.filter((_, i) => i !== index));
    }
  };

  const updateCueCardPoint = (index: number, value: string) => {
    const newPoints = [...cueCardPoints];
    newPoints[index] = value;
    setCueCardPoints(newPoints);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.speaking_type) {
      errors.speaking_type = 'Speaking type is required';
    }

    if (!formData.topic || formData.topic.trim() === '') {
      errors.topic = 'Topic is required';
    }

    if (formData.speaking_type === 'PART_2') {
      const filledPoints = cueCardPoints.filter((p) => p.trim() !== '');
      if (filledPoints.length === 0) {
        errors.cue_card = 'At least one cue card point is required for Part 2';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveTopic = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const data: any = {
        speaking_type: formData.speaking_type,
        topic: formData.topic,
        question: formData.question,
      };

      // Add cue card points for Part 2
      if (formData.speaking_type === 'PART_2') {
        const filledPoints = cueCardPoints.filter((p) => p.trim() !== '').map((p) => p.trim());
        data.cue_card = filledPoints;
      } else {
        data.cue_card = null;
      }

      if (isEditMode && currentTopic) {
        await managerAPI.updateSpeakingTopic(currentTopic.id, data);
        toast.success('Topic updated successfully');
      } else {
        await managerAPI.createSpeakingTopic(data);
        toast.success('Topic created successfully');
      }

      closeModal();
      loadTopics(pagination?.current_page || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (topicId: number) => {
    setDeleteConfirmId(topicId);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const deleteTopic = async (topicId: number) => {
    try {
      await managerAPI.deleteSpeakingTopic(topicId);
      toast.success('Topic deleted successfully');
      cancelDelete();
      loadTopics(pagination?.current_page || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete topic');
    }
  };

  const speakingTypeDisplay = {
    PART_1: 'Part 1: Introduction & Interview',
    PART_2: 'Part 2: Individual Long Turn',
    PART_3: 'Part 3: Two-way Discussion',
  };

  const showCueCardSection = formData.speaking_type === 'PART_2';

  if (loading && !topics.length) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-linear-to-r from-primary to-primary/80 dark:from-primary/90 dark:to-primary/70 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm p-3 rounded-lg">
              <Mic className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Speaking Topics</h1>
              <p className="mt-1 text-white/80 dark:text-white/70">Manage IELTS speaking topics for all three parts</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-primary dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group"
          >
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            Add Speaking Topic
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Search */}
          <div>
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Search className="h-4 w-4 mr-2 text-primary dark:text-primary-400" />
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in topics and questions..."
                className="block w-full pl-11 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Filter by Type */}
          <div>
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="h-4 w-4 mr-2 text-primary dark:text-primary-400" />
              Filter by Part
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="block w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              <option value="all">🎤 All Parts</option>
              <option value="PART_1">👋 Part 1 (Introduction)</option>
              <option value="PART_2">📝 Part 2 (Long Turn)</option>
              <option value="PART_3">💬 Part 3 (Discussion)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-start">
            <div className="shrink-0">
              <div className="bg-red-100 dark:bg-red-900/40 rounded-full p-2">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-base font-semibold text-red-900 dark:text-red-200">Oops! Something went wrong</h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => loadTopics()}
                className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && topics.length === 0 && (
        <EmptyState
          icon="Mic"
          title="No speaking topics found"
          description="Get started by creating your first speaking topic for IELTS practice."
          actionText="Add Speaking Topic"
          onAction={openCreateModal}
        />
      )}

      {/* Topics Grid */}
      {topics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary"
            >
              {/* Header with gradient */}
              <div
                className={`relative h-32 flex items-center justify-center overflow-hidden ${
                  topic.speaking_type === 'PART_1'
                    ? 'bg-linear-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700'
                    : topic.speaking_type === 'PART_2'
                    ? 'bg-linear-to-br from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700'
                    : 'bg-linear-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700'
                }`}
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <Mic className="h-16 w-16 text-white/30" />
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-4">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
                      topic.speaking_type === 'PART_1'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : topic.speaking_type === 'PART_2'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    {topic.speaking_type}
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 min-h-12">
                  {topic.topic}
                </h3>

                {topic.question && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed line-clamp-2">
                    {truncateText(topic.question, 100)}
                  </p>
                )}

                {topic.cue_card && Array.isArray(topic.cue_card) && topic.cue_card.length > 0 && (
                  <div className="mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Cue Card Points:</p>
                    <ul className="space-y-1">
                      {topic.cue_card.slice(0, 3).map((point, index) => (
                        <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                          <span className="mr-2">•</span>
                          <span className="line-clamp-1">{point}</span>
                        </li>
                      ))}
                      {topic.cue_card.length > 3 && (
                        <li className="text-xs text-gray-500 dark:text-gray-400 italic">
                          +{topic.cue_card.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <Calendar className="h-3 w-3 mr-2" />
                  {formatDate(topic.created_at)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(topic)}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-orange-200 dark:border-orange-800 rounded-xl text-sm font-semibold bg-orange-50 dark:bg-orange-900/20 text-primary dark:text-primary-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  {deleteConfirmId === topic.id ? (
                    <button
                      onClick={() => deleteTopic(topic.id)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-300 dark:border-red-800 rounded-xl text-sm font-semibold text-white bg-linear-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 hover:shadow-xl transition-all"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => confirmDelete(topic.id)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-200 dark:border-red-800 rounded-xl text-sm font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
                {deleteConfirmId === topic.id && (
                  <button
                    onClick={cancelDelete}
                    className="w-full mt-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
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
          onPageChange={(page) => loadTopics(page)}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        show={showModal}
        onClose={closeModal}
        title={isEditMode ? 'Edit Speaking Topic' : 'Add New Speaking Topic'}
        size="large"
        footer={
          <>
            <button
              onClick={closeModal}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={saveTopic}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{saving ? 'Saving...' : isEditMode ? 'Update Topic' : 'Create Topic'}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Speaking Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Speaking Part <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['PART_1', 'PART_2', 'PART_3'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, speaking_type: type, cue_card: type === 'PART_2' ? [] : null })
                  }
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.speaking_type === type
                      ? 'border-primary bg-orange-50 dark:bg-orange-900/20 text-primary dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-xs font-semibold">{type.replace('_', ' ')}</div>
                </button>
              ))}
            </div>
            {formErrors.speaking_type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.speaking_type}</p>
            )}
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Enter topic title..."
            />
            {formErrors.topic && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.topic}</p>}
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Question {formData.speaking_type !== 'PART_2' && '(Optional)'}
            </label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Enter the question or prompt..."
            />
          </div>

          {/* Cue Card Points (Part 2 only) */}
          {showCueCardSection && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cue Card Points <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addCueCardPoint}
                  className="inline-flex items-center gap-1 text-xs text-primary dark:text-primary-400 hover:text-primary/80 dark:hover:text-primary-300"
                >
                  <ListPlus className="h-4 w-4" />
                  Add Point
                </button>
              </div>
              <div className="space-y-2">
                {cueCardPoints.map((point, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => updateCueCardPoint(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder={`Point ${index + 1}...`}
                    />
                    {cueCardPoints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCueCardPoint(index)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {formErrors.cue_card && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.cue_card}</p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
