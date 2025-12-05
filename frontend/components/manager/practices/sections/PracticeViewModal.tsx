'use client';

import { X, Clock, Calendar, BookOpen, Target, User } from 'lucide-react';

interface PracticeViewModalProps {
  practice: any;
  sectionType: 'listening' | 'reading' | 'writing' | 'speaking';
  onClose: () => void;
  onEdit: () => void;
}

const DIFFICULTY_COLORS = {
  EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  HARD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  EXPERT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const DIFFICULTY_LABELS = {
  EASY: 'Easy (Band 4-5)',
  MEDIUM: 'Medium (Band 5.5-6.5)',
  HARD: 'Hard (Band 7-8)',
  EXPERT: 'Expert (Band 8.5-9)',
};

export function PracticeViewModal({
  practice,
  sectionType,
  onClose,
  onEdit,
}: PracticeViewModalProps) {
  const getContentDetails = () => {
    const content = practice.content;
    if (!content) return null;

    switch (sectionType) {
      case 'listening':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <BookOpen className="w-4 h-4" />
              <span>Part {content.part_number}</span>
            </div>
            {content.questions_count && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Target className="w-4 h-4" />
                <span>{content.questions_count} questions</span>
              </div>
            )}
          </div>
        );
      case 'reading':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <BookOpen className="w-4 h-4" />
              <span>Passage {content.passage_number}</span>
            </div>
            {content.questions_count && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Target className="w-4 h-4" />
                <span>{content.questions_count} questions</span>
              </div>
            )}
          </div>
        );
      case 'writing':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <BookOpen className="w-4 h-4" />
              <span>Task {content.task_type}</span>
            </div>
            {content.chart_type && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Target className="w-4 h-4" />
                <span className="capitalize">{content.chart_type.replace('_', ' ')}</span>
              </div>
            )}
          </div>
        );
      case 'speaking':
        return (
          <div className="space-y-3">
            {content.part && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <BookOpen className="w-4 h-4" />
                <span>Part {content.part}</span>
              </div>
            )}
            {content.topic_type && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Target className="w-4 h-4" />
                <span className="capitalize">{content.topic_type}</span>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Practice Details
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              practice.is_active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {practice.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              practice.is_free
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            }`}>
              {practice.is_free ? 'Free' : 'Premium'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title and Description */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {practice.title}
            </h3>
            {practice.description && (
              <p className="text-gray-600 dark:text-gray-400">{practice.description}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Difficulty</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                DIFFICULTY_COLORS[practice.difficulty as keyof typeof DIFFICULTY_COLORS]
              }`}>
                {DIFFICULTY_LABELS[practice.difficulty as keyof typeof DIFFICULTY_LABELS]}
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</p>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {practice.duration_minutes || 'Auto'} min
                </span>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Attempts</p>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {practice.total_attempts || 0}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg. Score</p>
              <span className="font-semibold text-gray-900 dark:text-white">
                {practice.average_score ? practice.average_score.toFixed(1) : '-'}
              </span>
            </div>
          </div>

          {/* Content Details */}
          {practice.content && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Linked Content
              </h4>
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  {practice.content.title}
                </p>
                {getContentDetails()}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Created: {new Date(practice.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Updated: {new Date(practice.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Practice
          </button>
        </div>
      </div>
    </div>
  );
}
