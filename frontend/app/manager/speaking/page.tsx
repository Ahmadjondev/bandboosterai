'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mic,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Check,
  Calendar,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  ListPlus,
  Minus,
  Volume2,
  Play,
  Pause,
  VolumeX,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { managerAPI } from '@/lib/manager/api-client';
import {
  formatDate,
  truncateText,
  debounce,
} from '@/lib/manager/utils';
import {
  LoadingSpinner,
  EmptyState,
  Modal,
  Pagination,
  useToast,
  createToastHelpers,
} from '@/components/manager/shared';
import type { SpeakingTopic, SpeakingQuestion, PaginatedResponse } from '@/types/manager';

interface QuestionForm {
  question_text: string;
  cue_card_points?: string[] | null;
  audio_url?: string | null;
}

interface SpeakingTopicForm {
  speaking_type: 'PART_1' | 'PART_2' | 'PART_3';
  topic: string;
  questions: QuestionForm[];
}

export default function SpeakingTopicsPage() {
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'PART_1' | 'PART_2' | 'PART_3'>('all');
  const [filterAudio, setFilterAudio] = useState<'all' | 'yes' | 'no'>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<SpeakingTopic | null>(null);

  // Form states
  const [formData, setFormData] = useState<SpeakingTopicForm>({
    speaking_type: 'PART_1',
    topic: '',
    questions: [{ question_text: '', cue_card_points: null, audio_url: null }],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // TTS (Text-to-Speech) states
  const [ttsVoice, setTtsVoice] = useState<string>('female_primary');
  const [ttsVoices, setTtsVoices] = useState<Array<{ id: string; name: string; gender: string; recommended: boolean }>>([]);
  const [generatingTTSForTopic, setGeneratingTTSForTopic] = useState<number | null>(null);
  const [playingAudioForTopic, setPlayingAudioForTopic] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);

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

  // Generate TTS for a topic
  const generateTTSForTopic = async (topic: SpeakingTopic) => {
    setGeneratingTTSForTopic(topic.id);
    try {
      const result = await managerAPI.generateTTSForTopic(topic.id, ttsVoice);
      if (result.success && result.audio_url) {
        // Update the topic in the list with the new audio URL
        setTopics(prev => prev.map(t => 
          t.id === topic.id ? { ...t, audio_url: result.audio_url } : t
        ));
        toast.success('Audio generated successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate audio');
    } finally {
      setGeneratingTTSForTopic(null);
    }
  };

  // Toggle audio playback
  const toggleAudioPlayback = (topicId: number, audioUrl: string) => {
    if (playingAudioForTopic === topicId && audioRef.current) {
      audioRef.current.pause();
      setPlayingAudioForTopic(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlayingAudioForTopic(null);
      audioRef.current.onerror = () => {
        toast.error('Failed to play audio');
        setPlayingAudioForTopic(null);
      };
      audioRef.current.play();
      setPlayingAudioForTopic(topicId);
    }
  };

  // Stop all audio playback when unmounting
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    loadTopics(1);
  }, []);

  const loadTopics = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (filterType !== 'all') {
        params.speaking_type = filterType;
      }

      if (filterAudio !== 'all') {
        params.has_audio = filterAudio;
      }

      const data: any = await managerAPI.getSpeakingTopics(params);
      
      // Handle Django response format: {topics: [...], pagination: {...}}
      setTopics(data.topics || []);
      setPagination(data.pagination || {
        current_page: page,
        total_pages: 1,
        next: null,
        previous: null,
      });
    } catch (err: any) {
      if (err.message === 'Authentication required' || err.message === 'Redirecting to login') {
        return;
      }
      setError(err.message || 'Failed to load speaking topics');
      toast.error(err.message || 'Failed to load speaking topics');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(() => {
      loadTopics(1);
    }, 500),
    [searchQuery, filterType, filterAudio]
  );

  useEffect(() => {
    if (searchQuery !== undefined) {
      debouncedSearch();
    }
  }, [searchQuery]);

  useEffect(() => {
    loadTopics(1);
  }, [filterType, filterAudio]);
  // }, [filterType]);

  // Modal management
  const openCreateModal = () => {
    setIsEditMode(false);
    setCurrentTopic(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (topic: SpeakingTopic) => {
    setIsEditMode(true);
    setCurrentTopic(topic);
    
    // Map questions from topic to form data
    const questions: QuestionForm[] = topic.questions?.length > 0
      ? topic.questions.map(q => ({
          question_text: q.question_text,
          cue_card_points: q.cue_card_points,
          audio_url: q.audio_url,
        }))
      : [{ question_text: '', cue_card_points: null, audio_url: null }];
    
    setFormData({
      speaking_type: topic.speaking_type,
      topic: topic.topic,
      questions,
    });

    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      speaking_type: 'PART_1',
      topic: '',
      questions: [{ question_text: '', cue_card_points: null, audio_url: null }],
    });
    setFormErrors({});
  };

  // Question management
  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { question_text: '', cue_card_points: null, audio_url: null }],
    });
  };

  const removeQuestion = (index: number) => {
    if (formData.questions.length > 1) {
      setFormData({
        ...formData,
        questions: formData.questions.filter((_, i) => i !== index),
      });
    }
  };

  const updateQuestion = (index: number, field: keyof QuestionForm, value: any) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  // Cue card management for Part 2
  const addCueCardPoint = (questionIndex: number) => {
    const newQuestions = [...formData.questions];
    const currentPoints = newQuestions[questionIndex].cue_card_points || [];
    newQuestions[questionIndex].cue_card_points = [...currentPoints, ''];
    setFormData({ ...formData, questions: newQuestions });
  };

  const removeCueCardPoint = (questionIndex: number, pointIndex: number) => {
    const newQuestions = [...formData.questions];
    const currentPoints = newQuestions[questionIndex].cue_card_points || [];
    if (currentPoints.length > 1) {
      newQuestions[questionIndex].cue_card_points = currentPoints.filter((_, i) => i !== pointIndex);
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  const updateCueCardPoint = (questionIndex: number, pointIndex: number, value: string) => {
    const newQuestions = [...formData.questions];
    const currentPoints = [...(newQuestions[questionIndex].cue_card_points || [])];
    currentPoints[pointIndex] = value;
    newQuestions[questionIndex].cue_card_points = currentPoints;
    setFormData({ ...formData, questions: newQuestions });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.speaking_type) {
      errors.speaking_type = 'Speaking type is required';
    }

    if (!formData.topic || formData.topic.trim() === '') {
      errors.topic = 'Topic is required';
    }

    // Check if at least one question has text
    const hasQuestion = formData.questions.some(q => q.question_text.trim() !== '');
    if (!hasQuestion) {
      errors.questions = 'At least one question is required';
    }

    // For Part 2, check if the first question has cue card points
    if (formData.speaking_type === 'PART_2') {
      const firstQuestion = formData.questions[0];
      const filledPoints = (firstQuestion.cue_card_points || []).filter((p) => p.trim() !== '');
      if (filledPoints.length === 0) {
        errors.cue_card = 'At least one cue card point is required for Part 2';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveTopic = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Clean up questions data
      const cleanedQuestions = formData.questions
        .filter(q => q.question_text.trim() !== '')
        .map((q, index) => ({
          question_text: q.question_text.trim(),
          cue_card_points: formData.speaking_type === 'PART_2' && index === 0
            ? (q.cue_card_points || []).filter((p) => p.trim() !== '')
            : null,
          audio_url: q.audio_url,
          order: index + 1,
        }));

      const data = {
        speaking_type: formData.speaking_type,
        topic: formData.topic.trim(),
        questions: cleanedQuestions,
      };

      if (isEditMode && currentTopic) {
        await managerAPI.updateSpeakingTopic(currentTopic.id, data);
        toast.success('Topic updated successfully');
      } else {
        await managerAPI.createSpeakingTopic(data);
        toast.success('Topic created successfully');
      }

      closeModal();
      loadTopics(pagination?.current_page || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (topicId: number) => {
    setDeleteConfirmId(topicId);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const deleteTopic = async (topicId: number) => {
    try {
      await managerAPI.deleteSpeakingTopic(topicId);
      toast.success('Topic deleted successfully');
      cancelDelete();
      loadTopics(pagination?.current_page || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete topic');
    }
  };

  const speakingTypeDisplay = {
    PART_1: 'Part 1: Introduction & Interview',
    PART_2: 'Part 2: Individual Long Turn',
    PART_3: 'Part 3: Two-way Discussion',
  };

  if (loading && !topics.length) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-linear-to-r from-primary to-primary/80 dark:from-primary/90 dark:to-primary/70 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 dark:bg-white/10 backdrop-blur-sm p-3 rounded-lg">
              <Mic className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Speaking Topics</h1>
              <p className="mt-1 text-white/80 dark:text-white/70">Manage IELTS speaking topics for all three parts</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Default Audios Link */}
            <Link
              href="/manager/speaking/default-audios"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white hover:bg-white/20 rounded-lg font-medium transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Default Audios
            </Link>
            {/* TTS Voice Selector */}
            <div className="flex items-center gap-2 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2">
              <Volume2 className="h-4 w-4" />
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer"
              >
                {ttsVoices.map((v) => (
                  <option key={v.id} value={v.id} className="text-gray-900">
                    {v.name} {v.recommended ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-primary dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              Add Speaking Topic
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Search */}
          <div>
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Search className="h-4 w-4 mr-2 text-primary dark:text-primary-400" />
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in topics and questions..."
                className="block w-full pl-11 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Filter by Type */}
          <div>
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="h-4 w-4 mr-2 text-primary dark:text-primary-400" />
              Filter by Part
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="block w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              <option value="all">🎤 All Parts</option>
              <option value="PART_1">👋 Part 1 (Introduction)</option>
              <option value="PART_2">📝 Part 2 (Long Turn)</option>
              <option value="PART_3">💬 Part 3 (Discussion)</option>
            </select>
          </div>

          {/* Filter by Audio Status */}
          <div>
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Volume2 className="h-4 w-4 mr-2 text-primary dark:text-primary-400" />
              Audio Status
            </label>
            <select
              value={filterAudio}
              onChange={(e) => setFilterAudio(e.target.value as any)}
              className="block w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            >
              <option value="all">🔊 All Topics</option>
              <option value="yes">✅ With Audio</option>
              <option value="no">❌ Without Audio</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-start">
            <div className="shrink-0">
              <div className="bg-red-100 dark:bg-red-900/40 rounded-full p-2">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-base font-semibold text-red-900 dark:text-red-200">Oops! Something went wrong</h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => loadTopics()}
                className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && topics.length === 0 && (
        <EmptyState
          icon="Mic"
          title="No speaking topics found"
          description="Get started by creating your first speaking topic for IELTS practice."
          actionText="Add Speaking Topic"
          onAction={openCreateModal}
        />
      )}

      {/* Topics Grid */}
      {topics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary"
            >
              {/* Header with gradient */}
              <div
                className={`relative h-32 flex items-center justify-center overflow-hidden ${
                  topic.speaking_type === 'PART_1'
                    ? 'bg-linear-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700'
                    : topic.speaking_type === 'PART_2'
                    ? 'bg-linear-to-br from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-700'
                    : 'bg-linear-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700'
                }`}
              >
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <Mic className="h-16 w-16 text-white/30" />
                {/* Audio indicator badge */}
                {topic.has_audio && (
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 rounded-full p-2 shadow-lg">
                    <Volume2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                )}
                {/* Question count badge */}
                <div className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 rounded-full px-2 py-1 shadow-lg">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {topic.question_count || 0} Q
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
                      topic.speaking_type === 'PART_1'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : topic.speaking_type === 'PART_2'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    {topic.speaking_type}
                  </span>
                  {/* TTS Audio Controls - play first question's audio if available */}
                  {topic.has_audio && topic.questions?.[0]?.audio_url ? (
                    <button
                      onClick={() => toggleAudioPlayback(topic.id, topic.questions[0].audio_url!)}
                      className={`p-2 rounded-full transition-all ${
                        playingAudioForTopic === topic.id
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'
                      }`}
                      title={playingAudioForTopic === topic.id ? 'Pause audio' : 'Play audio'}
                    >
                      {playingAudioForTopic === topic.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => generateTTSForTopic(topic)}
                      disabled={generatingTTSForTopic === topic.id}
                      className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-green-400 transition-all disabled:opacity-50"
                      title="Generate examiner audio"
                    >
                      {generatingTTSForTopic === topic.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 min-h-12">
                  {topic.topic}
                </h3>

                {/* Show first question preview */}
                {topic.questions && topic.questions.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed line-clamp-2">
                    {truncateText(topic.questions[0].question_text, 100)}
                  </p>
                )}

                {/* Show cue card points for Part 2 */}
                {topic.speaking_type === 'PART_2' && 
                  topic.questions?.[0]?.cue_card_points && 
                  topic.questions[0].cue_card_points.length > 0 && (
                  <div className="mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Cue Card Points:</p>
                    <ul className="space-y-1">
                      {topic.questions[0].cue_card_points.slice(0, 3).map((point, index) => (
                        <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                          <span className="mr-2">•</span>
                          <span className="line-clamp-1">{point}</span>
                        </li>
                      ))}
                      {topic.questions[0].cue_card_points.length > 3 && (
                        <li className="text-xs text-gray-500 dark:text-gray-400 italic">
                          +{topic.questions[0].cue_card_points.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <Calendar className="h-3 w-3 mr-2" />
                  {formatDate(topic.created_at)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(topic)}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-orange-200 dark:border-orange-800 rounded-xl text-sm font-semibold bg-orange-50 dark:bg-orange-900/20 text-primary dark:text-primary-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  {deleteConfirmId === topic.id ? (
                    <button
                      onClick={() => deleteTopic(topic.id)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-300 dark:border-red-800 rounded-xl text-sm font-semibold text-white bg-linear-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 hover:shadow-xl transition-all"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => confirmDelete(topic.id)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2.5 border-2 border-red-200 dark:border-red-800 rounded-xl text-sm font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
                {deleteConfirmId === topic.id && (
                  <button
                    onClick={cancelDelete}
                    className="w-full mt-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <Pagination
          currentPage={pagination.current_page}
          totalPages={pagination.total_pages}
          hasNext={!!pagination.next}
          hasPrevious={!!pagination.previous}
          onPageChange={(page) => loadTopics(page)}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        show={showModal}
        onClose={closeModal}
        title={isEditMode ? 'Edit Speaking Topic' : 'Add New Speaking Topic'}
        size="large"
        footer={
          <>
            <button
              onClick={closeModal}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm ring-2 ring-inset ring-gray-200 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={saveTopic}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{saving ? 'Saving...' : isEditMode ? 'Update Topic' : 'Create Topic'}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Speaking Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Speaking Part <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['PART_1', 'PART_2', 'PART_3'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    // Initialize with cue card points for Part 2
                    const newQuestions = type === 'PART_2' 
                      ? formData.questions.map((q, i) => ({
                          ...q,
                          cue_card_points: i === 0 ? (q.cue_card_points || ['', '', '', '']) : null,
                        }))
                      : formData.questions.map(q => ({ ...q, cue_card_points: null }));
                    setFormData({ ...formData, speaking_type: type, questions: newQuestions });
                  }}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.speaking_type === type
                      ? 'border-primary bg-orange-50 dark:bg-orange-900/20 text-primary dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-xs font-semibold">{type.replace('_', ' ')}</div>
                </button>
              ))}
            </div>
            {formErrors.speaking_type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.speaking_type}</p>
            )}
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Enter topic title..."
            />
            {formErrors.topic && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.topic}</p>}
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Questions <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1 text-xs text-primary dark:text-primary-400 hover:text-primary/80 dark:hover:text-primary-300"
              >
                <ListPlus className="h-4 w-4" />
                Add Question
              </button>
            </div>
            {formErrors.questions && (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400">{formErrors.questions}</p>
            )}
            
            <div className="space-y-4">
              {formData.questions.map((question, qIndex) => (
                <div key={qIndex} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Question {qIndex + 1}
                    </span>
                    {formData.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="Enter the question..."
                  />

                  {/* Cue Card Points (Part 2, first question only) */}
                  {formData.speaking_type === 'PART_2' && qIndex === 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Cue Card Points <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => addCueCardPoint(qIndex)}
                          className="inline-flex items-center gap-1 text-xs text-primary dark:text-primary-400"
                        >
                          <Plus className="h-3 w-3" />
                          Add Point
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(question.cue_card_points || []).map((point, pIndex) => (
                          <div key={pIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={point}
                              onChange={(e) => updateCueCardPoint(qIndex, pIndex, e.target.value)}
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder={`Point ${pIndex + 1}...`}
                            />
                            {(question.cue_card_points?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCueCardPoint(qIndex, pIndex)}
                                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {formErrors.cue_card && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formErrors.cue_card}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
