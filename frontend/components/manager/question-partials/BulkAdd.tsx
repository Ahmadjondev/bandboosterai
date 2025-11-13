/**
 * BulkAdd Component
 * Allows adding multiple questions at once via pipe-separated format
 * Migrated from BulkAdd.js
 */

'use client';

import { useState } from 'react';
import { Zap, Layers, X } from 'lucide-react';
import type { Question } from '@/types/reading';

interface BulkAddProps {
  onBulkAdd: (questions: Question[]) => void;
}

export function BulkAdd({ onBulkAdd }: BulkAddProps) {
  const [bulkText, setBulkText] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const toggle = () => {
    setShowBulkAdd(!showBulkAdd);
  };

  const processBulk = () => {
    if (!bulkText.trim()) {
      alert('Please enter questions');
      return;
    }

    const lines = bulkText.split('\n').filter((line) => line.trim());
    const parsedQuestions: Question[] = [];
    let failed = 0;

    for (const line of lines) {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        parsedQuestions.push({
          id: null,
          question_text: parts[0],
          correct_answer_text: parts[1],
          answer_two_text: parts[2] || '',
          explanation: parts[3] || '',
          points: parseInt(parts[4]) || 1,
          order: 0,
          choices: [],
        });
      } else {
        failed++;
      }
    }

    if (parsedQuestions.length > 0) {
      onBulkAdd(parsedQuestions);
      setBulkText('');
      setShowBulkAdd(false);
      alert(
        `Added ${parsedQuestions.length} question(s)${failed > 0 ? `, ${failed} failed` : ''}`
      );
    } else {
      alert(
        'No valid questions found. Format: Question | Answer [| Alt Answer] [| Explanation] [| Points]'
      );
    }
  };

  const cancel = () => {
    setBulkText('');
    setShowBulkAdd(false);
  };

  return (
    <div className="bulk-add-component">
      {/* Toggle Button */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-slate-900">Quick Actions</span>
            </div>
            <button
              onClick={toggle}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-orange-700 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              Bulk Add
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <kbd className="px-2 py-1 bg-white rounded border border-slate-300 font-mono">
              Ctrl/Cmd + Enter
            </kbd>
            <span>Add & Continue</span>
          </div>
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <div className="bg-white rounded-lg border-2 border-orange-300 p-6 shadow-lg mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Bulk Add Questions</h3>
            <button onClick={cancel} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900 mb-2 font-medium">
              Format: One question per line (pipe-separated)
            </p>
            <div className="space-y-1 text-xs text-amber-800 font-mono">
              <p>Question | Answer | AltAnswer | Explanation | Points</p>
              <p className="text-amber-600">(Only Question and Answer are required)</p>
            </div>
            <div className="mt-3 pt-3 border-t border-amber-200">
              <p className="text-xs text-amber-900 font-semibold mb-1">Examples:</p>
              <div className="space-y-1 text-xs text-amber-800 font-mono">
                <p>What is 2+2? | 4</p>
                <p>Complete: The sky is ___ | blue | azure | Color of clear sky | 2</p>
              </div>
            </div>
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
            placeholder="What is the capital of France? | Paris&#10;Complete: The sky is ___ | blue&#10;How many continents are there? | 7 | seven | Remember Antarctica | 1"
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={cancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={processBulk}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Add Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
