'use client';

/**
 * AI Content Generator Component - Redesigned
 * Modern UI with support for:
 * - Single section upload (Reading, Listening, Writing, Speaking)
 * - Full book upload (Cambridge IELTS books with multiple tests)
 * - Improved audio uploader with drag-drop and batch support
 * - Test selection and preview
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
  Book,
  Layers,
  Play,
  Pause,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FileAudio,
  Sparkles,
  RotateCcw,
  Download,
  Plus,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Loader2,
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
  FullTest,
  FullTestExtractionResponse,
} from '@/types/manager/ai-content';

const AIContentGenerator: React.FC = () => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Upload state (declared early for useMemo dependency)
  const [uploadMode, setUploadMode] = useState<UploadMode>('pdf');
  
  // Add as Book state
  const [addAsBook, setAddAsBook] = useState(false);
  const [bookDetails, setBookDetails] = useState({
    title: '',
    description: '',
    level: 'B2' as 'B1' | 'B2' | 'C1' | 'C2',
    author: '',
    publisher: 'Cambridge University Press',
  });
  const [savedContentIds, setSavedContentIds] = useState<{
    listening: number[];
    reading: number[];
    writing: number[];
    speaking: number[];
  }>({ listening: [], reading: [], writing: [], speaking: [] });
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const [createdBookId, setCreatedBookId] = useState<number | null>(null);

  // Add as Practice state
  const [addAsPractice, setAddAsPractice] = useState(false);
  const [practiceDifficulty, setPracticeDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'>('MEDIUM');
  const [isCreatingPractices, setIsCreatingPractices] = useState(false);
  const [createdPracticesCount, setCreatedPracticesCount] = useState(0);

  // Dynamic steps based on addAsBook toggle
  const steps: Step[] = useMemo(() => {
    const baseSteps = [
      { number: 1, title: 'Upload Content', icon: 'upload' },
      { number: 2, title: 'Review Content', icon: 'eye' },
      { number: 3, title: 'Save to Database', icon: 'database' },
    ];
    if (addAsBook && uploadMode === 'full_book') {
      baseSteps.push({ number: 4, title: 'Create Book', icon: 'book' });
    }
    return baseSteps;
  }, [addAsBook, uploadMode]);

  // Rest of upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedJsonFile, setSelectedJsonFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<ContentType>('auto');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Generated content - Single section mode
  const [extractedData, setExtractedData] = useState<AIGenerateResponse | null>(null);

  // Full book mode state
  const [fullTestData, setFullTestData] = useState<FullTestExtractionResponse | null>(null);
  const [selectedTestIndex, setSelectedTestIndex] = useState<number>(0);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set(['listening', 'reading', 'writing', 'speaking']));

  // Edit state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number; section: string }>({ current: 0, total: 0, section: '' });
  const [savedResult, setSavedResult] = useState<any>(null); // Store full save result with IDs

  // Image upload state for question groups
  const [groupImages, setGroupImages] = useState<Record<string, { file: File; preview: string }>>({});

  // Image upload state for writing tasks (Task 1 charts/graphs)
  const [writingTaskImages, setWritingTaskImages] = useState<Record<string, { file: File; preview: string }>>({});

  // Audio upload state for listening parts - Improved with batch support
  const [partAudios, setPartAudios] = useState<Record<string, { file: File; preview: string; duration?: number }>>({});
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const [audioUploadQueue, setAudioUploadQueue] = useState<File[]>([]);

  // TTS (Text-to-Speech) state for speaking questions
  const [ttsVoice, setTtsVoice] = useState<string>('female_primary');
  const [ttsVoices, setTtsVoices] = useState<Array<{ id: string; name: string; gender: string; recommended: boolean }>>([]);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [ttsProgress, setTtsProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  // Per-test TTS audio state: { testIndex: { audioKey: audioUrl } }
  const [allTestsTTSAudios, setAllTestsTTSAudios] = useState<Record<number, Record<string, string>>>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Helper to get audio URLs for current test
  const generatedTTSAudios = useMemo(() => {
    return allTestsTTSAudios[selectedTestIndex] || {};
  }, [allTestsTTSAudios, selectedTestIndex]);

  // Review UI state: expansion and inline edit buffers
  const [expanded, setExpanded] = useState<{ 
    passages: Set<number>; 
    parts: Set<number>;
    tests: Set<number>;
    sections: Set<string>;
    tasks: Set<number>;
    topics: Set<number>;
  }>({
    passages: new Set(),
    parts: new Set(),
    tests: new Set([0]), // First test expanded by default
    sections: new Set(['listening', 'reading']), // Default expanded sections
    tasks: new Set(),
    topics: new Set(),
  });

  // Tab state for review
  const [activeReviewTab, setActiveReviewTab] = useState<'listening' | 'reading' | 'writing' | 'speaking'>('reading');

  // Inline edit buffers keyed by editingItem string (e.g. "passage:2" or "question:2-0-1")
  const [editBuffer, setEditBuffer] = useState<Record<string, any>>({});

  const toggleExpand = (key: 'passages' | 'parts' | 'tests' | 'sections' | 'tasks' | 'topics', idx: number | string) => {
    setExpanded((prev) => {
      const next = { ...prev } as any;
      const set = new Set(next[key]);
      if (set.has(idx)) set.delete(idx);
      else set.add(idx);
      next[key] = set;
      return next;
    });
  };

  // Toggle section selection for full book mode
  const toggleSectionSelection = (section: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // Get current test data in full book mode
  const currentTest = useMemo(() => {
    if (!fullTestData?.tests || fullTestData.tests.length === 0) return null;
    return fullTestData.tests[selectedTestIndex] || fullTestData.tests[0];
  }, [fullTestData, selectedTestIndex]);

  // Auto-select first available tab when currentTest changes (for full book mode)
  useEffect(() => {
    if (!currentTest) return;
    
    // Check which sections have data and select the first one
    if (currentTest.listening?.parts?.length > 0) {
      setActiveReviewTab('listening');
    } else if (currentTest.reading?.passages?.length > 0) {
      setActiveReviewTab('reading');
    } else if (currentTest.writing?.tasks?.length > 0) {
      setActiveReviewTab('writing');
    } else if (currentTest.speaking?.topics?.length > 0) {
      setActiveReviewTab('speaking');
    }
  }, [currentTest]);

  // Calculate stats for current data
  const contentStats = useMemo(() => {
    if (uploadMode === 'full_book' && currentTest) {
      return {
        listening: currentTest.listening?.parts?.length || 0,
        reading: currentTest.reading?.passages?.length || 0,
        writing: currentTest.writing?.tasks?.length || 0,
        speaking: currentTest.speaking?.topics?.length || 0,
        totalQuestions: 
          (currentTest.listening?.parts?.reduce((acc: number, p: any) => 
            acc + (p.question_groups?.reduce((a: number, g: any) => a + (g.questions?.length || 0), 0) || 0), 0) || 0) +
          (currentTest.reading?.passages?.reduce((acc: number, p: any) => 
            acc + (p.question_groups?.reduce((a: number, g: any) => a + (g.questions?.length || 0), 0) || 0), 0) || 0),
      };
    }
    if (extractedData) {
      const passagesOrParts = extractedData.passages || extractedData.parts || [];
      return {
        items: passagesOrParts.length,
        questions: passagesOrParts.reduce((acc: number, item: any) => 
          acc + (item.question_groups?.reduce((a: number, g: any) => a + (g.questions?.length || 0), 0) || 0), 0),
        tasks: extractedData.tasks?.length || 0,
        topics: extractedData.topics?.length || 0,
      };
    }
    return null;
  }, [uploadMode, currentTest, extractedData]);

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
    'book': <Book className="w-5 h-5" />,
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

  // Handle image upload for writing tasks (Task 1 charts/graphs)
  const handleWritingTaskImageUpload = (taskKey: string, file: File) => {
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

    setWritingTaskImages(prev => ({
      ...prev,
      [taskKey]: { file, preview }
    }));

    showNotification('Writing task image uploaded successfully', 'success');
  };

  // Remove uploaded writing task image
  const handleWritingTaskImageRemove = (taskKey: string) => {
    setWritingTaskImages(prev => {
      const updated = { ...prev };
      // Revoke the preview URL to free memory
      if (updated[taskKey]?.preview) {
        URL.revokeObjectURL(updated[taskKey].preview);
      }
      delete updated[taskKey];
      return updated;
    });
    showNotification('Writing task image removed', 'info');
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

  // ============= TTS (Text-to-Speech) Functions =============

  // Load TTS voices on mount
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const data = await managerAPI.getTTSVoices();
        setTtsVoices(data.voices);
        setTtsVoice(data.default);
      } catch (error) {
        console.error('Failed to load TTS voices:', error);
        // Use default voices if API fails
        setTtsVoices([
          { id: 'female_primary', name: 'Sonia (British Female)', gender: 'female', recommended: true },
          { id: 'male_primary', name: 'Ryan (British Male)', gender: 'male', recommended: true },
        ]);
      }
    };
    loadVoices();
  }, []);

  // Helper to update TTS audios for current test
  const setGeneratedTTSAudios = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setAllTestsTTSAudios(prev => ({
      ...prev,
      [selectedTestIndex]: updater(prev[selectedTestIndex] || {}),
    }));
  };

  // Generate TTS for a single question
  const generateTTSForQuestion = async (questionText: string, speakingPart: string, questionKey: string) => {
    try {
      const result = await managerAPI.generateTTSForQuestion(questionText, speakingPart, ttsVoice);
      if (result.success && result.audio_url) {
        setGeneratedTTSAudios(prev => ({
          ...prev,
          [questionKey]: result.audio_url,
        }));
        return result.audio_url;
      }
      return null;
    } catch (error) {
      console.error('TTS generation failed:', error);
      throw error;
    }
  };

  // Generate TTS for all speaking topics in batch
  const generateTTSBatch = async (topics: any[]) => {
    if (!topics || topics.length === 0) return;

    setIsGeneratingTTS(true);
    const totalQuestions = topics.reduce((acc, topic) => {
      if (topic.part_number === 2) return acc + 1; // Cue card counts as 1
      return acc + (topic.questions?.length || 0);
    }, 0);
    setTtsProgress({ current: 0, total: totalQuestions });

    try {
      const result = await managerAPI.generateTTSBatch(topics, ttsVoice, true);
      
      if (result.generated) {
        const newAudios: Record<string, string> = {};
        let processedCount = 0;

        result.generated.forEach((topicResult) => {
          if (topicResult.cue_card_audio) {
            newAudios[`topic-${topicResult.topic_index}-cuecard`] = topicResult.cue_card_audio;
            processedCount++;
          }
          topicResult.question_audios?.forEach((qa) => {
            newAudios[`topic-${topicResult.topic_index}-q-${qa.question_index}`] = qa.audio_url;
            processedCount++;
          });
        });

        setGeneratedTTSAudios(prev => ({ ...prev, ...newAudios }));
        setTtsProgress({ current: processedCount, total: totalQuestions });
        showNotification(`Generated ${processedCount} audio files`, 'success');
      }

      if (result.errors && result.errors.length > 0) {
        showNotification(`${result.errors.length} audio(s) failed to generate`, 'warning');
      }
    } catch (error) {
      console.error('Batch TTS generation failed:', error);
      showNotification('Failed to generate audio files', 'error');
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // Play/Pause TTS audio
  const toggleAudioPlayback = (audioKey: string, audioUrl: string) => {
    if (playingAudio === audioKey && audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlayingAudio(null);
      audioRef.current.play();
      setPlayingAudio(audioKey);
    }
  };

  // Stop all audio playback
  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudio(null);
  };

  // Generate TTS audio for all tests at once
  const generateTTSForAllTests = async () => {
    if (!fullTestData?.tests || fullTestData.tests.length === 0) return;
    
    setIsGeneratingTTS(true);
    
    // Calculate total questions across all tests
    let totalQuestions = 0;
    fullTestData.tests.forEach((test: any) => {
      if (test.speaking?.topics) {
        test.speaking.topics.forEach((topic: any) => {
          if (topic.part_number === 2) totalQuestions += 1;
          else totalQuestions += (topic.questions?.length || 0);
        });
      }
    });
    
    setTtsProgress({ current: 0, total: totalQuestions });
    let overallProgress = 0;
    let overallSuccess = 0;
    let overallErrors = 0;
    
    try {
      // Process each test sequentially
      for (let testIdx = 0; testIdx < fullTestData.tests.length; testIdx++) {
        const test = fullTestData.tests[testIdx];
        if (!test.speaking?.topics || test.speaking.topics.length === 0) continue;
        
        const result = await managerAPI.generateTTSBatch(test.speaking.topics, ttsVoice, true);
        
        if (result.generated) {
          const newAudios: Record<string, string> = {};
          
          result.generated.forEach((topicResult: any) => {
            if (topicResult.cue_card_audio) {
              newAudios[`topic-${topicResult.topic_index}-cuecard`] = topicResult.cue_card_audio;
              overallProgress++;
              overallSuccess++;
            }
            topicResult.question_audios?.forEach((qa: any) => {
              newAudios[`topic-${topicResult.topic_index}-q-${qa.question_index}`] = qa.audio_url;
              overallProgress++;
              overallSuccess++;
            });
          });
          
          // Update audio state for this specific test
          setAllTestsTTSAudios(prev => ({
            ...prev,
            [testIdx]: { ...(prev[testIdx] || {}), ...newAudios },
          }));
          
          setTtsProgress({ current: overallProgress, total: totalQuestions });
        }
        
        if (result.errors) {
          overallErrors += result.errors.length;
        }
      }
      
      showNotification(
        `Generated ${overallSuccess} audio files across ${fullTestData.tests.length} tests${overallErrors > 0 ? ` (${overallErrors} failed)` : ''}`,
        overallErrors > 0 ? 'warning' : 'success'
      );
    } catch (error) {
      console.error('Batch TTS generation for all tests failed:', error);
      showNotification('Failed to generate audio files', 'error');
    } finally {
      setIsGeneratingTTS(false);
    }
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

  const canProceedToReview = (uploadMode === 'pdf' || uploadMode === 'full_book') 
    ? selectedFile && !isUploading 
    : selectedJsonFile && !isUploading;
  const canSaveContent = (extractedData && extractedData.success) || (fullTestData && fullTestData.success);

  // Upload mode toggle
  const handleUploadModeChange = (mode: UploadMode) => {
    setUploadMode(mode);
    setSelectedFile(null);
    setSelectedJsonFile(null);
    setExtractedData(null);
    setFullTestData(null);
    setSelectedTestIndex(0);
    setUploadProgress(0);
  };

  // File selection handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      showNotification('Please select a PDF file', 'error');
      return;
    }

    // Full book mode allows larger files (50MB) for Cambridge IELTS books
    const maxSize = uploadMode === 'full_book' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = uploadMode === 'full_book' ? '50MB' : '10MB';

    if (file.size > maxSize) {
      showNotification(`File size must be less than ${maxSizeLabel}`, 'error');
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
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
    if (uploadMode === 'full_book') {
      await generateFullBookFromPdf();
    } else if (uploadMode === 'pdf') {
      await generateFromPdf();
    } else {
      await processJsonFile();
    }
  };

  // Generate full book content (Cambridge IELTS)
  const generateFullBookFromPdf = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 2000);

      const response = await managerAPI.generateFullTestFromPdf(selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.data) {
        setFullTestData(response.data);
        setCurrentStep(2);
        showNotification(
          `Successfully extracted ${response.data.book_info?.extracted_tests || 1} test(s) from the book!`,
          'success'
        );
      } else {
        showNotification(response.error || 'Failed to extract content from book', 'error');
      }
    } catch (error: any) {
      showNotification('Upload error: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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

  // Create practices from saved content with AI-extracted difficulty
  const createPracticesFromSavedContent = async (results: any, originalData?: any) => {
    setIsCreatingPractices(true);
    try {
      const practicesData: Array<{
        section_type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
        content_id: number;
        name?: string;
        difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
      }> = [];

      // Helper function to map difficulty from AI response
      const mapDifficulty = (aiDifficulty: string | undefined): 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT' => {
        const mapped = aiDifficulty?.toUpperCase();
        if (mapped === 'EASY' || mapped === 'MEDIUM' || mapped === 'HARD' || mapped === 'EXPERT') {
          return mapped;
        }
        return practiceDifficulty; // Fall back to user-selected difficulty
      };

      // Add listening parts with AI-extracted difficulty
      if (results.listening?.parts) {
        results.listening.parts.forEach((part: any, idx: number) => {
          if (part.part_id) {
            // Try to get difficulty from original data
            const originalPart = originalData?.listening?.parts?.[idx];
            practicesData.push({
              section_type: 'LISTENING',
              content_id: part.part_id,
              name: part.title || `Listening Part ${part.part_number}`,
              difficulty: mapDifficulty(originalPart?.difficulty),
            });
          }
        });
      }

      // Add reading passages with AI-extracted difficulty
      if (results.reading?.passages) {
        results.reading.passages.forEach((passage: any, idx: number) => {
          if (passage.passage_id) {
            const originalPassage = originalData?.reading?.passages?.[idx];
            practicesData.push({
              section_type: 'READING',
              content_id: passage.passage_id,
              name: passage.title,
              difficulty: mapDifficulty(originalPassage?.difficulty),
            });
          }
        });
      }

      // Add writing tasks with AI-extracted difficulty
      if (results.writing?.tasks) {
        results.writing.tasks.forEach((task: any, idx: number) => {
          if (task.task_id) {
            const originalTask = originalData?.writing?.tasks?.[idx];
            // Extract task number from task_type: TASK_1 -> 1, TASK_2 -> 2
            const taskNumber = task.task_type?.split('_').pop() || (idx + 1);
            practicesData.push({
              section_type: 'WRITING',
              content_id: task.task_id,
              name: `Writing Task ${taskNumber}`,
              difficulty: mapDifficulty(originalTask?.difficulty),
            });
          }
        });
      }

      // Add speaking topics with AI-extracted difficulty
      if (results.speaking?.topics) {
        results.speaking.topics.forEach((topic: any, idx: number) => {
          if (topic.topic_id) {
            const originalTopic = originalData?.speaking?.topics?.[idx];
            practicesData.push({
              section_type: 'SPEAKING',
              content_id: topic.topic_id,
              name: topic.title || `Speaking Part ${topic.part_number}`,
              difficulty: mapDifficulty(originalTopic?.difficulty),
            });
          }
        });
      }

      if (practicesData.length > 0) {
        const response = await managerAPI.createPracticesBatch(practicesData, practiceDifficulty);
        if (response.success || response.created_count > 0) {
          setCreatedPracticesCount(response.created_count);
          showNotification(`Created ${response.created_count} practice(s) successfully!`, 'success');
        } else if (response.errors?.length > 0) {
          showNotification(`Some practices failed to create: ${response.message}`, 'warning');
        }
      }
    } catch (error: any) {
      showNotification('Error creating practices: ' + error.message, 'error');
    } finally {
      setIsCreatingPractices(false);
    }
  };

  // Save content to database
  const handleSaveContent = async () => {
    if (uploadMode === 'full_book') {
      await saveFullTestContent();
    } else {
      await saveSingleSectionContent();
    }
  };

  // Save a single test content (all sections)
  const saveTestContent = async (test: any, testIndex: number, isPartOfBatch: boolean = false) => {
    // Build test data based on selected sections
    const testData: any = {};
    
    if (selectedSections.has('listening') && test.listening) {
      testData.listening = test.listening;
      if (!isPartOfBatch) setSaveProgress(prev => ({ ...prev, section: 'Listening' }));
    }
    if (selectedSections.has('reading') && test.reading) {
      testData.reading = test.reading;
      if (!isPartOfBatch) setSaveProgress(prev => ({ ...prev, section: 'Reading' }));
    }
    if (selectedSections.has('writing') && test.writing) {
      testData.writing = test.writing;
      if (!isPartOfBatch) setSaveProgress(prev => ({ ...prev, section: 'Writing' }));
    }
    if (selectedSections.has('speaking') && test.speaking) {
      // Include TTS audio URLs with the speaking data
      const speakingData = { ...test.speaking };
      const testTTSAudios = allTestsTTSAudios[testIndex] || {};
      if (Object.keys(testTTSAudios).length > 0) {
        speakingData.question_audios = testTTSAudios;
      }
      testData.speaking = speakingData;
      if (!isPartOfBatch) setSaveProgress(prev => ({ ...prev, section: 'Speaking' }));
    }

    // Get audio files for this test index (if available)
    const audios: Record<string, File> = {};
    Object.entries(partAudios).forEach(([key, { file }]) => {
      // Audio keys are like "part-0", "part-1" for single test mode
      // or "test-0-part-0" for multi-test mode
      if (key.startsWith(`test-${testIndex}-`) || (!key.startsWith('test-') && testIndex === selectedTestIndex)) {
        const newKey = key.replace(`test-${testIndex}-`, '');
        audios[newKey || key] = file;
      }
    });

    // Get image files for this test index
    const images: Record<string, File> = {};
    Object.entries(groupImages).forEach(([key, { file }]) => {
      if (key.startsWith(`test-${testIndex}-`) || (!key.startsWith('test-') && testIndex === selectedTestIndex)) {
        const newKey = key.replace(`test-${testIndex}-`, '');
        images[newKey || key] = file;
      }
    });

    // Get writing task image files for this test index
    Object.entries(writingTaskImages).forEach(([key, { file }]) => {
      if (key.startsWith(`test-${testIndex}-`) || (!key.startsWith('test-') && testIndex === selectedTestIndex)) {
        const newKey = key.replace(`test-${testIndex}-`, '');
        // Prefix writing task images with 'writing-' to distinguish them
        images[`writing-${newKey || key}`] = file;
      }
    });

    return await managerAPI.saveFullTestContent(testData, audios, images);
  };

  // Save full test content (current test only)
  const saveFullTestContent = async () => {
    if (!currentTest) return;

    setIsSaving(true);
    setSaveProgress({ current: 0, total: selectedSections.size, section: '' });

    try {
      const response = await saveTestContent(currentTest, selectedTestIndex, false);

      if (response.success) {
        setSavedItems(response.saved_sections || []);
        setSavedResult(response); // Store full response with IDs
        
        // Extract saved content IDs for book creation
        if (response.results) {
          setSavedContentIds({
            listening: response.results.listening?.parts?.map((p: any) => p.part_id) || [],
            reading: response.results.reading?.passages?.map((p: any) => p.passage_id) || [],
            writing: response.results.writing?.tasks?.map((t: any) => t.task_id) || [],
            speaking: response.results.speaking?.topics?.map((t: any) => t.topic_id) || [],
          });
          
          // Create practices if addAsPractice is enabled
          if (addAsPractice) {
            await createPracticesFromSavedContent(response.results, currentTest);
          }
        }
        
        // Auto-populate book title from extracted book info
        if (addAsBook && fullTestData?.book_info?.title) {
          setBookDetails(prev => ({
            ...prev,
            title: prev.title || `${fullTestData.book_info.title} - ${currentTest?.test_name || 'Test'}`,
          }));
        }
        
        // Proceed to step 4 if addAsBook is enabled, otherwise step 3
        if (addAsBook) {
          setCurrentStep(4);
          showNotification('Content saved! Now configure your book.', 'success');
        } else {
          setCurrentStep(3);
          showNotification(response.message || 'Content saved successfully!', 'success');
        }
        
        // Clean up previews
        cleanupPreviews();
      } else {
        showNotification(response.error || 'Failed to save content', 'error');
      }
    } catch (error: any) {
      showNotification('Save error: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
      setSaveProgress({ current: 0, total: 0, section: '' });
    }
  };

  // Save ALL tests from full book extraction
  const saveAllTests = async () => {
    if (!fullTestData?.tests || fullTestData.tests.length === 0) return;

    const tests = fullTestData.tests;
    const totalTests = tests.length;
    
    setIsSaving(true);
    setSaveProgress({ current: 0, total: totalTests, section: '' });

    const allSavedIds = {
      listening: [] as number[],
      reading: [] as number[],
      writing: [] as number[],
      speaking: [] as number[],
    };
    
    const allSavedItems: any[] = [];
    let successCount = 0;

    try {
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        setSaveProgress({ current: i + 1, total: totalTests, section: `Test ${i + 1}: ${test.test_name || `Test ${i + 1}`}` });

        try {
          const response = await saveTestContent(test, i, true);
          
          if (response.success) {
            successCount++;
            allSavedItems.push(...(response.saved_sections || []));
            
            // Accumulate saved content IDs
            if (response.results) {
              allSavedIds.listening.push(...(response.results.listening?.parts?.map((p: any) => p.part_id) || []));
              allSavedIds.reading.push(...(response.results.reading?.passages?.map((p: any) => p.passage_id) || []));
              allSavedIds.writing.push(...(response.results.writing?.tasks?.map((t: any) => t.task_id) || []));
              allSavedIds.speaking.push(...(response.results.speaking?.topics?.map((t: any) => t.topic_id) || []));
            }
          } else {
            showNotification(`Test ${i + 1} failed: ${response.error}`, 'error');
          }
        } catch (error: any) {
          showNotification(`Test ${i + 1} error: ${error.message}`, 'error');
        }
      }

      if (successCount > 0) {
        setSavedItems(allSavedItems);
        setSavedContentIds(allSavedIds);
        
        // Create practices if addAsPractice is enabled
        // For batch mode, we need to combine original data from all tests
        if (addAsPractice && fullTestData?.tests) {
          // Combine all original parts/passages/tasks/topics from all tests
          const allOriginalData = {
            listening: { parts: fullTestData.tests.flatMap(t => t.listening?.parts || []) },
            reading: { passages: fullTestData.tests.flatMap(t => t.reading?.passages || []) },
            writing: { tasks: fullTestData.tests.flatMap(t => t.writing?.tasks || []) },
            speaking: { topics: fullTestData.tests.flatMap(t => t.speaking?.topics || []) },
          };
          const allResults = {
            listening: { parts: allSavedIds.listening.map(id => ({ part_id: id })) },
            reading: { passages: allSavedIds.reading.map(id => ({ passage_id: id })) },
            writing: { tasks: allSavedIds.writing.map(id => ({ task_id: id })) },
            speaking: { topics: allSavedIds.speaking.map(id => ({ topic_id: id })) },
          };
          await createPracticesFromSavedContent(allResults, allOriginalData);
        }
        
        // Auto-populate book title from extracted book info
        if (addAsBook && fullTestData?.book_info?.title) {
          setBookDetails(prev => ({
            ...prev,
            title: prev.title || fullTestData.book_info.title,
          }));
        }
        
        // Proceed to next step
        if (addAsBook) {
          setCurrentStep(4);
          showNotification(`${successCount}/${totalTests} tests saved! Now configure your book.`, 'success');
        } else {
          setCurrentStep(3);
          showNotification(`${successCount}/${totalTests} tests saved successfully!`, 'success');
        }
        
        // Clean up previews
        cleanupPreviews();
      } else {
        showNotification('No tests were saved successfully', 'error');
      }
    } catch (error: any) {
      showNotification('Save error: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
      setSaveProgress({ current: 0, total: 0, section: '' });
    }
  };

  // Save single section content
  const saveSingleSectionContent = async () => {
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
          cleanupPreviews();
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

  // Cleanup preview URLs
  const cleanupPreviews = () => {
    Object.values(groupImages).forEach(({ preview }) => {
      URL.revokeObjectURL(preview);
    });
    setGroupImages({});

    Object.values(writingTaskImages).forEach(({ preview }) => {
      URL.revokeObjectURL(preview);
    });
    setWritingTaskImages({});

    Object.values(partAudios).forEach(({ preview }) => {
      URL.revokeObjectURL(preview);
    });
    setPartAudios({});
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
    setFullTestData(null);
    setSelectedTestIndex(0);
    setSelectedSections(new Set(['listening', 'reading', 'writing', 'speaking']));
    setSavedItems([]);
    setSavedResult(null);
    setEditingItem(null);
    setEditBuffer({});
    setUploadProgress(0);
    
    // Reset book state
    setAddAsBook(false);
    setBookDetails({
      title: '',
      description: '',
      level: 'B2',
      author: '',
      publisher: 'Cambridge University Press',
    });
    setSavedContentIds({ listening: [], reading: [], writing: [], speaking: [] });
    setCreatedBookId(null);
    
    // Reset practice state
    setAddAsPractice(false);
    setPracticeDifficulty('MEDIUM');
    setCreatedPracticesCount(0);
    
    // Clean up previews
    cleanupPreviews();
  };

  // Create book with sections from saved content
  const createBookWithSections = async () => {
    if (!bookDetails.title.trim()) {
      showNotification('Please enter a book title', 'error');
      return;
    }

    setIsCreatingBook(true);

    try {
      // Build sections array from saved content IDs
      const sections: any[] = [];
      let order = 1;

      // Get actual titles from currentTest data
      const listeningParts = currentTest?.listening?.parts || [];
      const readingPassages = currentTest?.reading?.passages || [];

      // Add listening sections with actual titles
      // Only section 1 is unlocked, rest are locked when in book mode
      savedContentIds.listening.forEach((id, idx) => {
        const partData = listeningParts[idx];
        const title = partData?.title || `Listening Part ${idx + 1}`;
        const currentOrder = order++;
        sections.push({
          section_type: 'LISTENING',
          listening_part: id,
          order: currentOrder,
          title: title,
          is_locked: currentOrder > 1, // Only first section is unlocked
        });
      });

      // Add reading sections with actual titles
      savedContentIds.reading.forEach((id, idx) => {
        const passageData = readingPassages[idx];
        const title = passageData?.title || `Reading Passage ${idx + 1}`;
        const currentOrder = order++;
        sections.push({
          section_type: 'READING',
          reading_passage: id,
          order: currentOrder,
          title: title,
          is_locked: currentOrder > 1, // Only first section is unlocked
        });
      });

      // Create book first
      const bookResponse = await managerAPI.createBook({
        title: bookDetails.title,
        description: bookDetails.description || `Auto-generated from ${fullTestData?.book_info?.title || 'IELTS'} content`,
        level: bookDetails.level,
        author: bookDetails.author,
        publisher: bookDetails.publisher,
        is_active: true,
      });

      if (bookResponse && bookResponse.id) {
        setCreatedBookId(bookResponse.id);

        // Now save sections in bulk
        if (sections.length > 0) {
          const formData = new FormData();
          formData.append('sections', JSON.stringify(sections));

          await managerAPI.bulkSaveBookSections(bookResponse.id, formData);
        }

        setCurrentStep(3);
        showNotification(`Book "${bookDetails.title}" created successfully with ${sections.length} sections!`, 'success');
      } else {
        showNotification('Failed to create book', 'error');
      }
    } catch (error: any) {
      showNotification('Error creating book: ' + error.message, 'error');
    } finally {
      setIsCreatingBook(false);
    }
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

            {/* Upload Mode Selection - Redesigned with 3 options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Upload Method
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Single Section PDF */}
                <button
                  onClick={() => handleUploadModeChange('pdf')}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    uploadMode === 'pdf'
                      ? 'border-orange-600 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20'
                      : 'border-slate-200 hover:border-orange-300 dark:border-slate-600'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${uploadMode === 'pdf' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <FileText className={`w-6 h-6 ${uploadMode === 'pdf' ? 'text-orange-600' : 'text-slate-500 dark:text-slate-400'}`} />
                  </div>
                  <span className={`font-medium text-sm ${uploadMode === 'pdf' ? 'text-orange-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    Single Section
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Reading, Listening, etc.
                  </span>
                </button>

                {/* Full Book (Cambridge IELTS) */}
                <button
                  onClick={() => handleUploadModeChange('full_book')}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    uploadMode === 'full_book'
                      ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20'
                      : 'border-slate-200 hover:border-purple-300 dark:border-slate-600'
                  }`}
                >
                  {uploadMode !== 'full_book' && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                      NEW
                    </div>
                  )}
                  <div className={`p-3 rounded-lg ${uploadMode === 'full_book' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Book className={`w-6 h-6 ${uploadMode === 'full_book' ? 'text-purple-600' : 'text-slate-500 dark:text-slate-400'}`} />
                  </div>
                  <span className={`font-medium text-sm ${uploadMode === 'full_book' ? 'text-purple-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    Full Book
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Cambridge IELTS
                  </span>
                </button>

                {/* JSON Upload */}
                <button
                  onClick={() => handleUploadModeChange('json')}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    uploadMode === 'json'
                      ? 'border-emerald-600 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
                      : 'border-slate-200 hover:border-emerald-300 dark:border-slate-600'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${uploadMode === 'json' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Code className={`w-6 h-6 ${uploadMode === 'json' ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`} />
                  </div>
                  <span className={`font-medium text-sm ${uploadMode === 'json' ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    JSON Import
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    Pre-formatted data
                  </span>
                </button>
              </div>

              {/* Mode description */}
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                uploadMode === 'full_book' 
                  ? 'bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800' 
                  : uploadMode === 'json'
                  ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800'
              }`}>
                {uploadMode === 'pdf' && (
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <p className="text-orange-700 dark:text-orange-300">
                      Upload a PDF with a single section (Reading, Listening, Writing, or Speaking). 
                      AI will extract the content and questions automatically.
                    </p>
                  </div>
                )}
                {uploadMode === 'full_book' && (
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <p className="text-purple-700 dark:text-purple-300">
                      Upload a complete Cambridge IELTS book or test preparation material. 
                      AI will extract <strong>ALL sections</strong> (Listening, Reading, Writing, Speaking) from <strong>multiple tests</strong> at once!
                    </p>
                  </div>
                )}
                {uploadMode === 'json' && (
                  <div className="flex items-start gap-2">
                    <Code className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-emerald-700 dark:text-emerald-300">
                      Import pre-formatted JSON content from external AI tools or previous exports.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Content Type Selection - Hidden in full_book mode */}
            {uploadMode !== 'full_book' && (
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
            )}

            {/* File Upload Area */}
            {(uploadMode === 'pdf' || uploadMode === 'full_book') ? (
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
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    uploadMode === 'full_book'
                      ? 'border-purple-300 dark:border-purple-700 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                      : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                  } ${selectedFile ? 'bg-slate-50 dark:bg-slate-900' : ''}`}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <div className={`p-4 rounded-full mb-4 ${uploadMode === 'full_book' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                        {uploadMode === 'full_book' ? (
                          <Book className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <FileText className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                      <p className="text-slate-900 dark:text-white font-medium mb-1">{selectedFile.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="mt-3 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={`p-4 rounded-full mx-auto mb-4 inline-block ${
                        uploadMode === 'full_book' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-slate-100 dark:bg-slate-700'
                      }`}>
                        {uploadMode === 'full_book' ? (
                          <Book className="w-10 h-10 text-purple-500 dark:text-purple-400" />
                        ) : (
                          <Upload className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">
                        {uploadMode === 'full_book' 
                          ? 'Drop your Cambridge IELTS book here or click to browse'
                          : 'Click to upload PDF file'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Maximum file size: {uploadMode === 'full_book' ? '50MB' : '10MB'}
                      </p>
                      {uploadMode === 'full_book' && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                          Supports Cambridge IELTS books and similar test preparation materials
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Upload Progress */}
                {isUploading && uploadProgress > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-slate-400">Extracting content...</span>
                      <span className={`font-medium ${uploadMode === 'full_book' ? 'text-purple-600' : 'text-orange-600'}`}>
                        {uploadProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          uploadMode === 'full_book' 
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500' 
                            : 'bg-gradient-to-r from-orange-500 to-amber-500'
                        }`}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    {uploadMode === 'full_book' && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                        Processing full book may take a few minutes...
                      </p>
                    )}
                  </div>
                )}
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
                className={`px-6 py-3 text-white font-medium rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 transition-all ${
                  uploadMode === 'full_book'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{uploadMode === 'full_book' ? 'Extracting Full Book...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{uploadMode === 'full_book' ? 'Extract All Tests' : 'Extract Content'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review - Single Section Mode */}
      {currentStep === 2 && extractedData && uploadMode !== 'full_book' && (
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

      {/* Step 2: Review - Full Book Mode */}
      {currentStep === 2 && fullTestData && uploadMode === 'full_book' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header with Book Info */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Book className="w-7 h-7" />
                  {fullTestData.book_info?.title || 'Cambridge IELTS Book'}
                </h2>
                <p className="text-purple-100 mt-1">
                  {fullTestData.book_info?.extracted_tests || fullTestData.tests?.length || 0} test(s) extracted successfully
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Add as Practice Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddAsPractice(!addAsPractice)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                      addAsPractice
                        ? 'bg-white text-green-600 shadow-lg ring-2 ring-green-400'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                    title={addAsPractice ? 'Practice mode enabled - content will be added as individual practices' : 'Create practice items from saved content'}
                  >
                    <Sparkles className={`w-4 h-4 ${addAsPractice ? 'text-green-500' : ''}`} />
                    <span className="text-sm">{addAsPractice ? 'Practice On' : 'Add as Practice'}</span>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${
                      addAsPractice ? 'bg-green-400' : 'bg-white/30'
                    }`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        addAsPractice ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </button>
                  {addAsPractice && (
                    <select
                      value={practiceDifficulty}
                      onChange={(e) => setPracticeDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT')}
                      className="px-3 py-2 rounded-lg bg-white/20 text-white text-sm font-medium border border-white/30 focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="EASY" className="text-gray-900">Easy</option>
                      <option value="MEDIUM" className="text-gray-900">Medium</option>
                      <option value="HARD" className="text-gray-900">Hard</option>
                      <option value="EXPERT" className="text-gray-900">Expert</option>
                    </select>
                  )}
                </div>
                {/* Add as Book Toggle with Lock */}
                <button
                  onClick={() => setAddAsBook(!addAsBook)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    addAsBook
                      ? 'bg-white text-purple-600 shadow-lg ring-2 ring-amber-400'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={addAsBook ? 'Book mode enabled - all tests will be saved as a book' : 'Create a book with sections after saving'}
                >
                  {addAsBook ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4" />}
                  <span className="text-sm">{addAsBook ? 'Book Locked' : 'Add as Book'}</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${
                    addAsBook ? 'bg-amber-400' : 'bg-white/30'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      addAsBook ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </button>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Practice Mode Banner */}
            {addAsPractice && (
              <div className="mt-4 p-3 bg-green-500/20 border border-green-400/50 rounded-lg flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-green-300" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-100">Practice Mode Enabled</p>
                  <p className="text-xs text-green-200/80">
                    All sections will be saved as individual {practiceDifficulty.toLowerCase()} difficulty practices. 
                    Students can practice each section separately.
                  </p>
                </div>
              </div>
            )}

            {/* Locked Book Mode Banner */}
            {addAsBook && (
              <div className="mt-4 p-3 bg-amber-500/20 border border-amber-400/50 rounded-lg flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-300" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-100">Book Mode Enabled</p>
                  <p className="text-xs text-amber-200/80">All {fullTestData.tests?.length || 0} tests will be saved and organized as a book. You can preview each test below.</p>
                </div>
              </div>
            )}

            {/* Test Selector Tabs */}
            {fullTestData.tests && fullTestData.tests.length > 1 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-200">
                    {addAsBook ? (
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Preview test {selectedTestIndex + 1} of {fullTestData.tests.length} (all will be saved)
                      </span>
                    ) : (
                      <>Showing test {selectedTestIndex + 1} of {fullTestData.tests.length}</>
                    )}
                  </span>
                  {fullTestData.tests.length > 10 && (
                    <span className="text-xs text-purple-300 bg-purple-500/30 px-2 py-1 rounded">
                      Scroll to see all tests →
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-purple-800/30">
                  {fullTestData.tests.map((test, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTestIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm transition shrink-0 ${
                        selectedTestIndex === idx
                          ? 'bg-white text-purple-600 shadow-lg'
                          : 'bg-white/20 hover:bg-white/30'
                      }`}
                    >
                      {test.test_name || `Test ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            {/* Section Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Select sections to save:
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {['listening', 'reading', 'writing', 'speaking'].map((section) => {
                  const sectionData = currentTest?.[section as keyof typeof currentTest];
                  const hasData = sectionData && (
                    (section === 'listening' && (sectionData as any)?.parts?.length > 0) ||
                    (section === 'reading' && (sectionData as any)?.passages?.length > 0) ||
                    (section === 'writing' && (sectionData as any)?.tasks?.length > 0) ||
                    (section === 'speaking' && (sectionData as any)?.topics?.length > 0)
                  );

                  const icons = {
                    listening: <Headphones className="w-5 h-5" />,
                    reading: <BookOpen className="w-5 h-5" />,
                    writing: <Edit className="w-5 h-5" />,
                    speaking: <Mic className="w-5 h-5" />,
                  };

                  return (
                    <button
                      key={section}
                      onClick={() => hasData && toggleSectionSelection(section)}
                      disabled={!hasData}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        !hasData
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 opacity-50 cursor-not-allowed'
                          : selectedSections.has(section)
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        selectedSections.has(section) && hasData
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {icons[section as keyof typeof icons]}
                      </div>
                      <span className={`font-medium capitalize ${
                        selectedSections.has(section) && hasData
                          ? 'text-purple-600'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {section}
                      </span>
                      <span className="text-xs text-slate-500">
                        {!hasData ? 'No data' : 
                          section === 'listening' ? `${(sectionData as any)?.parts?.length || 0} parts` :
                          section === 'reading' ? `${(sectionData as any)?.passages?.length || 0} passages` :
                          section === 'writing' ? `${(sectionData as any)?.tasks?.length || 0} tasks` :
                          `${(sectionData as any)?.topics?.length || 0} topics`
                        }
                      </span>
                      {hasData && (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedSections.has(section)
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-slate-300'
                        }`}>
                          {selectedSections.has(section) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Upload Section for Listening */}
            {selectedSections.has('listening') && currentTest?.listening?.parts && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                  <FileAudio className="w-5 h-5" />
                  Upload Audio Files for Listening Parts
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  {currentTest.listening.parts.map((part: any, idx: number) => (
                    <div key={idx} className="relative">
                      {partAudios[`part-${idx}`] ? (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-green-300 dark:border-green-700">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">Part {idx + 1}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{partAudios[`part-${idx}`].file.name}</p>
                          <button
                            onClick={() => handleAudioRemove(`part-${idx}`)}
                            className="mt-2 text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-700 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition">
                          <Music className="w-6 h-6 text-purple-500 mb-1" />
                          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Part {idx + 1}</span>
                          <span className="text-xs text-slate-500">{part.title || 'Upload audio'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAudioUpload(`part-${idx}`, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Preview Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700 mb-4">
              <div className="flex gap-1">
                {['reading', 'listening', 'writing', 'speaking'].map((tab) => {
                  const tabData = currentTest?.[tab as keyof typeof currentTest];
                  const hasData = tabData && (
                    (tab === 'listening' && (tabData as any)?.parts?.length > 0) ||
                    (tab === 'reading' && (tabData as any)?.passages?.length > 0) ||
                    (tab === 'writing' && (tabData as any)?.tasks?.length > 0) ||
                    (tab === 'speaking' && (tabData as any)?.topics?.length > 0)
                  );

                  if (!hasData) return null;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveReviewTab(tab as any)}
                      className={`px-4 py-2 font-medium text-sm capitalize transition border-b-2 -mb-px ${
                        activeReviewTab === tab
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Preview - Detailed with Questions */}
            <div className="max-h-[70vh] overflow-y-auto space-y-4">
              {/* Reading Passages */}
              {activeReviewTab === 'reading' && currentTest?.reading?.passages && (
                <div className="space-y-4">
                  {currentTest.reading.passages.map((passage: any, pIdx: number) => (
                    <div key={pIdx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {/* Passage Header */}
                      <button
                        onClick={() => toggleExpand('passages', pIdx)}
                        className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold">
                            {passage.passage_number || pIdx + 1}
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{passage.title}</h4>
                            <p className="text-sm text-slate-500">
                              {passage.question_groups?.length || 0} question groups • {passage.question_groups?.reduce((acc: number, g: any) => acc + (g.questions?.length || 0), 0) || 0} questions
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded.passages.has(pIdx) ? 'rotate-90' : ''}`} />
                      </button>

                      {/* Passage Content - Expanded */}
                      {expanded.passages.has(pIdx) && (
                        <div className="p-4 space-y-4">
                          {/* Passage Text Preview */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg max-h-40 overflow-y-auto">
                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                              {(passage.content || passage.text || '').substring(0, 500)}...
                            </p>
                          </div>

                          {/* Question Groups */}
                          {passage.question_groups?.map((group: any, gIdx: number) => (
                            <div key={gIdx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              {/* Group Header */}
                              <div className="p-3 bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                                    {formatQuestionType(group.question_type)}
                                  </span>
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{group.title}</span>
                                  <span className="text-xs text-slate-500">({group.questions?.length || 0} questions)</span>
                                </div>
                                {questionTypeRequiresImage(group.question_type) && (
                                  <div className="flex items-center gap-2">
                                    {groupImages[`test-${selectedTestIndex}-fb-reading-${pIdx}-${gIdx}`] ? (
                                      <span className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Image attached
                                      </span>
                                    ) : (
                                      <label className="text-xs text-amber-600 flex items-center gap-1 cursor-pointer hover:text-amber-700">
                                        <Image className="w-3 h-3" />
                                        <span>Add image</span>
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(`test-${selectedTestIndex}-fb-reading-${pIdx}-${gIdx}`, file);
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Group Description */}
                              {group.description && (
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-400 italic">
                                  {group.description}
                                </div>
                              )}
                              {/* Example if present */}
                              {group.example && (
                                <div className="mx-3 my-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded">Example</span>
                                  </div>
                                  <div className="text-sm space-y-1">
                                    <p className="text-amber-900 dark:text-amber-100"><strong>Q:</strong> {group.example.question}</p>
                                    <p className="text-amber-900 dark:text-amber-100"><strong>A:</strong> {group.example.answer}</p>
                                    {group.example.explanation && (
                                      <p className="text-xs text-amber-700 dark:text-amber-300 italic mt-1">💡 {group.example.explanation}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* Questions List */}
                              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {group.questions?.map((q: any, qIdx: number) => (
                                  <div key={qIdx} className="p-3 flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs flex items-center justify-center font-medium text-slate-600 dark:text-slate-400 shrink-0">
                                      {q.order || qIdx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-slate-800 dark:text-slate-200">{q.text || q.question_text}</p>
                                      {q.choices && (
                                        <div className="mt-2 grid grid-cols-2 gap-1">
                                          {q.choices.map((c: any, cIdx: number) => (
                                            <span key={cIdx} className={`text-xs px-2 py-1 rounded ${c.key === q.correct_answer || q.correct_answer?.includes(c.key) ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                              {c.key}. {c.text}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                        Answer: {q.correct_answer}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Listening Parts */}
              {activeReviewTab === 'listening' && currentTest?.listening?.parts && (
                <div className="space-y-4">
                  {currentTest.listening.parts.map((part: any, pIdx: number) => (
                    <div key={pIdx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {/* Part Header */}
                      <button
                        onClick={() => toggleExpand('parts', pIdx)}
                        className="w-full p-4 bg-purple-50 dark:bg-purple-900/20 flex items-center justify-between hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500 text-white flex items-center justify-center font-bold">
                            {part.part_number || pIdx + 1}
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{part.title}</h4>
                            <p className="text-sm text-slate-500">
                              {part.question_groups?.length || 0} question groups • {part.question_groups?.reduce((acc: number, g: any) => acc + (g.questions?.length || 0), 0) || 0} questions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {partAudios[`part-${pIdx}`] ? (
                            <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                              <CheckCircle className="w-3 h-3" />
                              Audio ready
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                              <AlertTriangle className="w-3 h-3" />
                              No audio
                            </span>
                          )}
                          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded.parts.has(pIdx) ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {/* Part Content - Expanded */}
                      {expanded.parts.has(pIdx) && (
                        <div className="p-4 space-y-4">
                          {/* Transcript Preview */}
                          {part.transcript && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg max-h-32 overflow-y-auto">
                              <p className="text-xs font-medium text-slate-500 mb-1">Transcript:</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                {part.transcript.substring(0, 300)}...
                              </p>
                            </div>
                          )}

                          {/* Question Groups */}
                          {part.question_groups?.map((group: any, gIdx: number) => (
                            <div key={gIdx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              {/* Group Header */}
                              <div className="p-3 bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                                    {formatQuestionType(group.question_type)}
                                  </span>
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{group.title}</span>
                                  <span className="text-xs text-slate-500">({group.questions?.length || 0} questions)</span>
                                </div>
                                {questionTypeRequiresImage(group.question_type) && (
                                  <div className="flex items-center gap-2">
                                    {groupImages[`test-${selectedTestIndex}-fb-listening-${pIdx}-${gIdx}`] ? (
                                      <span className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Image attached
                                      </span>
                                    ) : (
                                      <label className="text-xs text-amber-600 flex items-center gap-1 cursor-pointer hover:text-amber-700">
                                        <Image className="w-3 h-3" />
                                        <span>Add image</span>
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(`test-${selectedTestIndex}-fb-listening-${pIdx}-${gIdx}`, file);
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Group Description */}
                              {group.description && (
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-400 italic">
                                  {group.description}
                                </div>
                              )}
                              {/* Example if present */}
                              {group.example && (
                                <div className="mx-3 my-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded">Example</span>
                                  </div>
                                  <div className="text-sm space-y-1">
                                    <p className="text-amber-900 dark:text-amber-100"><strong>Q:</strong> {group.example.question}</p>
                                    <p className="text-amber-900 dark:text-amber-100"><strong>A:</strong> {group.example.answer}</p>
                                    {group.example.explanation && (
                                      <p className="text-xs text-amber-700 dark:text-amber-300 italic mt-1">💡 {group.example.explanation}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* Questions List */}
                              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {group.questions?.map((q: any, qIdx: number) => (
                                  <div key={qIdx} className="p-3 flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs flex items-center justify-center font-medium text-slate-600 dark:text-slate-400 shrink-0">
                                      {q.order || qIdx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-slate-800 dark:text-slate-200">{q.text || q.question_text}</p>
                                      {q.choices && (
                                        <div className="mt-2 grid grid-cols-2 gap-1">
                                          {q.choices.map((c: any, cIdx: number) => (
                                            <span key={cIdx} className={`text-xs px-2 py-1 rounded ${c.key === q.correct_answer || q.correct_answer?.includes(c.key) ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                              {c.key}. {c.text}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                        Answer: {q.correct_answer}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Writing Tasks */}
              {activeReviewTab === 'writing' && currentTest?.writing?.tasks && (
                <div className="space-y-4">
                  {currentTest.writing.tasks.map((task: any, tIdx: number) => {
                    const taskImageKey = `test-${selectedTestIndex}-task-${tIdx}`;
                    const isTask1 = task.task_type === 'TASK_1' || tIdx === 0;
                    
                    return (
                    <div key={tIdx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {/* Task Header */}
                      <button
                        onClick={() => toggleExpand('tasks', tIdx)}
                        className="w-full p-4 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-between hover:bg-orange-100 dark:hover:bg-orange-900/30 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                            {task.task_type?.replace('TASK_', 'T') || `T${tIdx + 1}`}
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{task.task_type || `Task ${tIdx + 1}`}</h4>
                            <p className="text-sm text-slate-500">
                              Min words: {task.min_words || 150} • {task.has_visual ? 'Has visual' : 'No visual'}
                              {writingTaskImages[taskImageKey] && ' • Image uploaded ✓'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded.tasks.has(tIdx) ? 'rotate-90' : ''}`} />
                      </button>

                      {/* Task Content - Expanded */}
                      {expanded.tasks.has(tIdx) && (
                        <div className="p-4 space-y-3">
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <p className="text-xs font-medium text-slate-500 mb-2">Prompt:</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{task.prompt}</p>
                          </div>
                          {task.visual_description && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                              <p className="text-xs font-medium text-amber-600 mb-1">Visual Description:</p>
                              <p className="text-sm text-amber-700 dark:text-amber-300">{task.visual_description}</p>
                            </div>
                          )}
                          
                          {/* Image Upload Section for Task 1 */}
                          {isTask1 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                                <Image className="w-4 h-4" />
                                Chart/Graph Image (Required for Task 1)
                              </p>
                              
                              {writingTaskImages[taskImageKey] ? (
                                <div className="space-y-3">
                                  {/* Preview */}
                                  <div className="relative inline-block">
                                    <img
                                      src={writingTaskImages[taskImageKey].preview}
                                      alt="Task 1 visual"
                                      className="max-w-full h-auto max-h-64 rounded-lg border border-blue-200 dark:border-blue-700"
                                    />
                                    <button
                                      onClick={() => handleWritingTaskImageRemove(taskImageKey)}
                                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    {writingTaskImages[taskImageKey].file.name}
                                  </p>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                                  <Image className="w-8 h-8 text-blue-400 mb-2" />
                                  <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                                    Upload Chart/Graph Image
                                  </span>
                                  <span className="text-xs text-slate-500 mt-1">
                                    PNG, JPG, or GIF up to 5MB
                                  </span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleWritingTaskImageUpload(taskImageKey, file);
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}

              {/* Speaking Topics */}
              {activeReviewTab === 'speaking' && currentTest?.speaking?.topics && (
                <div className="space-y-4">
                  {/* TTS Controls Header */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                          <Volume2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">Examiner Audio (TTS)</h4>
                          <p className="text-sm text-slate-500">Generate authentic IELTS examiner audio for questions</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Voice Selection */}
                        <select
                          value={ttsVoice}
                          onChange={(e) => setTtsVoice(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                          disabled={isGeneratingTTS}
                        >
                          {ttsVoices.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} {v.recommended ? '★' : ''}
                            </option>
                          ))}
                        </select>
                        {/* Generate Current Test Button */}
                        <button
                          onClick={() => generateTTSBatch(currentTest.speaking.topics)}
                          disabled={isGeneratingTTS}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingTTS ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Generating... {ttsProgress.current}/{ttsProgress.total}</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4" />
                              <span>Generate This Test</span>
                            </>
                          )}
                        </button>
                        {/* Generate All Tests Button - only show if multiple tests */}
                        {fullTestData?.tests && fullTestData.tests.length > 1 && (
                          <button
                            onClick={generateTTSForAllTests}
                            disabled={isGeneratingTTS}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeneratingTTS ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating All...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-4 h-4" />
                                <span>Generate All {fullTestData.tests.length} Tests</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Topic Cards */}
                  {currentTest.speaking.topics.map((topic: any, tIdx: number) => (
                    <div key={tIdx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {/* Topic Header */}
                      <button
                        onClick={() => toggleExpand('topics', tIdx)}
                        className="w-full p-4 bg-green-50 dark:bg-green-900/20 flex items-center justify-between hover:bg-green-100 dark:hover:bg-green-900/30 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-500 text-white flex items-center justify-center font-bold">
                            P{topic.part_number}
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{topic.topic}</h4>
                            <p className="text-sm text-slate-500">
                              Part {topic.part_number} • {topic.part_number === 2 ? `${topic.cue_card?.bullet_points?.length || 0} bullet points` : `${topic.questions?.length || 0} questions`}
                              {/* Show audio status */}
                              {(topic.part_number === 2 ? generatedTTSAudios[`topic-${tIdx}-cuecard`] : 
                                topic.questions?.some((_: any, qIdx: number) => generatedTTSAudios[`topic-${tIdx}-q-${qIdx}`])) && (
                                <span className="ml-2 text-green-600">• Audio ready</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded.topics.has(tIdx) ? 'rotate-90' : ''}`} />
                      </button>

                      {/* Topic Content - Expanded */}
                      {expanded.topics.has(tIdx) && (
                        <div className="p-4 space-y-3">
                          {/* Part 2: Cue Card */}
                          {topic.part_number === 2 && topic.cue_card && (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <p className="font-medium text-green-800 dark:text-green-200 flex-1">{topic.cue_card.main_prompt}</p>
                                {/* TTS Play Button for Cue Card */}
                                {generatedTTSAudios[`topic-${tIdx}-cuecard`] ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAudioPlayback(`topic-${tIdx}-cuecard`, generatedTTSAudios[`topic-${tIdx}-cuecard`]);
                                    }}
                                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
                                      playingAudio === `topic-${tIdx}-cuecard`
                                        ? 'bg-green-600 text-white'
                                        : 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-300'
                                    }`}
                                  >
                                    {playingAudio === `topic-${tIdx}-cuecard` ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                  </button>
                                ) : (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        // Build cue card text for TTS
                                        const cueCardText = `${topic.cue_card.main_prompt}. You should say: ${topic.cue_card.bullet_points?.join(', ')}.`;
                                        const audioUrl = await generateTTSForQuestion(cueCardText, 'PART_2', `topic-${tIdx}-cuecard`);
                                        if (audioUrl) showNotification('Cue card audio generated', 'success');
                                      } catch (err) {
                                        showNotification('Failed to generate audio', 'error');
                                      }
                                    }}
                                    className="shrink-0 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1"
                                  >
                                    <Volume2 className="w-4 h-4" />
                                    Generate
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-green-700 dark:text-green-300 mb-2">You should say:</p>
                              <ul className="space-y-1">
                                {topic.cue_card.bullet_points?.map((bp: string, bpIdx: number) => (
                                  <li key={bpIdx} className="text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                                    <span className="text-green-500">•</span>
                                    {bp}
                                  </li>
                                ))}
                              </ul>
                              {topic.cue_card.follow_up && (
                                <p className="mt-3 text-sm text-green-700 dark:text-green-300 italic">{topic.cue_card.follow_up}</p>
                              )}
                            </div>
                          )}

                          {/* Part 1 & 3: Questions with TTS */}
                          {(topic.part_number === 1 || topic.part_number === 3) && topic.questions && (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {topic.questions.map((q: string, qIdx: number) => {
                                const audioKey = `topic-${tIdx}-q-${qIdx}`;
                                const hasAudio = !!generatedTTSAudios[audioKey];
                                
                                return (
                                  <div key={qIdx} className="py-3 flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-xs flex items-center justify-center font-medium text-green-600 dark:text-green-400 shrink-0">
                                      {qIdx + 1}
                                    </span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{q}</p>
                                    {/* TTS Button */}
                                    {hasAudio ? (
                                      <button
                                        onClick={() => toggleAudioPlayback(audioKey, generatedTTSAudios[audioKey])}
                                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition ${
                                          playingAudio === audioKey
                                            ? 'bg-green-600 text-white'
                                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'
                                        }`}
                                      >
                                        {playingAudio === audioKey ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          try {
                                            const audioUrl = await generateTTSForQuestion(q, `PART_${topic.part_number}`, audioKey);
                                            if (audioUrl) showNotification('Audio generated', 'success');
                                          } catch (err) {
                                            showNotification('Failed to generate audio', 'error');
                                          }
                                        }}
                                        className="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-green-600 transition"
                                        title="Generate audio"
                                      >
                                        <Volume2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500">
                {selectedSections.size} section(s) selected for saving
                {fullTestData?.tests && fullTestData.tests.length > 1 && (
                  <span className="ml-2 text-purple-600">• {fullTestData.tests.length} tests available</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Save All Tests as Book Button - show when book mode is locked */}
                {addAsBook && fullTestData?.tests && fullTestData.tests.length > 0 && (
                  <button
                    onClick={saveAllTests}
                    disabled={isSaving || selectedSections.size === 0}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg ring-2 ring-amber-400/50"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving {saveProgress.current}/{saveProgress.total}...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        <span>Save All {fullTestData.tests.length} Tests as Book</span>
                      </>
                    )}
                  </button>
                )}
                {/* Save All Tests Button - show when multiple tests exist but not in book mode */}
                {!addAsBook && fullTestData?.tests && fullTestData.tests.length > 1 && (
                  <button
                    onClick={saveAllTests}
                    disabled={isSaving || selectedSections.size === 0}
                    className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving && saveProgress.total > 1 ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving {saveProgress.current}/{saveProgress.total}...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-5 h-5" />
                        <span>Save All {fullTestData.tests.length} Tests</span>
                      </>
                    )}
                  </button>
                )}
                {/* Save Current Test Button - hide when book mode is locked */}
                {!addAsBook && (
                  <button
                    onClick={handleSaveContent}
                    disabled={isSaving || selectedSections.size === 0}
                    className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving && saveProgress.total <= 1 ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving {saveProgress.section}...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-5 h-5" />
                        <span>{fullTestData?.tests && fullTestData.tests.length > 1 ? 'Save Current Test' : 'Save Selected Sections'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              createdBookId ? 'bg-indigo-100 dark:bg-indigo-900/20' : 
              uploadMode === 'full_book' ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-green-100 dark:bg-green-900/20'
            }`}>
              <CheckCircle className={`w-12 h-12 ${
                createdBookId ? 'text-indigo-600' :
                uploadMode === 'full_book' ? 'text-purple-600' : 'text-green-600'
              }`} />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {createdBookId 
                ? 'Book Created Successfully!'
                : uploadMode === 'full_book' ? 'Full Test Saved Successfully!' : 'Content Saved Successfully!'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {createdBookId
                ? `Your book "${bookDetails.title}" has been created with all sections linked.`
                : uploadMode === 'full_book' 
                ? 'All selected sections from the IELTS test have been saved to the database.'
                : 'Your IELTS test content has been extracted and saved to the database.'
              }
            </p>

            {/* Show saved sections for full book mode */}
            {uploadMode === 'full_book' && Array.isArray(savedItems) && savedItems.length > 0 && (
              <div className="flex justify-center gap-2 mb-6 flex-wrap">
                {savedItems.map((section, idx) => (
                  <span 
                    key={idx}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium capitalize"
                  >
                    {section}
                  </span>
                ))}
              </div>
            )}

            {/* Show book info if created */}
            {createdBookId && (
              <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl inline-block">
                <div className="flex items-center gap-3">
                  <Book className="w-8 h-8 text-indigo-600" />
                  <div className="text-left">
                    <p className="font-semibold text-indigo-900 dark:text-indigo-100">{bookDetails.title}</p>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">
                      {savedContentIds.listening.length + savedContentIds.reading.length} sections
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleReset}
                className={`px-6 py-3 text-white font-medium rounded-lg flex items-center gap-2 ${
                  createdBookId ? 'bg-indigo-600 hover:bg-indigo-700' :
                  uploadMode === 'full_book' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                <RotateCcw className="w-5 h-5" />
                {uploadMode === 'full_book' ? 'Upload Another Book' : 'Generate More Content'}
              </button>
              {createdBookId && (
                <button
                  onClick={() => {
                    window.location.href = `/manager/books/${createdBookId}`;
                  }}
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Book className="w-5 h-5" />
                  View Book
                </button>
              )}
              <button
                onClick={() => {
                  window.location.href = '/manager';
                }}
                className="px-6 py-3 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700 flex items-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Create Book */}
      {currentStep === 4 && addAsBook && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Book className="w-7 h-7" />
                  Create Book
                </h2>
                <p className="text-indigo-100 mt-1">
                  Configure your book with the saved content sections
                </p>
              </div>
              <button
                onClick={() => {
                  setCurrentStep(3);
                  setAddAsBook(false);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition"
                title="Skip book creation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Book Details Form */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Book Title *
                </label>
                <input
                  type="text"
                  value={bookDetails.title}
                  onChange={(e) => setBookDetails(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Cambridge IELTS 18 - Test 1"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={bookDetails.description}
                  onChange={(e) => setBookDetails(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this book..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  CEFR Level
                </label>
                <select
                  value={bookDetails.level}
                  onChange={(e) => setBookDetails(prev => ({ ...prev, level: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="B1">B1 - Intermediate</option>
                  <option value="B2">B2 - Upper Intermediate</option>
                  <option value="C1">C1 - Advanced</option>
                  <option value="C2">C2 - Proficient</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Publisher
                </label>
                <input
                  type="text"
                  value={bookDetails.publisher}
                  onChange={(e) => setBookDetails(prev => ({ ...prev, publisher: e.target.value }))}
                  placeholder="e.g., Cambridge University Press"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  value={bookDetails.author}
                  onChange={(e) => setBookDetails(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Optional author name"
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Locked Sections Info Banner */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900 dark:text-amber-100">Progressive Unlock System</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Only <strong>Section 1</strong> will be unlocked for learners. Other sections will unlock automatically as users complete previous sections.
                  </p>
                </div>
              </div>
            </div>

            {/* Sections Preview */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Sections to be added ({savedContentIds.listening.length + savedContentIds.reading.length})
              </h3>
              
              {/* Combined Sections List with Order */}
              <div className="space-y-2 mb-4">
                {(() => {
                  const listeningParts = currentTest?.listening?.parts || [];
                  const readingPassages = currentTest?.reading?.passages || [];
                  let order = 0;
                  const allSections: Array<{type: 'listening' | 'reading', idx: number, title: string, order: number}> = [];
                  
                  savedContentIds.listening.forEach((id, idx) => {
                    order++;
                    const partData = listeningParts[idx];
                    allSections.push({
                      type: 'listening',
                      idx,
                      title: partData?.title || `Listening Part ${idx + 1}`,
                      order
                    });
                  });
                  
                  savedContentIds.reading.forEach((id, idx) => {
                    order++;
                    const passageData = readingPassages[idx];
                    allSections.push({
                      type: 'reading',
                      idx,
                      title: passageData?.title || `Reading Passage ${idx + 1}`,
                      order
                    });
                  });
                  
                  return allSections.map((section) => (
                    <div 
                      key={`${section.type}-${section.idx}`} 
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        section.order === 1
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        section.order === 1
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                      }`}>
                        {section.order}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {section.type === 'listening' ? (
                            <Headphones className="w-4 h-4 text-purple-600" />
                          ) : (
                            <BookOpen className="w-4 h-4 text-blue-600" />
                          )}
                          <span className="font-medium text-slate-900 dark:text-white text-sm">
                            {section.title}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {section.type === 'listening' ? 'Listening' : 'Reading'}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        section.order === 1
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      }`}>
                        {section.order === 1 ? (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>Unlocked</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {savedContentIds.listening.length === 0 && savedContentIds.reading.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No sections available for book creation.</p>
                  <p className="text-sm">Only Listening and Reading sections can be added to books.</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setCurrentStep(3);
                  setAddAsBook(false);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Skip Book Creation
              </button>
              <button
                onClick={createBookWithSections}
                disabled={isCreatingBook || !bookDetails.title.trim() || (savedContentIds.listening.length + savedContentIds.reading.length) === 0}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingBook ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Book...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Create Book</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIContentGenerator;
