/**
 * Table Completion Builder Component
 * 
 * Advanced builder for creating Table Completion questions:
 * - Create structured tables with headers
 * - Add rows and columns dynamically
 * - Insert <input> blanks in cells
 * - Auto-generate questions from <input> tags
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  X,
  Edit3,
  Save,
  Eye,
  EyeOff,
  Table2,
  Columns,
  Rows,
  ArrowUp,
  ArrowDown,
  Copy,
} from 'lucide-react';

interface TableStructure {
  title: string;
  headers: string[];
  rows: string[][];
}

interface GeneratedQuestion {
  tempId: string;
  question_text: string;
  correct_answer_text: string;
  answer_two_text: string;
  choices: any[];
  order: number;
  explanation: string;
  points: number;
}

interface TableCompletionBuilderProps {
  questionType?: string;
  existingQuestions?: any[];
  tableData?: string;
  onQuestionsReady: (questions: GeneratedQuestion[]) => void;
  onUpdateTableData: (data: string) => void;
  onCancel: () => void;
}

export function TableCompletionBuilder({
  questionType = 'TC',
  existingQuestions = [],
  tableData = '',
  onQuestionsReady,
  onUpdateTableData,
  onCancel,
}: TableCompletionBuilderProps) {
  const [tableStructure, setTableStructure] = useState<TableStructure>({
    title: '',
    headers: ['Column 1', 'Column 2'],
    rows: [['', '']],
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Load existing data
  useEffect(() => {
    if (tableData) {
      try {
        const parsed = JSON.parse(tableData);
        // Ensure we have valid structure with defaults
        setTableStructure({
          title: parsed.title || '',
          headers: Array.isArray(parsed.headers) && parsed.headers.length > 0 
            ? parsed.headers 
            : ['Column 1', 'Column 2'],
          rows: Array.isArray(parsed.rows) && parsed.rows.length > 0 
            ? parsed.rows 
            : [['', '']],
        });
        
        if (existingQuestions && existingQuestions.length > 0) {
          setGeneratedQuestions(existingQuestions.map((q, idx) => ({
            ...q,
            tempId: `existing-${idx}`,
          })));
          setCurrentStep(2);
        }
      } catch {
        console.log('tableData is not valid JSON, starting fresh');
      }
    }
  }, [tableData, existingQuestions]);

  // Add column
  const addColumn = () => {
    setTableStructure(prev => ({
      ...prev,
      headers: [...prev.headers, `Column ${prev.headers.length + 1}`],
      rows: prev.rows.map(row => [...row, '']),
    }));
  };

  // Remove column
  const removeColumn = (colIndex: number) => {
    if (tableStructure.headers.length <= 2) {
      alert('Table must have at least 2 columns');
      return;
    }
    setTableStructure(prev => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== colIndex),
      rows: prev.rows.map(row => row.filter((_, i) => i !== colIndex)),
    }));
  };

  // Update header
  const updateHeader = (colIndex: number, value: string) => {
    setTableStructure(prev => {
      const headers = [...prev.headers];
      headers[colIndex] = value;
      return { ...prev, headers };
    });
  };

  // Add row
  const addRow = () => {
    setTableStructure(prev => ({
      ...prev,
      rows: [...prev.rows, new Array(prev.headers.length).fill('')],
    }));
  };

  // Remove row
  const removeRow = (rowIndex: number) => {
    if (tableStructure.rows.length <= 1) {
      alert('Table must have at least 1 row');
      return;
    }
    setTableStructure(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== rowIndex),
    }));
  };

  // Update cell
  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    setTableStructure(prev => {
      const rows = prev.rows.map((row, ri) =>
        ri === rowIndex
          ? row.map((cell, ci) => (ci === colIndex ? value : cell))
          : row
      );
      return { ...prev, rows };
    });
  };

  // Insert blank in cell
  const insertBlank = (rowIndex: number, colIndex: number) => {
    setTableStructure(prev => {
      const rows = prev.rows.map((row, ri) =>
        ri === rowIndex
          ? row.map((cell, ci) => (ci === colIndex ? cell + '<input>' : cell))
          : row
      );
      return { ...prev, rows };
    });
  };

  // Count blanks (with safe null checks)
  const countBlanks = useCallback(() => {
    let count = 0;
    
    // Safe check for rows array
    const rows = Array.isArray(tableStructure?.rows) ? tableStructure.rows : [];
    
    rows.forEach(row => {
      if (!Array.isArray(row)) return;
      row.forEach(cell => {
        if (cell && typeof cell === 'string') {
          count += (cell.match(/<input>/gi) || []).length;
        }
      });
    });
    return count;
  }, [tableStructure]);

  // Generate questions (with safe null checks)
  const generateQuestions = () => {
    const blankCount = countBlanks();
    if (blankCount === 0) {
      alert('No blanks found. Use the blank button to add <input> tags in cells.');
      return;
    }

    const questions: GeneratedQuestion[] = [];
    let questionNumber = 1;

    // Safe check for rows array
    const rows = Array.isArray(tableStructure?.rows) ? tableStructure.rows : [];
    const headers = Array.isArray(tableStructure?.headers) ? tableStructure.headers : [];
    
    rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, colIndex) => {
        if (!cell || typeof cell !== 'string') return;
        const matches = cell.match(/<input>/gi);
        if (matches) {
          matches.forEach(() => {
            const header = headers[colIndex] || `Column ${colIndex + 1}`;
            const rowLabel = row[0] || `Row ${rowIndex + 1}`;
            questions.push({
              tempId: `q-${Date.now()}-${questionNumber}`,
              question_text: `${tableStructure.title ? tableStructure.title + ': ' : ''}${rowLabel} - ${header}`,
              correct_answer_text: '',
              answer_two_text: '',
              choices: [],
              order: questionNumber,
              explanation: '',
              points: 1,
            });
            questionNumber++;
          });
        }
      });
    });

    setGeneratedQuestions(questions);
    setCurrentStep(2);
  };

  // CRUD operations for questions
  const updateAnswer = (index: number, value: string) => {
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], correct_answer_text: value };
      }
      return updated;
    });
  };

  const updateQuestionText = (index: number, value: string) => {
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], question_text: value };
      }
      return updated;
    });
  };

  // Edit question text with prompt
  const editQuestion = (index: number) => {
    const question = generatedQuestions[index];
    if (!question) return;
    const newText = prompt('Edit question text:', question.question_text);
    if (newText && newText.trim()) {
      updateQuestionText(index, newText.trim());
    }
  };

  const removeQuestion = (index: number) => {
    if (!confirm('Remove this question?')) return;
    setGeneratedQuestions(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  // Alias for deleteQuestion
  const deleteQuestion = (index: number) => removeQuestion(index);

  const duplicateQuestion = (index: number) => {
    setGeneratedQuestions(prev => {
      const q = prev[index];
      if (!q) return prev;
      const newQuestion = {
        ...q,
        tempId: `q-${Date.now()}-dup`,
        correct_answer_text: '', // Clear answer for duplicate
      };
      const updated = [...prev];
      updated.splice(index + 1, 0, newQuestion);
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  // Move question up
  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  // Move question down
  const moveQuestionDown = (index: number) => {
    if (index >= generatedQuestions.length - 1) return;
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated.map((q, i) => ({ ...q, order: i + 1 }));
    });
  };

  const reorderQuestions = () => {
    setGeneratedQuestions(prev => 
      prev.map((q, idx) => ({ ...q, order: idx + 1 }))
    );
  };

  // Save
  const saveQuestions = () => {
    if (generatedQuestions.some(q => !q.correct_answer_text?.trim())) {
      alert('Please fill in all answers');
      return;
    }

    reorderQuestions();
    onQuestionsReady(generatedQuestions);
    onUpdateTableData(JSON.stringify(tableStructure, null, 2));
  };

  // Render preview (with safe null checks)
  const renderPreview = () => {
    const headers = Array.isArray(tableStructure?.headers) ? tableStructure.headers : [];
    const rows = Array.isArray(tableStructure?.rows) ? tableStructure.rows : [];
    
    if (headers.length === 0) {
      return '<p class="text-slate-400">No table content yet</p>';
    }

    let html = '';
    if (tableStructure?.title) {
      html += `<h3 class="font-bold text-lg mb-4 text-center">${tableStructure.title}</h3>`;
    }

    html += '<div class="overflow-x-auto"><table class="w-full border-collapse border border-slate-300 dark:border-gray-600">';
    
    // Headers
    html += '<thead><tr class="bg-slate-100 dark:bg-gray-700">';
    headers.forEach(header => {
      html += `<th class="border border-slate-300 dark:border-gray-600 px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300">${header || ''}</th>`;
    });
    html += '</tr></thead>';

    // Rows
    html += '<tbody>';
    rows.forEach(row => {
      if (!Array.isArray(row)) return;
      html += '<tr>';
      row.forEach(cell => {
        const cellValue = (cell && typeof cell === 'string') ? cell : '';
        const formatted = cellValue.replace(/<input>/gi,
          '<span class="inline-block px-3 py-0.5 mx-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded border border-orange-300 dark:border-orange-700 font-mono text-sm min-w-[60px]">___</span>'
        );
        html += `<td class="border border-slate-300 dark:border-gray-600 px-3 py-2 text-slate-600 dark:text-slate-400">${formatted || '&nbsp;'}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    return html;
  };

  const blankCount = countBlanks();
  const canGenerate = tableStructure?.title?.trim() && blankCount > 0;
  const canSave = generatedQuestions.length > 0 &&
    generatedQuestions.every(q => q.correct_answer_text?.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            📊 Table Completion Builder
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create tables with headers, rows, and blanks for answers
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

      {/* Step 1: Table Editor */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Table Title */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Table Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={tableStructure.title}
              onChange={(e) => setTableStructure(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Types of Music Festival"
            />
          </div>

          {/* Table Controls */}
          <div className="flex gap-3">
            <button
              onClick={addColumn}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
            >
              <Columns className="w-4 h-4" />
              Add Column
            </button>
            <button
              onClick={addRow}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition inline-flex items-center gap-2"
            >
              <Rows className="w-4 h-4" />
              Add Row
            </button>
          </div>

          {/* Table Editor */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-4 overflow-x-auto">
            <table className="w-full border-collapse">
              {/* Headers */}
              <thead>
                <tr>
                  {(Array.isArray(tableStructure?.headers) ? tableStructure.headers : []).map((header, colIndex) => (
                    <th key={`header-${colIndex}`} className="p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={header || ''}
                          onChange={(e) => updateHeader(colIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded font-semibold bg-slate-50 dark:bg-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:text-white"
                          placeholder="Header"
                        />
                        <button
                          onClick={() => removeColumn(colIndex)}
                          className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                          title="Remove column"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="w-10"></th>
                </tr>
              </thead>
              
              {/* Rows */}
              <tbody>
                {(Array.isArray(tableStructure?.rows) ? tableStructure.rows : []).map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {(Array.isArray(row) ? row : []).map((cell, colIndex) => (
                      <td key={`cell-${rowIndex}-${colIndex}`} className="p-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={cell || ''}
                            onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white font-mono"
                            placeholder="Cell content"
                          />
                          <button
                            onClick={() => insertBlank(rowIndex, colIndex)}
                            className="p-1 text-orange-600 dark:text-orange-400 hover:text-orange-700 border border-orange-300 dark:border-orange-800 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            title="Insert blank"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    ))}
                    <td className="p-2">
                      <button
                        onClick={() => removeRow(rowIndex)}
                        className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-base font-semibold text-slate-700 dark:text-slate-300">Preview</h5>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {blankCount} blank{blankCount !== 1 ? 's' : ''} found
                </span>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPreview ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {showPreview && (
              <div
                className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md p-5 min-h-[150px]"
                dangerouslySetInnerHTML={{ __html: renderPreview() }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-5 border-t border-slate-200 dark:border-gray-700">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
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

      {/* Step 2: Review Questions */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <button
            onClick={() => setCurrentStep(1)}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
          >
            ← Back to Table Editor
          </button>

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
                  <div className="flex items-start gap-2 mb-3">
                    <span className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {q.order}
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 flex-1 pt-1">{q.question_text}</p>
                    
                    {/* CRUD Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => editQuestion(index)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Edit question text"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
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
                        onClick={() => deleteQuestion(index)}
                        className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-10">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Answer:</label>
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

          <div className="flex justify-between pt-5 border-t border-slate-200 dark:border-gray-700">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
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

export default TableCompletionBuilder;
