/**
 * Listening Section Component
 * Matches the IELTS official test interface design
 * Converted from Vue.js to React with 100% UI/UX parity
 */

"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useExam } from "./ExamContext";
import type { ListeningSection as ListeningSectionType } from "@/types/exam";
import QuestionRenderer from "./QuestionRenderer";
import QuestionPalette from "./QuestionPalette";
import TextHighlighter from "./TextHighlighter";

export default function ListeningSection() {
  const { sectionData, audioPreloading, submitAnswer, userAnswers, handleNextSection, attemptId } = useExam();
  const [activePart, setActivePart] = useState(1); // 1-indexed like Vue.js
  const [fontSize, setFontSize] = useState("text-base"); // Font size state
  const [audioStates, setAudioStates] = useState<Record<number, {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    volume: number;
    cachedTime: number;
  }>>({});
  const [focusedQuestionId, setFocusedQuestionId] = useState<number | null>(null);
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const questionsRef = useRef<Record<number, HTMLDivElement | null>>({});
  const questionsContainerRef = useRef<HTMLDivElement>(null!);

  const listeningData = sectionData as ListeningSectionType;
  const parts = listeningData?.parts || [];
  const nextSectionName = (sectionData as any)?.next_section_name || "Next Section";

  // Cache key for localStorage
  const getCacheKey = useCallback(() => {
    const attemptId = (listeningData as any)?.attempt_id || 'default';
    return `listening-progress-${attemptId}`;
  }, [listeningData]);

  // Load cached progress from localStorage
  const loadCachedProgress = useCallback(() => {
    try {
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const progress = JSON.parse(cached);
        console.log('[LISTENING CACHE] Loaded cached progress:', progress);

        // Restore active part
        if (progress.activePart && progress.activePart >= 1 && progress.activePart <= 4) {
          setActivePart(progress.activePart);
        }

        // Restore audio times for each part
        if (progress.audioTimes) {
          setAudioStates(prev => {
            const newStates = { ...prev };
            Object.entries(progress.audioTimes).forEach(([partNum, time]) => {
              const partNumber = parseInt(partNum);
              if (newStates[partNumber]) {
                newStates[partNumber].cachedTime = time as number;
              }
            });
            return newStates;
          });
        }

        return progress;
      }
    } catch (error) {
      console.error('[LISTENING CACHE] Failed to load cached progress:', error);
    }
    return null;
  }, [getCacheKey]);

  // Save current progress to localStorage
  const saveCachedProgress = useCallback(() => {
    try {
      const cacheKey = getCacheKey();
      const audioTimes: Record<number, number> = {};

      Object.entries(audioStates).forEach(([partNumber, state]) => {
        if (state.currentTime > 0) {
          audioTimes[parseInt(partNumber)] = state.currentTime;
        }
      });

      const progress = {
        activePart,
        audioTimes,
        timestamp: Date.now()
      };

      localStorage.setItem(cacheKey, JSON.stringify(progress));
      console.log('[LISTENING CACHE] Saved progress:', progress);
    } catch (error) {
      console.error('[LISTENING CACHE] Failed to save progress:', error);
    }
  }, [getCacheKey, activePart, audioStates]);

  // Get audio URL (use preloaded blob URL if available)
  const getAudioUrl = useCallback((part: any) => {
    const originalUrl = part.audio_url;
    const preloaded = audioPreloading.preloadedAudios.find(
      (a) => a.partNumber === part.part_number
    );
    
    if (preloaded) {
      return preloaded.blobUrl;
    }
    
    console.log('[LISTENING] Using original audio URL:', originalUrl);
    return originalUrl;
  }, [audioPreloading.preloadedAudios]);

  // Initialize audio states
  useEffect(() => {
    if (parts.length > 0) {
      const initialStates: Record<number, any> = {};
      parts.forEach(part => {
        initialStates[part.part_number] = {
          currentTime: 0,
          duration: 0,
          isPlaying: false,
          volume: 100,
          cachedTime: 0
        };
      });
      setAudioStates(initialStates);

      // Load cached progress
      setTimeout(() => {
        loadCachedProgress();
      }, 100);
    }
  }, [parts, loadCachedProgress]);

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

  // Format time helper
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Audio control functions
  const playAudio = useCallback((partNumber: number) => {
    const audio = audioRefs.current[partNumber];
    if (audio) {
      audio.play().then(() => {
        setAudioStates(prev => ({
          ...prev,
          [partNumber]: { ...prev[partNumber], isPlaying: true }
        }));
        console.log(`[AUDIO] Playing Part ${partNumber}`);
      }).catch(error => {
        console.error(`[AUDIO] Failed to play Part ${partNumber}:`, error);
      });
    }
  }, []);

  const pauseAudio = useCallback((partNumber: number) => {
    const audio = audioRefs.current[partNumber];
    if (audio) {
      audio.pause();
      setAudioStates(prev => ({
        ...prev,
        [partNumber]: { ...prev[partNumber], isPlaying: false }
      }));
      console.log(`[AUDIO] Paused Part ${partNumber}`);
    }
  }, []);

  const toggleAudio = useCallback((partNumber: number) => {
    if (audioStates[partNumber]?.isPlaying) {
      pauseAudio(partNumber);
    } else {
      playAudio(partNumber);
    }
  }, [audioStates, playAudio, pauseAudio]);

  const seekAudio = useCallback((partNumber: number, event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRefs.current[partNumber];
    if (audio && audioStates[partNumber]) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * audioStates[partNumber].duration;
      audio.currentTime = newTime;
    }
  }, [audioStates]);

  const handleAudioLoaded = useCallback((partNumber: number, event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget;
    setAudioStates(prev => ({
      ...prev,
      [partNumber]: { ...prev[partNumber], duration: audio.duration }
    }));

    // Restore cached audio time if available
    const cachedTime = audioStates[partNumber]?.cachedTime;
    if (cachedTime && cachedTime > 0 && cachedTime < audio.duration) {
      audio.currentTime = cachedTime;
      console.log(`[AUDIO] Restored Part ${partNumber} to ${formatTime(cachedTime)}`);
    }
  }, [audioStates, formatTime]);

  const handleTimeUpdate = useCallback((partNumber: number, event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget;
    setAudioStates(prev => ({
      ...prev,
      [partNumber]: { ...prev[partNumber], currentTime: audio.currentTime }
    }));

    // Save progress every 2 seconds
    const currentTime = audio.currentTime;
    if (Math.floor(currentTime) % 2 === 0) {
      saveCachedProgress();
    }
  }, [saveCachedProgress]);

  const handleAudioEnded = useCallback((partNumber: number) => {
    setAudioStates(prev => ({
      ...prev,
      [partNumber]: { ...prev[partNumber], isPlaying: false }
    }));
    console.log(`[AUDIO] Part ${partNumber} finished`);

    // Auto-play next part
    const nextPartNumber = partNumber + 1;
    if (nextPartNumber <= 4 && parts.find(p => p.part_number === nextPartNumber)?.audio_url) {
      console.log(`[AUDIO] Auto-playing Part ${nextPartNumber}`);
      setTimeout(() => {
        setActivePart(nextPartNumber);
        playAudio(nextPartNumber);
      }, 1000);
    }
  }, [parts, playAudio]);

  // Scroll to question
  const scrollToQuestion = useCallback((questionId: number) => {
    const element = questionsRef.current[questionId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setFocusedQuestionId(questionId);
      setTimeout(() => setFocusedQuestionId(null), 2000);
    }
  }, []);

  // Get answered count per part
  const getPartAnsweredCount = useCallback((partNumber: number) => {
    const part = parts.find(p => p.part_number === partNumber);
    if (!part) return 0;

    let count = 0;
    part.test_heads?.forEach(group => {
      group.questions?.forEach(question => {
        if (userAnswers[question.id] && userAnswers[question.id].toString().trim() !== '') {
          // For MCMA questions, count based on max_selections
          if (group.question_type === "MCMA" && question.max_selections) {
            const maxSelections = typeof question.max_selections === 'string' 
              ? parseInt(question.max_selections) 
              : question.max_selections;
            count += maxSelections;
          } else {
            count++;
          }
        }
      });
    });
    return count;
  }, [parts, userAnswers]);

  // Get total questions per part
  const getPartTotalQuestions = useCallback((partNumber: number) => {
    const part = parts.find(p => p.part_number === partNumber);
    if (!part) return 0;

    let total = 0;
    part.test_heads?.forEach(group => {
      group.questions?.forEach(question => {
        // For MCMA questions, count based on max_selections
        if (group.question_type === "MCMA" && question.max_selections) {
          const maxSelections = typeof question.max_selections === 'string' 
            ? parseInt(question.max_selections) 
            : question.max_selections;
          total += maxSelections;
        } else {
          total++;
        }
      });
    });
    return total;
  }, [parts]);

  // Save progress when switching parts
  useEffect(() => {
    saveCachedProgress();
  }, [activePart, saveCachedProgress]);

  // Auto-play Part 1 audio after component mounts (matching Vue.js behavior)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (parts.length > 0 && parts[0]?.audio_url && audioRefs.current[1]) {
        console.log('[AUDIO] Auto-playing Part 1');
        playAudio(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [parts, playAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      saveCachedProgress();
    };
  }, [saveCachedProgress]);

  if (!listeningData || parts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <p className="text-gray-600 dark:text-gray-400">Loading listening section...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Content */}
      <div ref={questionsContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {/* Only show active part */}
        {parts.map((part) => (
          <div key={part.id} style={{ display: part.part_number === activePart ? 'block' : 'none' }}>
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="max-w-5xl mx-auto">
                {/* Hidden Audio Element */}
                {part.audio_url && (
                  <audio
                    ref={(el) => {
                      audioRefs.current[part.part_number] = el;
                    }}
                    src={getAudioUrl(part)}
                    onTimeUpdate={(e) => handleTimeUpdate(part.part_number, e)}
                    onEnded={() => handleAudioEnded(part.part_number)}
                    onLoadedMetadata={(e) => handleAudioLoaded(part.part_number, e)}
                    controlsList="nodownload noplaybackrate"
                    style={{ display: 'none' }}
                  />
                )}

                {/* Question Groups */}
                {part.test_heads?.map((group) => (
                  <div key={group.id} className="mb-8">
                    {/* Question Body Container */}
                    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6 sm:p-8 ${fontSize}`}>
                      {/* Use QuestionRenderer for entire group */}
                      <QuestionRenderer
                        group={group}
                        userAnswers={userAnswers}
                        onAnswer={(questionId: number, answer: string, immediate: boolean) => {
                          submitAnswer(questionId, answer);
                        }}
                        onFocus={(questionId: number) => {
                          setFocusedQuestionId(questionId);
                          setTimeout(() => setFocusedQuestionId(null), 2000);
                        }}
                        fontSize={fontSize}
                      />
                    </div>
                  </div>
                ))}

              
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Question Palette - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-gray-600 shadow-lg z-40">
        <div className="px-4 py-2 max-w-7xl mx-auto">
          {/* Single Line Layout */}
          <div className="flex items-center gap-3 overflow-x-auto">
            {/* Part Buttons with Separators */}
            {parts.map((part, index) => (
              <div key={part.id} className="flex items-center gap-3 shrink-0">
                {/* Part Button */}
                <button
                  onClick={() => setActivePart(part.part_number)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                    activePart === part.part_number
                      ? 'bg-slate-900 dark:bg-slate-700 text-white'
                      : 'bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Part {part.part_number}
                  {activePart !== part.part_number && (
                    <span className="ml-2 text-xs opacity-75">
                      {getPartAnsweredCount(part.part_number)}/{getPartTotalQuestions(part.part_number)}
                    </span>
                  )}
                </button>

                {/* Separator (except after last part) */}
                {index < parts.length - 1 && (
                  <span className="text-slate-300 dark:text-gray-600 shrink-0">|</span>
                )}
              </div>
            ))}

            {/* Arrow Separator */}
            <span className="text-slate-400 dark:text-gray-500 text-lg shrink-0 mx-1">→</span>

            {/* Active Part Questions */}
            <div className="flex items-center gap-2">
              {parts
                .filter(p => p.part_number === activePart)
                .map(part => 
                  part.test_heads?.map(group =>
                    group.questions?.map(question => {
                      const isAnswered = userAnswers[question.id] && 
                                        userAnswers[question.id].toString().trim() !== '';
                      const isFocused = focusedQuestionId === question.id;

                      return (
                        <button
                          key={question.id}
                          onClick={() => scrollToQuestion(question.id)}
                          className={`w-8 h-8 shrink-0 rounded-lg text-sm font-semibold transition-all border-2 ${
                            isFocused
                              ? 'bg-slate-200 dark:bg-gray-700 border-indigo-300 dark:border-indigo-500'
                              : isAnswered
                              ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600'
                              : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-300 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700'
                          }`}
                          title={`Question ${question.order}${isAnswered ? ' - Answered' : ' - Not answered'}`}
                        >
                          {question.order}
                        </button>
                      );
                    })
                  )
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Text Highlighter - per part */}
      <TextHighlighter
        sectionName="listening"
        subSection={`part-${activePart}`}
        containerRef={questionsContainerRef}
        attemptId={attemptId}
      />
    </div>
  );
}
