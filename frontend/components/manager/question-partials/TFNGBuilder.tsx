/**
 * TFNGBuilder Component
 * Specialized builder for True/False/Not Given questions
 * Allows rapid bulk entry with instant preview
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Zap, X, Edit3, CheckSquare, ArrowRight, ArrowLeft, Plus, Trash2, Check, AlertCircle, Edit2 } from 'lucide-react';
import type { Question } from '@/types/reading';

interface TFNGBuilderProps {
  questionType?: 'TFNG' | 'YNNG';
  existingQuestions?: Question[];
  onQuestionsReady: (questions: Question[]) => void;
  onCancel: () => void;
}

interface AnswerOption {
  value: string;
  label: string;
  color: 'green' | 'rose' | 'amber';
}

interface PreviewQuestion extends Question {
  tempId: string;
}

export function TFNGBuilder({
  questionType = 'TFNG',
  existingQuestions = [],
  onQuestionsReady,
  onCancel,
}: TFNGBuilderProps) {
  const [bulkText, setBulkText] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const answerOptions: AnswerOption[] = useMemo(() => {
    if (questionType === 'YNNG') {
      return [
        { value: 'YES', label: 'Yes', color: 'green' },
        { value: 'NO', label: 'No', color: 'rose' },
        { value: 'NOT GIVEN', label: 'Not Given', color: 'amber' },
      ];
    }
    return [
      { value: 'TRUE', label: 'True', color: 'green' },
      { value: 'FALSE', label: 'False', color: 'rose' },
      { value: 'NOT GIVEN', label: 'Not Given', color: 'amber' },
    ];
  }, [questionType]);

  const typeLabel = questionType === 'YNNG' ? 'Yes/No/Not Given' : 'True/False/Not Given';

  const hasValidQuestions = useMemo(() => {
    return (
      previewQuestions.length > 0 && previewQuestions.every((q) => q.correct_answer_text)
    );
  }, [previewQuestions]);

  const questionsWithoutAnswers = useMemo(() => {
    return previewQuestions.filter((q) => !q.correct_answer_text).length;
  }, [previewQuestions]);

  useEffect(() => {
    if (existingQuestions && existingQuestions.length > 0) {
      setPreviewQuestions(
        existingQuestions.map((q, idx) => ({
          ...q,
          tempId: q.id ? `existing-${q.id}` : `existing-${idx}`,
        }))
      );
      setShowPreview(true);
    }
  }, [existingQuestions]);

  const processQuestions = () => {
    if (!bulkText.trim()) {
      alert('Please enter questions');
      return;
    }

    const lines = bulkText.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      alert('No valid questions found');
      return;
    }

    // Append new questions to existing ones
    const startOrder = previewQuestions.length > 0 
      ? Math.max(...previewQuestions.map(q => q.order || 0)) + 1 
      : 1;
    
    const newQuestions: PreviewQuestion[] = lines.map((line, index) => ({
      id: null,
      tempId: `question-${Date.now()}-${index}`,
      question_text: line.trim(),
      correct_answer_text: '',
      answer_two_text: '',
      choices: [],
      order: startOrder + index,
      explanation: '',
      points: 1,
    }));

    setPreviewQuestions(prev => [...prev, ...newQuestions]);
    setShowPreview(true);
    setBulkText('');
  };

  const setAnswer = (questionIndex: number, answer: string) => {
    setPreviewQuestions((prev) =>
      prev.map((q, idx) =>
        idx === questionIndex ? { ...q, correct_answer_text: answer } : q
      )
    );
  };

  const removeQuestion = (index: number) => {
    if (confirm('Are you sure you want to remove this question?')) {
      setPreviewQuestions((prev) => {
        const updated = prev.filter((_, idx) => idx !== index);
        return updated.map((q, i) => ({ ...q, order: i + 1 }));
      });
    }
  };

  const editQuestion = (index: number) => {
    const question = previewQuestions[index];
    const newText = prompt('Edit question:', question.question_text);
    if (newText && newText.trim()) {
      setPreviewQuestions((prev) =>
        prev.map((q, idx) =>
          idx === index ? { ...q, question_text: newText.trim() } : q
        )
      );
    }
  };

  const addSingleQuestion = () => {
    const text = prompt('Enter question text:');
    if (text && text.trim()) {
      const newQuestion: PreviewQuestion = {
        id: null,
        tempId: `question-${Date.now()}`,
        question_text: text.trim(),
        correct_answer_text: '',
        answer_two_text: '',
        choices: [],
        order: previewQuestions.length + 1,
        explanation: '',
        points: 1,
      };
      setPreviewQuestions((prev) => [...prev, newQuestion]);
      setShowPreview(true);
    }
  };

  const clearAll = () => {
    if (confirm('This will remove all questions. This action cannot be undone.')) {
      setPreviewQuestions([]);
      setBulkText('');
      setShowPreview(false);
    }
  };

  const saveQuestions = () => {
    if (!hasValidQuestions) {
      alert('Please set answers for all questions');
      return;
    }

    // Preserve original IDs when saving, only remove tempId
    const questionsToSave = previewQuestions.map(({ tempId, ...rest }, idx) => ({
      ...rest,
      order: idx + 1, // Ensure proper ordering
    }));
    onQuestionsReady(questionsToSave);
  };

  const handleCancel = () => {
    if (previewQuestions.length > 0) {
      if (confirm('You have unsaved questions. Are you sure you want to discard them?')) {
        setPreviewQuestions([]);
        setBulkText('');
        setShowPreview(false);
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  const getAnswerColorClass = (answer: string) => {
    const option = answerOptions.find((opt) => opt.value === answer);
    if (!option) return 'bg-slate-100 text-slate-700 border-slate-300';

    const colors = {
      green: 'bg-green-100 text-green-700 border-green-300',
      rose: 'bg-rose-100 text-rose-700 border-rose-300',
      amber: 'bg-amber-100 text-amber-700 border-amber-300',
    };
    return colors[option.color];
  };

  const setAllAnswers = (answer: string) => {
    if (confirm(`Set all unanswered questions to "${answer}"?`)) {
      setPreviewQuestions((prev) =>
        prev.map((q) => (q.correct_answer_text ? q : { ...q, correct_answer_text: answer }))
      );
    }
  };

  const updateOrder = (questionIndex: number, newOrder: number) => {
    if (isNaN(newOrder) || newOrder < 1) {
      alert('Order must be a positive number');
      return;
    }

    setPreviewQuestions((prev) =>
      prev.map((q, idx) => (idx === questionIndex ? { ...q, order: newOrder } : q))
    );
  };

  const questionCount = bulkText.split('\n').filter((l) => l.trim()).length;

  return (
    <div className="tfng-builder">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              {typeLabel} Quick Builder
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Add multiple questions at once and assign answers
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Input Section */}
      {!showPreview && (
        <div className="space-y-4">
          <div className="bg-linear-to-br from-indigo-50 to-purple-50 border-2 border-orange-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shrink-0">
                <Edit3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                  Step 1: Enter Questions
                </h4>
                <p className="text-xs text-slate-600">
                  Type or paste one question per line. Press Enter for new question.
                </p>
              </div>
            </div>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-sans text-sm"
              placeholder="Example:&#10;The author was born in London.&#10;The study was conducted over five years.&#10;The results were published in 2020."
              autoFocus
            />

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-500">
                <span className="font-medium">{questionCount}</span> question(s) entered
              </p>
              {bulkText && (
                <button
                  onClick={() => setBulkText('')}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={processQuestions}
              disabled={!bulkText.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Continue to Answers
            </button>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {showPreview && (
        <div className="space-y-4">
          {/* Quick Actions Bar */}
          <div className="bg-linear-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                  Step 2: Assign Answers
                </h4>
                <p className="text-xs text-slate-600 mb-2">
                  Click the buttons below each question to set the correct answer. You can
                  also edit the order numbers.
                </p>

                {/* Quick Answer Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">Quick actions:</span>
                  {answerOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAllAnswers(option.value)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded hover:opacity-80 transition-opacity bg-${option.color}-100 text-${option.color}-700 border-${option.color}-300`}
                    >
                      <Zap className="w-3 h-3" />
                      Set All {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-700">Progress</span>
                <span className="text-xs text-slate-600">
                  {previewQuestions.length - questionsWithoutAnswers} /{' '}
                  {previewQuestions.length} answered
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  style={{
                    width: `${((previewQuestions.length - questionsWithoutAnswers) / previewQuestions.length) * 100}%`,
                  }}
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {previewQuestions.map((question, index) => (
              <div
                key={question.tempId}
                className={`bg-white rounded-lg border-2 p-4 transition-all ${
                  question.correct_answer_text ? 'border-green-200' : 'border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500 font-medium">#</span>
                      <input
                        type="number"
                        value={question.order}
                        min={1}
                        onChange={(e) => updateOrder(index, parseInt(e.target.value))}
                        onWheel={(e) => e.preventDefault()}
                        inputMode="numeric"
                        className={`w-12 px-2 py-1 text-xs font-bold text-center rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 border-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          question.correct_answer_text
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}
                        title="Question number in passage/part"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 mb-3">
                      {question.question_text}
                    </p>

                    {/* Answer Options */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {answerOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAnswer(index, option.value)}
                          className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                            question.correct_answer_text === option.value
                              ? `${getAnswerColorClass(option.value)} ring-2 ring-offset-1 ring-${option.color}-500`
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* Status Badge */}
                    {!question.correct_answer_text && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        <span>Answer not set</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => editQuestion(index)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      title="Edit question"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeQuestion(index)}
                      className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit
              </button>
              <button
                onClick={addSingleQuestion}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add One More
              </button>
              {previewQuestions.length > 0 && (
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>

            <button
              onClick={saveQuestions}
              disabled={!hasValidQuestions}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {existingQuestions && existingQuestions.length > 0 
                ? `Save ${previewQuestions.length} Question(s)` 
                : `Add ${previewQuestions.length} Question(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
