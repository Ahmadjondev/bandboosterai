/**
 * useQuestionBuilder Hook
 * React hook for managing QuestionBuilder state and operations
 */

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { managerAPI } from '@/lib/manager';
import { errorLogger } from '@/lib/manager/error-logger';
import type { Question, QuestionType, TestHead } from '@/types/reading';
import type {
  QuestionGroupForm,
  QuestionBuilderState,
  ValidationResult,
  BulkCreateRequestBody,
  UpdateResult,
  MatchingOption,
} from '@/types/question-builder';

const INITIAL_QUESTION_GROUP: QuestionGroupForm = {
  id: null,
  title: '',
  description: '',
  question_type: 'MCQ',
  question_data: '',
  reading: null,
  listening_part: null,
  picture: null,
  diagramImageFile: null,
  mapImageFile: null,
};

const INITIAL_STATE: QuestionBuilderState = {
  currentStep: 1,
  totalSteps: 3,
  questionGroup: INITIAL_QUESTION_GROUP,
  questions: [],
  loading: false,
  saving: false,
  error: null,
  previewMode: false,
  editingQuestionIndex: null,
  showBuilder: false,
};

interface UseQuestionBuilderOptions {
  testHeadId?: number;
  passageId?: number;
  listeningPartId?: number;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export function useQuestionBuilder(options: UseQuestionBuilderOptions = {}) {
  const router = useRouter();
  const [state, setState] = useState<QuestionBuilderState>(INITIAL_STATE);

  // Computed values
  const selectedQuestionType = useMemo(() => {
    const { QUESTION_TYPES } = require('@/types/question-builder');
    return QUESTION_TYPES.find((t: any) => t.code === state.questionGroup.question_type);
  }, [state.questionGroup.question_type]);

  const canProceedToStep2 = useMemo(() => {
    return state.questionGroup.title.trim() !== '' && state.questionGroup.question_type;
  }, [state.questionGroup.title, state.questionGroup.question_type]);

  const canProceedToStep3 = useMemo(() => {
    return state.questions.length > 0;
  }, [state.questions.length]);

  const progressPercentage = useMemo(() => {
    return (state.currentStep / state.totalSteps) * 100;
  }, [state.currentStep, state.totalSteps]);

  const isMCQType = useMemo(() => {
    return ['MCQ', 'MCMA'].includes(state.questionGroup.question_type);
  }, [state.questionGroup.question_type]);

  const isTFNG = useMemo(() => {
    return ['TFNG', 'YNNG'].includes(state.questionGroup.question_type);
  }, [state.questionGroup.question_type]);

  const isMatching = useMemo(() => {
    return ['MF', 'MI', 'MH'].includes(state.questionGroup.question_type);
  }, [state.questionGroup.question_type]);

  const isSummaryCompletion = useMemo(() => {
    return state.questionGroup.question_type === 'SUC';
  }, [state.questionGroup.question_type]);

  const isNoteCompletion = useMemo(() => {
    return state.questionGroup.question_type === 'NC';
  }, [state.questionGroup.question_type]);

  const isFormCompletion = useMemo(() => {
    return state.questionGroup.question_type === 'FC';
  }, [state.questionGroup.question_type]);

  const isTableCompletion = useMemo(() => {
    return state.questionGroup.question_type === 'TC';
  }, [state.questionGroup.question_type]);

  const isDiagramLabeling = useMemo(() => {
    return state.questionGroup.question_type === 'DL';
  }, [state.questionGroup.question_type]);

  const isMapLabeling = useMemo(() => {
    return state.questionGroup.question_type === 'ML';
  }, [state.questionGroup.question_type]);

  // Step Management
  const goToStep = useCallback((step: number) => {
    if (step === 2 && !canProceedToStep2) {
      setState((prev) => ({ ...prev, error: 'Please complete group details first' }));
      return;
    }
    if (step === 3 && !canProceedToStep3) {
      setState((prev) => ({ ...prev, error: 'Please add at least one question' }));
      return;
    }
    setState((prev) => ({
      ...prev,
      currentStep: step,
      error: null,
      showBuilder: step === 2,
    }));
  }, [canProceedToStep2, canProceedToStep3]);

  const nextStep = useCallback(() => {
    if (state.currentStep < state.totalSteps) {
      goToStep(state.currentStep + 1);
    }
  }, [state.currentStep, state.totalSteps, goToStep]);

  const previousStep = useCallback(() => {
    if (state.currentStep > 1) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        error: null,
      }));
    }
  }, [state.currentStep]);

  // Question Group Management
  const setQuestionGroup = useCallback((updates: Partial<QuestionGroupForm>) => {
    setState((prev) => ({
      ...prev,
      questionGroup: { ...prev.questionGroup, ...updates },
    }));
  }, []);

  // Question Management
  const addQuestion = useCallback((question: Question) => {
    setState((prev) => {
      const newQuestion = {
        ...question,
        order: prev.questions.length + 1,
      };
      return {
        ...prev,
        questions: [...prev.questions, newQuestion],
      };
    });
    errorLogger.userAction('Question added', { questionText: question.question_text?.substring(0, 50) });
  }, []);

  const updateQuestion = useCallback((index: number, question: Question) => {
    setState((prev) => {
      const newQuestions = [...prev.questions];
      newQuestions[index] = question;
      return { ...prev, questions: newQuestions };
    });
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setState((prev) => {
      const newQuestions = prev.questions.filter((_, i) => i !== index);
      // Update order for remaining questions
      newQuestions.forEach((q, i) => {
        q.order = i + 1;
      });
      return {
        ...prev,
        questions: newQuestions,
        editingQuestionIndex: null,
      };
    });
    errorLogger.userAction('Question removed', { index });
  }, []);

  const moveQuestionUp = useCallback((index: number) => {
    if (index <= 0) return;
    setState((prev) => {
      const newQuestions = [...prev.questions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      newQuestions[index - 1].order = index;
      newQuestions[index].order = index + 1;
      return { ...prev, questions: newQuestions };
    });
  }, []);

  const moveQuestionDown = useCallback((index: number) => {
    setState((prev) => {
      if (index >= prev.questions.length - 1) return prev;
      const newQuestions = [...prev.questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      newQuestions[index].order = index + 1;
      newQuestions[index + 1].order = index + 2;
      return { ...prev, questions: newQuestions };
    });
  }, []);

  const duplicateQuestion = useCallback((index: number) => {
    setState((prev) => {
      const original = prev.questions[index];
      const duplicate: Question = {
        ...original,
        id: null,
        question_text: `${original.question_text} (Copy)`,
        order: prev.questions.length + 1,
        choices: original.choices?.map((c) => ({ ...c, id: undefined })),
      };
      return { ...prev, questions: [...prev.questions, duplicate] };
    });
    errorLogger.userAction('Question duplicated', { index });
  }, []);

  const clearAllQuestions = useCallback(() => {
    setState((prev) => ({
      ...prev,
      questions: [],
      editingQuestionIndex: null,
    }));
    errorLogger.userAction('All questions cleared');
  }, []);

  const setEditingQuestionIndex = useCallback((index: number | null) => {
    setState((prev) => ({ ...prev, editingQuestionIndex: index }));
  }, []);

  const reorderQuestion = useCallback((index: number, newOrder: number) => {
    setState((prev) => {
      const newQuestions = [...prev.questions];
      newQuestions[index].order = newOrder;
      return { ...prev, questions: newQuestions };
    });
  }, []);

  // UI State
  const togglePreview = useCallback(() => {
    setState((prev) => ({ ...prev, previewMode: !prev.previewMode }));
  }, []);

  const toggleBuilder = useCallback(() => {
    setState((prev) => ({ ...prev, showBuilder: !prev.showBuilder }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
    if (error) {
      errorLogger.error(error, 'QuestionBuilder');
    }
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setSaving = useCallback((saving: boolean) => {
    setState((prev) => ({ ...prev, saving }));
  }, []);

  // Handle bulk questions from specialized builders
  // replaceAll: when true, replaces ALL existing questions (for builders that manage complete question sets like TFNG, Matching)
  const handleBulkQuestions = useCallback((newQuestions: Question[], replaceAll: boolean = false) => {
    setState((prev) => {
      // Full replacement mode - for specialized builders that manage complete question sets
      if (replaceAll) {
        // Preserve IDs for existing questions that match by order or content
        const processedQuestions = newQuestions.map((newQ, idx) => {
          // Try to find matching existing question by order
          const existingByOrder = prev.questions.find(
            (eq) => eq.order === newQ.order || eq.order === idx + 1
          );
          
          // If we found a matching question, preserve its ID for proper updates
          const existingId = existingByOrder?.id ?? null;
          
          return {
            ...newQ,
            id: newQ.id ?? existingId,
            order: idx + 1,
          };
        });
        
        return {
          ...prev,
          questions: processedQuestions,
          editingQuestionIndex: null,
        };
      }
      
      if (prev.editingQuestionIndex !== null) {
        // Editing mode: replace or update questions
        if (newQuestions.length === 1) {
          const newQs = [...prev.questions];
          newQs[prev.editingQuestionIndex] = {
            ...newQs[prev.editingQuestionIndex],
            ...newQuestions[0],
          };
          return { ...prev, questions: newQs, editingQuestionIndex: null };
        }
        // Multiple questions: replace the edited one and add the rest
        const beforeQuestions = prev.questions.slice(0, prev.editingQuestionIndex);
        const afterQuestions = prev.questions.slice(prev.editingQuestionIndex + 1);
        const startOrder = prev.questions[prev.editingQuestionIndex].order;

        newQuestions.forEach((q, idx) => {
          q.order = startOrder + idx;
          q.id = null;
        });

        afterQuestions.forEach((q, idx) => {
          q.order = startOrder + newQuestions.length + idx;
        });

        return {
          ...prev,
          questions: [...beforeQuestions, ...newQuestions, ...afterQuestions],
          editingQuestionIndex: null,
        };
      }

      // Adding new questions
      const startOrder = prev.questions.length + 1;
      newQuestions.forEach((q, idx) => {
        q.order = startOrder + idx;
        q.id = null;
      });
      return { ...prev, questions: [...prev.questions, ...newQuestions] };
    });

    errorLogger.userAction('Bulk questions added', { count: newQuestions.length, replaceAll });
  }, []);

  // Update question_data (for matching options, summary text, etc.)
  const updateQuestionData = useCallback((data: string) => {
    setState((prev) => ({
      ...prev,
      questionGroup: { ...prev.questionGroup, question_data: data },
    }));
  }, []);

  // Update diagram/map image file
  const updateImageFile = useCallback((file: File | null, type: 'diagram' | 'map') => {
    setState((prev) => ({
      ...prev,
      questionGroup: {
        ...prev.questionGroup,
        [type === 'diagram' ? 'diagramImageFile' : 'mapImageFile']: file,
      },
    }));
  }, []);

  // Validation
  const validateQuestionData = useCallback((): ValidationResult => {
    const errors: string[] = [];
    const { questionGroup, questions } = state;

    if (!questionGroup.title.trim()) {
      errors.push('Group title is required');
    }

    if (questions.length === 0) {
      errors.push('At least one question is required');
    }

    questions.forEach((q, index) => {
      if (!q.question_text.trim()) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }
      if (!q.correct_answer_text.trim() && !selectedQuestionType?.hasChoices) {
        errors.push(`Question ${index + 1}: Answer is required`);
      }
      if (selectedQuestionType?.hasChoices) {
        if (!q.choices || q.choices.length < 2) {
          errors.push(`Question ${index + 1}: At least 2 choices are required`);
        } else if (!q.choices.some((c) => c.is_correct)) {
          errors.push(`Question ${index + 1}: At least one correct answer must be selected`);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }, [state, selectedQuestionType]);

  // Helper Functions
  const mapQuestionToAPIFormat = useCallback((question: Question) => {
    const baseData: any = {
      question_text: question.question_text,
      correct_answer_text: question.correct_answer_text || '',
      answer_two_text: question.answer_two_text || '',
      order: question.order,
    };

    if (question.choices && question.choices.length > 0) {
      baseData.choices = question.choices.map((c) => ({
        choice_text: c.choice_text,
        is_correct: c.is_correct,
      }));
    }

    return baseData;
  }, []);

  const parseMatchingOptions = useCallback((text: string): MatchingOption[] => {
    if (!text) return [];
    const lines = text.split('\n').filter((line) => line.trim());
    return lines.map((line) => {
      const match = line.match(/^([A-Z])\s*[-:).]\s*(.+)$/i);
      if (match) {
        return {
          value: match[1].toUpperCase(),
          label: match[2].trim(),
          fullText: line.trim(),
        };
      }
      return {
        value: line.charAt(0).toUpperCase(),
        label: line.trim(),
        fullText: line.trim(),
      };
    });
  }, []);

  const buildBulkCreateRequestBody = useCallback(
    (testheadId: number): BulkCreateRequestBody => {
      const { questionGroup, questions } = state;
      const requestBody: BulkCreateRequestBody = { testhead: testheadId };

      const questionType = questionGroup.question_type;
      const isMatchingType = ['MF', 'MI', 'MH'].includes(questionType);
      const isSummaryType = questionType === 'SUC';
      const isStructuredType = ['NC', 'FC', 'TC'].includes(questionType);

      if (isMatchingType) {
        const options = parseMatchingOptions(questionGroup.question_data);
        requestBody.matching_data = {
          options,
          questions: questions.map(mapQuestionToAPIFormat),
        };
      } else if (isSummaryType) {
        try {
          const summaryData = questionGroup.question_data
            ? JSON.parse(questionGroup.question_data)
            : { title: '', text: '', blankCount: questions.length };
          requestBody.matching_data = {
            ...summaryData,
            questions: questions.map(mapQuestionToAPIFormat),
          };
        } catch {
          requestBody.matching_data = {
            title: '',
            text: questionGroup.question_data || '',
            blankCount: questions.length,
            questions: questions.map(mapQuestionToAPIFormat),
          };
        }
      } else if (isStructuredType) {
        try {
          const structureData = questionGroup.question_data
            ? JSON.parse(questionGroup.question_data)
            : { title: '', items: [] };
          requestBody.matching_data = {
            ...structureData,
            questions: questions.map(mapQuestionToAPIFormat),
          };
        } catch {
          requestBody.matching_data = {
            title: '',
            items: [],
            questions: questions.map(mapQuestionToAPIFormat),
          };
        }
      } else {
        requestBody.questions = questions.map(mapQuestionToAPIFormat);
      }

      return requestBody;
    },
    [state, parseMatchingOptions, mapQuestionToAPIFormat]
  );

  const prepareTestHeadData = useCallback(() => {
    const { questionGroup } = state;
    return {
      title: questionGroup.title,
      description: questionGroup.description,
      question_type: questionGroup.question_type,
      question_data: questionGroup.question_data || '',
      reading: questionGroup.reading || undefined,
      listening_part: questionGroup.listening_part || undefined,
    };
  }, [state]);

  // Update existing questions
  const updateExistingQuestions = useCallback(
    async (questionsToUpdate: Question[]): Promise<UpdateResult> => {
      const result: UpdateResult = {
        total: questionsToUpdate.length,
        completed: 0,
        errors: [],
        updatedQuestions: [],
      };

      for (const question of questionsToUpdate) {
        if (!question.id) continue;

        try {
          const questionData = mapQuestionToAPIFormat(question);
          await managerAPI.updateQuestion(question.id, questionData);
          result.completed++;
          result.updatedQuestions.push(question);
        } catch (err: any) {
          errorLogger.apiError(
            `/tests/question/${question.id}/update/`,
            'PUT',
            err.statusCode,
            err.message
          );
          result.errors.push({
            questionId: question.id,
            error: err.message || 'Failed to update question',
          });
        }
      }

      return result;
    },
    [mapQuestionToAPIFormat]
  );

  // Save All
  const saveAll = useCallback(async () => {
    const validation = validateQuestionData();

    if (!validation.isValid) {
      setError(validation.errors[0]);
      errorLogger.validationError('questionData', validation.errors.join('; '));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Step 1: Create or update the TestHead
      const testheadData = prepareTestHeadData();
      let testheadId = state.questionGroup.id;

      const hasImageFile =
        state.questionGroup.diagramImageFile || state.questionGroup.mapImageFile;

      errorLogger.info('Saving testhead', 'QuestionBuilder', {
        testheadId,
        hasImageFile: !!hasImageFile,
        questionType: state.questionGroup.question_type,
      });

      // API response type - we use any since API may return different structures
      let testheadResponse: any;

      if (state.questionGroup.id) {
        // Update existing testhead
        if (hasImageFile) {
          const formData = new FormData();
          formData.append('title', testheadData.title);
          formData.append('description', testheadData.description);
          formData.append('question_type', testheadData.question_type);
          formData.append('question_data', testheadData.question_data);

          if (testheadData.reading) {
            formData.append('reading', testheadData.reading.toString());
          }
          if (testheadData.listening_part) {
            formData.append('listening_part', testheadData.listening_part.toString());
          }

          const imageFile =
            state.questionGroup.diagramImageFile || state.questionGroup.mapImageFile;
          if (imageFile) {
            formData.append('picture', imageFile);
          }

          testheadResponse = await managerAPI.uploadFile(
            `/tests/testhead/${state.questionGroup.id}/update/`,
            formData
          );
        } else {
          testheadResponse = await managerAPI.updateTestHead(state.questionGroup.id, testheadData);
        }
      } else {
        // Create new testhead
        if (hasImageFile) {
          const formData = new FormData();
          formData.append('title', testheadData.title);
          formData.append('description', testheadData.description);
          formData.append('question_type', testheadData.question_type);
          formData.append('question_data', testheadData.question_data);

          if (testheadData.reading) {
            formData.append('reading', testheadData.reading.toString());
          }
          if (testheadData.listening_part) {
            formData.append('listening_part', testheadData.listening_part.toString());
          }

          const imageFile =
            state.questionGroup.diagramImageFile || state.questionGroup.mapImageFile;
          if (imageFile) {
            formData.append('picture', imageFile);
          }

          testheadResponse = await managerAPI.uploadFile(
            '/tests/testhead/create/',
            formData
          );
        } else {
          testheadResponse = await managerAPI.createTestHead(testheadData);
        }
        testheadId = testheadResponse.id || testheadResponse.testhead?.id;
        setState((prev) => ({
          ...prev,
          questionGroup: { ...prev.questionGroup, id: testheadId },
        }));
      }

      if (!testheadId) {
        throw new Error('Failed to get testhead ID from response');
      }

      // Step 2: Handle Questions
      const existingQuestions = state.questions.filter((q) => q.id);
      const newQuestions = state.questions.filter((q) => !q.id);

      let updateResults: UpdateResult = { total: 0, completed: 0, errors: [], updatedQuestions: [] };
      let createResults = { created_count: 0, error_count: 0, errors: [] as string[] };

      // Update existing questions
      if (existingQuestions.length > 0) {
        errorLogger.info(`Updating ${existingQuestions.length} existing questions`, 'QuestionBuilder');
        updateResults = await updateExistingQuestions(existingQuestions);
      }

      // Create new questions in bulk
      if (newQuestions.length > 0) {
        errorLogger.info(`Creating ${newQuestions.length} new questions`, 'QuestionBuilder');
        const requestBody = buildBulkCreateRequestBody(testheadId);
        
        try {
          const bulkResponse = await managerAPI.createQuestionsBulk(requestBody);
          createResults = {
            created_count: bulkResponse.created_count || 0,
            error_count: bulkResponse.error_count || 0,
            errors: bulkResponse.errors || [],
          };
        } catch (err: any) {
          errorLogger.apiError('/tests/questions/bulk-create/', 'POST', err.statusCode, err.message);
          createResults.errors.push(err.message || 'Failed to create questions');
          createResults.error_count = newQuestions.length;
        }
      }

      // Report results
      const totalSuccess = updateResults.completed + createResults.created_count;
      const totalErrors = updateResults.errors.length + createResults.error_count;

      if (totalErrors > 0) {
        const errorMessages = [
          ...updateResults.errors.map((e) => `Update failed for question ${e.questionId}: ${e.error}`),
          ...createResults.errors.map((e) => `Create failed: ${e}`),
        ];
        errorLogger.warn(`Save completed with errors: ${errorMessages.join('; ')}`, 'QuestionBuilder');
        setError(`Saved ${totalSuccess} question(s). ${totalErrors} error(s) occurred.`);
      } else {
        errorLogger.info(`Save completed successfully: ${totalSuccess} questions`, 'QuestionBuilder');
      }

      // Call success callback or navigate
      if (options.onSaveSuccess) {
        options.onSaveSuccess();
      } else {
        // Navigate back
        setTimeout(() => {
          if (options.passageId) {
            router.push(`/manager/reading/view/${options.passageId}`);
          } else if (options.listeningPartId) {
            router.push(`/manager/listening/view/${options.listeningPartId}`);
          } else {
            router.push('/manager/reading');
          }
        }, 1500);
      }
    } catch (error: any) {
      errorLogger.error(error.message || 'Failed to save question group', 'QuestionBuilder', error);
      setError(error.message || 'Failed to save question group');
    } finally {
      setSaving(false);
    }
  }, [
    state,
    validateQuestionData,
    prepareTestHeadData,
    updateExistingQuestions,
    buildBulkCreateRequestBody,
    options,
    router,
  ]);

  // Load TestHead by ID
  const loadTestHead = useCallback(async (testHeadId: number) => {
    setLoading(true);
    try {
      const response = await managerAPI.getTestHead(testHeadId);
      // API may return data directly or wrapped in { testhead: ... }
      const groupData: any = (response as any).testhead || response;

      setState((prev) => ({
        ...prev,
        questionGroup: {
          id: groupData.id,
          title: groupData.title || '',
          description: groupData.description || '',
          question_type: (groupData.question_type as QuestionType) || 'MCQ',
          question_data: typeof groupData.question_data === 'string' 
            ? groupData.question_data 
            : JSON.stringify(groupData.question_data || ''),
          reading: groupData.reading || null,
          listening_part: groupData.listening_part || null,
          picture: groupData.picture || null,
          diagramImageFile: null,
          mapImageFile: null,
        },
        questions: (groupData.questions || []).map((q: any, index: number) => ({
          id: q.id,
          question_text: q.question_text || q.text || '',
          correct_answer_text: q.correct_answer_text || q.correct_answer || '',
          answer_two_text: q.answer_two_text || '',
          explanation: q.explanation || '',
          points: q.points || 1,
          order: q.order || q.question_number || index + 1,
          choices: (q.choices || []).map((c: any) => ({
            id: c.id,
            choice_text: c.choice_text || c.text || '',
            is_correct: c.is_correct || false,
          })),
        })),
        currentStep: (groupData.questions?.length || 0) > 0 ? 2 : 1,
        showBuilder: true,
      }));

      errorLogger.info(`TestHead ${testHeadId} loaded successfully`, 'QuestionBuilder');
    } catch (error: any) {
      errorLogger.error(`Failed to load TestHead ${testHeadId}`, 'QuestionBuilder', error);
      setError(error.message || 'Failed to load test head data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel
  const cancel = useCallback(() => {
    if (options.onCancel) {
      options.onCancel();
    } else if (options.passageId) {
      router.push(`/manager/reading/view/${options.passageId}`);
    } else if (options.listeningPartId) {
      router.push(`/manager/listening/view/${options.listeningPartId}`);
    } else {
      router.push('/manager/reading');
    }
  }, [options, router]);

  // Reset Form
  const resetForm = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    // State
    ...state,
    selectedQuestionType,
    canProceedToStep2,
    canProceedToStep3,
    progressPercentage,

    // Type checks
    isMCQType,
    isTFNG,
    isMatching,
    isSummaryCompletion,
    isNoteCompletion,
    isFormCompletion,
    isTableCompletion,
    isDiagramLabeling,
    isMapLabeling,

    // Step Management
    goToStep,
    nextStep,
    previousStep,

    // Question Group
    setQuestionGroup,
    updateQuestionData,
    updateImageFile,

    // Questions
    addQuestion,
    updateQuestion,
    removeQuestion,
    moveQuestionUp,
    moveQuestionDown,
    duplicateQuestion,
    clearAllQuestions,
    setEditingQuestionIndex,
    reorderQuestion,
    handleBulkQuestions,

    // UI
    togglePreview,
    toggleBuilder,
    setError,
    setLoading,
    setSaving,

    // Data
    loadTestHead,
    saveAll,
    cancel,
    resetForm,
    validateQuestionData,
  };
}
