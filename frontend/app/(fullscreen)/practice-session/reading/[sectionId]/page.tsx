'use client';

/**
 * Unified Reading Practice Page
 * Supports both book sections (numeric IDs) and section practices (UUIDs)
 * URL: /practice-session/reading/[sectionId]
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuestionRenderer from '@/components/exam/QuestionRenderer';
import TextHighlighter from '@/components/exam/TextHighlighter';
import PracticeHeader from '@/components/practice/PracticeHeader';
import PracticeQuestionPalette from '@/components/practice/PracticeQuestionPalette';
import TimeUpDialog from '@/components/practice/TimeUpDialog';
import TimerStartDialog from '@/components/practice/TimerStartDialog';
import { formatPassageContent } from '@/lib/exam-utils';
import { getSectionDetail, submitSectionAnswers } from '@/lib/api/books';
import { EmailNotVerifiedError } from '@/lib/api-client';
import type { SectionDetailResponse } from '@/types/books';

// Default duration in minutes for reading section (IELTS standard: 20 min per passage)
const DEFAULT_READING_DURATION = 20;

export default function ReadingPracticePage() {
  const params = useParams();
  const router = useRouter();
  
  // Support both numeric IDs (book sections) and UUIDs (section practices)
  const sectionIdParam = params.sectionId as string;
  const isUUID = sectionIdParam.includes('-');
  const sectionId: number | string = isUUID ? sectionIdParam : parseInt(sectionIdParam);

  const [data, setData] = useState<SectionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [fontSize, setFontSize] = useState('text-base');
  const [splitPosition, setSplitPosition] = useState(50);

  // Timer state - track elapsed time properly
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [showTimerDialog, setShowTimerDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [customTimerDuration, setCustomTimerDuration] = useState<number | null>(null);
  
  // Track actual elapsed time for submission
  const elapsedTimeRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const passageRef = useRef<HTMLDivElement>(null!);
  const questionsRef = useRef<HTMLDivElement>(null!);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    loadSectionData();
  }, [sectionId]);

  // Track elapsed time when timer is running
  useEffect(() => {
    if (isTimerRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      lastTickRef.current = Date.now();
      const interval = setInterval(() => {
        if (lastTickRef.current) {
          const now = Date.now();
          elapsedTimeRef.current += Math.floor((now - lastTickRef.current) / 1000);
          lastTickRef.current = now;
        }
      }, 1000);
      return () => {
        if (lastTickRef.current) {
          const now = Date.now();
          elapsedTimeRef.current += Math.floor((now - lastTickRef.current) / 1000);
          lastTickRef.current = null;
        }
        clearInterval(interval);
      };
    } else {
      lastTickRef.current = null;
    }
  }, [isTimerRunning]);

  // Listen for font size changes
  useEffect(() => {
    const handleFontSizeChange = (event: CustomEvent) => {
      const { fontSize: newFontSize } = event.detail;
      setFontSize(newFontSize);
    };

    window.addEventListener('fontSizeChange', handleFontSizeChange as EventListener);
    return () => {
      window.removeEventListener('fontSizeChange', handleFontSizeChange as EventListener);
    };
  }, []);

  const loadSectionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const sectionData = await getSectionDetail(sectionId);

      if (sectionData.section_type !== 'READING') {
        throw new Error('This is not a reading section');
      }

      setData(sectionData);
    } catch (err: any) {
      if (err instanceof EmailNotVerifiedError) {
        router.push('/verify-email');
        return;
      }
      setError(err?.message || 'Failed to load section');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = useCallback((questionId: number, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  }, []);

  const scrollToQuestion = useCallback((questionId: number) => {
    const element = questionRefs.current[questionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Timer handlers
  const handleTimerStart = useCallback((customDuration?: number) => {
    if (customDuration) {
      setCustomTimerDuration(customDuration);
    }
    setIsTimerRunning(true);
    setTimerStarted(true);
    setShowTimerDialog(false);
    // Reset elapsed time when starting fresh
    elapsedTimeRef.current = 0;
    startTimeRef.current = Date.now();
  }, []);

  const handleTimerPause = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const handleTimerClick = useCallback(() => {
    if (!timerStarted) {
      setShowTimerDialog(true);
    }
  }, [timerStarted]);

  const handleTimeUp = useCallback(() => {
    setIsTimerRunning(false);
    setShowTimeUpDialog(true);
  }, []);

  const handleSubmit = async (skipConfirm = false) => {
    if (!data) return;

    if (!skipConfirm) {
      const confirmed = window.confirm(
        'Are you sure you want to submit your answers? You cannot change them after submission.'
      );
      if (!confirmed) return;
    }

    try {
      setSubmitting(true);
      // Calculate time spent: use elapsed time ref or calculate from start time
      let timeSpent = elapsedTimeRef.current;
      
      // If elapsed time is 0 but we have a start time, calculate it
      if (timeSpent === 0 && startTimeRef.current) {
        timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      }

      // Submit answers to backend - it will calculate score and save result
      await submitSectionAnswers(sectionId, {
        answers,
        time_spent: timeSpent,
      });

      // Navigate to results page - results page will fetch data from API
      router.push(`/practice-session/reading/${sectionIdParam}/results`);
    } catch (err: any) {
      if (err instanceof EmailNotVerifiedError) {
        router.push('/verify-email');
        return;
      }
      alert(err?.message || 'Failed to submit answers');
      setSubmitting(false);
    }
  };

  const handleTimeUpSubmit = useCallback(() => {
    handleSubmit(true);
  }, [data, sectionId, answers, sectionIdParam]);

  const handleExit = () => {
    const confirmed = window.confirm(
      'Are you sure you want to exit? Your progress will not be saved.'
    );
    if (confirmed) {
      // For section practices, go back to practice page; for books, go to book detail
      if (data?.source === 'practice' || data?.book.id === 0) {
        router.push('/practice');
      } else {
        router.push(`/dashboard/books/${data?.book.id}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading reading section...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-300 mb-4">{error || 'Section not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const passage = data.reading_passage;
  
  // If no passage data, show error
  if (!passage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-300">
            This section does not have reading passage data.
          </p>
        </div>
      </div>
    );
  }
  
  const answeredCount = Object.keys(answers).filter(
    id => answers[parseInt(id)] !== '' && answers[parseInt(id)] !== null
  ).length;

  // Get all questions for palette
  const allQuestions = passage.test_heads?.flatMap((th: any) =>
    th.questions?.map((q: any) => ({
      id: q.id,
      order: q.order,
      type: th.question_type,
      max_selections: q.max_selections,
    })) || []
  ) || [];

  // Get timer duration (use custom duration, section duration, or default)
  const defaultDurationMinutes = data.duration_minutes || DEFAULT_READING_DURATION;
  const timerDurationMinutes = customTimerDuration || defaultDurationMinutes;
  const timerDuration = timerDurationMinutes * 60;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Timer Start Dialog */}
      <TimerStartDialog
        isOpen={showTimerDialog}
        onStart={handleTimerStart}
        sectionType="reading"
        duration={defaultDurationMinutes}
        title={data.title}
      />

      {/* Time Up Dialog */}
      <TimeUpDialog
        isOpen={showTimeUpDialog}
        onSubmit={handleTimeUpSubmit}
        submitting={submitting}
        answeredCount={answeredCount}
        totalQuestions={data.total_questions}
        sectionType="Reading"
      />

      {/* Header */}
      <PracticeHeader
        title={data.title}
        subtitle={data.book.title}
        answeredCount={answeredCount}
        totalQuestions={data.total_questions}
        onSubmit={() => handleSubmit()}
        onExit={handleExit}
        submitting={submitting}
        bookId={data.book.id}
        sectionType="reading"
        timerDuration={timerDuration}
        isTimerRunning={isTimerRunning}
        timerStarted={timerStarted}
        onTimerStart={handleTimerStart}
        onTimerPause={handleTimerPause}
        onTimerClick={handleTimerClick}
        onTimeUp={handleTimeUp}
      />

      {/* Split Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Passage */}
        <div
          className="overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 mb-8"
          style={{ width: `${splitPosition}%` }}
        >
          <div ref={passageRef} className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {passage.title || 'Reading Passage'}
            </h2>
            <div
              className={`prose prose-gray dark:prose-invert max-w-none ${fontSize}`}
              dangerouslySetInnerHTML={{ __html: formatPassageContent(passage.content || passage.passage || '') }}
            />
          </div>

          {/* TextHighlighter for passage */}
          <TextHighlighter
            sectionName="reading"
            containerRef={passageRef}
            attemptId={`practice-${sectionId}`}
          />
        </div>

        {/* Resizer */}
        <div
          className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 dark:hover:bg-blue-400 cursor-col-resize transition-colors relative group"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = splitPosition;
            const containerWidth = e.currentTarget.parentElement!.offsetWidth;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const newWidth = startWidth + (deltaX / containerWidth) * 100;
              setSplitPosition(Math.max(30, Math.min(70, newWidth)));
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-400 dark:bg-gray-500 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 rounded-full p-2 shadow-md transition-colors pointer-events-none">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </div>
        </div>

        {/* Right: Questions */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-24">
          <div ref={questionsRef} className="p-6 space-y-8">
            {passage.test_heads?.map((testHead: any) => (
              <div
                key={testHead.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="space-y-6">
                  <QuestionRenderer
                    group={testHead}
                    userAnswers={answers}
                    onAnswer={handleAnswer}
                    fontSize={fontSize}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* TextHighlighter for questions */}
          <TextHighlighter
            sectionName="reading-questions"
            containerRef={questionsRef}
            attemptId={`practice-${sectionId}`}
          />
        </div>
      </div>

      {/* Question Palette */}
      <PracticeQuestionPalette
        questions={allQuestions}
        answeredQuestions={new Set(
          Object.keys(answers)
            .map(id => parseInt(id))
            .filter(id => {
              const answer = answers[id];
              return answer !== '' && answer !== null && answer !== undefined;
            })
        )}
        onQuestionClick={scrollToQuestion}
      />
    </div>
  );
}

