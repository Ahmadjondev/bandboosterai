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

  // Parse matching options from various formats
  const parseOptions = (data: string) => {
    if (!data) {
      setOptions([]);
      return;
    }

    // Try parsing as JSON first (from AI-generated data)
    try {
      const parsed = JSON.parse(data);
      
      // Check if it's the new format with options array
      if (parsed.options && Array.isArray(parsed.options)) {
        const parsedOptions = parsed.options.map((opt: any) => ({
          value: opt.value || opt.key || '',
          label: opt.label || opt.text || '',
          fullText: `${opt.value || opt.key} - ${opt.label || opt.text}`,
        }));
        setOptions(parsedOptions);
        return;
      }
      
      // Check if it's directly an array of options
      if (Array.isArray(parsed)) {
        const parsedOptions = parsed.map((opt: any) => ({
          value: opt.value || opt.key || '',
          label: opt.label || opt.text || '',
          fullText: `${opt.value || opt.key} - ${opt.label || opt.text}`,
        }));
        setOptions(parsedOptions);
        return;
      }
    } catch {
      // Not JSON, try parsing as plain text
    }

    // Parse as plain text (legacy format)
    const lines = data.split('\n').filter((line) => line.trim());
    const parsed = lines.map((line) => {
      const match = line.match(/^([A-Za-z0-9]+)\s*[-:).]\s*(.+)$/i);
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

    // Parse text into options
    const lines = optionsText.split('\n').filter((line) => line.trim());
    const parsedOptions = lines.map((line) => {
      const match = line.match(/^([A-Za-z0-9]+)\s*[-:).]\s*(.+)$/i);
      if (match) {
        return {
          value: match[1].toUpperCase(),
          label: match[2].trim(),
        };
      }
      return {
        value: line.charAt(0).toUpperCase(),
        label: line.trim(),
      };
    });

    // Update options state
    setOptions(parsedOptions.map(opt => ({
      ...opt,
      fullText: `${opt.value} - ${opt.label}`
    })));
    setShowOptionsEditor(false);
    
    // Save as JSON format for consistency
    const jsonData = JSON.stringify({ options: parsedOptions }, null, 2);
    onUpdateMatchingOptions(jsonData);
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

    // Append new questions to existing ones
    const startOrder = previewQuestions.length > 0 
      ? Math.max(...previewQuestions.map(q => q.order || 0)) + 1 
      : 1;

    const newQuestions: Question[] = lines.map((line, index) => ({
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

    // Preserve original IDs when saving, ensure proper ordering
    const questionsToSave = previewQuestions.map((q, idx) => {
      const { tempId, ...rest } = q as Question & { tempId?: string };
      return {
        ...rest,
        order: idx + 1, // Ensure proper ordering
      };
    });
    onQuestionsReady(questionsToSave);
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

  // Get question type labels
  const getTypeInfo = () => {
    switch (questionType) {
      case 'MF':
        return {
          title: '🔗 Matching Features Builder',
          description: 'Match statements with people, places, or categories',
          optionsLabel: 'Features/Categories',
          optionsPlaceholder: 'A - Sir Francis Drake\nB - Wilfried Morawetz\nC - Dany Cleyet-Marrel',
        };
      case 'MI':
        return {
          title: '📄 Matching Information Builder',
          description: 'Match information with specific paragraphs or sections',
          optionsLabel: 'Paragraphs/Sections',
          optionsPlaceholder: 'A - Paragraph A\nB - Paragraph B\nC - Paragraph C',
        };
      case 'MH':
        return {
          title: '📑 Matching Headings Builder',
          description: 'Match headings with paragraphs',
          optionsLabel: 'Headings',
          optionsPlaceholder: 'i - Western countries provide essential assistance\nii - Unbalanced development for essential space technology',
        };
      default:
        return {
          title: '🔗 Matching Builder',
          description: 'Create matching questions',
          optionsLabel: 'Options',
          optionsPlaceholder: 'A - Option 1\nB - Option 2',
        };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {typeInfo.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {typeInfo.description}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors inline-flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Close
        </button>
      </div>

      {/* Options Setup */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">{typeInfo.optionsLabel}</h4>
            {hasOptions && (
              <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Enter {typeInfo.optionsLabel.toLowerCase()} (one per line)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm dark:bg-gray-700 dark:text-white"
                placeholder={typeInfo.optionsPlaceholder}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Format: <code className="bg-slate-100 dark:bg-gray-700 px-1 py-0.5 rounded">A - Option text</code>{' '}
                or <code className="bg-slate-100 dark:bg-gray-700 px-1 py-0.5 rounded">i - Heading text</code>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowOptionsEditor(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-gray-700"
              >
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center shrink-0">
                  <span className="font-bold text-orange-700 dark:text-orange-300 text-sm">
                    {option.value}
                  </span>
                </div>
                <span className="text-sm text-slate-900 dark:text-slate-100 pt-1">{option.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-gray-700 border-dashed">
            <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">No {typeInfo.optionsLabel.toLowerCase()} set</p>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Edit2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Add Questions</h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
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
                <div className="absolute inset-0 z-10 bg-orange-50 dark:bg-orange-900/20 border-2 border-dashed border-orange-400 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <UploadCloud className="w-12 h-12 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-300">
                      Drop your text file here
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">or drop copied text</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Enter questions (one per line)
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={8}
                  className={`w-full px-4 py-3 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors dark:bg-gray-700 dark:text-white ${
                    isDragging ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : ''
                  }`}
                  placeholder="Question 1 text here&#10;Question 2 text here&#10;Question 3 text here&#10;&#10;Or drag & drop a text file here..."
                />
                <div className="flex items-start gap-2 mt-2">
                  <Info className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Each line will become a separate question. You'll assign answers in the next
                    step. <strong className="text-orange-600 dark:text-orange-400">Try dragging a .txt file here!</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={addSingleQuestion}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Single
              </button>
              <button
                onClick={processQuestions}
                disabled={!bulkText.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Assign Answers</h4>
              <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 rounded-full">
                {previewQuestions.length} questions
              </span>
              {questionsWithoutAnswers > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                  {questionsWithoutAnswers} without answers
                </span>
              )}
            </div>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>

          <div className="space-y-3">
            {previewQuestions.map((question, index) => (
              <div
                key={question.tempId}
                className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{question.order}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                    {question.question_text}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Answer:</label>
                    <select
                      value={question.correct_answer_text}
                      onChange={(e) => setAnswer(index, e.target.value)}
                      className={`px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-white ${
                        question.correct_answer_text
                          ? 'bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600'
                          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
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
                      <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        {question.correct_answer_text}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveQuestionUp(index)}
                    disabled={index === 0}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveQuestionDown(index)}
                    disabled={index === previewQuestions.length - 1}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editQuestion(index)}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeQuestion(index)}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
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
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveQuestions}
                disabled={!hasValidQuestions}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed inline-flex items-center gap-2"
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
          <div className="bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-gray-700 border-dashed p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">No questions yet</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Enter questions above to get started</p>
          </div>
        )
      )}
    </div>
  );
}
