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
  const [editBuffer, setEditBuffer] = useState<Record<string, any>>({});

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [savedItems, setSavedItems] = useState<any[]>([]);

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
      const response = await managerAPI.saveGeneratedContent(extractedData.content_type, extractedData);

      if (response.success) {
        setSavedItems(response.passages || response.parts || response.tasks || response.topics || []);
        setCurrentStep(3);
        showNotification(response.message, 'success');
      } else {
        showNotification(response.error || 'Failed to save content', 'error');
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

      {/* Step 2: Review (simplified for now - full implementation follows same pattern) */}
      {currentStep === 2 && extractedData && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Review Extracted Content</h2>

            {/* Content preview - simplified */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Content Type:</strong> {extractedData.content_type}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                <strong>Items Found:</strong>{' '}
                {extractedData.passages?.length ||
                  extractedData.parts?.length ||
                  extractedData.tasks?.length ||
                  extractedData.topics?.length ||
                  0}
              </p>
              {(extractedData.passages || extractedData.parts) && (
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                  <strong>Total Questions:</strong> {countTotalQuestions(extractedData.passages || extractedData.parts)}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6 border-t dark:border-slate-700">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleSaveContent}
                disabled={!canSaveContent || isSaving}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Database className="w-5 h-5" />
                <span>{isSaving ? 'Saving...' : 'Save to Database'}</span>
              </button>
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
