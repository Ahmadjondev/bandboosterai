'use client';

import React, { useState } from 'react';
import { AnswerGroup } from '@/types/results';

interface AnswerReviewModalProps {
  answerGroups: AnswerGroup[];
  sectionTitle: string;
  onClose: () => void;
}

export function AnswerReviewModal({ answerGroups, sectionTitle, onClose }: AnswerReviewModalProps) {
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);

  const selectedGroup = answerGroups[selectedGroupIndex];

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-cyan-600 p-6 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{sectionTitle} - Answer Review</h2>
            <p className="text-white/90 text-sm mt-1">Review your answers and explanations</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Group Selector */}
        {answerGroups.length > 1 && (
          <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
            <div className="flex gap-2 overflow-x-auto">
              {answerGroups.map((group, index) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupIndex(index)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedGroupIndex === index
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {group.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {selectedGroup.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Question Type: {selectedGroup.test_head}
            </p>
          </div>

          <div className="space-y-6">
            {selectedGroup.answers.map((answer) => (
              <div
                key={answer.question_number}
                className={`p-5 rounded-xl border-2 ${
                  answer.is_correct
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        answer.is_correct
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {answer.question_number}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Question {answer.question_number}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {answer.is_mcma && answer.mcma_score && (
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Score: {answer.mcma_score}
                      </span>
                    )}
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        answer.is_correct
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                    </div>
                  </div>
                </div>

                {/* Question Text */}
                <div className="mb-4">
                  <p className="text-base text-slate-900 dark:text-white font-medium">
                    {answer.question_text}
                  </p>
                </div>

                {/* Answer Details */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                      Your Answer:
                    </span>
                    <span className={`text-sm ${
                      answer.is_correct
                        ? 'text-green-700 dark:text-green-300 font-medium'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {answer.user_answer || 'Not answered'}
                    </span>
                  </div>
                  {!answer.is_correct && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
                        Correct Answer:
                      </span>
                      <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                        {answer.correct_answer}
                      </span>
                    </div>
                  )}
                </div>

                {/* MCMA Breakdown */}
                {answer.is_mcma && answer.mcma_breakdown && answer.mcma_breakdown.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-600">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Detailed Breakdown:
                    </p>
                    <ul className="space-y-1">
                      {answer.mcma_breakdown.map((item, idx) => (
                        <li key={idx} className="text-sm text-slate-600 dark:text-slate-400">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Showing {selectedGroup.answers.length} question(s)
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
