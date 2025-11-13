/**
 * Writing Section Component
 * Task 1 (20 min) + Task 2 (40 min) text editors with word count
 * Improved UX/UI with better visual feedback and accessibility
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useExam } from "./ExamContext";
import type { WritingSection as WritingSectionType } from "@/types/exam";
import { countWords, formatTime } from "@/lib/exam-utils";
import TextHighlighter from "./TextHighlighter";

export default function WritingSection() {
  const { sectionData, submitWriting, timeRemaining, handleNextSection, attemptId } = useExam();
  const [currentTask, setCurrentTask] = useState<"TASK_1" | "TASK_2">("TASK_1");
  const [task1Text, setTask1Text] = useState("");
  const [task2Text, setTask2Text] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState("text-base");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const promptContainerRef = useRef<HTMLDivElement>(null!);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const writingData = sectionData as WritingSectionType;
  const tasks = writingData?.tasks || [];
  const task1 = tasks.find((t) => t.task_type === "TASK_1");
  const task2 = tasks.find((t) => t.task_type === "TASK_2");
  const currentTaskData = currentTask === "TASK_1" ? task1 : task2;
  const currentText = currentTask === "TASK_1" ? task1Text : task2Text;
  const setCurrentText = currentTask === "TASK_1" ? setTask1Text : setTask2Text;
  const nextSectionName = (sectionData as any)?.next_section_name || "Next Section";

  // Load existing answers
  useEffect(() => {
    if (task1?.user_attempt) setTask1Text(task1.user_attempt);
    if (task2?.user_attempt) setTask2Text(task2.user_attempt);
  }, [task1, task2]);

  // Auto-focus textarea when switching tasks
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentTask]);

  // Listen for font size changes from header
  useEffect(() => {
    const handleFontSizeChange = (event: CustomEvent) => {
      const { fontSize: newFontSize } = event.detail;
      setFontSize(newFontSize);
    };

    window.addEventListener('fontSizeChange', handleFontSizeChange as EventListener);
    return () => {
      window.removeEventListener('fontSizeChange', handleFontSizeChange as EventListener);
    };
  }, []);

  // Handle ESC key to close image modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isImageModalOpen]);

  // Auto-save debounced
  useEffect(() => {
    if (!currentTaskData) return;

    const timer = setTimeout(async () => {
      if (currentText.trim()) {
        try {
          setIsSaving(true);
          setSaveError(null);
          
          const taskNumber = currentTask === "TASK_1" ? 1 : 2;
          await submitWriting(
            currentTaskData.id,
            taskNumber as 1 | 2,
            currentText
          );
          
          setLastSaved(new Date().toLocaleTimeString());
        } catch (error) {
          console.error("Failed to save writing:", error);
          setSaveError("Failed to save. Your work is temporarily stored locally.");
        } finally {
          setIsSaving(false);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentText, currentTaskData, currentTask, submitWriting]);

  const wordCount = countWords(currentText);
  const minWords = currentTaskData?.min_words || (currentTask === "TASK_1" ? 150 : 250);
  const isUnderMin = wordCount < minWords;
  const wordProgress = Math.min((wordCount / minWords) * 100, 100);

  const task1Time = 20 * 60;
  const task2Time = 40 * 60;
  const shouldSwitchTask = currentTask === "TASK_1" && timeRemaining <= task2Time;

  if (!writingData || tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading writing section...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors duration-300 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-3">
            {task1 && (
              <button
                onClick={() => setCurrentTask("TASK_1")}
                className={`relative px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  currentTask === "TASK_1"
                    ? "bg-green-600 text-white shadow-md scale-105"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Task 1</span>
                  <span className="text-xs opacity-75">(20 min)</span>
                </div>
                {countWords(task1Text) >= (task1.min_words || 150) && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </span>
                )}
              </button>
            )}
            {task2 && (
              <button
                onClick={() => setCurrentTask("TASK_2")}
                className={`relative px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  currentTask === "TASK_2"
                    ? "bg-green-600 text-white shadow-md scale-105"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Task 2</span>
                  <span className="text-xs opacity-75">(40 min)</span>
                </div>
                {countWords(task2Text) >= (task2.min_words || 250) && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                    ✓
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Words:</span>
                <span
                  className={`text-lg font-bold ${
                    isUnderMin
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {wordCount}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  / {minWords} minimum
                </span>
              </div>
              <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    wordProgress >= 100 ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(wordProgress, 100)}%` }}
                />
              </div>
            </div>

            <div className="text-sm min-w-[140px]">
              {isSaving ? (
                <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : saveError ? (
                <span className="text-red-600 dark:text-red-400 text-xs">
                  ⚠️ {saveError}
                </span>
              ) : lastSaved ? (
                <span className="text-green-600 dark:text-green-400">
                  ✓ Saved {lastSaved}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {shouldSwitchTask && (
          <div className="bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500 rounded-lg p-3 animate-pulse">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">Time Management Alert</p>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  Consider moving to Task 2 now. You have <strong>{formatTime(timeRemaining)}</strong> remaining for both tasks.
                  Task 2 is worth twice as much as Task 1 in your final score.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div ref={promptContainerRef} className="w-1/2 overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 border-r-2 border-gray-200 dark:border-gray-700 p-8">
          <div className="mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {currentTaskData?.task_type_display || "Writing Task"}
              </h2>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-semibold rounded-full">
                {currentTask === "TASK_1" ? "20 minutes" : "40 minutes"}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Write at least <strong>{minWords} words</strong> • 
              {currentTask === "TASK_1" 
                ? " Describe visual information" 
                : " Essay-type response"}
            </p>
          </div>

            <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {currentTaskData?.prompt}
            </div>
          </div>
          {(currentTaskData?.picture_url || currentTaskData?.picture) && (
            <div className="mb-8 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <img
                src={currentTaskData.picture_url || currentTaskData.picture}
                alt="Task visual reference"
                className="w-full rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setIsImageModalOpen(true)}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center italic">
                Click image to enlarge • Reference image for your response
              </p>
            </div>
          )}

          <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📝</div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 text-lg">
                  Instructions & Tips
                </h3>
                <ul className="space-y-2 text-sm text-blue-900 dark:text-blue-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>Write <strong>at least {minWords} words</strong> for this task</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>Suggested time: <strong>{currentTask === "TASK_1" ? "20" : "40"} minutes</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>Your answer is automatically saved every 2 seconds</span>
                  </li>
                  {currentTask === "TASK_1" ? (
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      <span>Describe the main features and make comparisons</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">✓</span>
                      <span>Give reasons and examples to support your opinion</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <TextHighlighter
            sectionName="writing"
            subSection={`task-${currentTask === "TASK_1" ? "1" : "2"}`}
            containerRef={promptContainerRef}
            attemptId={attemptId}
          />
        </div>

        <div className="w-1/2 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Your Answer
            </span>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Characters: {currentText.length}</span>
              <span>•</span>
              <span>Lines: {currentText.split('\n').length}</span>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder={`Start writing your answer here...\n\n${
              currentTask === "TASK_1" 
                ? "Describe the visual information presented, highlighting key trends and making relevant comparisons." 
                : "Present your opinion clearly, support it with reasons and examples, and address different perspectives."
            }`}
            className={`flex-1 w-full p-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none border-none leading-relaxed ${fontSize}`}
            style={{ lineHeight: '1.8' }}
            spellCheck="true"
            aria-label={`Writing area for ${currentTaskData?.task_type_display}`}
          />

          <div className="bg-linear-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-t-2 border-gray-200 dark:border-gray-700 px-6 py-4 shadow-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {isUnderMin ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">
                      {minWords - wordCount} more word{minWords - wordCount !== 1 ? "s" : ""} needed
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Word count requirement met</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {currentTask === "TASK_1" && task2 ? (
                  <button
                    onClick={() => setCurrentTask("TASK_2")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-md"
                  >
                    Continue to Task 2 →
                  </button>
                ) : currentTask === "TASK_2" && nextSectionName ? (
                  <button
                    onClick={() => handleNextSection(false)}
                    className="px-5 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
                  >
                    Continue to {nextSectionName.charAt(0).toUpperCase() + nextSectionName.slice(1)} →
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && (currentTaskData?.picture_url || currentTaskData?.picture) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full mx-4">
            {/* Close button */}
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              aria-label="Close image"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Image */}
            <img
              src={currentTaskData.picture_url || currentTaskData.picture}
              alt="Task visual reference - enlarged view"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                setIsImageModalOpen(false);
              }}
            />

            {/* Hint text */}
            <div className="absolute -bottom-10 left-0 right-0 text-center text-white/80 text-sm">
              Press <kbd className="px-2 py-1 bg-white/20 rounded">ESC</kbd> or click outside to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
