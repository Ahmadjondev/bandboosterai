'use client';

import { X } from 'lucide-react';

interface AllQuestion {
  id: number;
  order: number;
  question_text: string;
  correct_answer: string;
  question_type: string | null;
  user_answer: string | null;
  is_correct: boolean;
  is_answered: boolean;
}

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: AllQuestion[];
  section: 'listening' | 'reading';
}

export default function QuestionModal({
  isOpen,
  onClose,
  questions,
  section,
}: QuestionModalProps) {
  if (!isOpen || !questions || questions.length === 0) return null;

  const correctCount = questions.filter((q) => q.is_correct).length;
  const totalCount = questions.length;
  const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600">
            <div className="text-white">
              <h2 className="text-xl font-bold capitalize flex items-center gap-2">
                {section === 'listening' ? '🎧' : '📖'} {section} Results
              </h2>
              <p className="text-sm text-blue-100 mt-1">
                {correctCount} / {totalCount} correct ({accuracy.toFixed(0)}% accuracy)
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Stats Summary */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {correctCount}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Correct</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {totalCount - correctCount}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Incorrect</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {accuracy.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    question.is_correct
                      ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
                      : question.is_answered
                      ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
                      : 'bg-gray-50/50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700/50'
                  }`}
                >
                  {/* Question Number Badge */}
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      question.is_correct 
                        ? 'bg-green-500 text-white' 
                        : question.is_answered
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-400 text-white'
                    }`}
                  >
                    {question.order}
                  </div>

                  {/* Answer Content */}
                  <div className="flex-1 min-w-0">
                    {/* Question Text */}
                    {question.question_text && (
                      <p className="text-sm text-gray-900 dark:text-white mb-2 font-medium">
                        {question.question_text}
                      </p>
                    )}

                    {/* Answers */}
                    <div className="space-y-1">
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">You:</span>
                        <span className={`font-medium ${
                          !question.is_answered
                            ? 'text-gray-400 dark:text-gray-500 italic'
                            : question.is_correct
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {question.user_answer || 'No answer'}
                        </span>
                      </div>
                      {question.is_answered && !question.is_correct && (
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400 shrink-0">Correct:</span>
                          <span className="text-green-700 dark:text-green-300 font-medium">
                            {question.correct_answer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Icon */}
                  <div className="shrink-0">
                    {question.is_correct ? (
                      <span className="text-green-500 text-lg">✓</span>
                    ) : question.is_answered ? (
                      <span className="text-red-500 text-lg">✗</span>
                    ) : (
                      <span className="text-gray-400 text-lg">−</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
