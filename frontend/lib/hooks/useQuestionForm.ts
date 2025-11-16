/**
 * useQuestionForm Hook
 * React hook for question form management and validation
 * Migrated from QuestionFormMixin.js
 */

import { useState } from 'react';
import type { Question, QuestionChoice, QuestionTypeOption } from '@/types/reading';

interface ValidationErrors {
  question_text?: string;
  correct_answer_text?: string;
  choices?: string;
}

interface UseQuestionFormReturn {
  currentQuestion: Question;
  validationErrors: ValidationErrors;
  editingQuestionIndex: number | null;
  showExplanation: boolean;
  isQuestionValid: boolean;
  setCurrentQuestion: (question: Question) => void;
  setEditingQuestionIndex: (index: number | null) => void;
  setShowExplanation: (show: boolean) => void;
  validateQuestion: (questionType?: QuestionTypeOption) => boolean;
  resetQuestionForm: () => void;
  createQuestionObject: () => Question;
}

const initialQuestion: Question = {
  id: null,
  question_text: '',
  correct_answer_text: '',
  answer_two_text: '',
  choices: [],
  order: 0,
  explanation: '',
  points: 1,
};

export function useQuestionForm(selectedQuestionType?: QuestionTypeOption): UseQuestionFormReturn {
  const [currentQuestion, setCurrentQuestion] = useState<Question>(initialQuestion);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const isQuestionValid = (): boolean => {
    if (!currentQuestion.question_text.trim()) return false;

    if (selectedQuestionType?.hasChoices) {
      return !!(
        currentQuestion.choices && 
        currentQuestion.choices.length >= 2 &&
        currentQuestion.choices.some((c) => !!c.is_correct)
      );
    }

    return !!currentQuestion.correct_answer_text.trim();
  };

  const validateQuestion = (questionType?: QuestionTypeOption): boolean => {
    const errors: ValidationErrors = {};
    const type = questionType || selectedQuestionType;

    if (!currentQuestion.question_text.trim()) {
      errors.question_text = 'Question text is required';
    }

    if (type?.hasChoices) {
      if (!currentQuestion.choices || currentQuestion.choices.length < 2) {
        errors.choices = 'At least 2 choices are required';
      } else if (!currentQuestion.choices.some((c) => c.is_correct)) {
        errors.choices = 'At least one correct answer must be selected';
      }
    } else {
      if (!currentQuestion.correct_answer_text.trim()) {
        errors.correct_answer_text = 'Answer is required';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetQuestionForm = () => {
    setCurrentQuestion(initialQuestion);
    setEditingQuestionIndex(null);
    setValidationErrors({});
    setShowExplanation(false);
  };

  const createQuestionObject = (): Question => {
    return {
      id: currentQuestion.id || null,
      question_text: currentQuestion.question_text,
      correct_answer_text: currentQuestion.correct_answer_text,
      answer_two_text: currentQuestion.answer_two_text,
      choices: selectedQuestionType?.hasChoices ? [...(currentQuestion.choices || [])] : [],
      order: currentQuestion.order || 0,
      explanation: currentQuestion.explanation || '',
      points: currentQuestion.points || 1,
    };
  };

  return {
    currentQuestion,
    validationErrors,
    editingQuestionIndex,
    showExplanation,
    isQuestionValid: isQuestionValid(),
    setCurrentQuestion,
    setEditingQuestionIndex,
    setShowExplanation,
    validateQuestion,
    resetQuestionForm,
    createQuestionObject,
  };
}
