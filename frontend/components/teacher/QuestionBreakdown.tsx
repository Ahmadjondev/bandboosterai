'use client';

import { Check, X, Minus } from 'lucide-react';

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

interface QuestionBreakdownProps {
  questions: AllQuestion[];
  section: 'listening' | 'reading';
}

export default function QuestionBreakdown({
  questions,
  section,
}: QuestionBreakdownProps) {
  if (!questions || questions.length === 0) return null;

  const correctCount = questions.filter((q) => q.is_correct).length;
  const answeredCount = questions.filter((q) => q.is_answered).length;
  const totalCount = questions.length;
  const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Compact Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
            {section}
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {correctCount}/{totalCount}
            </span>
            <span className={`font-semibold ${
              accuracy >= 70 ? 'text-green-600' : accuracy >= 50 ? 'text-orange-600' : 'text-red-600'
            }`}>
              {accuracy.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Minimalist Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-16">
                Q#
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Student Answer
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Correct Answer
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-16">
                ✓
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {questions.map((question) => (
              <tr
                key={question.id}
                className={`transition-colors ${
                  question.is_answered
                    ? question.is_correct
                      ? 'hover:bg-green-50/50 dark:hover:bg-green-900/5'
                      : 'hover:bg-red-50/50 dark:hover:bg-red-900/5'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                }`}
              >
                {/* Question Number */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {question.order}
                  </span>
                </td>

                {/* Student Answer */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      !question.is_answered
                        ? 'text-gray-400 dark:text-gray-500'
                        : question.is_correct
                        ? 'text-gray-900 dark:text-white'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {question.user_answer || '—'}
                    </span>
                  </div>
                </td>

                {/* Correct Answer */}
                <td className="px-4 py-3">
                  {!question.is_correct && question.is_answered ? (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {question.correct_answer}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      —
                    </span>
                  )}
                </td>

                {/* Status Icon */}
                <td className="px-4 py-3 text-center">
                  {!question.is_answered ? (
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700">
                      <Minus className="h-4 w-4 text-gray-400" />
                    </div>
                  ) : question.is_correct ? (
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30">
                      <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
