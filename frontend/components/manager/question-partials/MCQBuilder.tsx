/**
 * MCQBuilder Component
 * Specialized builder for MCQ questions with choices
 * Supports both single answer (MCQ) and multiple answers (MCMA)
 */

'use client';

import { Info, Check, X, Plus } from 'lucide-react';
import type { Question, QuestionChoice } from '@/types/reading';

interface MCQBuilderProps {
  question: Question;
  questionType: 'MCQ' | 'MCMA';
  validationErrors: Record<string, string>;
  onUpdate: (question: Question) => void;
}

export function MCQBuilder({
  question,
  questionType,
  validationErrors,
  onUpdate,
}: MCQBuilderProps) {
  const isMultipleAnswers = questionType === 'MCMA';

  const selectedCorrectCount = question.choices?.filter((c) => c.is_correct).length || 0;

  const correctAnswersDisplay = isMultipleAnswers
    ? selectedCorrectCount > 0
      ? `${selectedCorrectCount} correct answer${selectedCorrectCount !== 1 ? 's' : ''} selected`
      : 'Select multiple correct answers'
    : '';

  const addChoice = () => {
    const newChoices = [
      ...(question.choices || []),
      {
        choice_text: '',
        is_correct: false,
      },
    ];
    onUpdate({ ...question, choices: newChoices });
  };

  const removeChoice = (index: number) => {
    const newChoices = question.choices?.filter((_, i) => i !== index) || [];
    onUpdate({ ...question, choices: newChoices });
  };

  const setCorrectChoice = (index: number) => {
    const newChoices = [...(question.choices || [])];
    if (isMultipleAnswers) {
      // MCMA: Toggle the selected choice
      newChoices[index] = {
        ...newChoices[index],
        is_correct: !newChoices[index].is_correct,
      };
    } else {
      // MCQ: Only one can be correct
      newChoices.forEach((choice, i) => {
        choice.is_correct = i === index;
      });
    }
    onUpdate({ ...question, choices: newChoices });
  };

  const updateChoiceText = (index: number, value: string) => {
    const newChoices = [...(question.choices || [])];
    newChoices[index] = { ...newChoices[index], choice_text: value };
    onUpdate({ ...question, choices: newChoices });
  };

  return (
    <div className="mcq-builder">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-slate-700">Answer Choices</label>
        <div className="flex items-center gap-3">
          {isMultipleAnswers && (
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                selectedCorrectCount > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {correctAnswersDisplay}
            </span>
          )}
          <span className="text-xs text-slate-500">
            {question.choices?.length || 0} choices
          </span>
        </div>
      </div>

      {/* Info banner for MCMA */}
      {isMultipleAnswers && (
        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            <div className="text-xs text-orange-700">
              <strong>Multiple Answers:</strong> Each correct answer counts as 1 question toward
              the 40-question total. For example, if you select 2 correct answers, this question
              counts as 2 questions.
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {question.choices?.map((choice, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-sm font-medium text-slate-700 shrink-0">
              {String.fromCharCode(65 + index)}
            </span>
            <input
              value={choice.choice_text}
              onChange={(e) => updateChoiceText(index, e.target.value)}
              type="text"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder={`Enter choice ${String.fromCharCode(65 + index)}`}
            />
            <button
              onClick={() => setCorrectChoice(index)}
              className={`px-3 py-2 border rounded-lg transition-colors shrink-0 hover:shadow-md ${
                choice.is_correct
                  ? 'bg-green-500 text-white border-green-600'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
              title={isMultipleAnswers ? 'Toggle correct answer' : 'Mark as correct'}
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => removeChoice(index)}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addChoice}
        className="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Choice
      </button>

      {(validationErrors.choices || validationErrors.correct) && (
        <p className="mt-1 text-xs text-rose-600">
          {validationErrors.choices || validationErrors.correct}
        </p>
      )}
    </div>
  );
}
