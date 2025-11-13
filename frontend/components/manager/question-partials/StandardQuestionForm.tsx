/**
 * StandardQuestionForm Component
 * Form for non-T/F/NG question types
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { MCQBuilder } from './MCQBuilder';
import type { Question, QuestionTypeOption } from '@/types/reading';

interface StandardQuestionFormProps {
  question: Question;
  questionType: QuestionTypeOption;
  validationErrors: Record<string, string>;
  isEditing: boolean;
  editingIndex: number | null;
  showExplanation: boolean;
  onUpdate: (question: Question) => void;
  onShowExplanationChange: (show: boolean) => void;
  onAddQuestion: () => void;
  onAddAndNew: () => void;
  onCancelEdit: () => void;
  onKeyPress: (event: React.KeyboardEvent) => void;
}

export function StandardQuestionForm({
  question,
  questionType,
  validationErrors,
  isEditing,
  editingIndex,
  showExplanation,
  onUpdate,
  onShowExplanationChange,
  onAddQuestion,
  onAddAndNew,
  onCancelEdit,
  onKeyPress,
}: StandardQuestionFormProps) {
  const [localShowExplanation, setLocalShowExplanation] = useState(showExplanation);

  useEffect(() => {
    setLocalShowExplanation(showExplanation);
  }, [showExplanation]);

  const toggleExplanation = () => {
    const newValue = !localShowExplanation;
    setLocalShowExplanation(newValue);
    onShowExplanationChange(newValue);
  };

  const updateQuestion = (field: keyof Question, value: any) => {
    onUpdate({ ...question, [field]: value });
  };

  const hasErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {isEditing ? 'Edit Question' : 'Add Question'}
        </h3>
        {isEditing && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
              Editing Q{editingIndex! + 1}
            </span>
            <button
              onClick={onCancelEdit}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {hasErrors && (
        <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-800 mb-1">
                Please fix the following errors:
              </p>
              <ul className="text-xs text-rose-700 space-y-1">
                {Object.entries(validationErrors).map(([key, error]) => (
                  <li key={key}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4" onKeyDown={onKeyPress}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Question Text
            <span className="text-rose-600">*</span>
          </label>
          <textarea
            value={question.question_text}
            onChange={(e) => updateQuestion('question_text', e.target.value)}
            rows={3}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 ${
              validationErrors.question_text
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 focus:ring-orange-500'
            } focus:border-orange-500`}
            placeholder="Enter the question..."
          />
          <p className="mt-1 text-xs text-slate-500">
            {question.question_text.length} characters
          </p>
        </div>

        {/* MCQ Choices */}
        {questionType.hasChoices ? (
          <MCQBuilder
            question={question}
            questionType={questionType.code as 'MCQ' | 'MCMA'}
            validationErrors={validationErrors}
            onUpdate={onUpdate}
          />
        ) : (
          /* Non-MCQ Answer */
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Correct Answer
              <span className="text-rose-600">*</span>
            </label>
            <input
              value={question.correct_answer_text}
              onChange={(e) => updateQuestion('correct_answer_text', e.target.value)}
              type="text"
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 ${
                validationErrors.correct_answer_text
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-slate-300 focus:ring-orange-500'
              } focus:border-orange-500`}
              placeholder="Enter the correct answer"
            />
            {validationErrors.correct_answer_text && (
              <p className="mt-1 text-xs text-rose-600">
                {validationErrors.correct_answer_text}
              </p>
            )}
          </div>
        )}

        {/* Additional Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Points</label>
            <input
              value={question.points}
              onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 1)}
              type="number"
              min="1"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add Explanation
            </label>
            <button
              onClick={toggleExplanation}
              className={`w-full px-4 py-2.5 border rounded-lg transition-colors text-sm font-medium ${
                localShowExplanation
                  ? 'bg-orange-50 text-orange-700 border-orange-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-orange-50'
              }`}
            >
              {localShowExplanation ? 'Hide' : 'Show'} Explanation
            </button>
          </div>
        </div>

        {/* Explanation Field */}
        {localShowExplanation && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Explanation / Feedback
            </label>
            <textarea
              value={question.explanation || ''}
              onChange={(e) => updateQuestion('explanation', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Optional: Explain the answer for students"
            />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center gap-2 mt-6 pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Press{' '}
          <kbd className="px-2 py-1 bg-slate-100 rounded border border-slate-300">
            Ctrl/Cmd + Enter
          </kbd>{' '}
          to add and continue
          {isEditing && (
            <>
              {' '}
              or{' '}
              <kbd className="px-2 py-1 bg-slate-100 rounded border border-slate-300">Esc</kbd>{' '}
              to cancel
            </>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={onCancelEdit}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel Edit
            </button>
          )}
          <button
            onClick={onAddQuestion}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
          >
            {isEditing ? 'Update Question' : 'Add Question'}
          </button>
          {!isEditing && (
            <button
              onClick={onAddAndNew}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              Add & New
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
