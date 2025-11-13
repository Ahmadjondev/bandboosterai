/**
 * Matching Features Builder Component
 * Specialized builder for Matching questions (MF/MI/MH)
 * Allows rapid bulk entry with dropdown answers
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  List,
  X,
  Edit2,
  Plus,
  ArrowRight,
  Trash2,
  Check,
  AlertCircle,
  Info,
  UploadCloud,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { Question } from '@/types/reading';

interface MatchingOption {
  value: string;
  label: string;
  fullText: string;
}

interface MatchingBuilderProps {
  questionType?: 'MF' | 'MI' | 'MH';
  existingQuestions?: Question[];
  matchingOptions?: string;
  onQuestionsReady: (questions: Question[]) => void;
  onCancel: () => void;
  onUpdateMatchingOptions: (options: string) => void;
}

export function MatchingBuilder({
  questionType = 'MF',
  existingQuestions = [],
  matchingOptions = '',
  onQuestionsReady,
  onCancel,
  onUpdateMatchingOptions,
}: MatchingBuilderProps) {
  const [bulkText, setBulkText] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [options, setOptions] = useState<MatchingOption[]>([]);
  const [showOptionsEditor, setShowOptionsEditor] = useState(false);
  const [optionsText, setOptionsText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const hasValidQuestions = useMemo(
    () =>
      previewQuestions.length > 0 &&
      previewQuestions.every((q) => q.correct_answer_text),
    [previewQuestions]
  );

  const questionsWithoutAnswers = useMemo(
    () => previewQuestions.filter((q) => !q.correct_answer_text).length,
    [previewQuestions]
  );

  const hasOptions = options.length > 0;

  useEffect(() => {
    if (existingQuestions && existingQuestions.length > 0) {
      setPreviewQuestions(
        existingQuestions.map((q, idx) => ({
          ...q,
          tempId: q.tempId || `existing-${q.id || idx}`,
        }))
      );
      setShowPreview(true);
    }
  }, [existingQuestions]);

  useEffect(() => {
    if (matchingOptions) {
      parseOptions(matchingOptions);
    }
  }, [matchingOptions]);

  const parseOptions = (text: string) => {
    if (!text) {
      setOptions([]);
      return;
    }

    const lines = text.split('\n').filter((line) => line.trim());
    const parsed = lines.map((line) => {
      const match = line.match(/^([A-Z])\s*[-:).]\s*(.+)$/i);
      if (match) {
        return {
          value: match[1].toUpperCase(),
          label: match[2].trim(),
          fullText: line.trim(),
        };
      }
      return {
        value: line.charAt(0).toUpperCase(),
        label: line.trim(),
        fullText: line.trim(),
      };
    });
    setOptions(parsed);
  };

  const toggleOptionsEditor = () => {
    if (!showOptionsEditor) {
      setOptionsText(options.map((o) => o.fullText).join('\n'));
    }
    setShowOptionsEditor(!showOptionsEditor);
  };

  const saveOptions = () => {
    if (!optionsText.trim()) {
      alert('Please enter matching options');
      return;
    }

    parseOptions(optionsText);
    setShowOptionsEditor(false);
    onUpdateMatchingOptions(optionsText);
  };

  const processQuestions = () => {
    if (!bulkText.trim()) {
      alert('Please enter questions');
      return;
    }

    if (options.length === 0) {
      alert('Please set up matching options first');
      return;
    }

    const lines = bulkText.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      alert('No valid questions found');
      return;
    }

    const newQuestions: Question[] = lines.map((line, index) => ({
      tempId: `question-${Date.now()}-${index}`,
      question_text: line.trim(),
      correct_answer_text: '',
      answer_two_text: '',
      choices: [],
      order: index + 1,
      explanation: '',
      points: 1,
    }));

    setPreviewQuestions(newQuestions);
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
      setPreviewQuestions((prev) =>
        prev.filter((_, idx) => idx !== index).map((q, i) => ({ ...q, order: i + 1 }))
      );
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
    if (options.length === 0) {
      alert('Please set up matching options first');
      return;
    }

    const text = prompt('Enter question text:');
    if (text && text.trim()) {
      const newQuestion: Question = {
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

    if (options.length === 0) {
      alert('Please set up matching options first');
      return;
    }

    onQuestionsReady(previewQuestions);
  };

  const getAnswerColor = (answer: string) => {
    const colors = ['indigo', 'blue', 'green', 'amber', 'rose', 'purple', 'pink', 'cyan'];
    const index = answer.charCodeAt(0) - 65;
    return colors[index % colors.length];
  };

  const moveQuestionUp = (index: number) => {
    if (index > 0) {
      setPreviewQuestions((prev) => {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index - 1]] = [
          newQuestions[index - 1],
          newQuestions[index],
        ];
        newQuestions[index].order = index + 1;
        newQuestions[index - 1].order = index;
        return newQuestions;
      });
    }
  };

  const moveQuestionDown = (index: number) => {
    if (index < previewQuestions.length - 1) {
      setPreviewQuestions((prev) => {
        const newQuestions = [...prev];
        [newQuestions[index], newQuestions[index + 1]] = [
          newQuestions[index + 1],
          newQuestions[index],
        ];
        newQuestions[index].order = index + 1;
        newQuestions[index + 1].order = index + 2;
        return newQuestions;
      });
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if ((e.target as HTMLElement).classList.contains('drop-zone')) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (options.length === 0) {
      alert('Please set up matching options first');
      return;
    }

    const files = e.dataTransfer.files;

    if (files.length > 0) {
      for (let file of Array.from(files)) {
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const text = await file.text();
          setBulkText(text);
          return;
        }
      }
      alert('Please drop a text file (.txt)');
      return;
    }

    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      setBulkText(text);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Matching Features Builder
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Quickly add matching questions with answers
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      {/* Options Setup */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-orange-600" />
            <h4 className="font-semibold text-slate-900">Matching Options</h4>
            {hasOptions && (
              <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                {options.length} options
              </span>
            )}
          </div>
          <button
            onClick={toggleOptionsEditor}
            className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors inline-flex items-center gap-2"
          >
            {showOptionsEditor ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            {showOptionsEditor ? 'Cancel' : hasOptions ? 'Edit Options' : 'Set Options'}
          </button>
        </div>

        {showOptionsEditor ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Enter matching options (one per line)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                placeholder="A - First option&#10;B - Second option&#10;C - Third option&#10;D - Fourth option"
              />
              <p className="text-xs text-slate-500 mt-2">
                Format: <code className="bg-slate-100 px-1 py-0.5 rounded">A - Option text</code>{' '}
                or <code className="bg-slate-100 px-1 py-0.5 rounded">A) Option text</code>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowOptionsEditor(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveOptions}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Save Options
              </button>
            </div>
          </div>
        ) : hasOptions ? (
          <div className="grid grid-cols-2 gap-3">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div
                  className={`w-8 h-8 bg-${getAnswerColor(option.value)}-100 rounded-lg flex items-center justify-center`}
                >
                  <span className={`font-bold text-${getAnswerColor(option.value)}-700`}>
                    {option.value}
                  </span>
                </div>
                <span className="text-sm text-slate-900">{option.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-3">No matching options set</p>
            <button
              onClick={toggleOptionsEditor}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Set Up Options
            </button>
          </div>
        )}
      </div>

      {/* Bulk Entry Section */}
      {hasOptions && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Edit2 className="w-5 h-5 text-orange-600" />
            <h4 className="font-semibold text-slate-900">Add Questions</h4>
            <span className="text-xs text-slate-500 ml-2">
              • Drag & drop text files or paste directly
            </span>
          </div>

          <div className="space-y-3">
            <div
              className="drop-zone relative"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-10 bg-orange-50 border-2 border-dashed border-orange-400 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <UploadCloud className="w-12 h-12 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-orange-900">
                      Drop your text file here
                    </p>
                    <p className="text-xs text-orange-600 mt-1">or drop copied text</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enter questions (one per line)
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={8}
                  className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                    isDragging ? 'border-orange-400 bg-orange-50' : ''
                  }`}
                  placeholder="Question 1 text here&#10;Question 2 text here&#10;Question 3 text here&#10;&#10;Or drag & drop a text file here..."
                />
                <div className="flex items-start gap-2 mt-2">
                  <Info className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500">
                    Each line will become a separate question. You'll assign answers in the next
                    step. <strong className="text-orange-600">Try dragging a .txt file here!</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={addSingleQuestion}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Single
              </button>
              <button
                onClick={processQuestions}
                disabled={!bulkText.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Process Questions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions Preview & Answer Assignment */}
      {showPreview && previewQuestions.length > 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-slate-900">Assign Answers</h4>
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                {previewQuestions.length} questions
              </span>
              {questionsWithoutAnswers > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  {questionsWithoutAnswers} without answers
                </span>
              )}
            </div>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {previewQuestions.map((question, index) => (
              <div
                key={question.tempId}
                className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-orange-700">{question.order}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 leading-relaxed">
                    {question.question_text}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-600">Answer:</label>
                    <select
                      value={question.correct_answer_text}
                      onChange={(e) => setAnswer(index, e.target.value)}
                      className={`px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        question.correct_answer_text
                          ? 'bg-white'
                          : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <option value="">Select answer...</option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.value} - {option.label}
                        </option>
                      ))}
                    </select>

                    {question.correct_answer_text && (
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-lg bg-${getAnswerColor(
                          question.correct_answer_text
                        )}-100 text-${getAnswerColor(question.correct_answer_text)}-700`}
                      >
                        {question.correct_answer_text}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveQuestionUp(index)}
                    disabled={index === 0}
                    className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveQuestionDown(index)}
                    disabled={index === previewQuestions.length - 1}
                    className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editQuestion(index)}
                    className="p-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeQuestion(index)}
                    className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center gap-3 mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={addSingleQuestion}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Another
            </button>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveQuestions}
                disabled={!hasValidQuestions}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save {previewQuestions.length} Question
                {previewQuestions.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      ) : (
        hasOptions && (
          <div className="bg-slate-50 rounded-lg border border-slate-200 border-dashed p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-slate-900 mb-1">No questions yet</h4>
            <p className="text-sm text-slate-600 mb-4">Enter questions above to get started</p>
          </div>
        )
      )}
    </div>
  );
}
