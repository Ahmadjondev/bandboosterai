/**
 * QuestionBuilder Component
 * Advanced question creation interface with support for multiple question types
 * React/Next.js port of Vue.js QuestionBuilder
 */

'use client';

import { useEffect, useState } from 'react';
import {
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  List,
  CheckCircle,
  HelpCircle,
  Link,
  Link2,
  AlignLeft,
  Edit3,
  MessageSquare,
  Book,
  Clipboard,
  Grid3X3,
  Image,
  Map,
  CheckSquare,
  Eye,
  EyeOff,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';

import { useQuestionBuilder } from '@/lib/hooks/useQuestionBuilder';
import { QUESTION_TYPES } from '@/types/question-builder';
import type { QuestionType, Question } from '@/types/reading';
import type { QuestionTypeOption } from '@/types/question-builder';

// Import specialized builders
import { TFNGBuilder } from '@/components/manager/question-partials/TFNGBuilder';
import { MatchingBuilder } from '@/components/manager/question-partials/MatchingBuilder';
import { StandardQuestionForm } from '@/components/manager/question-partials/StandardQuestionForm';
import { QuestionList } from '@/components/manager/question-partials/QuestionList';
import { BulkAdd } from '@/components/manager/question-partials/BulkAdd';
import { SummaryCompletionBuilder } from '@/components/manager/question-partials/SummaryCompletionBuilder';
import { NoteCompletionBuilder } from '@/components/manager/question-partials/NoteCompletionBuilder';
import { FormCompletionBuilder } from '@/components/manager/question-partials/FormCompletionBuilder';
import { TableCompletionBuilder } from '@/components/manager/question-partials/TableCompletionBuilder';
import { DiagramLabelingBuilder } from '@/components/manager/question-partials/DiagramLabelingBuilder';
import { LoadingSpinner } from '@/components/manager/shared';

// Icon mapping for question types
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  List: List,
  CheckSquare: CheckSquare,
  CheckCircle: CheckCircle,
  HelpCircle: HelpCircle,
  Link: Link,
  Link2: Link2,
  AlignLeft: AlignLeft,
  Edit3: Edit3,
  MessageSquare: MessageSquare,
  FileText: FileText,
  Book: Book,
  Clipboard: Clipboard,
  Grid: Grid3X3,
  Image: Image,
  Map: Map,
};

interface QuestionBuilderProps {
  testHeadId?: number;
  passageId?: number;
  listeningPartId?: number;
  passageTitle?: string;
  listeningPartTitle?: string;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export function QuestionBuilder({
  testHeadId,
  passageId,
  listeningPartId,
  passageTitle,
  listeningPartTitle,
  onSaveSuccess,
  onCancel,
}: QuestionBuilderProps) {
  const builder = useQuestionBuilder({
    testHeadId,
    passageId,
    listeningPartId,
    onSaveSuccess,
    onCancel,
  });

  const [showExplanation, setShowExplanation] = useState(false);

  // Load testhead if editing
  useEffect(() => {
    if (testHeadId) {
      builder.loadTestHead(testHeadId);
    }
    // Set passage/listening context for new testheads
    if (passageId && !testHeadId) {
      builder.setQuestionGroup({ reading: passageId });
    }
    if (listeningPartId && !testHeadId) {
      builder.setQuestionGroup({ listening_part: listeningPartId });
    }
  }, [testHeadId, passageId, listeningPartId]);

  // Get icon component for question type
  const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || HelpCircle;
  };

  if (builder.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
          <button
            onClick={builder.cancel}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            Question Groups
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 dark:text-slate-100 font-medium">
            {builder.questionGroup.id ? 'Edit Question Group' : 'Question Builder'}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {builder.questionGroup.id ? 'Edit Question Group' : 'Question Builder'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {builder.questionGroup.id
            ? 'Update question group and manage questions'
            : 'Create comprehensive question groups step by step'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((step, idx) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    builder.currentStep >= step
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step}
                </div>
                <span
                  className={`text-sm ${
                    builder.currentStep >= step
                      ? 'text-slate-900 dark:text-slate-100 font-medium'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step === 1 ? 'Group Details' : step === 2 ? 'Add Questions' : 'Review & Save'}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-4 transition-colors ${
                    builder.currentStep > step
                      ? 'bg-orange-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {builder.error && (
        <div className="mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-800 dark:text-rose-300">{builder.error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Group Details */}
      {builder.currentStep === 1 && (
        <Step1GroupDetails
          builder={builder}
          passageTitle={passageTitle}
          getIconComponent={getIconComponent}
        />
      )}

      {/* Step 2: Add Questions */}
      {builder.currentStep === 2 && (
        <Step2AddQuestions
          builder={builder}
          showExplanation={showExplanation}
          setShowExplanation={setShowExplanation}
        />
      )}

      {/* Step 3: Review & Save */}
      {builder.currentStep === 3 && <Step3ReviewSave builder={builder} />}
    </div>
  );
}

// Step 1: Group Details
function Step1GroupDetails({
  builder,
  passageTitle,
  getIconComponent,
}: {
  builder: ReturnType<typeof useQuestionBuilder>;
  passageTitle?: string;
  getIconComponent: (name: string) => React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Group Details</h3>

      {/* Passage Info */}
      {passageTitle && (
        <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-700 dark:text-orange-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{passageTitle}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Related Passage</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Group Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Group Title <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            value={builder.questionGroup.title}
            onChange={(e) => builder.setQuestionGroup({ title: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Questions 1-5"
          />
        </div>

        {/* Question Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Question Type <span className="text-rose-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {QUESTION_TYPES.map((type) => {
              const IconComponent = getIconComponent(type.icon);
              const isSelected = builder.questionGroup.question_type === type.code;
              return (
                <label
                  key={type.code}
                  className={`relative flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-500'
                      : 'border-slate-200 dark:border-gray-600 hover:border-slate-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    value={type.code}
                    checked={isSelected}
                    onChange={() => builder.setQuestionGroup({ question_type: type.code })}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-orange-100 dark:bg-orange-900/40'
                        : 'bg-slate-100 dark:bg-gray-700'
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 ${
                        isSelected
                          ? 'text-orange-700 dark:text-orange-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{type.label}</p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Instructions / Description
          </label>
          <textarea
            value={builder.questionGroup.description}
            onChange={(e) => builder.setQuestionGroup({ description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
            placeholder="Instructions for students..."
          />
        </div>

        {/* Additional Data */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Additional Data <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={builder.questionGroup.question_data}
            onChange={(e) => builder.setQuestionGroup({ question_data: e.target.value })}
            rows={4}
            className="w-full px-4 py-2.5 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
            placeholder="Additional context, matching lists, or reference text..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
        <button
          onClick={builder.cancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={builder.nextStep}
          disabled={!builder.canProceedToStep2}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Next: Add Questions
        </button>
      </div>
    </div>
  );
}

// Step 2: Add Questions
function Step2AddQuestions({
  builder,
  showExplanation,
  setShowExplanation,
}: {
  builder: ReturnType<typeof useQuestionBuilder>;
  showExplanation: boolean;
  setShowExplanation: (show: boolean) => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: null,
    question_text: '',
    correct_answer_text: '',
    answer_two_text: '',
    choices: [],
    order: 0,
    explanation: '',
    points: 1,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const selectedQuestionType = QUESTION_TYPES.find(
    (t) => t.code === builder.questionGroup.question_type
  );

  const validateAndAddQuestion = () => {
    const errors: Record<string, string> = {};

    if (!currentQuestion.question_text.trim()) {
      errors.question_text = 'Question text is required';
    }

    if (selectedQuestionType?.hasChoices) {
      if (!currentQuestion.choices || currentQuestion.choices.length < 2) {
        errors.choices = 'At least 2 choices are required';
      } else if (!currentQuestion.choices.some((c) => c.is_correct)) {
        errors.choices = 'At least one correct answer must be selected';
      }
    } else if (!currentQuestion.correct_answer_text.trim()) {
      errors.correct_answer_text = 'Answer is required';
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      if (builder.editingQuestionIndex !== null) {
        builder.updateQuestion(builder.editingQuestionIndex, {
          ...currentQuestion,
          order: builder.questions[builder.editingQuestionIndex].order,
        });
        builder.setEditingQuestionIndex(null);
      } else {
        builder.addQuestion(currentQuestion);
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setCurrentQuestion({
      id: null,
      question_text: '',
      correct_answer_text: '',
      answer_two_text: '',
      choices: [],
      order: 0,
      explanation: '',
      points: 1,
    });
    setValidationErrors({});
    builder.setEditingQuestionIndex(null);
  };

  const handleEditQuestion = (index: number) => {
    const question = builder.questions[index];
    setCurrentQuestion({ ...question });
    builder.setEditingQuestionIndex(index);
  };

  const handleBulkAdd = (questions: Omit<Question, 'order'>[]) => {
    questions.forEach((q) => {
      builder.addQuestion({ ...q, order: 0 });
    });
  };

  return (
    <div className="space-y-6">
      {/* Specialized Builders */}
      {builder.isTFNG && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <div className="p-6">
            <TFNGBuilder
              questionType={builder.questionGroup.question_type as 'TFNG' | 'YNNG'}
              existingQuestions={builder.questions}
              onQuestionsReady={(questions) => {
                // TFNG builder manages complete question set - always replace all
                builder.handleBulkQuestions(questions, true);
              }}
              onCancel={() => builder.setEditingQuestionIndex(null)}
            />
          </div>
        </div>
      )}

      {builder.isMatching && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <div className="p-6">
            <MatchingBuilder
              questionType={builder.questionGroup.question_type as 'MF' | 'MI' | 'MH'}
              existingQuestions={builder.questions}
              matchingOptions={builder.questionGroup.question_data}
              onQuestionsReady={(questions) => {
                // Matching builder manages complete question set - always replace all
                builder.handleBulkQuestions(questions, true);
              }}
              onCancel={() => builder.setEditingQuestionIndex(null)}
              onUpdateMatchingOptions={(options) => {
                builder.updateQuestionData(options);
              }}
            />
          </div>
        </div>
      )}

      {/* Summary Completion Builder */}
      {builder.isSummaryCompletion && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <div className="p-6">
            <SummaryCompletionBuilder
              existingQuestions={builder.questions}
              summaryData={builder.questionGroup.question_data}
              onQuestionsReady={(questions) => {
                // Summary builder manages complete question set - always replace all
                builder.handleBulkQuestions(questions, true);
              }}
              onUpdateSummaryData={(data) => {
                builder.updateQuestionData(data);
              }}
              onCancel={() => builder.setEditingQuestionIndex(null)}
            />
          </div>
        </div>
      )}

      {/* Note Completion Builder */}
      {builder.isNoteCompletion && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <div className="p-6">
            <NoteCompletionBuilder
              existingQuestions={builder.questions}
              noteData={builder.questionGroup.question_data}
              onQuestionsReady={(questions) => {
                // Note builder manages complete question set - always replace all
                builder.handleBulkQuestions(questions, true);
              }}
              onUpdateNoteData={(data) => {
                builder.updateQuestionData(data);
              }}
              onCancel={() => builder.setEditingQuestionIndex(null)}
            />
          </div>
        </div>
      )}

      {/* Form Completion Builder */}
      {builder.isFormCompletion && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <div className="p-6">
            <FormCompletionBuilder
              existingQuestions={builder.questions}
              formData={builder.questionGroup.question_data}
              onQuestionsReady={(questions) => {
                // Form builder manages complete question set - always replace all
                builder.handleBulkQuestions(questions, true);
              }}
              onUpdateFormData={(data) => {
                builder.updateQuestionData(data);
              }}
              onCancel={() => builder.setEditingQuestionIndex(null)}
            />
          </div>
        </div>
      )}

      {/* Table Completion Builder */}
      {builder.isTableCompletion && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <div className="p-6">
            <TableCompletionBuilder
              existingQuestions={builder.questions}
              tableData={builder.questionGroup.question_data}
              onQuestionsReady={(questions) => {
                // Table builder manages complete question set - always replace all
                builder.handleBulkQuestions(questions, true);
              }}
              onUpdateTableData={(data) => {
                builder.updateQuestionData(data);
              }}
              onCancel={() => builder.setEditingQuestionIndex(null)}
            />
          </div>
        </div>
      )}

      {/* Diagram/Map Labeling Builder */}
      {(builder.isDiagramLabeling || builder.isMapLabeling) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
          <div className="p-6">
            <DiagramLabelingBuilder
              questionType={builder.questionGroup.question_type as 'DL' | 'ML'}
              existingQuestions={builder.questions}
              labelingData={builder.questionGroup.question_data}
              onQuestionsReady={(questions) => {
                // Diagram/Map builder manages complete question set - always replace all
                builder.handleBulkQuestions(questions, true);
              }}
              onUpdateLabelingData={(data) => {
                builder.updateQuestionData(data);
              }}
              onCancel={() => builder.setEditingQuestionIndex(null)}
            />
          </div>
        </div>
      )}

      {/* Standard Question Interface */}
      {!builder.isTFNG && !builder.isMatching && !builder.isSummaryCompletion && !builder.isNoteCompletion && !builder.isFormCompletion && !builder.isTableCompletion && !builder.isDiagramLabeling && !builder.isMapLabeling && (
        <>
          {/* Bulk Add */}
          <BulkAdd onBulkAdd={handleBulkAdd} />

          {/* Standard Question Form */}
          {selectedQuestionType && (
            <StandardQuestionForm
              question={currentQuestion}
              questionType={selectedQuestionType}
              validationErrors={validationErrors}
              isEditing={builder.editingQuestionIndex !== null}
              editingIndex={builder.editingQuestionIndex}
              showExplanation={showExplanation}
              onUpdate={setCurrentQuestion}
              onShowExplanationChange={setShowExplanation}
              onAddQuestion={validateAndAddQuestion}
              onAddAndNew={() => {
                validateAndAddQuestion();
              }}
              onCancelEdit={resetForm}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  validateAndAddQuestion();
                }
                if (e.key === 'Escape' && builder.editingQuestionIndex !== null) {
                  resetForm();
                }
              }}
            />
          )}
        </>
      )}

      {/* Question List */}
      <QuestionList
        questions={builder.questions}
        questionType={builder.questionGroup.question_type}
        previewMode={builder.previewMode}
        onEditQuestion={handleEditQuestion}
        onRemoveQuestion={(index) => {
          if (confirm('Are you sure you want to delete this question?')) {
            builder.removeQuestion(index);
          }
        }}
        onDuplicateQuestion={builder.duplicateQuestion}
        onMoveQuestionUp={builder.moveQuestionUp}
        onMoveQuestionDown={builder.moveQuestionDown}
        onReorderQuestion={(index, newOrder) => builder.reorderQuestion(index, newOrder)}
        onTogglePreview={builder.togglePreview}
        onClearAll={() => {
          if (confirm('Are you sure you want to remove all questions? This cannot be undone.')) {
            builder.clearAllQuestions();
          }
        }}
        onOpenBuilder={builder.toggleBuilder}
      />

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <button
          onClick={builder.previousStep}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>
        <button
          onClick={builder.nextStep}
          disabled={!builder.canProceedToStep3}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          Next: Review & Save
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 3: Review & Save
function Step3ReviewSave({ builder }: { builder: ReturnType<typeof useQuestionBuilder> }) {
  const selectedQuestionType = QUESTION_TYPES.find(
    (t) => t.code === builder.questionGroup.question_type
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Review & Save</h3>

      {/* Group Summary */}
      <div className="space-y-4 mb-6">
        <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-4 border border-slate-200 dark:border-gray-600">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Group Details
          </h4>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Title</dt>
              <dd className="text-slate-900 dark:text-slate-100">{builder.questionGroup.title}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Type</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {selectedQuestionType?.label || builder.questionGroup.question_type}
              </dd>
            </div>
            {builder.questionGroup.description && (
              <div className="col-span-2">
                <dt className="text-slate-500 dark:text-slate-400 font-medium">Description</dt>
                <dd className="text-slate-900 dark:text-slate-100">
                  {builder.questionGroup.description}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-4 border border-slate-200 dark:border-gray-600">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Questions Summary
          </h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Total questions:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {builder.questions.length}
            </span>
          </div>

          {/* Questions Preview */}
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {builder.questions.map((q, index) => (
              <div
                key={q.id || `q-${index}`}
                className="p-3 bg-white dark:bg-gray-800 rounded border border-slate-200 dark:border-gray-600"
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full flex items-center justify-center text-xs font-medium">
                    {q.order || index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                      {q.question_text}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Answer: {q.correct_answer_text || (q.choices?.find((c) => c.is_correct)?.choice_text)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3 pt-6 border-t border-slate-200 dark:border-gray-700">
        <button
          onClick={builder.previousStep}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>
        <button
          onClick={builder.saveAll}
          disabled={builder.saving}
          className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {builder.saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {builder.questionGroup.id ? 'Updating...' : 'Saving...'}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {builder.questionGroup.id ? 'Update Question Group' : 'Save Question Group'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default QuestionBuilder;
