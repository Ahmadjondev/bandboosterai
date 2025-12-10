/**
 * Question List Manager Component
 * Handles displaying, editing, reordering, and managing questions
 */

'use client';

import { useMemo } from 'react';
import {
  HelpCircle,
  Eye,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Edit2,
  Edit,
  Check,
  CheckCircle,
  Info,
  Award,
} from 'lucide-react';
import type { Question } from '@/types/reading';

interface QuestionListProps {
  questions: Question[];
  questionType: string;
  previewMode?: boolean;
  onEditQuestion: (index: number) => void;
  onRemoveQuestion: (index: number) => void;
  onDuplicateQuestion: (index: number) => void;
  onMoveQuestionUp: (index: number) => void;
  onMoveQuestionDown: (index: number) => void;
  onReorderQuestion: (index: number, newOrder: number) => void;
  onTogglePreview: () => void;
  onClearAll: () => void;
  onOpenBuilder?: () => void;
}

export function QuestionList({
  questions,
  questionType,
  previewMode = false,
  onEditQuestion,
  onRemoveQuestion,
  onDuplicateQuestion,
  onMoveQuestionUp,
  onMoveQuestionDown,
  onReorderQuestion,
  onTogglePreview,
  onClearAll,
  onOpenBuilder,
}: QuestionListProps) {
  const isTFNGType = useMemo(
    () => questionType === 'TFNG' || questionType === 'YNNG',
    [questionType]
  );

  const isMatchingType = useMemo(
    () => questionType === 'MF' || questionType === 'MI' || questionType === 'MH',
    [questionType]
  );

  const hasDedicatedBuilder = useMemo(
    () => isTFNGType || isMatchingType,
    [isTFNGType, isMatchingType]
  );

  const questionStats = useMemo(
    () => ({
      total: questions.length,
      withExplanation: questions.filter((q) => q.explanation).length,
      totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
    }),
    [questions]
  );

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-center py-12">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-2">No questions added yet</p>
          <p className="text-xs text-slate-400">Add questions individually or use bulk add</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Questions ({questions.length})
          </h3>
          {questionStats.total > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Total Points: {questionStats.totalPoints} • With Explanations:{' '}
              {questionStats.withExplanation}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasDedicatedBuilder && questions.length > 0 && onOpenBuilder && (
            <button
              onClick={onOpenBuilder}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-700 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add More
            </button>
          )}
          {questions.length > 0 && (
            <button
              onClick={onTogglePreview}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-slate-50 transition-colors ${
                previewMode
                  ? 'bg-orange-50 text-orange-700 border-orange-300'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {previewMode ? 'Edit Mode' : 'Preview Mode'}
            </button>
          )}
          {questions.length > 0 && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Preview Mode */}
      {previewMode ? (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-lg p-5 border border-slate-200"
            >
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 mb-3">
                    {question.question_text}
                  </p>

                  {/* MCQ Choices */}
                  {question.choices && question.choices.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {question.choices.map((choice, cIndex) => (
                        <div
                          key={cIndex}
                          className={`flex items-center gap-2 px-3 py-2 border rounded ${
                            choice.is_correct
                              ? 'bg-green-50 border-green-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-xs font-medium text-slate-700">
                            {String.fromCharCode(65 + cIndex)}.
                          </span>
                          <span className="text-xs text-slate-800">
                            {choice.choice_text}
                          </span>
                          {choice.is_correct && (
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Answer */
                    <div className="mb-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-300 rounded text-xs">
                        <Check className="w-3 h-3 text-green-700" />
                        <span className="font-medium text-green-900">
                          Answer: {question.correct_answer_text}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-2 text-xs text-orange-900">
                      <div className="flex items-start gap-2">
                        <Info className="w-3 h-3 text-orange-600 shrink-0 mt-0.5" />
                        <span>{question.explanation}</span>
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {question.points || 1} point
                      {question.points !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-slate-500 font-medium">#</span>
                      <input
                        type="number"
                        value={question.order}
                        min={1}
                        onChange={(e) => onReorderQuestion(index, parseInt(e.target.value) || 1)}
                        onWheel={(e) => e.preventDefault()}
                        inputMode="numeric"
                        className="w-12 px-2 py-1 text-xs font-bold text-center bg-orange-50 text-orange-700 border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="Question number in passage/part"
                      />
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {question.question_text}
                    </p>
                    {question.explanation && (
                      <span className="shrink-0" title="Has explanation">
                        <Info className="w-3.5 h-3.5 text-orange-500" />
                      </span>
                    )}
                  </div>
                  <div className="ml-16 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Answer:</span>
                    <span className="text-xs text-green-700 font-medium">
                      {question.correct_answer_text}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      {question.points || 1} pt
                      {question.points !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onMoveQuestionUp(index)}
                    disabled={index === 0}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onMoveQuestionDown(index)}
                    disabled={index === questions.length - 1}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {!isTFNGType && (
                    <button
                      onClick={() => onDuplicateQuestion(index)}
                      className="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onEditQuestion(index)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                    title={isTFNGType ? 'Edit in Builder' : 'Edit'}
                  >
                    {isTFNGType ? (
                      <Edit className="w-3.5 h-3.5" />
                    ) : (
                      <Edit2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onRemoveQuestion(index)}
                    className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
