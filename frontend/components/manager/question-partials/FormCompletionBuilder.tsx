/**
 * Form Completion Builder Component
 * 
 * Advanced builder for creating Form Completion questions with hierarchical structure:
 * - Main title for the entire form
 * - Sections with titles  
 * - Items (fields/rows with labels)
 * - <input> blanks for answers
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  Edit3,
  Save,
  Eye,
  EyeOff,
  Table,
  Copy,
  RefreshCw,
} from 'lucide-react';

interface FormField {
  label: string;
  value: string; // Can contain <input> for blanks
}

interface FormSection {
  title: string;
  fields: FormField[];
}

interface FormStructure {
  title: string;
  sections: FormSection[];
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

interface FormCompletionBuilderProps {
  questionType?: string;
  existingQuestions?: any[];
  formData?: string;
  onQuestionsReady: (questions: GeneratedQuestion[]) => void;
  onUpdateFormData: (data: string) => void;
  onCancel: () => void;
}

export function FormCompletionBuilder({
  questionType = 'FC',
  existingQuestions = [],
  formData = '',
  onQuestionsReady,
  onUpdateFormData,
  onCancel,
}: FormCompletionBuilderProps) {
  const [formStructure, setFormStructure] = useState<FormStructure>({
    title: '',
    sections: [],
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Load existing data
  useEffect(() => {
    if (formData) {
      try {
        const parsed = JSON.parse(formData);
        setFormStructure(parsed);
        
        if (existingQuestions && existingQuestions.length > 0) {
          setGeneratedQuestions(existingQuestions.map((q, idx) => ({
            ...q,
            tempId: `existing-${idx}`,
          })));
          setCurrentStep(2);
        }
      } catch {
        console.log('formData is not valid JSON, starting fresh');
      }
    }
  }, [formData, existingQuestions]);

  // Add section
  const addSection = () => {
    setFormStructure(prev => ({
      ...prev,
      sections: [...prev.sections, { title: '', fields: [] }],
    }));
  };

  // Remove section
  const removeSection = (index: number) => {
    if (!confirm('Remove this section?')) return;
    setFormStructure(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  // Move section
  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setFormStructure(prev => {
      const sections = [...prev.sections];
      [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]];
      return { ...prev, sections };
    });
  };

  const moveSectionDown = (index: number) => {
    if (index >= formStructure.sections.length - 1) return;
    setFormStructure(prev => {
      const sections = [...prev.sections];
      [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
      return { ...prev, sections };
    });
  };

  // Update section title
  const updateSectionTitle = (index: number, title: string) => {
    setFormStructure(prev => {
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], title };
      return { ...prev, sections };
    });
  };

  // Add field to section
  const addField = (sectionIndex: number) => {
    setFormStructure(prev => {
      const sections = [...prev.sections];
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        fields: [...sections[sectionIndex].fields, { label: '', value: '' }],
      };
      return { ...prev, sections };
    });
  };

  // Remove field
  const removeField = (sectionIndex: number, fieldIndex: number) => {
    setFormStructure(prev => {
      const sections = [...prev.sections];
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        fields: sections[sectionIndex].fields.filter((_, i) => i !== fieldIndex),
      };
      return { ...prev, sections };
    });
  };

  // Update field
  const updateField = (sectionIndex: number, fieldIndex: number, key: 'label' | 'value', value: string) => {
    setFormStructure(prev => {
      const sections = [...prev.sections];
      const fields = [...sections[sectionIndex].fields];
      fields[fieldIndex] = { ...fields[fieldIndex], [key]: value };
      sections[sectionIndex] = { ...sections[sectionIndex], fields };
      return { ...prev, sections };
    });
  };

  // Insert blank in field value
  const insertBlank = (sectionIndex: number, fieldIndex: number) => {
    setFormStructure(prev => {
      const sections = [...prev.sections];
      const fields = [...sections[sectionIndex].fields];
      fields[fieldIndex] = {
        ...fields[fieldIndex],
        value: fields[fieldIndex].value + '<input>',
      };
      sections[sectionIndex] = { ...sections[sectionIndex], fields };
      return { ...prev, sections };
    });
  };

  // Count blanks (with safe null checks)
  const countBlanks = useCallback(() => {
    let count = 0;
    
    // Safe check for sections array
    const sections = Array.isArray(formStructure?.sections) ? formStructure.sections : [];
    
    sections.forEach(section => {
      if (!section || !Array.isArray(section.fields)) return;
      
      section.fields.forEach(field => {
        if (field?.value && typeof field.value === 'string') {
          count += (field.value.match(/<input>/gi) || []).length;
        }
      });
    });
    return count;
  }, [formStructure]);

  // Generate questions (with safe null checks)
  const generateQuestions = () => {
    const blankCount = countBlanks();
    if (blankCount === 0) {
      alert('No blanks found. Use the "Insert Blank" button to add <input> tags.');
      return;
    }

    const questions: GeneratedQuestion[] = [];
    let questionNumber = 1;

    // Safe check for sections array
    const sections = Array.isArray(formStructure?.sections) ? formStructure.sections : [];
    
    sections.forEach(section => {
      if (!section || !Array.isArray(section.fields)) return;
      
      section.fields.forEach(field => {
        if (!field?.value) return;
        const matches = field.value.match(/<input>/gi);
        if (matches) {
          matches.forEach(() => {
            questions.push({
              tempId: `q-${Date.now()}-${questionNumber}`,
              question_text: `${section.title ? section.title + ': ' : ''}${field.label}`,
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

  const removeQuestion = (index: number) => {
    if (!confirm('Remove this question?')) return;
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index: number) => {
    setGeneratedQuestions(prev => {
      const q = prev[index];
      if (!q) return prev;
      const newQuestion = {
        ...q,
        tempId: `q-${Date.now()}-dup`,
        order: prev.length + 1,
      };
      return [...prev, newQuestion];
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
    onUpdateFormData(JSON.stringify(formStructure, null, 2));
  };

  // Render preview (with safe null checks)
  const renderPreview = () => {
    const sections = Array.isArray(formStructure?.sections) ? formStructure.sections : [];
    
    if (!formStructure?.title && sections.length === 0) {
      return '<p class="text-slate-400">No content yet</p>';
    }

    let html = `<h3 class="font-bold text-lg mb-4 text-center border-b pb-2">${formStructure?.title || 'Untitled Form'}</h3>`;

    sections.forEach(section => {
      if (!section) return;
      if (section.title) {
        html += `<h4 class="font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2 bg-slate-100 dark:bg-gray-700 px-3 py-1 rounded">${section.title}</h4>`;
      }
      html += `<table class="w-full border-collapse mb-4">`;
      section.fields.forEach(field => {
        const formattedValue = field.value.replace(/<input>/gi,
          '<span class="inline-block px-4 py-0.5 mx-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded border border-orange-300 dark:border-orange-700 font-mono text-sm min-w-[100px]">___</span>'
        );
        html += `<tr class="border-b border-slate-200 dark:border-gray-700">
          <td class="py-2 pr-4 font-medium text-slate-700 dark:text-slate-300 w-1/3">${field.label || '(No label)'}</td>
          <td class="py-2 text-slate-600 dark:text-slate-400">${formattedValue || '<span class="text-slate-400">(empty)</span>'}</td>
        </tr>`;
      });
      html += `</table>`;
    });

    return html;
  };

  const blankCount = countBlanks();
  const canGenerate = formStructure?.title?.trim() && blankCount > 0;
  const canSave = generatedQuestions.length > 0 &&
    generatedQuestions.every(q => q.correct_answer_text.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            📋 Form Completion Builder
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create structured forms with labeled fields and blanks
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

      {/* Step 1: Form Editor */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Form Title */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Form Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formStructure.title}
              onChange={(e) => setFormStructure(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., THEATRE ROYAL PLYMOUTH - Booking Form"
            />
          </div>

          {/* Sections */}
          <div className="bg-slate-50 dark:bg-gray-900 rounded-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <label className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Sections
              </label>
              <button
                onClick={addSection}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Section
              </button>
            </div>

            {formStructure.sections.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                <Table className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No sections yet. Click "Add Section" to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formStructure.sections.map((section, sIndex) => (
                  <div
                    key={`section-${sIndex}`}
                    className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    {/* Section Header */}
                    <div className="flex gap-3 items-center flex-wrap mb-4">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(sIndex, e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Section title (optional, e.g., Personal Information)"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveSectionUp(sIndex)}
                          disabled={sIndex === 0}
                          className="p-2 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-600 rounded hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveSectionDown(sIndex)}
                          disabled={sIndex === formStructure.sections.length - 1}
                          className="p-2 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-600 rounded hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSection(sIndex)}
                          className="p-2 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="bg-slate-50 dark:bg-gray-900 rounded-md p-3">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Fields</span>
                        <button
                          onClick={() => addField(sIndex)}
                          className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Field
                        </button>
                      </div>

                      {section.fields.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-5">
                          No fields. Click "Add Field" to start.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {section.fields.map((field, fIndex) => (
                            <div
                              key={`field-${sIndex}-${fIndex}`}
                              className="p-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    Field Label
                                  </label>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateField(sIndex, fIndex, 'label', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="e.g., Name, Date, Phone"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                    Value (use blanks)
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={field.value}
                                      onChange={(e) => updateField(sIndex, fIndex, 'value', e.target.value)}
                                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white font-mono"
                                      placeholder="<input> or fixed text"
                                    />
                                    <button
                                      onClick={() => insertBlank(sIndex, fIndex)}
                                      className="px-2 py-1 text-xs text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-800 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                                      title="Insert Blank"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => removeField(sIndex, fIndex)}
                                      className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md p-5 min-h-[200px]"
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
            ← Back to Form Editor
          </button>

          {/* Bulk Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {generatedQuestions.length} question(s)
              </span>
              <button
                onClick={reorderQuestions}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-600 rounded hover:bg-slate-50 dark:hover:bg-gray-700 transition inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reorder
              </button>
            </div>
          </div>

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
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                      {q.order}
                    </span>
                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) => updateQuestionText(index, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-white"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => duplicateQuestion(index)}
                        className="p-2 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-600 rounded hover:bg-slate-50 dark:hover:bg-gray-700 transition"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="p-2 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-11">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Answer:</label>
                    <input
                      type="text"
                      value={q.correct_answer_text}
                      onChange={(e) => updateAnswer(index, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-800 dark:text-white"
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

export default FormCompletionBuilder;
