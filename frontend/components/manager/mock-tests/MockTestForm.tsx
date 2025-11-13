"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { managerAPI } from "@/lib/manager";
import {
  ExamType,
  DifficultyLevel,
  StructuredMockTestContent,
  ReadingPassageSummary,
  ListeningPartSummary,
  WritingTaskSummary,
  SpeakingTopicSummary,
} from "@/types/manager/mock-tests";
import { LoadingSpinner, Alert, Badge, SelectContentDialog } from "@/components/manager/shared";

interface MockTestFormProps {
  mode: "create" | "edit";
  testId?: number;
}

type ContentType = "reading" | "listening" | "writing" | "speaking";
type SelectionSlot = {
  type: ContentType;
  position: number;
  label: string;
};

export default function MockTestForm({ mode, testId }: MockTestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<StructuredMockTestContent & {
    title: string;
    description: string;
    exam_type: ExamType;
    difficulty: DifficultyLevel;
    is_active: boolean;
  }>({
    title: "",
    description: "",
    exam_type: "FULL_TEST",
    difficulty: "INTERMEDIATE",
    is_active: true,
    reading_passages: {
      passage_1: null,
      passage_2: null,
      passage_3: null,
    },
    listening_parts: {
      part_1: null,
      part_2: null,
      part_3: null,
      part_4: null,
    },
    writing_tasks: {
      task_1: null,
      task_2: null,
    },
    speaking_topics: {
      topic_1: null,
      topic_2: null,
      topic_3: null,
    },
  });

  // Available content for selection
  const [readingPassages, setReadingPassages] = useState<ReadingPassageSummary[]>([]);
  const [listeningParts, setListeningParts] = useState<ListeningPartSummary[]>([]);
  const [writingTasks, setWritingTasks] = useState<WritingTaskSummary[]>([]);
  const [speakingTopics, setSpeakingTopics] = useState<SpeakingTopicSummary[]>([]);

  // Selection modal state
  const [selectionModal, setSelectionModal] = useState<{
    open: boolean;
    type: ContentType | null;
    position: number | null;
  }>({
    open: false,
    type: null,
    position: null,
  });

  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing test data in edit mode
  useEffect(() => {
    if (mode === "edit" && testId) {
      loadTestData();
    }
  }, [mode, testId]);

  // Load all available content
  useEffect(() => {
    loadAllContent();
  }, []);

  const loadTestData = async () => {
    if (!testId) return;
    setLoading(true);
    try {
      const response = await managerAPI.getMockTest(testId);
      const test = response.test;
      
      // Convert arrays to structured object format
      const convertArrayToStructured = <T extends { passage_number?: number; part_number?: number }>(
        items: T[],
        keyPrefix: string,
        count: number
      ): Record<string, T | null> => {
        const result: Record<string, T | null> = {};
        for (let i = 1; i <= count; i++) {
          const item = items.find((item) => 
            ('passage_number' in item && item.passage_number === i) ||
            ('part_number' in item && item.part_number === i) ||
            items.indexOf(item) === i - 1
          );
          result[`${keyPrefix}_${i}`] = item || null;
        }
        return result;
      };

      setFormData({
        title: test.title,
        description: test.description || "",
        exam_type: test.exam_type,
        difficulty: test.difficulty,
        is_active: test.is_active,
        reading_passages: convertArrayToStructured(test.reading_passages, 'passage', 3) as any,
        listening_parts: convertArrayToStructured(test.listening_parts, 'part', 4) as any,
        writing_tasks: {
          task_1: test.writing_tasks.find(t => t.task_type === 'TASK_1') || null,
          task_2: test.writing_tasks.find(t => t.task_type === 'TASK_2') || null,
        },
        speaking_topics: {
          topic_1: test.speaking_topics[0] || null,
          topic_2: test.speaking_topics[1] || null,
          topic_3: test.speaking_topics[2] || null,
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to load test data");
    } finally {
      setLoading(false);
    }
  };

  const loadAllContent = async () => {
    setLoadingContent(true);
    try {
      const [reading, listening, writing, speaking] = await Promise.all([
        managerAPI.getReadingPassagesForMockTest({}),
        managerAPI.getListeningPartsForMockTest({}),
        managerAPI.getWritingTasksForMockTest({}),
        managerAPI.getSpeakingTopicsForMockTest({}),
      ]);
      setReadingPassages(reading.passages);
      setListeningParts(listening.parts);
      setWritingTasks(writing.tasks);
      setSpeakingTopics(speaking.topics);
    } catch (err: any) {
      setError(err.message || "Failed to load content");
    } finally {
      setLoadingContent(false);
    }
  };

  const getSelectionSlots = (): SelectionSlot[] => {
    const slots: SelectionSlot[] = [];
    const type = formData.exam_type;

    // Reading passages (3)
    if (["FULL_TEST", "LISTENING_READING", "LISTENING_READING_WRITING", "READING"].includes(type)) {
      slots.push(
        { type: "reading", position: 1, label: "Reading Passage 1" },
        { type: "reading", position: 2, label: "Reading Passage 2" },
        { type: "reading", position: 3, label: "Reading Passage 3" }
      );
    }

    // Listening parts (4)
    if (["FULL_TEST", "LISTENING_READING", "LISTENING_READING_WRITING", "LISTENING"].includes(type)) {
      slots.push(
        { type: "listening", position: 1, label: "Listening Part 1" },
        { type: "listening", position: 2, label: "Listening Part 2" },
        { type: "listening", position: 3, label: "Listening Part 3" },
        { type: "listening", position: 4, label: "Listening Part 4" }
      );
    }

    // Writing tasks (2)
    if (["FULL_TEST", "LISTENING_READING_WRITING", "WRITING"].includes(type)) {
      slots.push(
        { type: "writing", position: 1, label: "Writing Task 1" },
        { type: "writing", position: 2, label: "Writing Task 2" }
      );
    }

    // Speaking topics (3)
    if (["FULL_TEST", "SPEAKING"].includes(type)) {
      slots.push(
        { type: "speaking", position: 1, label: "Speaking Part 1" },
        { type: "speaking", position: 2, label: "Speaking Part 2" },
        { type: "speaking", position: 3, label: "Speaking Part 3" }
      );
    }

    return slots;
  };

  const getSelectedContent = (type: ContentType, position: number) => {
    switch (type) {
      case "reading":
        return formData.reading_passages[`passage_${position}` as keyof typeof formData.reading_passages];
      case "listening":
        return formData.listening_parts[`part_${position}` as keyof typeof formData.listening_parts];
      case "writing":
        return formData.writing_tasks[`task_${position}` as keyof typeof formData.writing_tasks];
      case "speaking":
        return formData.speaking_topics[`topic_${position}` as keyof typeof formData.speaking_topics];
    }
  };

  const openSelectionModal = (type: ContentType, position: number) => {
    // Debug: log when trying to open selection modal
    // eslint-disable-next-line no-console
    console.debug('[MockTestForm] openSelectionModal', { type, position });
    setSelectionModal({ open: true, type, position });
  };

  const closeSelectionModal = () => {
    // eslint-disable-next-line no-console
    console.debug('[MockTestForm] closeSelectionModal');
    setSelectionModal({ open: false, type: null, position: null });
  };

  // Debug: watch selectionModal changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[MockTestForm] selectionModal state', selectionModal);
  }, [selectionModal]);

  const selectContent = (content: any) => {
    if (!selectionModal.type || selectionModal.position === null) return;

    const type = selectionModal.type;
    const position = selectionModal.position;

    switch (type) {
      case "reading":
        setFormData((prev) => ({
          ...prev,
          reading_passages: {
            ...prev.reading_passages,
            [`passage_${position}`]: content,
          },
        }));
        break;
      case "listening":
        setFormData((prev) => ({
          ...prev,
          listening_parts: {
            ...prev.listening_parts,
            [`part_${position}`]: content,
          },
        }));
        break;
      case "writing":
        setFormData((prev) => ({
          ...prev,
          writing_tasks: {
            ...prev.writing_tasks,
            [`task_${position}`]: content,
          },
        }));
        break;
      case "speaking":
        setFormData((prev) => ({
          ...prev,
          speaking_topics: {
            ...prev.speaking_topics,
            [`topic_${position}`]: content,
          },
        }));
        break;
    }

    closeSelectionModal();
  };

  const removeContent = (type: ContentType, position: number) => {
    switch (type) {
      case "reading":
        setFormData((prev) => ({
          ...prev,
          reading_passages: {
            ...prev.reading_passages,
            [`passage_${position}`]: null,
          },
        }));
        break;
      case "listening":
        setFormData((prev) => ({
          ...prev,
          listening_parts: {
            ...prev.listening_parts,
            [`part_${position}`]: null,
          },
        }));
        break;
      case "writing":
        setFormData((prev) => ({
          ...prev,
          writing_tasks: {
            ...prev.writing_tasks,
            [`task_${position}`]: null,
          },
        }));
        break;
      case "speaking":
        setFormData((prev) => ({
          ...prev,
          speaking_topics: {
            ...prev.speaking_topics,
            [`topic_${position}`]: null,
          },
        }));
        break;
    }
  };

  const chooseRandomly = async () => {
    setLoadingContent(true);
    try {
      const slots = getSelectionSlots();
      const newFormData = { ...formData };

      // Get all selected IDs to avoid duplicates
      const getSelectedIds = (type: ContentType) => {
        const ids: number[] = [];
        switch (type) {
          case "reading":
            Object.values(formData.reading_passages).forEach((p) => p && ids.push(p.id));
            break;
          case "listening":
            Object.values(formData.listening_parts).forEach((p) => p && ids.push(p.id));
            break;
          case "writing":
            Object.values(formData.writing_tasks).forEach((t) => t && ids.push(t.id));
            break;
          case "speaking":
            Object.values(formData.speaking_topics).forEach((t) => t && ids.push(t.id));
            break;
        }
        return ids;
      };

      // Reading passages
      for (const slot of slots.filter((s) => s.type === "reading")) {
        const response = await managerAPI.getReadingPassagesForMockTest({
          passage_number: slot.position,
        });
        const selectedIds = getSelectedIds("reading");
        const available = response.passages.filter((p) => !selectedIds.includes(p.id));
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          newFormData.reading_passages[`passage_${slot.position}` as keyof typeof newFormData.reading_passages] = available[randomIndex];
        }
      }

      // Listening parts
      for (const slot of slots.filter((s) => s.type === "listening")) {
        const response = await managerAPI.getListeningPartsForMockTest({
          part_number: slot.position,
        });
        const selectedIds = getSelectedIds("listening");
        const available = response.parts.filter((p) => !selectedIds.includes(p.id));
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          newFormData.listening_parts[`part_${slot.position}` as keyof typeof newFormData.listening_parts] = available[randomIndex];
        }
      }

      // Writing tasks
      for (const slot of slots.filter((s) => s.type === "writing")) {
        const response = await managerAPI.getWritingTasksForMockTest({
          task_type: slot.position === 1 ? 'TASK_1' : 'TASK_2',
        });
        const selectedIds = getSelectedIds("writing");
        const available = response.tasks.filter((t) => !selectedIds.includes(t.id));
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          newFormData.writing_tasks[`task_${slot.position}` as keyof typeof newFormData.writing_tasks] = available[randomIndex];
        }
      }

      // Speaking topics
      for (const slot of slots.filter((s) => s.type === "speaking")) {
        const response = await managerAPI.getSpeakingTopicsForMockTest({
          speaking_type: `PART_${slot.position}` as 'PART_1' | 'PART_2' | 'PART_3',
        });
        const selectedIds = getSelectedIds("speaking");
        const available = response.topics.filter((t) => !selectedIds.includes(t.id));
        if (available.length > 0) {
          const randomIndex = Math.floor(Math.random() * available.length);
          newFormData.speaking_topics[`topic_${slot.position}` as keyof typeof newFormData.speaking_topics] = available[randomIndex];
        }
      }

      setFormData(newFormData);
      setSuccess("Random content selected successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to select random content");
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
      // Prepare payload with arrays of IDs
      const payload = {
        title: formData.title,
        description: formData.description,
        exam_type: formData.exam_type,
        difficulty: formData.difficulty,
        is_active: formData.is_active,
        reading_passages: Object.values(formData.reading_passages)
          .filter((p): p is ReadingPassageSummary => p !== null)
          .map(p => p.id),
        listening_parts: Object.values(formData.listening_parts)
          .filter((p): p is ListeningPartSummary => p !== null)
          .map(p => p.id),
        writing_tasks: Object.values(formData.writing_tasks)
          .filter((t): t is WritingTaskSummary => t !== null)
          .map(t => t.id),
        speaking_topics: Object.values(formData.speaking_topics)
          .filter((t): t is SpeakingTopicSummary => t !== null)
          .map(t => t.id),
      };

      if (mode === "edit" && testId) {
        await managerAPI.updateMockTest(testId, payload);
        setSuccess("Mock test updated successfully!");
        setTimeout(() => {
          router.push(`/manager/mock-tests/${testId}`);
        }, 1500);
      } else {
        const response = await managerAPI.createMockTest(payload);
        setSuccess("Mock test created successfully!");
        setTimeout(() => {
          router.push(`/manager/mock-tests/${response.test.id}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === "edit" ? "update" : "create"} mock test`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const slots = getSelectionSlots();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {mode === "edit" ? "Edit Mock Test" : "Create New Mock Test"}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {mode === "edit" ? "Update mock test information and content" : "Create a new IELTS mock test"}
        </p>
      </div>

      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </h2>

          {/* Title */}
          <div className="mb-4">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., IELTS Full Test 1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description of the mock test..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Exam Type and Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="exam_type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Exam Type <span className="text-red-500">*</span>
              </label>
              <select
                id="exam_type"
                value={formData.exam_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, exam_type: e.target.value as ExamType })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
              <label
                htmlFor="difficulty"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Difficulty <span className="text-red-500">*</span>
              </label>
              <select
                id="difficulty"
                value={formData.difficulty}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, difficulty: e.target.value as DifficultyLevel })
                }
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="EASY">Easy</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Active (visible to students)
              </span>
            </label>
          </div>
        </div>

        {/* Content Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Test Content
            </h2>
            <button
              type="button"
              onClick={chooseRandomly}
              disabled={loadingContent}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingContent ? "Loading..." : "Choose Randomly"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map((slot) => {
              const content = getSelectedContent(slot.type, slot.position);
              return (
                <div
                  key={`${slot.type}-${slot.position}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {slot.label}
                    </h3>
                    {content && (
                      <button
                        type="button"
                        onClick={() => removeContent(slot.type, slot.position)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {content ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {content.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge text={content.difficulty || 'MEDIUM'} color="blue" />
                        {slot.type === "reading" && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Passage {(content as ReadingPassageSummary).passage_number}
                          </span>
                        )}
                        {slot.type === "listening" && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Part {(content as ListeningPartSummary).part_number}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSelectionModal(slot.type, slot.position)}
                      className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors"
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
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : mode === "edit" ? "Update Test" : "Create Test"}
          </button>
        </div>
      </form>

      <SelectContentDialog
        show={selectionModal.open && !!selectionModal.type}
        onClose={closeSelectionModal}
        type={selectionModal.type}
        position={selectionModal.position}
        readingPassages={readingPassages}
        listeningParts={listeningParts}
        writingTasks={writingTasks}
        speakingTopics={speakingTopics}
        loading={loadingContent}
        onSelect={(item) => selectContent(item)}
      />
    </div>
  );
}
