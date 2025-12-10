/**
 * Note Completion Builder Component
 * 
 * Advanced builder for creating Note Completion questions with hierarchical structure:
 * - Main title for the entire note
 * - Sections with titles
 * - Items (text or nested sub-items with prefix)
 * - Sub-items within items
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
  List,
  Type,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SubItem {
  text: string;
}

interface NestedItem {
  prefix: string;
  items: string[];
}

type NoteItem = string | NestedItem;

interface NoteSection {
  title: string;
  items: NoteItem[];
}

interface NoteStructure {
  title: string;
  items: NoteSection[];
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

interface NoteCompletionBuilderProps {
  questionType?: string;
  existingQuestions?: any[];
  noteData?: string;
  onQuestionsReady: (questions: GeneratedQuestion[]) => void;
  onUpdateNoteData: (data: string) => void;
  onCancel: () => void;
}

export function NoteCompletionBuilder({
  questionType = 'NC',
  existingQuestions = [],
  noteData = '',
  onQuestionsReady,
  onUpdateNoteData,
  onCancel,
}: NoteCompletionBuilderProps) {
  const [noteStructure, setNoteStructure] = useState<NoteStructure>({
    title: '',
    items: [],
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // Load existing data
  useEffect(() => {
    if (noteData) {
      try {
        const parsed = JSON.parse(noteData);
        setNoteStructure(parsed);
        
        if (existingQuestions && existingQuestions.length > 0) {
          setGeneratedQuestions(existingQuestions.map((q, idx) => ({
            ...q,
            tempId: `existing-${idx}`,
          })));
          setCurrentStep(2);
        }
      } catch {
        console.log('noteData is not valid JSON, starting fresh');
      }
    }
  }, [noteData, existingQuestions]);

  const markAsModified = () => setIsModified(true);

  // Add a new section
  const addSection = () => {
    setNoteStructure(prev => ({
      ...prev,
      items: [...prev.items, { title: '', items: [] }],
    }));
    markAsModified();
  };

  // Remove a section
  const removeSection = (sectionIndex: number) => {
    if (!confirm('Remove this section?')) return;
    setNoteStructure(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== sectionIndex),
    }));
    markAsModified();
  };

  // Move section up/down
  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setNoteStructure(prev => {
      const items = [...prev.items];
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
      return { ...prev, items };
    });
    markAsModified();
  };

  const moveSectionDown = (index: number) => {
    if (index >= noteStructure.items.length - 1) return;
    setNoteStructure(prev => {
      const items = [...prev.items];
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
      return { ...prev, items };
    });
    markAsModified();
  };

  // Add item to section
  const addItem = (sectionIndex: number) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      items[sectionIndex] = {
        ...items[sectionIndex],
        items: [...items[sectionIndex].items, ''],
      };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Remove item from section
  const removeItem = (sectionIndex: number, itemIndex: number) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      items[sectionIndex] = {
        ...items[sectionIndex],
        items: items[sectionIndex].items.filter((_, i) => i !== itemIndex),
      };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Update simple item text
  const updateItemText = (sectionIndex: number, itemIndex: number, text: string) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      const sectionItems = [...items[sectionIndex].items];
      sectionItems[itemIndex] = text;
      items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Convert simple item to nested
  const convertToNested = (sectionIndex: number, itemIndex: number) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      const sectionItems = [...items[sectionIndex].items];
      const currentText = typeof sectionItems[itemIndex] === 'string' 
        ? sectionItems[itemIndex] as string 
        : '';
      sectionItems[itemIndex] = {
        prefix: currentText,
        items: [''],
      };
      items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Convert nested to simple
  const convertToSimple = (sectionIndex: number, itemIndex: number) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      const sectionItems = [...items[sectionIndex].items];
      const nested = sectionItems[itemIndex] as NestedItem;
      sectionItems[itemIndex] = nested.prefix || '';
      items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Update nested item prefix
  const updateNestedPrefix = (sectionIndex: number, itemIndex: number, prefix: string) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      const sectionItems = [...items[sectionIndex].items];
      const nested = sectionItems[itemIndex] as NestedItem;
      sectionItems[itemIndex] = { ...nested, prefix };
      items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Add sub-item
  const addSubItem = (sectionIndex: number, itemIndex: number) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      const sectionItems = [...items[sectionIndex].items];
      const nested = sectionItems[itemIndex] as NestedItem;
      sectionItems[itemIndex] = {
        ...nested,
        items: [...nested.items, ''],
      };
      items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Update sub-item
  const updateSubItem = (sectionIndex: number, itemIndex: number, subIndex: number, text: string) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      const sectionItems = [...items[sectionIndex].items];
      const nested = sectionItems[itemIndex] as NestedItem;
      const subItems = [...nested.items];
      subItems[subIndex] = text;
      sectionItems[itemIndex] = { ...nested, items: subItems };
      items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Remove sub-item
  const removeSubItem = (sectionIndex: number, itemIndex: number, subIndex: number) => {
    setNoteStructure(prev => {
      const items = [...prev.items];
      const sectionItems = [...items[sectionIndex].items];
      const nested = sectionItems[itemIndex] as NestedItem;
      sectionItems[itemIndex] = {
        ...nested,
        items: nested.items.filter((_, i) => i !== subIndex),
      };
      items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
      return { ...prev, items };
    });
    markAsModified();
  };

  // Insert blank <input> tag
  const insertBlank = (
    sectionIndex: number,
    itemIndex: number,
    subIndex?: number,
    textareaId?: string
  ) => {
    const blank = '<input>';
    
    if (subIndex !== undefined) {
      // Insert in sub-item
      setNoteStructure(prev => {
        const items = [...prev.items];
        const sectionItems = [...items[sectionIndex].items];
        const nested = sectionItems[itemIndex] as NestedItem;
        const subItems = [...nested.items];
        subItems[subIndex] = subItems[subIndex] + blank;
        sectionItems[itemIndex] = { ...nested, items: subItems };
        items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
        return { ...prev, items };
      });
    } else {
      // Insert in simple item
      setNoteStructure(prev => {
        const items = [...prev.items];
        const sectionItems = [...items[sectionIndex].items];
        if (typeof sectionItems[itemIndex] === 'string') {
          sectionItems[itemIndex] = (sectionItems[itemIndex] as string) + blank;
        }
        items[sectionIndex] = { ...items[sectionIndex], items: sectionItems };
        return { ...prev, items };
      });
    }
    markAsModified();
  };

  // Count blanks in structure (with safe null checks)
  const countBlanks = useCallback(() => {
    let count = 0;
    const countInText = (text: string) => {
      if (typeof text !== 'string') return 0;
      return (text.match(/<input>/gi) || []).length;
    };

    // Safe check for items array
    const items = Array.isArray(noteStructure?.items) ? noteStructure.items : [];
    
    items.forEach(section => {
      if (!section || !Array.isArray(section.items)) return;
      
      section.items.forEach(item => {
        if (typeof item === 'string') {
          count += countInText(item);
        } else if (item && typeof item === 'object' && Array.isArray(item.items)) {
          item.items.forEach(subItem => {
            count += countInText(subItem);
          });
        }
      });
    });

    return count;
  }, [noteStructure]);

  // Generate questions from blanks
  const generateQuestions = () => {
    const blankCount = countBlanks();
    if (blankCount === 0) {
      alert('No blanks found. Use the "Insert Blank" button to add <input> tags.');
      return;
    }

    const questions: GeneratedQuestion[] = [];
    let questionNumber = 1;

    // Safe check for items array
    const items = Array.isArray(noteStructure?.items) ? noteStructure.items : [];
    
    items.forEach((section, sIndex) => {
      if (!section || !Array.isArray(section.items)) return;
      
      section.items.forEach((item, iIndex) => {
        if (typeof item === 'string') {
          const matches = item.match(/<input>/gi);
          if (matches) {
            matches.forEach(() => {
              const context = item.replace(/<input>/gi, '___').slice(0, 100);
              questions.push({
                tempId: `q-${Date.now()}-${questionNumber}`,
                question_text: `${section.title}: ${context}...`,
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
        } else {
          item.items.forEach((subItem, siIndex) => {
            const matches = subItem.match(/<input>/gi);
            if (matches) {
              matches.forEach(() => {
                const context = `${item.prefix} - ${subItem.replace(/<input>/gi, '___')}`.slice(0, 100);
                questions.push({
                  tempId: `q-${Date.now()}-${questionNumber}`,
                  question_text: `${section.title}: ${context}...`,
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
        }
      });
    });

    setGeneratedQuestions(questions);
    setCurrentStep(2);
  };

  // Update question answer
  const updateAnswer = (index: number, value: string) => {
    setGeneratedQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], correct_answer_text: value };
      return updated;
    });
  };

  // Save
  const saveQuestions = () => {
    if (generatedQuestions.some(q => !q.correct_answer_text.trim())) {
      alert('Please fill in all answers');
      return;
    }

    onQuestionsReady(generatedQuestions);
    onUpdateNoteData(JSON.stringify(noteStructure, null, 2));
  };

  // Render preview HTML
  const renderPreview = () => {
    const items = Array.isArray(noteStructure?.items) ? noteStructure.items : [];
    
    if (!noteStructure?.title && items.length === 0) {
      return '<p class="text-slate-400">No content yet</p>';
    }

    let html = `<h3 class="font-bold text-lg mb-4">${noteStructure?.title || 'Untitled Note'}</h3>`;

    items.forEach(section => {
      if (!section) return;
      html += `<div class="mb-4">`;
      html += `<h4 class="font-semibold text-slate-800 dark:text-slate-200 mb-2">${section.title || 'Untitled Section'}</h4>`;
      html += `<ul class="list-disc list-inside space-y-1">`;

      section.items.forEach(item => {
        if (typeof item === 'string') {
          const formatted = item.replace(/<input>/gi, 
            '<span class="inline-block px-2 py-0.5 mx-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded border border-orange-300 dark:border-orange-700 font-mono text-sm">___</span>'
          );
          html += `<li class="text-slate-700 dark:text-slate-300">${formatted}</li>`;
        } else {
          html += `<li class="text-slate-700 dark:text-slate-300">`;
          html += `<span class="font-medium">${item.prefix}</span>`;
          html += `<ul class="list-circle list-inside ml-4 mt-1 space-y-1">`;
          item.items.forEach(subItem => {
            const formatted = subItem.replace(/<input>/gi,
              '<span class="inline-block px-2 py-0.5 mx-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded border border-orange-300 dark:border-orange-700 font-mono text-sm">___</span>'
            );
            html += `<li class="text-slate-600 dark:text-slate-400">${formatted}</li>`;
          });
          html += `</ul></li>`;
        }
      });

      html += `</ul></div>`;
    });

    return html;
  };

  const blankCount = countBlanks();
  const canGenerate = (noteStructure?.title?.trim() || (Array.isArray(noteStructure?.items) && noteStructure.items.length > 0)) && blankCount > 0;
  const canSave = generatedQuestions.length > 0 && 
    generatedQuestions.every(q => q.correct_answer_text.trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            📝 Note Completion Builder
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create structured notes with sections, items, and blanks
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

      {/* Step 1: Structure Editor */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Main Title */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Main Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={noteStructure.title}
              onChange={(e) => {
                setNoteStructure(prev => ({ ...prev, title: e.target.value }));
                markAsModified();
              }}
              className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Reclaiming urban rivers"
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

            {noteStructure.items.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No sections yet. Click "Add Section" to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {noteStructure.items.map((section, sIndex) => (
                  <div
                    key={`section-${sIndex}`}
                    className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    {/* Section Header */}
                    <div className="flex gap-3 items-center flex-wrap mb-4">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => {
                          setNoteStructure(prev => {
                            const items = [...prev.items];
                            items[sIndex] = { ...items[sIndex], title: e.target.value };
                            return { ...prev, items };
                          });
                          markAsModified();
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Section title (e.g., Historical background)"
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
                          disabled={sIndex === noteStructure.items.length - 1}
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

                    {/* Items */}
                    <div className="bg-slate-50 dark:bg-gray-900 rounded-md p-3">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Items</span>
                        <button
                          onClick={() => addItem(sIndex)}
                          className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>

                      {section.items.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-5">
                          No items. Click "Add Item" to start.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {section.items.map((item, iIndex) => (
                            <div
                              key={`item-${sIndex}-${iIndex}`}
                              className="p-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md"
                            >
                              {typeof item === 'string' ? (
                                /* Simple Text Item */
                                <div className="flex gap-3 items-start">
                                  <span className="text-2xl font-bold text-slate-400 mt-1">•</span>
                                  <div className="flex-1 space-y-2">
                                    <textarea
                                      value={item}
                                      onChange={(e) => updateItemText(sIndex, iIndex, e.target.value)}
                                      className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded text-sm resize-y focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                                      placeholder="Item text (use Insert Blank button for answers)"
                                      rows={2}
                                    />
                                    <div className="flex gap-2 flex-wrap">
                                      <button
                                        onClick={() => insertBlank(sIndex, iIndex)}
                                        className="px-2 py-1 text-xs text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-800 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition inline-flex items-center gap-1"
                                      >
                                        <Edit3 className="w-3 h-3" /> Insert Blank
                                      </button>
                                      <button
                                        onClick={() => convertToNested(sIndex, iIndex)}
                                        className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-600 rounded hover:bg-slate-50 dark:hover:bg-gray-700 transition inline-flex items-center gap-1"
                                      >
                                        <List className="w-3 h-3" /> Convert to Nested
                                      </button>
                                      <button
                                        onClick={() => removeItem(sIndex, iIndex)}
                                        className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Nested Item */
                                <div className="flex gap-3 items-start">
                                  <span className="text-2xl font-bold text-slate-400 mt-1">•</span>
                                  <div className="flex-1 space-y-3">
                                    <input
                                      type="text"
                                      value={item.prefix}
                                      onChange={(e) => updateNestedPrefix(sIndex, iIndex, e.target.value)}
                                      className="w-full px-3 py-2 border border-orange-300 dark:border-orange-800 rounded font-semibold bg-orange-50 dark:bg-orange-900/20 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:text-white"
                                      placeholder="Prefix (e.g., Industrial development led to:)"
                                    />
                                    <div className="bg-slate-100 dark:bg-gray-900 rounded-md p-3 ml-5">
                                      {item.items.map((subItem, siIndex) => (
                                        <div key={`sub-${sIndex}-${iIndex}-${siIndex}`} className="flex gap-2 items-center mb-2">
                                          <span className="text-lg text-slate-400">◦</span>
                                          <textarea
                                            value={subItem}
                                            onChange={(e) => updateSubItem(sIndex, iIndex, siIndex, e.target.value)}
                                            className="flex-1 px-2 py-1 border border-slate-300 dark:border-gray-600 rounded text-sm resize-y focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="Sub-item text"
                                            rows={1}
                                          />
                                          <button
                                            onClick={() => insertBlank(sIndex, iIndex, siIndex)}
                                            className="px-2 py-1 text-xs text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-800 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => removeSubItem(sIndex, iIndex, siIndex)}
                                            className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => addSubItem(sIndex, iIndex)}
                                        className="mt-2 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition inline-flex items-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" /> Add Sub-item
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => convertToSimple(sIndex, iIndex)}
                                        className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-gray-600 rounded hover:bg-slate-50 dark:hover:bg-gray-700 transition inline-flex items-center gap-1"
                                      >
                                        <Type className="w-3 h-3" /> Convert to Simple
                                      </button>
                                      <button
                                        onClick={() => removeItem(sIndex, iIndex)}
                                        className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition inline-flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3 h-3" /> Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
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
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
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
            ← Back to Structure
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
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full flex items-center justify-center text-sm font-semibold">
                      {q.order}
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 flex-1">{q.question_text}</p>
                  </div>
                  <div className="flex items-center gap-3">
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

export default NoteCompletionBuilder;
