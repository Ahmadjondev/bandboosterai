'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Search,
  Plus,
  Trash2,
  FileText,
  BookOpen,
  Mic,
  Headphones,
  PenTool,
  Check,
  X,
  ArrowRight,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  Sparkles,
  Package,
  Settings,
  Send,
  GripVertical,
} from 'lucide-react';
import { classroomApi, bundleApi, contentSearchApi } from '@/lib/classroom-api';
import type {
  ClassroomDetail,
  MockExamBasic,
  WritingTaskBasic,
  SpeakingTopicBasic,
  BundleItemFormData,
  AssignmentBundle,
} from '@/types/classroom';

type Step = 'search' | 'configure' | 'publish';

type ContentType = 'MOCK_EXAM' | 'WRITING_TASK' | 'SPEAKING_TOPIC';

interface SelectedItem {
  id: string;
  type: ContentType;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
}

export default function AssignmentBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classroomId = Number(params.id);
  const editBundleId = searchParams.get('edit') ? Number(searchParams.get('edit')) : null;

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContentType, setActiveContentType] = useState<ContentType>('MOCK_EXAM');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected items
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Bundle configuration
  const [bundleTitle, setBundleTitle] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [teacherInstructions, setTeacherInstructions] = useState('');

  // Publishing state
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  useEffect(() => {
    loadClassroom();
  }, [classroomId]);

  useEffect(() => {
    if (editBundleId) {
      loadExistingBundle();
    }
  }, [editBundleId]);

  useEffect(() => {
    // Auto-search when content type changes or search query updates
    if (searchQuery.length >= 2 || activeContentType) {
      performSearch();
    }
  }, [searchQuery, activeContentType]);

  const loadClassroom = async () => {
    try {
      setLoading(true);
      const data = await classroomApi.get(classroomId);
      setClassroom(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load classroom');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingBundle = async () => {
    if (!editBundleId) return;
    try {
      const bundle = await bundleApi.get(editBundleId);
      setBundleTitle(bundle.title);
      setBundleDescription(bundle.description || '');
      setDueDate(bundle.due_date ? bundle.due_date.split('T')[0] : '');
      setTeacherInstructions(bundle.teacher_instructions || '');
      // Map existing items
      const items: SelectedItem[] = bundle.items.map(item => {
        let title = 'Unknown Item';
        if (item.mock_exam) title = item.mock_exam.title;
        else if (item.writing_task) title = item.writing_task.prompt?.substring(0, 100) || 'Writing Task';
        else if (item.speaking_topic) title = item.speaking_topic.topic;
        else if (item.teacher_exam) title = item.teacher_exam.title;

        return {
          id: `${item.content_type}-${item.content_id}`,
          type: item.content_type as ContentType,
          title,
          icon: getIconForType(item.content_type as ContentType),
        };
      });
      setSelectedItems(items);
    } catch (err: any) {
      console.error('Failed to load bundle:', err);
    }
  };

  const performSearch = async () => {
    setSearching(true);
    try {
      let results: any[] = [];
      const filters = { q: searchQuery };

      switch (activeContentType) {
        case 'MOCK_EXAM':
          results = await contentSearchApi.mockExams(filters);
          break;
        case 'WRITING_TASK':
          results = await contentSearchApi.writingTasks(filters);
          break;
        case 'SPEAKING_TOPIC':
          results = await contentSearchApi.speakingTopics(filters);
          break;
      }
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const getIconForType = (type: ContentType): React.ElementType => {
    switch (type) {
      case 'MOCK_EXAM':
        return FileText;
      case 'WRITING_TASK':
        return PenTool;
      case 'SPEAKING_TOPIC':
        return Mic;
      default:
        return FileText;
    }
  };

  const handleAddItem = (item: any) => {
    const id = `${activeContentType}-${item.id}`;
    if (selectedItems.some(s => s.id === id)) return;

    // Determine title based on content type
    let title = '';
    let subtitle = undefined;

    if (activeContentType === 'MOCK_EXAM') {
      title = item.title || 'Untitled Exam';
      subtitle = item.exam_type_display || item.exam_type;
    } else if (activeContentType === 'WRITING_TASK') {
      title = item.prompt ? item.prompt.substring(0, 100) + (item.prompt.length > 100 ? '...' : '') : 'Writing Task';
      subtitle = item.task_type_display || item.task_type;
    } else if (activeContentType === 'SPEAKING_TOPIC') {
      title = item.topic || 'Speaking Topic';
      subtitle = item.speaking_type;
    }

    setSelectedItems(prev => [
      ...prev,
      {
        id,
        type: activeContentType,
        title,
        subtitle,
        icon: getIconForType(activeContentType),
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const handlePublish = async () => {
    if (!bundleTitle.trim()) {
      alert('Please enter a title for this assignment');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Please add at least one item to this assignment');
      return;
    }

    setPublishing(true);
    try {
      // Create bundle
      const bundleData = {
        classroom: classroomId,
        title: bundleTitle.trim(),
        description: bundleDescription.trim() || undefined,
        due_date: dueDate || undefined,
        teacher_instructions: teacherInstructions.trim() || undefined,
      };

      let bundle: AssignmentBundle;

      if (editBundleId) {
        bundle = await bundleApi.update(editBundleId, bundleData);
      } else {
        bundle = await bundleApi.create(bundleData);
      }

      // Add items
      for (const item of selectedItems) {
        const [contentType, contentId] = item.id.split('-');
        await bundleApi.addItem(bundle.id, {
          content_type: contentType as ContentType,
          content_id: Number(contentId),
          order: selectedItems.indexOf(item) + 1,
        });
      }

      // Publish if not editing
      if (!editBundleId) {
        await bundleApi.publish(bundle.id);
      }

      setPublishSuccess(true);
      setTimeout(() => {
        router.push(`/teacher/classroom/${classroomId}`);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to create assignment');
    } finally {
      setPublishing(false);
    }
  };

  const steps = [
    { id: 'search', label: 'Select Content', icon: Search },
    { id: 'configure', label: 'Configure', icon: Settings },
    { id: 'publish', label: 'Publish', icon: Send },
  ] as const;

  const canProceed = useMemo(() => {
    if (currentStep === 'search') return selectedItems.length > 0;
    if (currentStep === 'configure') return bundleTitle.trim().length > 0;
    return true;
  }, [currentStep, selectedItems, bundleTitle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Page
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link
            href={`/teacher/classroom/${classroomId}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  if (publishSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Assignment Published!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Redirecting to classroom...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/teacher/classroom/${classroomId}`}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editBundleId ? 'Edit Assignment' : 'New Assignment'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {classroom.name}
                </p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="hidden md:flex items-center gap-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = step.id === currentStep;
                const isPast = steps.findIndex(s => s.id === currentStep) > index;

                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => isPast && setCurrentStep(step.id)}
                      disabled={!isPast}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                          : isPast
                          ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      <StepIcon className="h-4 w-4" />
                      {step.label}
                    </button>
                    {index < steps.length - 1 && (
                      <ArrowRight className="h-4 w-4 mx-2 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Step 1: Search & Select */}
        {currentStep === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search Panel */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Content Type Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {[
                  { id: 'MOCK_EXAM', label: 'Mock Exams', icon: FileText },
                  { id: 'WRITING_TASK', label: 'Writing Tasks', icon: PenTool },
                  { id: 'SPEAKING_TOPIC', label: 'Speaking Topics', icon: Mic },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveContentType(tab.id as ContentType)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeContentType === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <TabIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeContentType.toLowerCase().replace('_', ' ')}s...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[500px] overflow-y-auto">
                {searching ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-8 w-8 mx-auto text-blue-600 animate-spin" />
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Searching...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center">
                    <Search className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {searchQuery ? 'No results found' : 'Enter a search term to find content'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {searchResults.map((item) => {
                      const itemId = `${activeContentType}-${item.id}`;
                      const isSelected = selectedItems.some(s => s.id === itemId);
                      const Icon = getIconForType(activeContentType);

                      return (
                        <div
                          key={item.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                  {item.title || item.topic || item.name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.exam_type || item.task_type || (item.part && `Part ${item.part}`)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => isSelected ? handleRemoveItem(itemId) : handleAddItem(item)}
                              className={`p-2 rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="h-5 w-5" />
                              ) : (
                                <Plus className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Items Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Selected Items
                  </h3>
                  <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
                    {selectedItems.length}
                  </span>
                </div>
              </div>

              {selectedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    No items selected yet. Search and add content to create your assignment bundle.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                  {selectedItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="text-gray-400 cursor-grab">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCurrentStep('configure')}
                  disabled={selectedItems.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configure */}
        {currentStep === 'configure' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Configure Assignment
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Set the title, due date, and instructions for this assignment.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Assignment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bundleTitle}
                  onChange={(e) => setBundleTitle(e.target.value)}
                  placeholder="e.g., Week 3: Writing Practice"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  placeholder="Brief description of this assignment (optional)"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Teacher Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    AI Grading Instructions
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Custom instructions for the AI to follow when grading student submissions.
                </p>
                <textarea
                  value={teacherInstructions}
                  onChange={(e) => setTeacherInstructions(e.target.value)}
                  placeholder="e.g., Focus on coherence and vocabulary range. Be strict about task achievement..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
                />
              </div>

              {/* Selected Items Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  This assignment includes:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-600 rounded-lg text-sm"
                      >
                        <Icon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                          {item.title}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep('search')}
                  className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('publish')}
                  disabled={!bundleTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Publish */}
        {currentStep === 'publish' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Review & Publish
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Review your assignment before publishing to students.
                </p>
              </div>

              {/* Summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Title</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{bundleTitle}</p>
                  </div>
                  {dueDate && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {bundleDescription && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                    <p className="text-gray-700 dark:text-gray-300">{bundleDescription}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Items ({selectedItems.length})
                  </p>
                  <div className="space-y-2">
                    {selectedItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                        >
                          <span className="text-sm text-gray-400 w-6">{index + 1}.</span>
                          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              ({item.subtitle})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {teacherInstructions && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      AI Grading Instructions
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      {teacherInstructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Publish Notice */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Publishing</strong> will immediately assign this to all{' '}
                  <strong>{classroom.enrollments?.length || 0} students</strong> in{' '}
                  <strong>{classroom.name}</strong>.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep('configure')}
                  disabled={publishing}
                  className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Publish Assignment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
