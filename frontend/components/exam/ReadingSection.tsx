/**
 * Reading Section Component
 * Split-pane layout: passage on left, questions on right
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useExam } from "./ExamContext";
import type { ReadingSection as ReadingSectionType } from "@/types/exam";
import { formatPassageContent } from "@/lib/exam-utils";
import QuestionRenderer from "./QuestionRenderer";
import QuestionPalette from "./QuestionPalette";
import TextHighlighter from "./TextHighlighter";

export default function ReadingSection() {
  const { sectionData, submitAnswer, userAnswers, handleNextSection, attemptId } = useExam();
  const [currentPassage, setCurrentPassage] = useState(0);
  const [fontSize, setFontSize] = useState("text-base");
  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const questionsRef = useRef<Record<number, HTMLDivElement | null>>({});
  const passageContainerRef = useRef<HTMLDivElement>(null!);
  const questionsContainerRef = useRef<HTMLDivElement>(null!);

  const readingData = sectionData as ReadingSectionType;
  const passages = readingData?.passages || [];
  const passage = passages[currentPassage];
  const nextSectionName = (sectionData as any)?.next_section_name || "Next Section";

  const fontSizes = [
    { value: "text-sm", label: "Small" },
    { value: "text-base", label: "Medium" },
    { value: "text-lg", label: "Large" },
  ];

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

  // Auto-scroll to top when passage changes
  useEffect(() => {
    if (passageContainerRef.current) {
      passageContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (questionsContainerRef.current) {
      questionsContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPassage]);

  if (!readingData || passages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading reading section...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Split Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Passage */}
        <div
          className="overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
          style={{ width: `${splitPosition}%` }}
        >
          <div ref={passageContainerRef} className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {passage?.title}
            </h2>
            {passage?.summary && (
              <p className={`italic text-gray-700 dark:text-gray-300 mb-6 ${fontSize}`}>
                {passage.summary}
              </p>
            )}
            <div
              className={`prose prose-gray dark:prose-invert max-w-none ${fontSize}`}
              dangerouslySetInnerHTML={{ __html: formatPassageContent(passage?.content || "") }}
            />
            {passage?.word_count && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
                Word count: {passage.word_count}
              </p>
            )}
          </div>

          {/* TextHighlighter for passage highlighting */}
          <TextHighlighter
            sectionName="reading"
            containerRef={passageContainerRef}
            attemptId={attemptId}
          />
        </div>

        {/* Resizer */}
        <div
          className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 dark:hover:bg-blue-400 cursor-col-resize transition-colors relative group"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = splitPosition;
            const containerWidth = e.currentTarget.parentElement!.offsetWidth;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const newWidth = startWidth + (deltaX / containerWidth) * 100;
              // Constrain between 30% and 70%
              setSplitPosition(Math.max(30, Math.min(70, newWidth)));
            };

            const handleMouseUp = () => {
              document.removeEventListener("mousemove", handleMouseMove);
              document.removeEventListener("mouseup", handleMouseUp);
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
          }}
        >
          {/* Resize Icon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-400 dark:bg-gray-500 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 rounded-full p-2 shadow-md transition-colors pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 8l-4 4 4 4m6 0l4-4-4-4"
              />
            </svg>
          </div>
        </div>

        {/* Right: Questions */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900">
          <div ref={questionsContainerRef} className="p-6 space-y-8">
            {passage?.test_heads?.map((testHead) => (
              <div
                key={testHead.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                

                {/* Questions */}
                <div className="space-y-6">
                  <QuestionRenderer
                    group={testHead}
                    userAnswers={userAnswers}
                    onAnswer={(questionId: number, answer: string, immediate: boolean) => {
                      submitAnswer(questionId, answer, immediate);
                    }}
                    fontSize={fontSize}
                  />
                </div>
              </div>
            ))}
          <div className=" p-6"></div>
          </div>

          {/* TextHighlighter for questions highlighting */}
          <TextHighlighter
            sectionName="reading-questions"
            containerRef={questionsContainerRef}
            attemptId={attemptId}
          />
        </div>
      </div>

      {/* Question Palette */}
      <QuestionPalette
        parts={passages.map((p, idx) => ({
          number: idx + 1,
          title: p.title || `Passage ${idx + 1}`,
          questions: p.test_heads?.flatMap((th) =>
            th.questions?.map((q) => ({ 
              id: q.id, 
              order: q.order,
              type: th.question_type,
              max_selections: q.max_selections
            })) || []
          ) || [],
        }))}
        currentPart={currentPassage}
        answeredQuestions={new Set(
          Object.keys(userAnswers)
            .map((id) => parseInt(id))
            .filter((id) => {
              const answer = userAnswers[id];
              return answer !== "" && answer !== null && answer !== undefined;
            })
        )}
        onPartChange={(idx) => setCurrentPassage(idx)}
        onQuestionClick={(questionId) => {
          const element = questionsRef.current[questionId];
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
      />
    </div>
  );
}
