'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VerificationGuard from '@/components/VerificationGuard';
import QuestionRenderer from '@/components/exam/QuestionRenderer';
import TextHighlighter from '@/components/exam/TextHighlighter';
import PracticeHeader from '@/components/practice/PracticeHeader';
import PracticeQuestionPalette from '@/components/practice/PracticeQuestionPalette';
import AudioStartDialog from '@/components/practice/AudioStartDialog';
import { getSectionDetail, submitSectionAnswers } from '@/lib/api/books';
import type { SectionDetailResponse } from '@/types/books';

export default function ListeningPracticePage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = parseInt(params.sectionId as string);

  const [data, setData] = useState<SectionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(true);

  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [startTime] = useState(Date.now());
  const [fontSize, setFontSize] = useState('text-base');

  // Audio state
  const [audioState, setAudioState] = useState({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 100,
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null!);
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    loadSectionData();
  }, [sectionId]);

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

      if (sectionData.section_type !== 'LISTENING') {
        throw new Error('This is not a listening section');
      }

      setData(sectionData);
    } catch (err: any) {
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

  const handleStartAudio = () => {
    setShowStartDialog(false);
    // Auto-play audio after dialog closes
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.error('[LISTENING] Failed to auto-play audio:', err);
        });
      }
    }, 300);
  };

  const scrollToQuestion = useCallback((questionId: number) => {
    const element = questionRefs.current[questionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleSubmit = async () => {
    if (!data) return;

    const confirmed = window.confirm(
      'Are you sure you want to submit your answers? You cannot change them after submission.'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      // Submit answers to backend - it will calculate score and save result
      await submitSectionAnswers(sectionId, {
        answers,
        time_spent: timeSpent,
      });

      // Navigate to results page - results page will fetch data from API
      router.push(`/dashboard/practice/listening/${sectionId}/results`);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit answers');
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    const confirmed = window.confirm(
      'Are you sure you want to exit? Your progress will not be saved.'
    );
    if (confirmed) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      router.push(`/dashboard/books/${data?.book.id}`);
    }
  };

  // Audio controls
  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (audioState.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const seekAudio = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * audioState.duration;
    audioRef.current.currentTime = newTime;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleAudioLoaded = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget;
    setAudioState(prev => ({ ...prev, duration: audio.duration }));
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget;
    setAudioState(prev => ({ ...prev, currentTime: audio.currentTime }));
  };

  const handlePlay = () => {
    setAudioState(prev => ({ ...prev, isPlaying: true }));
  };

  const handlePause = () => {
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  };

  const handleEnded = () => {
    setAudioState(prev => ({ ...prev, isPlaying: false }));
  };

  if (loading) {
    return (
      <VerificationGuard>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading listening section...</p>
          </div>
        </div>
      </VerificationGuard>
    );
  }

  if (error || !data) {
    return (
      <VerificationGuard>
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
      </VerificationGuard>
    );
  }

  const part = data.listening_part;
  
  // If no listening part data, show error
  if (!part) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-300">
            This section does not have listening audio data.
          </p>
        </div>
      </div>
    );
  }
  
  const answeredCount = Object.keys(answers).filter(
    id => answers[parseInt(id)] !== '' && answers[parseInt(id)] !== null
  ).length;

  // Get all questions for palette
  const allQuestions = part.test_heads?.flatMap((th: any) =>
    th.questions?.map((q: any) => ({
      id: q.id,
      order: q.order,
      type: th.question_type,
      max_selections: q.max_selections,
    })) || []
  ) || [];

  return (
    <VerificationGuard>
      <>
        {/* Audio Start Dialog */}
      <AudioStartDialog
        isOpen={showStartDialog}
        onStart={handleStartAudio}
        partTitle={data.title}
      />

      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <PracticeHeader
          title={data.title}
          subtitle={data.book.title}
          answeredCount={answeredCount}
          totalQuestions={data.total_questions}
          onSubmit={handleSubmit}
          onExit={handleExit}
          submitting={submitting}
          bookId={data.book.id}
          sectionType="listening"
        />

        {/* Hidden Audio Player */}
        {part.audio_url && (
          <audio
            ref={audioRef}
            src={part.audio_url}
            onLoadedMetadata={handleAudioLoaded}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            className="hidden"
          />
        )}

        

        {/* Questions Container */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-24">
          <div ref={questionsRef} className="p-6 max-w-5xl mx-auto space-y-8">
            {part.test_heads?.map((testHead: any) => (
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

          {/* Text Highlighter */}
          <TextHighlighter
            sectionName="listening"
            containerRef={questionsRef}
            attemptId={`practice-${sectionId}`}
          />
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
    </>
    </VerificationGuard>
  );
}
