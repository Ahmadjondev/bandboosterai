"use client";

import React, { useState, useEffect } from "react";
import { managerAPI } from "@/lib/manager";
import type { BookSection } from "@/types/books";
import { 
  LoadingSpinner, 
  Alert, 
  EmptyState, 
  SelectContentDialog 
} from "@/components/manager/shared";
import type { AvailableContent } from '@/types/manager/books';
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  Save, 
  RotateCcw, 
  FileText, 
  Headphones,
  Search,
  AlertCircle,
  MoveUp,
  MoveDown,
  Lock,
  LockOpen
} from 'lucide-react';

interface SectionEditRow extends Partial<BookSection> {
  temp_id?: string;
  _deleted?: boolean;
}

interface Props {
  bookId: number;
}

export default function BulkSectionsManager({ bookId }: Props) {
  const [items, setItems] = useState<SectionEditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string[]>>({});
  
  // Content Selection State
  const [availableContent, setAvailableContent] = useState<Record<string, AvailableContent[]>>({
    READING: [],
    LISTENING: [],
  });
  
  const [contentDialog, setContentDialog] = useState<{
    isOpen: boolean;
    rowIndex: number | null;
    type: 'reading' | 'listening' | null;
  }>({
    isOpen: false,
    rowIndex: null,
    type: null,
  });

  useEffect(() => {
    fetchSections();
    fetchAvailableContent('READING');
    fetchAvailableContent('LISTENING');
  }, [bookId]);

  const invalidRowsCount = Object.keys(rowErrors).length;

  const fetchSections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await managerAPI.getSections({ book_id: bookId });
      const list = data.sections || [];
      setItems(list.map((s) => ({ ...s })));
      setRowErrors({});
    } catch (err: any) {
      setError(err.message || "Failed to load sections");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableContent = async (type: 'READING' | 'LISTENING', query: string = '') => {
    try {
      const res = await managerAPI.getAvailableContent(type === 'READING' ? 'reading' : 'listening', query);
      setAvailableContent((prev) => ({ ...prev, [type]: res.content || [] }));
    } catch (err) {
      console.error(`Failed to fetch ${type} content`, err);
    }
  };

  const addRows = (n: number) => {
    const maxOrder = items.length ? Math.max(...items.map((s) => s.order || 0)) : 0;
    const newRows: SectionEditRow[] = Array.from({ length: n }).map((_, i) => ({
      temp_id: Math.random().toString(36).substring(2, 9),
      book: bookId,
      section_type: "READING",
      title: "",
      description: "",
      order: maxOrder + (i + 1),
      is_locked: false,
    }));
    setItems((prev) => [...prev, ...newRows]);
    
    // Scroll to bottom smoothly
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const addFromContent = (type: 'READING' | 'LISTENING') => {
    const content = (availableContent[type] || [])[0];
    if (!content) {
      setError(`No available ${type.toLowerCase()} content to add`);
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        temp_id: Math.random().toString(36).substring(2, 9),
        book: bookId,
        section_type: type,
        title: content.title || "",
        description: "",
        order: (prev.length ? Math.max(...prev.map((s) => s.order || 0)) : 0) + 1,
        is_locked: false,
        ...(type === 'READING' ? ({ reading_passage: content.id } as any) : ({ listening_part: content.id } as any)),
      },
    ]);
  };

  const deleteRow = (index: number) => {
    const row = items[index];
    // If it's a new row (no ID), delete immediately
    if (!row.id) {
      setItems((prev) => {
        const copy = [...prev];
        copy.splice(index, 1);
        copy.forEach((c, i) => (c.order = i + 1));
        return copy;
      });
      return;
    }

    // If it has an ID, mark as deleted (soft delete)
    setItems((prev) => {
      const copy = [...prev];
      copy[index]._deleted = true;
      return copy;
    });
  };

  const restoreRow = (index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index]._deleted = false;
      return copy;
    });
  };

  const updateField = (index: number, key: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      (copy[index] as any)[key] = value;
      return copy;
    });
    // clear row errors for the changed row
    const uid = items[index]?.id || items[index]?.temp_id;
    if (uid) {
      setRowErrors((prev) => {
        const copy = { ...prev };
        delete copy[uid];
        return copy;
      });
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index <= 0) return;
    if (direction === 'down' && index >= items.length - 1) return;

    setItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      copy.forEach((c, i) => (c.order = i + 1));
      return copy;
    });
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDropAt = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setItems((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(dragIndex, 1);
      copy.splice(index, 0, item);
      copy.forEach((c, i) => (c.order = i + 1));
      return copy;
    });
    setDragIndex(null);
  };

  const validateBeforeSave = () => {
    const errors: string[] = [];
    const perRow: Record<string, string[]> = {};
    let hasErrors = false;

    items.forEach((row, idx) => {
      if (row._deleted) return;
      const rowErrorsList: string[] = [];

      if (!row.section_type) rowErrorsList.push(`Section type is required`);
      
      if (row.section_type === 'READING' && !row.reading_passage) {
        rowErrorsList.push(`Select a Reading passage`);
      }

      if (row.section_type === 'LISTENING' && !row.listening_part) {
        rowErrorsList.push(`Select a Listening part`);
      }
      
      if (!row.id && !row.title) {
        rowErrorsList.push(`Title is required`);
      }

      if (rowErrorsList.length > 0) {
        const uid = row.id || row.temp_id || `${idx}`;
        perRow[uid] = rowErrorsList;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      errors.push("Please fix the errors in the marked sections before saving.");
    }
    
    setRowErrors(perRow);
    return errors;
  };

  const saveAll = async () => {
    setSuccess(null);
    setError(null);

    const validation = validateBeforeSave();
    if (validation.length) {
      setError(validation.join("\n"));
      return;
    }

    const formData = new FormData();
    const sectionsPayload: any[] = [];
    const deletedIds: number[] = [];

    let orderCounter = 1;
    items.forEach((row) => {
        if (row._deleted) {
            if (row.id) deletedIds.push(row.id);
            return;
        }
        
        const item: any = {
            id: row.id,
            section_type: row.section_type,
            title: row.title,
            description: row.description,
            order: orderCounter++, // Use sequential order excluding deleted
            duration_minutes: row.duration_minutes || null,
            is_locked: !!row.is_locked,
            reading_passage: (row as any).reading_passage?.id || (row as any).reading_passage || null,
            listening_part: (row as any).listening_part?.id || (row as any).listening_part || null,
        };

        if (!row.id) item.temp_id = row.temp_id;
        sectionsPayload.push(item);
    });

    formData.append("sections", JSON.stringify(sectionsPayload));
    if (deletedIds.length) formData.append("deleted_ids", JSON.stringify(deletedIds));

    try {
      setSaving(true);
      await managerAPI.bulkSaveBookSections(bookId, formData);
      setSuccess("All changes saved successfully");
      fetchSections();
    } catch (err: any) {
      setError(err.message || 'Failed to save sections');
    } finally {
      setSaving(false);
    }
  };

  const openContentDialog = (index: number, type: 'READING' | 'LISTENING') => {
    setContentDialog({
      isOpen: true,
      rowIndex: index,
      type: type === 'READING' ? 'reading' : 'listening',
    });
  };

  const handleContentSelect = (content: any) => {
    if (contentDialog.rowIndex === null || !contentDialog.type) return;
    
    const index = contentDialog.rowIndex;
    const type = contentDialog.type;
    
    // Update the field based on type
    if (type === 'reading') {
      updateField(index, 'reading_passage', content.id);
    } else {
      updateField(index, 'listening_part', content.id);
    }
    
    // Auto-fill title if empty
    const currentRow = items[index];
    if (!currentRow.title) {
      updateField(index, 'title', content.title);
    }

    setContentDialog(prev => ({ ...prev, isOpen: false }));
  };

  const getLinkedContentTitle = (row: SectionEditRow) => {
    if (row.section_type === 'READING') {
      const id = (row as any).reading_passage?.id || (row as any).reading_passage;
      return availableContent.READING?.find(c => c.id === id)?.title;
    } else {
      const id = (row as any).listening_part?.id || (row as any).listening_part;
      return availableContent.LISTENING?.find(c => c.id === id)?.title;
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="p-12 flex justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm py-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 transition-all duration-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <span>Total:</span>
            <span className="font-bold text-gray-900 dark:text-white">{items.filter(i => !i._deleted).length}</span>
          </div>
          {items.some(i => i._deleted) && (
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-800">
              <Trash2 className="w-3.5 h-3.5" />
              <span>{items.filter(i => i._deleted).length} to delete</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSections()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Reset Changes"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {saving ? <LoadingSpinner size="small" /> : <Save className="w-4 h-4" />}
            <span className="font-medium">Save Changes</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="animate-in slide-in-from-top-2">
          <Alert type="error" message={error} />
        </div>
      )}
      
      {success && (
        <div className="animate-in slide-in-from-top-2">
          <Alert type="success" message={success} />
        </div>
      )}

      {/* Sections List */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon="Layers"
              title="No sections found"
              description="Start by adding sections to this book."
              actionText="Add First Section"
              onAction={() => addRows(1)}
            />
          </div>
        ) : (
          items.map((row, idx) => {
            const uid = row.id || row.temp_id || `${idx}`;
            
            if (row._deleted) {
              return (
                 <div key={uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl opacity-75 transition-all">
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="line-through decoration-gray-400">{row.title || 'Untitled Section'}</span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">Deleted</span>
                  </div>
                  <button
                    onClick={() => restoreRow(idx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Undo
                  </button>
                </div>
              );
            }
            
            const isReading = row.section_type === 'READING';
            const hasError = rowErrors[uid] && rowErrors[uid].length > 0;

            return (
              <React.Fragment key={uid}>
              <div
                className={`
                  group relative bg-white dark:bg-gray-800 rounded-xl border shadow-sm
                  transition-all duration-200
                  ${dragIndex === idx ? 'ring-2 ring-blue-500 shadow-lg scale-[1.01] z-20 opacity-90 cursor-grabbing' : 'hover:shadow-md'}
                  ${hasError ? 'border-red-300 dark:border-red-900/50 ring-1 ring-red-200 dark:ring-red-900/30' : 'border-gray-200 dark:border-gray-700'}
                `}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropAt(idx)}
              >
                {/* Left Colored Border Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${isReading ? 'bg-blue-500' : 'bg-indigo-500'}`} />

                <div className="flex items-stretch pl-1.5">
                  {/* Drag Handle */}
                  <div className="w-10 flex flex-col items-center justify-center gap-2 border-r border-gray-100 dark:border-gray-700 cursor-move text-gray-300 hover:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="text-[10px] font-bold text-gray-400">{idx + 1}</span>
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <div className="flex-1 p-4 md:p-5">
                    <div className="flex flex-col md:flex-row gap-5 items-start">
                      
                      {/* Type Selection */}
                      <div className="w-full md:w-48 shrink-0 space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Section Type</label>
                        <div className="relative">
                          <select
                            value={row.section_type}
                            onChange={(e) => {
                              const newType = e.target.value as 'READING' | 'LISTENING';
                              updateField(idx, 'section_type', newType);
                              if (newType === 'READING') {
                                updateField(idx, 'listening_part', null);
                              } else {
                                updateField(idx, 'reading_passage', null);
                              }
                            }}
                            className={`
                              w-full pl-10 pr-8 py-2.5 text-sm rounded-lg appearance-none transition-all
                              focus:ring-2 focus:ring-offset-0 outline-none
                              ${isReading 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 focus:ring-blue-500' 
                                : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100 focus:ring-indigo-500'
                              }
                            `}
                          >
                            <option value="READING">Reading</option>
                            <option value="LISTENING">Listening</option>
                          </select>
                          <div className={`absolute left-3 top-3 pointer-events-none ${isReading ? 'text-blue-500' : 'text-indigo-500'}`}>
                            {isReading ? <FileText className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Main Content: Title & Description */}
                      <div className="flex-1 w-full space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">Title & Details</label>
                          <div className="space-y-2">
                            <input
                              className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              value={row.title || ''}
                              onChange={(e) => updateField(idx, 'title', e.target.value)}
                              placeholder="Enter Section Title"
                            />
                            <input
                              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              value={row.description || ''}
                              onChange={(e) => updateField(idx, 'description', e.target.value)}
                              placeholder="Add an optional description..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Linked Content Selection */}
                      <div className="w-full md:w-64 shrink-0">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                          Linked Content
                        </label>
                        
                        {getLinkedContentTitle(row) ? (
                          <div className={`
                            relative group/link rounded-lg border overflow-hidden transition-all
                            ${isReading 
                              ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50' 
                              : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50'
                            }
                          `}>
                            <div className="p-3 pr-10">
                              <p className={`text-sm font-medium truncate ${isReading ? 'text-blue-900 dark:text-blue-100' : 'text-indigo-900 dark:text-indigo-100'}`}>
                                {getLinkedContentTitle(row)}
                              </p>
                              <p className={`text-[10px] uppercase tracking-wide mt-1 ${isReading ? 'text-blue-600 dark:text-blue-300' : 'text-indigo-600 dark:text-indigo-300'}`}>
                                {isReading ? 'Reading Passage' : 'Listening Part'}
                              </p>
                            </div>
                            <button 
                              onClick={() => openContentDialog(idx, row.section_type as any)}
                              className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center border-l border-black/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              title="Change Content"
                            >
                              <Search className="w-4 h-4 opacity-50 hover:opacity-100" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openContentDialog(idx, row.section_type as any)}
                            className={`
                              w-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg transition-all
                              ${hasError 
                                ? 'border-red-300 bg-red-50 dark:bg-red-900/10 text-red-600' 
                                : 'border-gray-300 dark:border-gray-700 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                              }
                            `}
                          >
                            <div className="p-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                              <Search className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-medium">Select Content</span>
                          </button>
                        )}
                      </div>

                      {/* Lock Status Toggle */}
                      <div className="w-full md:w-32 shrink-0">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                          Access
                        </label>
                        <button
                          onClick={() => updateField(idx, 'is_locked', !row.is_locked)}
                          className={`
                            w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all
                            ${row.is_locked
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                              : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                            }
                          `}
                          title={row.is_locked ? 'Section is locked' : 'Section is unlocked'}
                        >
                          {row.is_locked ? (
                            <>
                              <Lock className="w-4 h-4" />
                              <span className="text-xs font-semibold">Locked</span>
                            </>
                          ) : (
                            <>
                              <LockOpen className="w-4 h-4" />
                              <span className="text-xs font-semibold">Open</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Actions Column */}
                      <div className="flex flex-row md:flex-col items-center gap-1 border-l border-gray-100 dark:border-gray-700 pl-4 ml-2">
                        <div className="flex flex-row md:flex-col gap-1">
                          <button 
                            onClick={() => handleMove(idx, 'up')} 
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-30"
                            disabled={idx === 0}
                            title="Move Up"
                          >
                            <MoveUp className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMove(idx, 'down')} 
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-30"
                            disabled={idx === items.length - 1}
                            title="Move Down"
                          >
                            <MoveDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-px h-4 md:w-4 md:h-px bg-gray-200 dark:bg-gray-700 my-1" />
                        <button
                          onClick={() => deleteRow(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
              
              {hasError && (
                <div className="flex items-center gap-2 mx-4 mt-1 mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded-b-lg border-x border-b border-red-100 dark:border-red-900/30 animate-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    {rowErrors[uid].map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Floating Bottom Actions */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 pointer-events-auto flex items-center gap-2 scale-95 hover:scale-100 transition-transform">
          <button
            onClick={() => addRows(1)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Section</span>
          </button>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
          
          <button
            onClick={() => addFromContent('READING')}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
            title="Add from Reading"
          >
             <FileText className="w-4 h-4" />
             <span className="hidden sm:inline">Reading</span>
          </button>

          <button
            onClick={() => addFromContent('LISTENING')}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
            title="Add from Listening"
          >
             <Headphones className="w-4 h-4" />
             <span className="hidden sm:inline">Listening</span>
          </button>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            onClick={() => addRows(5)}
            className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Add 5 empty rows"
          >
            +5 Empty
          </button>
        </div>
      </div>


      {/* Content Selection Dialog */}
      <SelectContentDialog
        show={contentDialog.isOpen}
        onClose={() => setContentDialog(prev => ({ ...prev, isOpen: false }))}
        type={contentDialog.type}
        position={null}
        onSelect={handleContentSelect}
        readingPassages={availableContent.READING}
        listeningParts={availableContent.LISTENING}
      />
    </div>
  );
}