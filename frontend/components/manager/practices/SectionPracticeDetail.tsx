'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  Edit2,
  BookOpen,
  Headphones,
  Edit3,
  Mic,
  Clock,
  Gift,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  BarChart3,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';
import type { SectionPracticeDetail as SectionPracticeDetailType } from '@/types/manager/section-practices';
import { cn } from '@/lib/manager/utils';

interface SectionPracticeDetailProps {
  practiceId: number;
  onClose: () => void;
  onEdit: () => void;
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  reading: BookOpen,
  listening: Headphones,
  writing: Edit3,
  speaking: Mic,
};

const SECTION_COLORS: Record<string, string> = {
  reading: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  listening: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  writing: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  speaking: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  HARD: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  EXPERT: 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
};

export function SectionPracticeDetail({
  practiceId,
  onClose,
  onEdit,
}: SectionPracticeDetailProps) {
  const [loading, setLoading] = useState(true);
  const [practice, setPractice] = useState<SectionPracticeDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPractice();
  }, [practiceId]);

  const fetchPractice = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await managerAPI.getSectionPractice(practiceId);
      setPractice(data);
    } catch (error: any) {
      console.error('Error fetching practice:', error);
      setError(error.message || 'Failed to load practice details');
    } finally {
      setLoading(false);
    }
  };

  const SectionIcon = ({ section }: { section: string }) => {
    const Icon = SECTION_ICONS[section.toLowerCase()] || BookOpen;
    return <Icon className="w-5 h-5" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getContentPreview = () => {
    if (!practice) return null;

    if (practice.reading_passage) {
      const { reading_passage } = practice;
      return (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Reading Passage</h4>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
              {reading_passage.passage_text}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            {reading_passage.test_heads?.length || 0} question groups
          </p>
        </div>
      );
    }

    if (practice.listening_part) {
      const { listening_part } = practice;
      return (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Listening Part</h4>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Part {listening_part.part_number}
            </p>
            {listening_part.audio_url && (
              <audio controls className="mt-2 w-full">
                <source src={listening_part.audio_url} />
              </audio>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {listening_part.test_heads?.length || 0} question groups
          </p>
        </div>
      );
    }

    if (practice.writing_task) {
      const { writing_task } = practice;
      return (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Writing Task</h4>
          <div className="flex gap-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
              {writing_task.task_type?.replace('_', ' ')}
            </span>
            {writing_task.chart_type && (
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">
                {writing_task.chart_type.replace('_', ' ')}
              </span>
            )}
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
              {writing_task.task_text}
            </p>
          </div>
          {writing_task.image_url && (
            <img
              src={writing_task.image_url}
              alt="Task image"
              className="w-full max-h-48 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
            />
          )}
        </div>
      );
    }

    if (practice.speaking_topic) {
      const { speaking_topic } = practice;
      return (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Speaking Topic</h4>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
              {speaking_topic.topic_type?.replace('_', ' ')}
            </span>
          </div>
          <div className="space-y-2">
            {speaking_topic.questions?.map((q, i) => (
              <div
                key={q.id}
                className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm"
              >
                <span className="text-gray-500">{i + 1}.</span>{' '}
                <span className="text-gray-700 dark:text-gray-300">{q.question_text}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <p className="text-gray-500">No content associated</p>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Practice Details
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-130px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : practice ? (
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      'p-2 rounded-lg',
                      SECTION_COLORS[practice.section_type.toLowerCase()]
                    )}>
                      <SectionIcon section={practice.section_type} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {practice.title}
                      </h3>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                        SECTION_COLORS[practice.section_type.toLowerCase()]
                      )}>
                        {practice.section_type}
                      </span>
                    </div>
                  </div>
                  {practice.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      {practice.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {practice.is_free && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                      <Gift className="w-4 h-4" />
                      Free
                    </span>
                  )}
                  {practice.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
                      <XCircle className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-xs">Difficulty</span>
                  </div>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium',
                    DIFFICULTY_COLORS[practice.difficulty]
                  )}>
                    {practice.difficulty}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Duration</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {practice.duration_minutes} min
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Attempts</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {practice.attempts_count}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Created</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(practice.created_at)}
                  </p>
                </div>
              </div>

              {/* Content Preview */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
                  Content Preview
                </h4>
                {getContentPreview()}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
