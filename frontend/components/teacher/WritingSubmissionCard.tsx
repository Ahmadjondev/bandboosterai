'use client';

import { FileText, CheckCircle, XCircle } from 'lucide-react';

interface WritingTask {
  id: number;
  task_type: string;
  task_type_display: string;
  prompt: string;
  picture: string | null;
  data: any;
  min_words: number;
}

interface WritingAttempt {
  id: number;
  uuid: string;
  task: WritingTask;
  answer_text: string;
  word_count: number;
  score: number | null;
  feedback: any;
  created_at: string;
  updated_at: string;
}

interface WritingSubmissionCardProps {
  writingAttempt: WritingAttempt;
  onScoreUpdate?: (attemptId: number, score: number) => void;
}

export default function WritingSubmissionCard({
  writingAttempt,
  onScoreUpdate,
}: WritingSubmissionCardProps) {
  const { task, answer_text, word_count, score, feedback } = writingAttempt;
  const meetsMinWords = word_count >= task.min_words;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {task.task_type_display}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {word_count} words
              </span>
              {meetsMinWords ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-xs ${
                  meetsMinWords
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {meetsMinWords
                  ? `Meets requirement (${task.min_words}+ words)`
                  : `Below requirement (${task.min_words} words needed)`}
              </span>
            </div>
          </div>
        </div>
        {score !== null && (
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Score</p>
            <p className="text-3xl font-bold text-blue-600">{score.toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* Task Prompt */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Task Prompt
        </h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {task.prompt}
          </p>
          {task.picture && (
            <img
              src={task.picture}
              alt="Task visual"
              className="mt-3 max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
            />
          )}
        </div>
      </div>

      {/* Student's Answer */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Student's Answer
        </h4>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
            {answer_text}
          </p>
        </div>
      </div>

      {/* Feedback Section */}
      {feedback && Object.keys(feedback).length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Evaluation Feedback
          </h4>
          <div className="space-y-3">
            {feedback.task_response_or_achievement && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Task Achievement / Response
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {feedback.task_response_or_achievement}
                </p>
              </div>
            )}
            {feedback.coherence_and_cohesion && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Coherence and Cohesion
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {feedback.coherence_and_cohesion}
                </p>
              </div>
            )}
            {feedback.lexical_resource && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Lexical Resource
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {feedback.lexical_resource}
                </p>
              </div>
            )}
            {feedback.grammatical_range_and_accuracy && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Grammatical Range and Accuracy
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {feedback.grammatical_range_and_accuracy}
                </p>
              </div>
            )}
            {feedback.overall && Array.isArray(feedback.overall) && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Overall Comments
                </p>
                <ul className="space-y-1">
                  {feedback.overall.map((comment: string, index: number) => (
                    comment && (
                      <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                        • {comment}
                      </li>
                    )
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
