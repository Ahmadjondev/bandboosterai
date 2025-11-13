/**
 * Question Palette Component
 * Bottom navigation palette for navigating questions/parts/passages
 * 
 * Features:
 * - Part/Passage navigation
 * - Question status indicators (answered/unanswered)
 * - Click to scroll to question
 * - Answer count display
 * - Compact single-row layout matching Vue.js version
 */

"use client";

import { useEffect, useRef } from "react";

interface QuestionPaletteProps {
  parts: Array<{
    number: number;
    title: string;
    questions: Array<{ 
      id: number; 
      order: number; 
      type?: string; 
      max_selections?: number | string;
    }>;
  }>;
  currentPart: number;
  answeredQuestions: Set<number>;
  onPartChange: (partIndex: number) => void;
  onQuestionClick: (questionId: number) => void;
}

export default function QuestionPalette({
  parts,
  currentPart,
  answeredQuestions,
  onPartChange,
  onQuestionClick,
}: QuestionPaletteProps) {
  const paletteRef = useRef<HTMLDivElement>(null);

  // Calculate total questions and answered count
  // For MCMA questions, count based on max_selections
  const totalQuestions = parts.reduce((sum, part) => {
    return sum + part.questions.reduce((qSum, q) => {
      if (q.type === "MCMA" && q.max_selections) {
        const maxSelections = typeof q.max_selections === 'string' 
          ? parseInt(q.max_selections) 
          : q.max_selections;
        return qSum + maxSelections;
      }
      return qSum + 1;
    }, 0);
  }, 0);
  
  const answeredCount = answeredQuestions.size;

  // Get questions for current part
  const currentPartData = parts[currentPart];
  const questions = currentPartData?.questions || [];

  // Scroll to palette when it opens
  useEffect(() => {
    if (paletteRef.current) {
      paletteRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [currentPart]);

  // Calculate answered count for a specific part
  // For MCMA questions, count based on max_selections
  const getPartAnsweredCount = (partIndex: number) => {
    const part = parts[partIndex];
    if (!part) return 0;
    
    return part.questions.reduce((count, q) => {
      if (answeredQuestions.has(q.id)) {
        if (q.type === "MCMA" && q.max_selections) {
          const maxSelections = typeof q.max_selections === 'string' 
            ? parseInt(q.max_selections) 
            : q.max_selections;
          return count + maxSelections;
        }
        return count + 1;
      }
      return count;
    }, 0);
  };
  
  // Calculate total questions for a specific part
  const getPartTotalCount = (partIndex: number) => {
    const part = parts[partIndex];
    if (!part) return 0;
    
    return part.questions.reduce((count, q) => {
      if (q.type === "MCMA" && q.max_selections) {
        const maxSelections = typeof q.max_selections === 'string' 
          ? parseInt(q.max_selections) 
          : q.max_selections;
        return count + maxSelections;
      }
      return count + 1;
    }, 0);
  };

  return (
    <div
      ref={paletteRef}
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-gray-600 shadow-lg z-40"
    >
      <div className="px-4 py-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 overflow-x-auto">
          {/* Part/Passage Buttons */}
          {parts.map((part, idx) => (
            <div key={idx} className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => onPartChange(idx)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  idx === currentPart
                    ? "bg-slate-900 dark:bg-slate-700 text-white"
                    : "bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600"
                }`}
              >
                Part {part.number}
                {idx !== currentPart && (
                  <span className="ml-2 text-xs opacity-75">
                    {getPartAnsweredCount(idx)}/{getPartTotalCount(idx)}
                  </span>
                )}
              </button>
              
              {/* Separator */}
              {idx < parts.length - 1 && (
                <span className="text-slate-300 dark:text-gray-600 shrink-0">|</span>
              )}
            </div>
          ))}

          {/* Arrow separator */}
          <span className="text-slate-400 dark:text-gray-500 text-lg shrink-0 mx-1">→</span>

          {/* Question buttons for active part */}
          <div className="flex items-center gap-2">
            {questions.map((q) => {
              const isAnswered = answeredQuestions.has(q.id);

              return (
                <button
                  key={q.id}
                  onClick={() => onQuestionClick(q.id)}
                  className={`w-8 h-8 shrink-0 rounded-lg text-sm font-semibold transition-all border-2 ${
                    isAnswered
                      ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600"
                      : "bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700"
                  }`}
                  title={`Question ${q.order}${isAnswered ? " - Answered" : " - Not answered"}`}
                >
                  {q.order}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
