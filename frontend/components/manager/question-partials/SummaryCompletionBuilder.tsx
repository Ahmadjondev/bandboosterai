/**
 * Summary Completion Builder Component
 * Specialized builder for Summary Completion (SUC) question type
 * Allows rapid bulk entry with drag & drop, stores data as JSON in question_data
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  X,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  Upload,
  Type,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';

interface GeneratedQuestion {
  tempId: string;
  blankNumber: number;
  question_text: string;
  correct_answer_text: string;
  answer_two_text: string;
  choices: any[];
  order: number;
  explanation: string;
  points: number;
  contextBefore?: string;
  contextAfter?: string;
}

interface SummaryCompletionData {
  title: string;
  text: string;
  blankCount?: number;
}

interface SummaryCompletionBuilderProps {
  questionType?: string;
  existingQuestions?: any[];
  summaryData?: string;
  onQuestionsReady: (questions: GeneratedQuestion[]) => void;
  onUpdateSummaryData: (data: string) => void;
  onCancel: () => void;
}

export function SummaryCompletionBuilder({
  questionType = 'SUC',
  existingQuestions = [],
  summaryData = '',
  onQuestionsReady,
  onUpdateSummaryData,
  onCancel,
}: SummaryCompletionBuilderProps) {
  const [summaryTitle, setSummaryTitle] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate blank count (with safe null checks)
  const blankCount = (summaryText?.match(/___+/g) || []).length;
  const hasValidSummary = summaryTitle?.trim() && summaryText?.trim() && blankCount > 0;
  const canGenerate = hasValidSummary && generatedQuestions.length === 0;
  const canSave = generatedQuestions.length > 0 && 
    generatedQuestions.every(q => q.correct_answer_text?.trim());

  // Load existing data
  useEffect(() => {
    if (summaryData) {
      try {
        const parsed: SummaryCompletionData = JSON.parse(summaryData);
        setSummaryTitle(parsed.title || '');
        setSummaryText(parsed.text || '');

        if (existingQuestions && existingQuestions.length > 0) {
          setGeneratedQuestions(existingQuestions.map((q, idx) => ({
            ...q,
            tempId: `existing-${idx}`,
            blankNumber: q.order,
          })));
          setCurrentStep(2);
          setShowPreview(true);
        }
      } catch {
        console.log('summaryData is not JSON, starting fresh');
      }
    }
  }, [summaryData, existingQuestions]);

  // Drag & Drop handlers
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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      for (const file of Array.from(files)) {
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const text = await file.text();
          setSummaryText(text);
          return;
        }
      }
      alert('Please drop a text file (.txt)');
      return;
    }

    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      setSummaryText(text);
    }
  };

  // Generate questions from blanks
  const generateQuestions = useCallback(() => {
    if (!hasValidSummary) {
      alert('Please enter a title and summary with blanks (___)');
      return;
    }

    const parts = summaryText.split(/___+/);
    const numBlanks = parts.length - 1;

    if (numBlanks === 0) {
      alert('No blanks found. Use ___ to mark answer positions');
      return;
    }

    const questions: GeneratedQuestion[] = [];
    for (let i = 0; i < numBlanks; i++) {
      const contextBefore = parts[i].slice(-50).trim();
      const contextAfter = parts[i + 1].slice(0, 50).trim();

      questions.push({
        tempId: `blank-${Date.now()}-${i}`,
        blankNumber: i + 1,
        question_text: `...${contextBefore} _____ ${contextAfter}...`,
        correct_answer_text: '',
        answer_two_text: '',
        choices: [],
        order: i + 1,
        explanation: '',
        points: 1,
        contextBefore,
        contextAfter,
      });
    }

    setGeneratedQuestions(questions);
    setCurrentStep(2);
    setShowPreview(true);
  }, [hasValidSummary, summaryText]);

  // Update answer for a question
  const updateAnswer = (index: number, value: string) => {
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], correct_answer_text: value };
      return updated;
    });
  };

  // Edit question text
  const editQuestionText = (index: number) => {
    const question = generatedQuestions[index];
    const newText = prompt('Edit question text:', question.question_text);
    if (newText && newText.trim()) {
      setGeneratedQuestions(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], question_text: newText.trim() };
        return updated;
      });
    }
  };

  // Remove a question
  const removeQuestion = (index: number) => {
    if (!confirm('Remove this question?')) return;
    
    setGeneratedQuestions(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((q, i) => ({
        ...q,
        order: i + 1,
        blankNumber: i + 1,
      }));
    });
  };

  // Duplicate a question
  const duplicateQuestion = (index: number) => {
    setGeneratedQuestions(prev => {
      const questionToDuplicate = prev[index];
      const duplicate: GeneratedQuestion = {
        ...questionToDuplicate,
        tempId: `duplicate-${Date.now()}-${index}`,
        correct_answer_text: '', // Clear answer for duplicate
      };
      const updated = [...prev];
      updated.splice(index + 1, 0, duplicate);
      return updated.map((q, i) => ({
        ...q,
        order: i + 1,
        blankNumber: i + 1,
      }));
    });
  };

  // Move question up
  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated.map((q, i) => ({
        ...q,
        order: i + 1,
        blankNumber: i + 1,
      }));
    });
  };

  // Move question down
  const moveQuestionDown = (index: number) => {
    if (index >= generatedQuestions.length - 1) return;
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated.map((q, i) => ({
        ...q,
        order: i + 1,
        blankNumber: i + 1,
      }));
    });
  };

  // Clear all
  const clearAll = () => {
    if (!confirm('Clear all content?')) return;
    setSummaryTitle('');
    setSummaryText('');
    setGeneratedQuestions([]);
    setCurrentStep(1);
    setShowPreview(false);
  };

  // Insert blank at cursor
  const insertBlank = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = summaryText;

    setSummaryText(text.substring(0, start) + '___' + text.substring(end));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 3, start + 3);
    }, 0);
  };

  // Save questions
  const saveQuestions = () => {
    if (!canSave) {
      alert('Please set answers for all questions');
      return;
    }

    const summaryDataJSON: SummaryCompletionData = {
      title: summaryTitle,
      text: summaryText,
      blankCount: generatedQuestions.length,
    };

    onQuestionsReady(generatedQuestions);
    onUpdateSummaryData(JSON.stringify(summaryDataJSON, null, 2));
  };

  // Render preview with highlighted blanks
  const renderPreviewHTML = () => {
    if (!summaryText) return '<p class="text-slate-400">No summary text entered</p>';
    
    let html = summaryText.replace(/___+/g, (match, index) => {
      return `<span class="inline-block px-2 py-0.5 mx-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded border border-orange-300 dark:border-orange-700 font-mono text-sm">${match}</span>`;
    });
    
    return `<div class="prose dark:prose-invert max-w-none"><h4 class="font-semibold mb-3">${summaryTitle || 'Untitled'}</h4><p class="whitespace-pre-wrap leading-relaxed">${html}</p></div>`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Summary Completion Builder
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create summary with blanks - questions auto-generate from ___ markers
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

      {/* Step 1: Enter Summary */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Title Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Summary Title</h4>
            </div>
            <input
              type="text"
              value={summaryTitle}
              onChange={(e) => setSummaryTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., The History of Aviation"
            />
          </div>

          {/* Summary Text Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Summary Text</h4>
                {blankCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                    {blankCount} blank{blankCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={insertBlank}
                className="px-3 py-1.5 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Insert Blank
              </button>
            </div>

            {/* Drop Zone */}
            <div
              className={`drop-zone relative border-2 border-dashed rounded-lg transition-colors ${
                isDragging
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-slate-300 dark:border-gray-600'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                ref={textareaRef}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border-0 focus:ring-0 resize-none min-h-[200px] dark:text-white"
                placeholder="Paste or type your summary text here. Use ___ (three underscores) to mark blanks.

Example:
The Wright brothers made their first successful ___ in 1903. Their aircraft, the Wright ___, flew for just ___ seconds..."
                rows={8}
              />
              
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-orange-50/90 dark:bg-orange-900/50 rounded-lg">
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                    <p className="text-orange-700 dark:text-orange-300 font-medium">
                      Drop text file here
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Tip: Use ___ (three underscores) to mark blank positions, or drag & drop a .txt file
            </p>
          </div>

          {/* Preview Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Preview</h4>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPreview && (
              <div
                className="p-4 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-gray-700"
                dangerouslySetInnerHTML={{ __html: renderPreviewHTML() }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-gray-700">
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={generateQuestions}
              disabled={!canGenerate}
              className="px-6 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              Generate Questions
              <span className="px-2 py-0.5 bg-orange-500 rounded text-xs">{blankCount}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Edit Questions */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setCurrentStep(1)}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Summary
          </button>

          {/* Questions List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Generated Questions ({generatedQuestions.length})
            </h4>
            
            <div className="space-y-4">
              {generatedQuestions.map((q, index) => (
                <div
                  key={q.tempId}
                  className="p-4 bg-slate-50 dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {q.blankNumber}
                      </span>
                      <button
                        onClick={() => editQuestionText(index)}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit context
                      </button>
                    </div>
                    
                    {/* CRUD Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => duplicateQuestion(index)}
                        className="p-1.5 text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        title="Duplicate question"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveQuestionUp(index)}
                        disabled={index === 0}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveQuestionDown(index)}
                        disabled={index === generatedQuestions.length - 1}
                        className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-mono">
                    {q.question_text}
                  </p>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Answer:
                    </label>
                    <input
                      type="text"
                      value={q.correct_answer_text}
                      onChange={(e) => updateAnswer(index, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Enter the correct answer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-gray-700">
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={saveQuestions}
              disabled={!canSave}
              className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SummaryCompletionBuilder;
