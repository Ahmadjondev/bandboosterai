/**
 * Practice Question Palette Component
 * Simplified question palette for practice mode
 * Shows all questions in a single row with answered status
 */

"use client";

interface Question {
  id: number;
  order: number;
  type?: string;
  max_selections?: number | string;
}

interface PracticeQuestionPaletteProps {
  questions: Question[];
  answeredQuestions: Set<number>;
  onQuestionClick: (questionId: number) => void;
}

export default function PracticeQuestionPalette({
  questions,
  answeredQuestions,
  onQuestionClick,
}: PracticeQuestionPaletteProps) {
  // Calculate total questions (MCMA questions count as multiple based on max_selections)
  const totalQuestions = questions.reduce((sum, q) => {
    if (q.type === "MCMA" && q.max_selections) {
      const maxSelections =
        typeof q.max_selections === "string"
          ? parseInt(q.max_selections)
          : q.max_selections;
      return sum + maxSelections;
    }
    return sum + 1;
  }, 0);

  const answeredCount = answeredQuestions.size;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40">
      <div className="px-4 py-3 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Label */}
          <div className="shrink-0">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Questions:
            </span>
          </div>

          {/* Question buttons */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1">
            {questions.map((q) => {
              const isAnswered = answeredQuestions.has(q.id);

              return (
                <button
                  key={q.id}
                  onClick={() => onQuestionClick(q.id)}
                  className={`w-10 h-10 shrink-0 rounded-lg text-sm font-semibold transition-all border-2 ${
                    isAnswered
                      ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  title={`Question ${q.order}${isAnswered ? " - Answered" : " - Not answered"}`}
                >
                  {q.order}
                </button>
              );
            })}
          </div>

          {/* Progress summary */}
          <div className="shrink-0 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {answeredCount} / {totalQuestions}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
