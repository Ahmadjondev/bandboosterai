'use client';

/**
 * AI Content Generator Component
 * Migrated from Vue.js to React + TypeScript
 * Allows managers to upload PDF files or JSON and generate IELTS test content using AI
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  Code,
  Zap,
  BookOpen,
  Headphones,
  Edit,
  Mic,
  Eye,
  Database,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Check,
  X,
  Image,
  AlertTriangle,
  Music,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import type {
  ContentType,
  ContentTypeOption,
  Step,
  UploadMode,
  Notification,
  AIGenerateResponse,
  ReadingPassage,
  ListeningPart,
  WritingTask,
  SpeakingTopic,
  QuestionGroup,
  SpeakingTopicGroup,
} from '@/types/manager/ai-content';

const AIContentGenerator: React.FC = () => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const steps: Step[] = [
    { number: 1, title: 'Upload Content', icon: 'upload' },
    { number: 2, title: 'Review Content', icon: 'eye' },
    { number: 3, title: 'Save to Database', icon: 'database' },
  ];

  // Upload state
  const [uploadMode, setUploadMode] = useState<UploadMode>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedJsonFile, setSelectedJsonFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<ContentType>('auto');
  const [isUploading, setIsUploading] = useState(false);

  // Generated content
  const [extractedData, setExtractedData] = useState<AIGenerateResponse | null>(null);

  // Edit state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [savedItems, setSavedItems] = useState<any[]>([]);

  // Image upload state for question groups
  const [groupImages, setGroupImages] = useState<Record<string, { file: File; preview: string }>>({});

  // Audio upload state for listening parts
  const [partAudios, setPartAudios] = useState<Record<string, { file: File; preview: string }>>({});

  // Review UI state: expansion and inline edit buffers
  const [expanded, setExpanded] = useState<{ passages: Set<number>; parts: Set<number> }>({
    passages: new Set(),
    parts: new Set(),
  });

  // Inline edit buffers keyed by editingItem string (e.g. "passage:2" or "question:2-0-1")
  const [editBuffer, setEditBuffer] = useState<Record<string, any>>({});

  const toggleExpand = (key: 'passages' | 'parts', idx: number) => {
    setExpanded((prev) => {
      const next = { ...prev } as any;
      const set = new Set(next[key]);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      next[key] = set;
      return next;
    });
  };

  const startInlineEdit = (kind: string, id: string | number) => {
    const editKey = `${kind}:${id}`;
    // current value snapshot
    let current: any = null;
    try {
      if (kind === 'passage' || kind === 'passages') {
        current = (extractedData as any)?.passages?.[Number(id)] || {};
      } else if (kind === 'parts' || kind === 'part') {
        current = (extractedData as any)?.parts?.[Number(id)] || {};
      } else if (kind === 'question') {
        // id expected like "p-g-q" e.g. "2-0-1"
        const [pIdx, gIdx, qIdx] = String(id).split('-').map((v) => Number(v));
        current = (extractedData as any)?.passages?.[pIdx]?.question_groups?.[gIdx]?.questions?.[qIdx] || {};
      }
    } catch (e) {
      current = {};
    }
    setEditBuffer((prev) => ({ ...prev, [editKey]: JSON.parse(JSON.stringify(current || {})) }));
    setEditingItem(editKey);
  };

  const cancelInlineEdit = (kind: string, id: string | number) => {
    const editKey = `${kind}:${id}`;
    setEditBuffer((prev) => {
      const next = { ...prev };
      delete next[editKey];
      return next;
    });
    cancelEdit();
  };

  const handleInlineChange = (editKey: string, field: string, value: any) => {
    setEditBuffer((prev) => ({ ...prev, [editKey]: { ...(prev[editKey] || {}), [field]: value } }));
  };

  const applyInlineEdit = (editKeyOrCollection: string, idx?: number | string) => {
    // editKeyOrCollection can be 'passages' (collection) when called from UI, or rely on editingItem
    const key = editingItem || `${editKeyOrCollection}:${idx}`;
    const buffer = editBuffer[key];
    if (!buffer || !extractedData) return cancelEdit();

    const [kind, id] = key.split(':');
    setExtractedData((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      if (kind === 'passage' || kind === 'passages') {
        const i = Number(id);
        copy.passages = copy.passages || [];
        copy.passages[i] = { ...copy.passages[i], ...buffer };
      } else if (kind === 'parts' || kind === 'part') {
        const i = Number(id);
        copy.parts = copy.parts || [];
        copy.parts[i] = { ...copy.parts[i], ...buffer };
      } else if (kind === 'question') {
        const [pIdx, gIdx, qIdx] = String(id).split('-').map((v: string) => Number(v));
        copy.passages = copy.passages || [];
        copy.passages[pIdx] = copy.passages[pIdx] || {};
        copy.passages[pIdx].question_groups = copy.passages[pIdx].question_groups || [];
        copy.passages[pIdx].question_groups[gIdx] = copy.passages[pIdx].question_groups[gIdx] || {};
        copy.passages[pIdx].question_groups[gIdx].questions = copy.passages[pIdx].question_groups[gIdx].questions || [];
        copy.passages[pIdx].question_groups[gIdx].questions[qIdx] = { ...copy.passages[pIdx].question_groups[gIdx].questions[qIdx], ...buffer };
      }
      return copy;
    });

    // cleanup
    setEditBuffer((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    cancelEdit();
    showNotification('Edit applied', 'success');
  };

  const saveAllItems = async () => {
    if (!extractedData) return;

    setIsSaving(true);
    try {
      const payload = JSON.parse(JSON.stringify(extractedData));
      const response = await managerAPI.saveGeneratedContent(payload.content_type, payload);

      if (response.success) {
        setSavedItems(response.passages || response.parts || response.tasks || response.topics || []);
        setCurrentStep(3);
        showNotification(response.message || 'Saved successfully', 'success');
      } else {
        showNotification(response.error || 'Failed to save content', 'error');
      }
    } catch (error: any) {
      showNotification('Save error: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Notification
  const [notification, setNotification] = useState<Notification | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Content type options
  const contentTypes: ContentTypeOption[] = [
    { value: 'auto', label: 'Auto-detect', icon: 'zap' },
    { value: 'reading', label: 'Reading', icon: 'book-open' },
    { value: 'listening', label: 'Listening', icon: 'headphones' },
    { value: 'writing', label: 'Writing', icon: 'edit' },
    { value: 'speaking', label: 'Speaking', icon: 'mic' },
  ];

  // Icon map
  const iconMap: Record<string, React.ReactNode> = {
    'zap': <Zap className="w-6 h-6" />,
    'book-open': <BookOpen className="w-6 h-6" />,
    'headphones': <Headphones className="w-6 h-6" />,
    'edit': <Edit className="w-6 h-6" />,
    'mic': <Mic className="w-6 h-6" />,
    'upload': <Upload className="w-5 h-5" />,
    'eye': <Eye className="w-5 h-5" />,
    'database': <Database className="w-5 h-5" />,
  };

  // Utility functions
  const showNotification = useCallback((message: string, type: Notification['type'] = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // Check if question type requires an image
  const questionTypeRequiresImage = (questionType: string): boolean => {
    const imageRequiredTypes = ['DL', 'ML', 'FCC', 'TC', 'FC'];
    return imageRequiredTypes.includes(questionType);
  };

  // Handle image upload for question groups
  const handleImageUpload = (groupKey: string, file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image size must be less than 5MB', 'error');
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);

    setGroupImages(prev => ({
      ...prev,
      [groupKey]: { file, preview }
    }));

    showNotification('Image uploaded successfully', 'success');
  };

  // Remove uploaded image
  const handleImageRemove = (groupKey: string) => {
    setGroupImages(prev => {
      const updated = { ...prev };
      // Revoke the preview URL to free memory
      if (updated[groupKey]?.preview) {
        URL.revokeObjectURL(updated[groupKey].preview);
      }
      delete updated[groupKey];
      return updated;
    });
    showNotification('Image removed', 'info');
  };

  // Handle audio upload for listening parts
  const handleAudioUpload = (partKey: string, file: File) => {
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      showNotification('Please select a valid audio file', 'error');
      return;
    }

    // Validate file size (max 50MB for audio)
    if (file.size > 50 * 1024 * 1024) {
      showNotification('Audio size must be less than 50MB', 'error');
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);

    setPartAudios(prev => ({
      ...prev,
      [partKey]: { file, preview }
    }));

    showNotification('Audio uploaded successfully', 'success');
  };

  // Remove uploaded audio
  const handleAudioRemove = (partKey: string) => {
    setPartAudios(prev => {
      const updated = { ...prev };
      // Revoke the preview URL to free memory
      if (updated[partKey]?.preview) {
        URL.revokeObjectURL(updated[partKey].preview);
      }
      delete updated[partKey];
      return updated;
    });
    showNotification('Audio removed', 'info');
  };

  // Sanitize and process HTML from AI so <strong> and basic tags render safely
  const processPassageHtml = (rawHtml: string) => {
    if (!rawHtml) return '';
    try {
      // Normalize escaped newlines to actual newlines
      const normalized = rawHtml.replace(/\\n/g, '\n');

      const parser = new DOMParser();
      const doc = parser.parseFromString(normalized, 'text/html');

      const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'I', 'EM', 'UL', 'OL', 'LI', 'SPAN', 'DIV']);

      const walk = (node: ChildNode) => {
        // make a static list because we'll modify children
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            if (!allowedTags.has(el.tagName)) {
              // replace node with its children (unwrap)
              while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
              el.parentNode?.removeChild(el);
              continue;
            }

            // Keep only safe attributes (none) except class for styling we add
            const attrs = Array.from(el.attributes || []);
            for (const a of attrs) {
              if (a.name !== 'class') el.removeAttribute(a.name);
            }

            // Style strong/b tags for emphasis
            if (el.tagName === 'STRONG' || el.tagName === 'B') {
              el.classList.add('text-orange-600', 'font-semibold');
            }

            walk(el);
          } else if (child.nodeType === Node.TEXT_NODE) {
            // leave text nodes here; newline handling is done in a separate pass below
          } else {
            // remove comments etc
            child.parentNode?.removeChild(child);
          }
        }
      };

      walk(doc.body);

      // Replace literal newlines in text nodes with <br> elements so line breaks are preserved
      const replaceNewlines = (node: Node) => {
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.nodeValue || '';
            if (text.includes('\n')) {
              const parts = text.split(/\n/);
              const frag = doc.createDocumentFragment();
              parts.forEach((part, i) => {
                frag.appendChild(doc.createTextNode(part));
                if (i < parts.length - 1) {
                  frag.appendChild(doc.createElement('br'));
                }
              });
              child.parentNode?.replaceChild(frag, child);
            }
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            replaceNewlines(child);
          }
        }
      };

      replaceNewlines(doc.body);

      return doc.body.innerHTML;
    } catch (e) {
      return rawHtml;
    }
  };

  const canProceedToReview = uploadMode === 'pdf' ? selectedFile && !isUploading : selectedJsonFile && !isUploading;
  const canSaveContent = extractedData && extractedData.success;

  // Upload mode toggle
  const handleUploadModeChange = (mode: UploadMode) => {
    setUploadMode(mode);
    setSelectedFile(null);
    setSelectedJsonFile(null);
    setExtractedData(null);
  };

  // File selection handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      showNotification('Please select a PDF file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification('File size must be less than 10MB', 'error');
      return;
    }

    setSelectedFile(file);
  };

  const handleJsonFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showNotification('Please select a JSON file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('File size must be less than 5MB', 'error');
      return;
    }

    setSelectedJsonFile(file);
  };

  // Generate content
  const handleGenerateContent = async () => {
    if (uploadMode === 'pdf') {
      await generateFromPdf();
    } else {
      await processJsonFile();
    }
  };

  const generateFromPdf = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const response = await managerAPI.generateContentFromPdf(selectedFile, contentType);

      if (response.success && response.data) {
        setExtractedData(response.data);
        setCurrentStep(2);
        showNotification('Content extracted successfully!', 'success');
      } else {
        showNotification(response.error || 'Failed to extract content', 'error');
      }
    } catch (error: any) {
      showNotification('Upload error: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const processJsonFile = async () => {
    if (!selectedJsonFile) return;

    setIsUploading(true);

    try {
      const jsonData = await managerAPI.processJsonFile(selectedJsonFile);

      // Check if content type matches (if not auto)
      if (contentType !== 'auto' && jsonData.content_type !== contentType) {
        showNotification(
          `Content type mismatch. Expected ${contentType}, got ${jsonData.content_type}`,
          'error'
        );
        return;
      }

      setExtractedData(jsonData);
      setCurrentStep(2);
      showNotification('JSON content loaded successfully!', 'success');
    } catch (error: any) {
      showNotification('Error processing JSON: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Save content to database
  const handleSaveContent = async () => {
    if (!extractedData) return;

    setIsSaving(true);

    try {
      // Check if there are any images or audio files to upload
      const hasImages = Object.keys(groupImages).length > 0;
      const hasAudios = Object.keys(partAudios).length > 0;

      if (hasImages || hasAudios) {
        // Use FormData for multipart upload when images or audio are present
        const formData = new FormData();
        formData.append('content_type', extractedData.content_type);
        formData.append('data', JSON.stringify(extractedData));

        // Add images with their group identifiers
        Object.entries(groupImages).forEach(([key, { file }]) => {
          formData.append(`images[${key}]`, file);
        });

        // Add audio files with their part identifiers
        Object.entries(partAudios).forEach(([key, { file }]) => {
          formData.append(`audios[${key}]`, file);
        });

        // Send with FormData
        const response = await managerAPI.saveGeneratedContentWithImages(formData);

        if (response.success) {
          setSavedItems(response.passages || response.parts || response.tasks || response.topics || []);
          setCurrentStep(3);
          showNotification(response.message, 'success');
          
          // Clean up image previews
          Object.values(groupImages).forEach(({ preview }) => {
            URL.revokeObjectURL(preview);
          });
          setGroupImages({});

          // Clean up audio previews
          Object.values(partAudios).forEach(({ preview }) => {
            URL.revokeObjectURL(preview);
          });
          setPartAudios({});
        } else {
          showNotification(response.error || 'Failed to save content', 'error');
        }
      } else {
        // No images or audio, use regular JSON post
        const response = await managerAPI.saveGeneratedContent(extractedData.content_type, extractedData);

        if (response.success) {
          setSavedItems(response.passages || response.parts || response.tasks || response.topics || []);
          setCurrentStep(3);
          showNotification(response.message, 'success');
        } else {
          showNotification(response.error || 'Failed to save content', 'error');
        }
      }
    } catch (error: any) {
      showNotification('Save error: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit functions
  const startEdit = (key: string, currentValue: any) => {
    setEditingItem(key);
    setEditBuffer({ ...editBuffer, [key]: currentValue });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditBuffer({});
  };

  const isEditing = (key: string) => editingItem === key;

  const getEditValue = (key: string) => editBuffer[key];

  // Navigation
  const handleReset = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setSelectedJsonFile(null);
    setContentType('auto');
    setExtractedData(null);
    setSavedItems([]);
    setEditingItem(null);
    setEditBuffer({});
    
    // Clean up image previews
    Object.values(groupImages).forEach(({ preview }) => {
      URL.revokeObjectURL(preview);
    });
    setGroupImages({});

    // Clean up audio previews
    Object.values(partAudios).forEach(({ preview }) => {
      URL.revokeObjectURL(preview);
    });
    setPartAudios({});
  };

  // Format question type
  const formatQuestionType = (type: string): string => {
    const types: Record<string, string> = {
      'MCQ': 'Multiple Choice',
      'MCMA': 'Multiple Choice (Multiple Answers)',
      'SA': 'Short Answer',
      'SC': 'Sentence Completion',
      'TFNG': 'True/False/Not Given',
      'YNNG': 'Yes/No/Not Given',
      'MF': 'Matching Features',
      'MI': 'Matching Information',
      'MH': 'Matching Headings',
      'SUC': 'Summary Completion',
      'NC': 'Note Completion',
      'FC': 'Form Completion',
      'TC': 'Table Completion',
      'FCC': 'Flow Chart Completion',
      'DL': 'Diagram Labeling',
      'ML': 'Map Labeling',
    };
    return types[type] || type;
  };

  // Count total questions
  const countTotalQuestions = (items: any[] | undefined): number => {
    if (!items) return 0;
    let total = 0;
    items.forEach((item: any) => {
      if (item && item.question_groups && Array.isArray(item.question_groups)) {
        item.question_groups.forEach((group: any) => {
          total += Array.isArray(group.questions) ? group.questions.length : 0;
        });
      }
    });
    return total;
  };

  // Group speaking topics
  const groupSpeakingTopics = (topics: SpeakingTopic[] | undefined): SpeakingTopicGroup[] => {
    if (!topics || !Array.isArray(topics)) return [];

    const groups: SpeakingTopicGroup[] = [];
    let currentGroup: SpeakingTopicGroup = {};

    topics.forEach((topic) => {
      const partNumber = (topic as any).part_number || (topic as any).part || (topic as any).speaking_type;

      if (partNumber === 1) {
        if (Object.keys(currentGroup).length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = { part1: topic };
      } else if (partNumber === 2) {
        currentGroup.part2 = topic;
      } else if (partNumber === 3) {
        currentGroup.part3 = topic;
      }
    });

    if (Object.keys(currentGroup).length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

  // Render step indicator icon
  const renderStepIcon = (step: Step) => {
    return iconMap[step.icon];
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          AI Content Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Upload IELTS test content via PDF (AI extraction) or JSON (pre-formatted AI response)
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
              : notification.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
              : 'bg-orange-50 text-orange-800 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Info className="w-5 h-5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      currentStep >= step.number
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500'
                    }`}
                  >
                    {renderStepIcon(step)}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-medium ${
                        currentStep >= step.number ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      Step {step.number}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{step.title}</div>
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Upload */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Upload Content</h2>

            {/* Upload Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Upload Method
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUploadModeChange('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    uploadMode === 'pdf'
                      ? 'border-orange-600 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                      : 'border-slate-200 text-slate-700 hover:border-orange-300 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Upload PDF (AI Extract)</span>
                </button>
                <button
                  onClick={() => handleUploadModeChange('json')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    uploadMode === 'json'
                      ? 'border-orange-600 bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                      : 'border-slate-200 text-slate-700 hover:border-orange-300 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Code className="w-5 h-5" />
                  <span className="font-medium">Upload JSON (Pre-formatted)</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {uploadMode === 'pdf' ? 'AI will extract content from PDF file' : 'Upload pre-formatted JSON response from AI'}
              </p>
            </div>

            {/* Content Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Content Type</label>
              <div className="grid grid-cols-5 gap-3">
                {contentTypes.map((ct) => (
                  <div
                    key={ct.value}
                    onClick={() => setContentType(ct.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-orange-500 ${
                      contentType === ct.value
                        ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className={contentType === ct.value ? 'text-orange-600' : 'text-slate-400 dark:text-slate-500'}>
                      {iconMap[ct.icon]}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        contentType === ct.value ? 'text-orange-600' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {ct.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* File Upload Area */}
            {uploadMode === 'pdf' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center hover:border-orange-400 transition-colors cursor-pointer"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">
                    {selectedFile ? selectedFile.name : 'Click to upload PDF file'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Maximum file size: 10MB'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center hover:border-orange-400 transition-colors cursor-pointer"
                >
                  <Code className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">
                    {selectedJsonFile ? selectedJsonFile.name : 'Click to upload JSON file'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedJsonFile ? `${(selectedJsonFile.size / 1024).toFixed(2)} KB` : 'Maximum file size: 5MB'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleGenerateContent}
                disabled={!canProceedToReview}
                className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    <span>Review Content</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {currentStep === 2 && extractedData && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Review Extracted Content</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Inspect and edit the extracted content before saving to the database.
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>Content Type:</strong> {extractedData.content_type}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <strong>Items Found:</strong>{' '}
                  {extractedData.passages?.length || extractedData.parts?.length || extractedData.tasks?.length || extractedData.topics?.length || 0}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <strong>Total Questions:</strong>{' '}
                  {countTotalQuestions(extractedData.passages || extractedData.parts)}
                </div>
              </div>
            </div>

            {/* Controls (minimal) - Back on left, Save on right */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <button
                  onClick={() => setCurrentStep(1)}
                  title="Back to upload"
                  aria-label="Back to upload"
                  className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              <div>
                <button
                  onClick={() => saveAllItems()}
                  disabled={isSaving}
                  aria-label="Save all extracted content"
                  title="Save all extracted content"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  <span className="text-sm">{isSaving ? 'Saving...' : 'Save All'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Render reading passages */}
              {extractedData.passages && Array.isArray(extractedData.passages) && (
                <div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-3">Passages</h3>
                  <div className="space-y-3">
                    {extractedData.passages.map((passage: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-white">{passage.title || `Passage ${idx + 1}`}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Questions: {countTotalQuestions([passage])}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand('passages', idx)}
                              className="text-sm px-3 py-1 rounded border bg-white dark:bg-slate-800"
                            >
                              {expanded.passages.has(idx) ? 'Collapse' : 'Expand'}
                            </button>
                            <button
                              onClick={() => startInlineEdit('passage', idx)}
                              className="text-sm px-3 py-1 rounded border bg-white dark:bg-slate-800"
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        {expanded.passages.has(idx) && (
                          <div className="mt-3">
                            {!isEditing(`passage:${idx}`) ? (
                              <div className="prose max-w-none text-sm text-slate-700 dark:text-slate-300">
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: processPassageHtml(
                                      passage.text || passage.body || passage.content || '<p>No passage text available.</p>'
                                    ),
                                  }}
                                />
                              </div>
                            ) : (
                              <div>
                                <textarea
                                  value={(editBuffer[`passage:${idx}`] && editBuffer[`passage:${idx}`].text) ?? (passage.text || passage.body || passage.content || '')}
                                  onChange={(e) => handleInlineChange(`passage:${idx}`, 'text', e.target.value)}
                                  className="w-full p-2 border rounded bg-white dark:bg-slate-800 dark:text-white"
                                  rows={6}
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => applyInlineEdit(`passage:${idx}`)}
                                    className="px-3 py-1 bg-orange-600 text-white rounded"
                                  >
                                    Apply
                                  </button>
                                  <button
                                    onClick={() => cancelInlineEdit('passage', idx)}
                                    className="px-3 py-1 border rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Questions detailed display */}
                            {Array.isArray(passage.question_groups) && (
                              <div className="mt-4 space-y-4">
                                {passage.question_groups.map((group: any, gidx: number) => (
                                  <div key={gidx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
                                    {/* Group Header */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
                                            {formatQuestionType(group.question_type || group.type || 'UNKNOWN')}
                                          </span>
                                          <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {Array.isArray(group.questions) ? group.questions.length : 0} questions
                                          </span>
                                        </div>
                                        <h4 className="font-medium text-slate-900 dark:text-white">
                                          {group.title || group.instructions || `Group ${gidx + 1}`}
                                        </h4>
                                        {group.instructions && group.title !== group.instructions && (
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1" dangerouslySetInnerHTML={{ __html: processPassageHtml(group.instructions) }} />
                                        )}
                                      </div>
                                    </div>

                                    {/* Image Upload for Visual Question Types */}
                                    {questionTypeRequiresImage(group.question_type || group.type) && (
                                      <div className="mt-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <div className="flex items-start gap-2 mb-2">
                                          <Image className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                              Image Upload (Optional)
                                            </p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                              This question type ({formatQuestionType(group.question_type || group.type)}) works best with a diagram/map/chart image, but it's optional.
                                            </p>
                                          </div>
                                        </div>

                                        {/* Image Upload Input */}
                                        {!groupImages[`passage-${idx}-group-${gidx}`] ? (
                                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                              <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-2" />
                                              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                                Click to upload image
                                              </p>
                                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                PNG, JPG or JPEG (max 5MB)
                                              </p>
                                            </div>
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept="image/png,image/jpeg,image/jpg"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  handleImageUpload(`passage-${idx}-group-${gidx}`, file);
                                                }
                                              }}
                                            />
                                          </label>
                                        ) : (
                                          <div className="mt-2">
                                            <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                                              <img
                                                src={groupImages[`passage-${idx}-group-${gidx}`].preview}
                                                alt="Question group image"
                                                className="w-full h-auto max-h-64 object-contain"
                                              />
                                              <button
                                                onClick={() => handleImageRemove(`passage-${idx}-group-${gidx}`)}
                                                className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                                                title="Remove image"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" />
                                              Image uploaded: {groupImages[`passage-${idx}-group-${gidx}`].file.name}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Questions List */}
                                    <div className="space-y-3">
                                      {Array.isArray(group.questions) && group.questions.map((q: any, qidx: number) => (
                                        <div key={qidx} className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 py-2">
                                          {!isEditing(`question:${idx}-${gidx}-${qidx}`) ? (
                                            <div className="flex items-start justify-between">
                                              <div className="flex-1">
                                                {/* Question Text */}
                                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                                  <span className="font-medium text-slate-500 dark:text-slate-400">
                                                    Q{q.order || q.question_number || qidx + 1}:
                                                  </span>{' '}
                                                  {q.text || q.question || q.prompt}
                                                </p>

                                                {/* Correct Answer */}
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                                  <CheckCircle className="w-3 h-3" />
                                                  Answer: {q.correct_answer || q.answer || 'N/A'}
                                                </p>

                                                {/* Multiple Choice Options */}
                                                {q.choices && Array.isArray(q.choices) && q.choices.length > 0 && (
                                                  <div className="mt-2 space-y-1">
                                                    {q.choices.map((choice: any, cIdx: number) => (
                                                      <div key={cIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                        <span className="font-medium">{choice.key || String.fromCharCode(65 + cIdx)}.</span>
                                                        <span>{choice.text || choice}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Options (alternative format) */}
                                                {q.options && Array.isArray(q.options) && q.options.length > 0 && !q.choices && (
                                                  <div className="mt-2 space-y-1">
                                                    {q.options.map((option: any, oIdx: number) => (
                                                      <div key={oIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                        <span className="font-medium">{String.fromCharCode(65 + oIdx)}.</span>
                                                        <span>{typeof option === 'string' ? option : option.text}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {/* Additional metadata */}
                                                {q.explanation && (
                                                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                                                    Explanation: {q.explanation}
                                                  </div>
                                                )}
                                              </div>

                                              {/* Edit Button */}
                                              <button
                                                onClick={() => startInlineEdit('question', `${idx}-${gidx}-${qidx}`)}
                                                className="p-1 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              <textarea
                                                value={editBuffer[`question:${idx}-${gidx}-${qidx}`]?.text || ''}
                                                onChange={(e) => handleInlineChange(`question:${idx}-${gidx}-${qidx}`, 'text', e.target.value)}
                                                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                rows={2}
                                                placeholder="Question text"
                                              />
                                              <input
                                                value={editBuffer[`question:${idx}-${gidx}-${qidx}`]?.correct_answer || ''}
                                                onChange={(e) => handleInlineChange(`question:${idx}-${gidx}-${qidx}`, 'correct_answer', e.target.value)}
                                                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                placeholder="Correct answer"
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => applyInlineEdit('question', `${idx}-${gidx}-${qidx}`)}
                                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1"
                                                >
                                                  <Check className="w-3 h-3" />
                                                  Save
                                                </button>
                                                <button
                                                  onClick={() => cancelInlineEdit('question', `${idx}-${gidx}-${qidx}`)}
                                                  className="px-2 py-1 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs rounded hover:bg-slate-400 dark:hover:bg-slate-500 flex items-center gap-1"
                                                >
                                                  <X className="w-3 h-3" />
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render listening parts */}
              {extractedData.parts && Array.isArray(extractedData.parts) && (
                <div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-3">Listening Parts</h3>
                  <div className="space-y-3">
                    {extractedData.parts.map((part: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-white">{part.title || `Part ${idx + 1}`}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Questions: {countTotalQuestions([part])}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand('parts', idx)}
                              className="text-sm px-3 py-1 rounded border bg-white dark:bg-slate-800"
                            >
                              {expanded.parts.has(idx) ? 'Collapse' : 'Expand'}
                            </button>
                          </div>
                        </div>

                        {/* Audio Upload for Listening Part */}
                        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
                          <div className="flex items-start gap-2 mb-2">
                            <Music className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                Audio Upload (Required)
                              </p>
                              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                                Upload the audio file for Part {part.part_number || idx + 1} listening section.
                              </p>
                            </div>
                          </div>

                          {/* Audio Upload Input */}
                          {!partAudios[`part-${idx}`] ? (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 text-purple-500 dark:text-purple-400 mb-2" />
                                <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                                  Click to upload audio
                                </p>
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                  MP3, WAV, OGG, M4A (max 50MB)
                                </p>
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleAudioUpload(`part-${idx}`, file);
                                  }
                                }}
                              />
                            </label>
                          ) : (
                            <div className="mt-2">
                              <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                                    <Music className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                      {partAudios[`part-${idx}`].file.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {(partAudios[`part-${idx}`].file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleAudioRemove(`part-${idx}`)}
                                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                                    title="Remove audio"
                                  >
                                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                                  </button>
                                </div>
                                <audio controls src={partAudios[`part-${idx}`].preview} className="w-full" />
                              </div>
                            </div>
                          )}
                        </div>

                        {expanded.parts.has(idx) && (
                          <div className="mt-3">
                            {part.audio_url && (
                              <div className="mb-4">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Audio:</label>
                                <audio controls src={part.audio_url} className="w-full" />
                              </div>
                            )}
                            {part.transcript && (
                              <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-900 rounded text-sm text-slate-600 dark:text-slate-400">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Transcript:</label>
                                <div dangerouslySetInnerHTML={{ __html: processPassageHtml(part.transcript) }} />
                              </div>
                            )}
                            <div className="prose max-w-none text-sm text-slate-700 dark:text-slate-300 mb-4">
                              <div dangerouslySetInnerHTML={{ __html: processPassageHtml(part.description || part.instructions || '') }} />
                            </div>
                            {/* Question Groups with detailed display */}
                            {Array.isArray(part.question_groups) && (
                              <div className="space-y-4">
                                {part.question_groups.map((group: any, gidx: number) => (
                                  <div key={gidx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
                                    {/* Group Header */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded">
                                            {formatQuestionType(group.question_type || group.type || 'UNKNOWN')}
                                          </span>
                                          <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {Array.isArray(group.questions) ? group.questions.length : 0} questions
                                          </span>
                                        </div>
                                        <h4 className="font-medium text-slate-900 dark:text-white">
                                          {group.title || group.instructions || `Group ${gidx + 1}`}
                                        </h4>
                                      </div>
                                    </div>

                                    {/* Image Upload for Visual Question Types */}
                                    {questionTypeRequiresImage(group.question_type || group.type) && (
                                      <div className="mt-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <div className="flex items-start gap-2 mb-2">
                                          <Image className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                              Image Upload (Optional)
                                            </p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                              This question type ({formatQuestionType(group.question_type || group.type)}) works best with a diagram/map/chart image, but it's optional.
                                            </p>
                                          </div>
                                        </div>

                                        {/* Image Upload Input */}
                                        {!groupImages[`part-${idx}-group-${gidx}`] ? (
                                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                              <Upload className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-2" />
                                              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                                Click to upload image
                                              </p>
                                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                PNG, JPG or JPEG (max 5MB)
                                              </p>
                                            </div>
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept="image/png,image/jpeg,image/jpg"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  handleImageUpload(`part-${idx}-group-${gidx}`, file);
                                                }
                                              }}
                                            />
                                          </label>
                                        ) : (
                                          <div className="mt-2">
                                            <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                                              <img
                                                src={groupImages[`part-${idx}-group-${gidx}`].preview}
                                                alt="Question group image"
                                                className="w-full h-auto max-h-64 object-contain"
                                              />
                                              <button
                                                onClick={() => handleImageRemove(`part-${idx}-group-${gidx}`)}
                                                className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                                                title="Remove image"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" />
                                              Image uploaded: {groupImages[`part-${idx}-group-${gidx}`].file.name}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Questions List */}
                                    <div className="space-y-3">
                                      {Array.isArray(group.questions) && group.questions.map((q: any, qidx: number) => (
                                        <div key={qidx} className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 py-2">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              {/* Question Text */}
                                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                                <span className="font-medium text-slate-500 dark:text-slate-400">
                                                  Q{q.order || q.question_number || qidx + 1}:
                                                </span>{' '}
                                                <span dangerouslySetInnerHTML={{ __html: processPassageHtml(q.text || q.question || q.prompt || '') }} />
                                              </p>

                                              {/* Correct Answer */}
                                              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Answer: {q.correct_answer || q.answer || 'N/A'}
                                              </p>

                                              {/* Multiple Choice Options */}
                                              {q.choices && Array.isArray(q.choices) && q.choices.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                  {q.choices.map((choice: any, cIdx: number) => (
                                                    <div key={cIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                      <span className="font-medium">{choice.key || String.fromCharCode(65 + cIdx)}.</span>
                                                      <span>{choice.text || choice}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}

                                              {/* Options (alternative format) */}
                                              {q.options && Array.isArray(q.options) && q.options.length > 0 && !q.choices && (
                                                <div className="mt-2 space-y-1">
                                                  {q.options.map((option: any, oIdx: number) => (
                                                    <div key={oIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                      <span className="font-medium">{String.fromCharCode(65 + oIdx)}.</span>
                                                      <span>{typeof option === 'string' ? option : option.text}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Content Saved Successfully!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Your IELTS test content has been extracted and saved to the database.
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700"
              >
                <Upload className="w-5 h-5 inline mr-2" />
                Generate More Content
              </button>
              <button
                onClick={() => {
                  const route = extractedData?.content_type === 'reading' ? '/manager/reading' : '/manager';
                  window.location.href = route;
                }}
                className="px-6 py-3 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700"
              >
                <ArrowRight className="w-5 h-5 inline mr-2" />
                View Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIContentGenerator;
