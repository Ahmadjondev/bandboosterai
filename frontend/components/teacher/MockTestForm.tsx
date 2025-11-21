'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { teacherMockExamApi } from '@/lib/teacher-api';
import type { MockExamBasic } from '@/types/teacher';

interface MockTestFormProps {
  mode: 'create' | 'edit';
  testId?: number;
}

type ExamType = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | 'LISTENING_READING' | 'LISTENING_READING_WRITING' | 'FULL_TEST';
type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
type ContentType = 'reading' | 'listening' | 'writing' | 'speaking';

interface SelectionSlot {
  type: ContentType;
  position: number;
  label: string;
}

export default function MockTestForm({ mode, testId }: MockTestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    exam_type: ExamType;
    difficulty_level: DifficultyLevel;
    reading_passages: Record<string, any | null>;
    listening_parts: Record<string, any | null>;
    writing_tasks: Record<string, any | null>;
    speaking_topics: Record<string, any | null>;
  }>({
    title: '',
    description: '',
    exam_type: 'FULL_TEST',
    difficulty_level: 'INTERMEDIATE',
    reading_passages: { passage_1: null, passage_2: null, passage_3: null },
    listening_parts: { part_1: null, part_2: null, part_3: null, part_4: null },
    writing_tasks: { task_1: null, task_2: null },
    speaking_topics: { topic_1: null, topic_2: null, topic_3: null },
  });

  // Available content
  const [readingPassages, setReadingPassages] = useState<any[]>([]);
  const [listeningParts, setListeningParts] = useState<any[]>([]);
  const [writingTasks, setWritingTasks] = useState<any[]>([]);
  const [speakingTopics, setSpeakingTopics] = useState<any[]>([]);

  // Selection modal
  const [selectionModal, setSelectionModal] = useState<{
    open: boolean;
    type: ContentType | null;
    position: number | null;
  }>({ open: false, type: null, position: null });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && testId) {
      loadTestData();
    }
    loadAllContent();
  }, [mode, testId]);

  const loadTestData = async () => {
    if (!testId) return;
    setLoading(true);
    try {
      const test = await teacherMockExamApi.getMockExam(testId);
      // Note: This loads basic metadata. Full content loading would need additional API
      setFormData({
        title: test.title,
        description: test.description || '',
        exam_type: test.exam_type as ExamType,
        difficulty_level: test.difficulty_level as DifficultyLevel,
        reading_passages: { passage_1: null, passage_2: null, passage_3: null },
        listening_parts: { part_1: null, part_2: null, part_3: null, part_4: null },
        writing_tasks: { task_1: null, task_2: null },
        speaking_topics: { topic_1: null, topic_2: null, topic_3: null },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load test data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllContent = async () => {
    setLoadingContent(true);
    try {
      const [reading, listening, writing, speaking] = await Promise.all([
        teacherMockExamApi.getAvailableReadingPassages({}),
        teacherMockExamApi.getAvailableListeningParts({}),
        teacherMockExamApi.getAvailableWritingTasks({}),
        teacherMockExamApi.getAvailableSpeakingTopics({}),
      ]);
      
      console.log('API Raw Response:', { reading, listening, writing, speaking });
      console.log('Content loaded:', {
        reading: reading.passages?.length || 0,
        listening: listening.parts?.length || 0,
        writing: writing.tasks?.length || 0,
        speaking: speaking.topics?.length || 0
      });
      console.log('Actual arrays:', {
        readingPassages: reading.passages,
        listeningParts: listening.parts,
        writingTasks: writing.tasks,
        speakingTopics: speaking.topics
      });
      
      setReadingPassages(reading.passages || []);
      setListeningParts(listening.parts || []);
      setWritingTasks(writing.tasks || []);
      setSpeakingTopics(speaking.topics || []);
      
      console.log('State should be set now');
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setError(err.message || 'Failed to load content');
    } finally {
      setLoadingContent(false);
    }
  };

  const getSelectionSlots = (): SelectionSlot[] => {
    const slots: SelectionSlot[] = [];
    const type = formData.exam_type;

    if (['FULL_TEST', 'LISTENING_READING', 'LISTENING_READING_WRITING', 'READING'].includes(type)) {
      slots.push(
        { type: 'reading', position: 1, label: 'Reading Passage 1' },
        { type: 'reading', position: 2, label: 'Reading Passage 2' },
        { type: 'reading', position: 3, label: 'Reading Passage 3' }
      );
    }

    if (['FULL_TEST', 'LISTENING_READING', 'LISTENING_READING_WRITING', 'LISTENING'].includes(type)) {
      slots.push(
        { type: 'listening', position: 1, label: 'Listening Part 1' },
        { type: 'listening', position: 2, label: 'Listening Part 2' },
        { type: 'listening', position: 3, label: 'Listening Part 3' },
        { type: 'listening', position: 4, label: 'Listening Part 4' }
      );
    }

    if (['FULL_TEST', 'LISTENING_READING_WRITING', 'WRITING'].includes(type)) {
      slots.push(
        { type: 'writing', position: 1, label: 'Writing Task 1' },
        { type: 'writing', position: 2, label: 'Writing Task 2' }
      );
    }

    if (['FULL_TEST', 'SPEAKING'].includes(type)) {
      slots.push(
        { type: 'speaking', position: 1, label: 'Speaking Part 1' },
        { type: 'speaking', position: 2, label: 'Speaking Part 2' },
        { type: 'speaking', position: 3, label: 'Speaking Part 3' }
      );
    }

    return slots;
  };

  const getSelectedContent = (type: ContentType, position: number) => {
    switch (type) {
      case 'reading':
        return formData.reading_passages[`passage_${position}`];
      case 'listening':
        return formData.listening_parts[`part_${position}`];
      case 'writing':
        return formData.writing_tasks[`task_${position}`];
      case 'speaking':
        return formData.speaking_topics[`topic_${position}`];
    }
  };

  const openSelectionModal = async (type: ContentType, position: number) => {
    // Ensure content is loaded before opening modal
    const hasContent = readingPassages && listeningParts && writingTasks && speakingTopics;
    if (!hasContent) {
      console.log('Content not loaded, loading now...');
      await loadAllContent();
    }
    setSelectionModal({ open: true, type, position });
  };

  const closeSelectionModal = () => {
    setSelectionModal({ open: false, type: null, position: null });
  };

  const selectContent = (content: any) => {
    if (!selectionModal.type || selectionModal.position === null) return;

    const type = selectionModal.type;
    const position = selectionModal.position;

    switch (type) {
      case 'reading':
        setFormData(prev => ({
          ...prev,
          reading_passages: { ...prev.reading_passages, [`passage_${position}`]: content },
        }));
        break;
      case 'listening':
        setFormData(prev => ({
          ...prev,
          listening_parts: { ...prev.listening_parts, [`part_${position}`]: content },
        }));
        break;
      case 'writing':
        setFormData(prev => ({
          ...prev,
          writing_tasks: { ...prev.writing_tasks, [`task_${position}`]: content },
        }));
        break;
      case 'speaking':
        setFormData(prev => ({
          ...prev,
          speaking_topics: { ...prev.speaking_topics, [`topic_${position}`]: content },
        }));
        break;
    }

    closeSelectionModal();
  };

  const removeContent = (type: ContentType, position: number) => {
    switch (type) {
      case 'reading':
        setFormData(prev => ({
          ...prev,
          reading_passages: { ...prev.reading_passages, [`passage_${position}`]: null },
        }));
        break;
      case 'listening':
        setFormData(prev => ({
          ...prev,
          listening_parts: { ...prev.listening_parts, [`part_${position}`]: null },
        }));
        break;
      case 'writing':
        setFormData(prev => ({
          ...prev,
          writing_tasks: { ...prev.writing_tasks, [`task_${position}`]: null },
        }));
        break;
      case 'speaking':
        setFormData(prev => ({
          ...prev,
          speaking_topics: { ...prev.speaking_topics, [`topic_${position}`]: null },
        }));
        break;
    }
  };

  const chooseRandomly = async () => {
    setLoadingContent(true);
    setError(null);
    try {
      const slots = getSelectionSlots();
      const newFormData = { ...formData };

      // Helper to get already selected IDs to avoid duplicates
      const getSelectedIds = (type: ContentType): number[] => {
        const ids: number[] = [];
        switch (type) {
          case 'reading':
            Object.values(formData.reading_passages).forEach((p) => p && ids.push(p.id));
            break;
          case 'listening':
            Object.values(formData.listening_parts).forEach((p) => p && ids.push(p.id));
            break;
          case 'writing':
            Object.values(formData.writing_tasks).forEach((t) => t && ids.push(t.id));
            break;
          case 'speaking':
            Object.values(formData.speaking_topics).forEach((t) => t && ids.push(t.id));
            break;
        }
        return ids;
      };

      // Reading passages
      for (const slot of slots.filter((s) => s.type === 'reading')) {
        const response = await teacherMockExamApi.getAvailableReadingPassages({
          passage_number: slot.position,
        });
        const selectedIds = getSelectedIds('reading');
        const available = response.passages.filter((p: any) => !selectedIds.includes(p.id));
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          newFormData.reading_passages[`passage_${slot.position}`] = available[randomIndex];
        }
      }

      // Listening parts
      for (const slot of slots.filter((s) => s.type === 'listening')) {
        const response = await teacherMockExamApi.getAvailableListeningParts({
          part_number: slot.position,
        });
        const selectedIds = getSelectedIds('listening');
        const available = response.parts.filter((p: any) => !selectedIds.includes(p.id));
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          newFormData.listening_parts[`part_${slot.position}`] = available[randomIndex];
        }
      }

      // Writing tasks
      for (const slot of slots.filter((s) => s.type === 'writing')) {
        const response = await teacherMockExamApi.getAvailableWritingTasks({
          task_type: slot.position === 1 ? 'TASK_1' : 'TASK_2',
        });
        const selectedIds = getSelectedIds('writing');
        const available = response.tasks.filter((t: any) => !selectedIds.includes(t.id));
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          newFormData.writing_tasks[`task_${slot.position}`] = available[randomIndex];
        }
      }

      // Speaking topics
      for (const slot of slots.filter((s) => s.type === 'speaking')) {
        const response = await teacherMockExamApi.getAvailableSpeakingTopics({
          speaking_type: `PART_${slot.position}` as any,
        });
        const selectedIds = getSelectedIds('speaking');
        const available = response.topics.filter((t: any) => !selectedIds.includes(t.id));
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          newFormData.speaking_topics[`topic_${slot.position}`] = available[randomIndex];
        }
      }

      setFormData(newFormData);
      setSuccess('Random content selected successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to select random content');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        exam_type: formData.exam_type,
        difficulty_level: formData.difficulty_level,
        reading_passages: Object.values(formData.reading_passages)
          .filter((p): p is any => p !== null)
          .map(p => p.id),
        listening_parts: Object.values(formData.listening_parts)
          .filter((p): p is any => p !== null)
          .map(p => p.id),
        writing_tasks: Object.values(formData.writing_tasks)
          .filter((t): t is any => t !== null)
          .map(t => t.id),
        speaking_topics: Object.values(formData.speaking_topics)
          .filter((t): t is any => t !== null)
          .map(t => t.id),
      };

      if (mode === 'edit' && testId) {
        await teacherMockExamApi.updateMockExam(testId, payload);
        setSuccess('Mock test updated successfully!');
        setTimeout(() => router.push(`/teacher/mock-tests/${testId}`), 1500);
      } else {
        await teacherMockExamApi.createMockExam(payload);
        setSuccess('Mock test created successfully! Pending admin review.');
        setTimeout(() => router.push('/teacher/mock-tests'), 1500);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} mock test`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const slots = getSelectionSlots();

  return (
    <div className="max-w-6xl mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-900 dark:text-red-100 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-900 dark:text-green-100 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exam Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.exam_type}
                  onChange={(e) => setFormData({ ...formData, exam_type: e.target.value as ExamType })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="FULL_TEST">Full Test</option>
                  <option value="LISTENING_READING">Listening + Reading</option>
                  <option value="LISTENING_READING_WRITING">Listening + Reading + Writing</option>
                  <option value="LISTENING">Listening Only</option>
                  <option value="READING">Reading Only</option>
                  <option value="WRITING">Writing Only</option>
                  <option value="SPEAKING">Speaking Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Difficulty <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.difficulty_level}
                  onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value as DifficultyLevel })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Content Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Test Content
            </h2>
            <button
              type="button"
              onClick={chooseRandomly}
              disabled={loadingContent}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loadingContent ? 'Loading...' : 'Choose Randomly'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {slots.map((slot) => {
              const content = getSelectedContent(slot.type, slot.position);
              return (
                <div
                  key={`${slot.type}-${slot.position}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {slot.label}
                    </h3>
                    {content && (
                      <button
                        type="button"
                        onClick={() => removeContent(slot.type, slot.position)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {content ? (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {content.title || content.prompt || content.topic || 'Untitled'}
                      </p>
                      {content.difficulty && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs">
                          {content.difficulty}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSelectionModal(slot.type, slot.position)}
                      className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      Select Content
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Test' : 'Create Test'}
          </button>
        </div>
      </form>

      {/* Selection Modal */}
      {selectionModal.open && selectionModal.type && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select {selectionModal.type.charAt(0).toUpperCase() + selectionModal.type.slice(1)} Content
              </h3>
              <button
                type="button"
                onClick={closeSelectionModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingContent ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    let items: any[] = [];
                    switch (selectionModal.type) {
                      case 'reading':
                        items = (readingPassages || []).filter(p => p?.passage_number === selectionModal.position);
                        console.log('Reading modal:', { total: readingPassages?.length, filtered: items.length, position: selectionModal.position });
                        break;
                      case 'listening':
                        items = (listeningParts || []).filter(p => p?.part_number === selectionModal.position);
                        console.log('Listening modal:', { total: listeningParts?.length, filtered: items.length, position: selectionModal.position });
                        break;
                      case 'writing':
                        items = (writingTasks || []).filter(t => t?.task_type === (selectionModal.position === 1 ? 'TASK_1' : 'TASK_2'));
                        console.log('Writing modal:', { total: writingTasks?.length, filtered: items.length, position: selectionModal.position, taskType: selectionModal.position === 1 ? 'TASK_1' : 'TASK_2' });
                        break;
                      case 'speaking':
                        items = (speakingTopics || []).filter(t => t?.speaking_type === `PART_${selectionModal.position}`);
                        console.log('Speaking modal:', { total: speakingTopics?.length, filtered: items.length, position: selectionModal.position, speakingType: `PART_${selectionModal.position}` });
                        break;
                    }

                    if (items.length === 0) {
                      console.log('No items found for modal');
                      return (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                          No content available for this selection
                        </p>
                      );
                    }

                    return items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectContent(item)}
                        className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {item.title || item.prompt || item.topic || 'Untitled'}
                        </div>
                        {item.difficulty && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                              {item.difficulty}
                            </span>
                          </div>
                        )}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
