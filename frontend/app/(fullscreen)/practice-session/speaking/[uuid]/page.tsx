"use client";

/**
 * Speaking Practice Page
 * Complete speaking practice flow with AI evaluation and detailed results
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Mic, 
  Square, 
  Volume2, 
  CheckCircle, 
  Circle,
  Sparkles,
  Radio,
  Headphones,
  ArrowLeft,
  Home,
  Award,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  MessageCircle,
  Loader2
} from "lucide-react";
import { getSpeakingDefaultAudios, SpeakingDefaultAudios, SpeakingDefaultAudioInfo } from "@/lib/exam-api";
import { 
  getSectionPracticeDetail, 
  startPractice,
  submitSpeakingAnswer,
  submitSpeakingComplete,
  getSpeakingResult,
  type SpeakingEvaluation,
  type SpeakingResultResponse
} from "@/lib/api/section-practice";
import type { SectionPracticeDetail, SpeakingTopicContent, SpeakingPracticeQuestion } from "@/types/section-practice";

// Extended type to include part info
interface FlattenedQuestion extends SpeakingPracticeQuestion {
  partNumber: 1 | 2 | 3;
  partTitle: string;
  topicId: number;
  globalIndex: number;
  indexInPart: number;
  totalInPart: number;
}

type SpeakingStatus = 
  | "idle" 
  | "playing_intro"
  | "playing_question"
  | "playing_prep"
  | "playing_start"
  | "countdown"
  | "prep_countdown"
  | "recording"
  | "submitting"
  | "evaluating"
  | "completed"
  | "results";

export default function SpeakingPracticePage() {
  const params = useParams();
  const router = useRouter();
  const practiceUuid = params.uuid as string;

  // Practice data
  const [practice, setPractice] = useState<SectionPracticeDetail | null>(null);
  const [attemptUuid, setAttemptUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [countdown, setCountdown] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [defaultAudios, setDefaultAudios] = useState<SpeakingDefaultAudios>({});
  const [defaultAudiosLoaded, setDefaultAudiosLoaded] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'question' | 'prep' | 'recording' | 'completed'>('intro');
  const [isDefaultAudioPlaying, setIsDefaultAudioPlaying] = useState(false);
  const [audioParams, setAudioParams] = useState({
    isPlaying: false,
    duration: 0,
    currentTime: 0
  });
  const [lastPlayedPart, setLastPlayedPart] = useState<number | null>(null);
  
  // Recording state
  const [recordedBlobs, setRecordedBlobs] = useState<Record<string, Blob>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  
  // Results state
  const [evaluationResult, setEvaluationResult] = useState<SpeakingResultResponse | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Audio preloading state
  const [audiosPreloaded, setAudiosPreloaded] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });
  const preloadedAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number>(0);

  // Load practice data
  useEffect(() => {
    loadPractice();
  }, [practiceUuid]);

  const loadPractice = async () => {
    try {
      setLoading(true);
      const data = await getSectionPracticeDetail(practiceUuid);
      
      if (data.section_type !== 'SPEAKING') {
        setError('This is not a speaking practice');
        return;
      }
      
      setPractice(data);
      
      // Check for existing in-progress attempt or start new one
      const existingAttempt = data.user_attempts?.find((a: { status: string }) => a.status === 'IN_PROGRESS');
      if (existingAttempt) {
        setAttemptUuid(existingAttempt.uuid);
        console.log('[Speaking] Continuing existing attempt:', existingAttempt.uuid);
      } else {
        // Start new practice attempt
        const attemptResponse = await startPractice(practiceUuid);
        setAttemptUuid(attemptResponse.attempt.uuid);
        console.log('[Speaking] Started new attempt:', attemptResponse.attempt.uuid);
      }
      setStartTime(Date.now());
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load practice';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get speaking content (must be defined before preloading effect)
  const speakingContent = practice?.content as SpeakingTopicContent | null;

  // Load and preload all audios before starting
  useEffect(() => {
    const loadAndPreloadAudios = async () => {
      try {
        // First, fetch the default audio URLs
        const audios = await getSpeakingDefaultAudios();
        console.log("[Speaking] Default audios loaded:", audios);
        setDefaultAudios(audios);
        setDefaultAudiosLoaded(true);
      } catch (err) {
        console.error("Failed to load default audios:", err);
        setDefaultAudiosLoaded(true);
      }
    };
    loadAndPreloadAudios();
  }, []);

  // Preload all audio files after practice and default audios are loaded
  useEffect(() => {
    if (!practice || !defaultAudiosLoaded || audiosPreloaded) return;

    const preloadAllAudios = async () => {
      const audioUrls: string[] = [];
      
      // Collect default audio URLs
      Object.values(defaultAudios).forEach((audio) => {
        if (audio?.audio_url) {
          audioUrls.push(audio.audio_url);
        }
      });

      // Collect question audio URLs
      if (speakingContent?.questions) {
        speakingContent.questions.forEach((q) => {
          if (q.audio_url) {
            audioUrls.push(q.audio_url);
          }
        });
      }

      if (audioUrls.length === 0) {
        setAudiosPreloaded(true);
        return;
      }

      setPreloadProgress({ loaded: 0, total: audioUrls.length });
      console.log(`[Speaking] Preloading ${audioUrls.length} audio files...`);

      let loadedCount = 0;
      const preloadPromises = audioUrls.map((url) => {
        return new Promise<void>((resolve) => {
          const audio = new Audio();
          audio.preload = 'auto';
          
          audio.oncanplaythrough = () => {
            loadedCount++;
            setPreloadProgress({ loaded: loadedCount, total: audioUrls.length });
            preloadedAudiosRef.current.set(url, audio);
            console.log(`[Speaking] Preloaded (${loadedCount}/${audioUrls.length}):`, url.substring(0, 50));
            resolve();
          };
          
          audio.onerror = () => {
            loadedCount++;
            setPreloadProgress({ loaded: loadedCount, total: audioUrls.length });
            console.warn(`[Speaking] Failed to preload:`, url.substring(0, 50));
            resolve(); // Still resolve to continue
          };
          
          audio.src = url;
          audio.load();
        });
      });

      await Promise.all(preloadPromises);
      console.log('[Speaking] All audios preloaded!');
      setAudiosPreloaded(true);
    };

    preloadAllAudios();
  }, [practice, defaultAudiosLoaded, defaultAudios, speakingContent, audiosPreloaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Flatten questions for linear navigation
  const allQuestions = useMemo(() => {
    if (!speakingContent?.questions) return [];
    
    const partNumber = parseInt(speakingContent.speaking_type.split('_')[1]) as 1 | 2 | 3;
    
    return speakingContent.questions.map((q, idx) => ({
      ...q,
      partNumber,
      partTitle: speakingContent.speaking_type_display,
      topicId: speakingContent.id,
      globalIndex: idx,
      indexInPart: idx,
      totalInPart: speakingContent.questions.length,
    }));
  }, [speakingContent]);

  const currentQuestion = allQuestions[currentIndex];

  // Initialize first question - only after all audios are preloaded
  useEffect(() => {
    if (allQuestions.length > 0 && status === "idle" && defaultAudiosLoaded && audiosPreloaded) {
      startQuestionFlow();
    }
  }, [allQuestions, status, defaultAudiosLoaded, audiosPreloaded]);

  // Watch for question change
  useEffect(() => {
    if (currentQuestion && status !== "idle" && status !== "completed" && status !== "results" && defaultAudiosLoaded && currentIndex > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setRecordingDuration(0);
      setCountdown(0);
      chunksRef.current = [];
      startQuestionFlow();
    }
  }, [currentIndex]);

  // ---------------------------------------------------------------------------
  // AUDIO PLAYBACK LOGIC
  // ---------------------------------------------------------------------------

  const getDefaultAudio = (type: keyof SpeakingDefaultAudios): SpeakingDefaultAudioInfo | undefined => {
    const audio = defaultAudios[type];
    console.log(`[Speaking] Getting default audio for ${type}:`, audio?.audio_url ? 'URL found' : 'No URL');
    return audio;
  };

  const playAudioUrl = (url: string, onSuccess: () => void, onError: () => void) => {
    if (!url) {
      console.log('[Speaking] No audio URL provided, skipping');
      onError();
      return;
    }

    console.log('[Speaking] Playing audio URL:', url);

    // Try to use preloaded audio first
    const preloadedAudio = preloadedAudiosRef.current.get(url);
    if (preloadedAudio) {
      console.log('[Speaking] Using preloaded audio');
      audioRef.current = preloadedAudio;
      preloadedAudio.currentTime = 0;
      preloadedAudio.onended = handleAudioEnded;
      preloadedAudio.onerror = (e) => {
        console.error('[Speaking] Preloaded audio playback error:', e);
        onError();
      };
      
      const playPromise = preloadedAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[Speaking] Preloaded audio playing successfully');
            onSuccess();
          })
          .catch((err) => {
            console.error('[Speaking] Preloaded audio play failed:', err);
            onError();
          });
      }
      return;
    }

    // Fallback: Create new audio element if not preloaded
    console.log('[Speaking] Audio not preloaded, loading fresh');
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    audio.onended = handleAudioEnded;
    audio.onerror = (e) => {
      console.error('[Speaking] Audio playback error:', e);
      onError();
    };
    audio.src = url;
    audio.load();
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[Speaking] Audio playing successfully');
          onSuccess();
        })
        .catch((err) => {
          console.error('[Speaking] Audio play failed:', err);
          onError();
        });
    }
  };

  const startQuestionFlow = () => {
    if (!currentQuestion) return;
    
    const part = currentQuestion.partNumber;
    console.log(`[Speaking] Starting flow for question ${currentIndex + 1}, part ${part}, lastPlayedPart: ${lastPlayedPart}`);
    
    if (lastPlayedPart !== part) {
      setLastPlayedPart(part);
      playPartIntro(part);
    } else {
      playQuestionAudio();
    }
  };

  const playPartIntro = (part: number) => {
    let introType: keyof SpeakingDefaultAudios;
    
    switch (part) {
      case 1:
        introType = 'PART_1_INTRO';
        break;
      case 2:
        introType = 'PART_2_INTRO';
        break;
      case 3:
        introType = 'PART_3_INTRO';
        break;
      default:
        playQuestionAudio();
        return;
    }
    
    const introAudio = getDefaultAudio(introType);
    console.log(`[Speaking] Playing intro for part ${part}`);
    
    if (introAudio?.audio_url) {
      setCurrentPhase('intro');
      setIsDefaultAudioPlaying(true);
      setStatus("playing_intro");
      
      playAudioUrl(
        introAudio.audio_url,
        () => {}, // onSuccess - audio is playing
        () => {
          // onError - skip to question
          console.log("[Speaking] Intro audio failed, skipping to question");
          setIsDefaultAudioPlaying(false);
          playQuestionAudio();
        }
      );
    } else {
      console.log("[Speaking] No intro audio found, skipping to question");
      playQuestionAudio();
    }
  };

  const handleAudioEnded = () => {
    console.log(`[Speaking] Audio ended, phase: ${currentPhase}, isDefaultPlaying: ${isDefaultAudioPlaying}`);
    
    if (isDefaultAudioPlaying) {
      setIsDefaultAudioPlaying(false);
      
      if (currentPhase === 'intro') {
        playQuestionAudio();
      } else if (currentPhase === 'prep') {
        startPrepCountdown();
      } else if (currentPhase === 'recording') {
        startRecording();
      }
    } else {
      if (currentQuestion?.partNumber === 2 && currentPhase === 'question') {
        playPrepAudio();
      } else {
        startCountdown();
      }
    }
  };

  const playPrepAudio = () => {
    const prepAudio = getDefaultAudio('PART_2_PREP');
    console.log("[Speaking] Playing prep audio");
    
    if (prepAudio?.audio_url) {
      setCurrentPhase('prep');
      setIsDefaultAudioPlaying(true);
      setStatus("playing_prep");
      
      playAudioUrl(
        prepAudio.audio_url,
        () => {}, // onSuccess
        () => {
          // onError - skip to countdown
          console.log("[Speaking] Prep audio failed, starting countdown");
          setIsDefaultAudioPlaying(false);
          startPrepCountdown();
        }
      );
    } else {
      startPrepCountdown();
    }
  };

  const startPrepCountdown = () => {
    setCurrentPhase('prep');
    setStatus("prep_countdown");
    const prepTime = 60;
    setCountdown(prepTime);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          playStartSpeakingAudio();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const playStartSpeakingAudio = () => {
    const startAudio = getDefaultAudio('PART_2_START');
    console.log("[Speaking] Playing start speaking audio");
    
    if (startAudio?.audio_url) {
      setCurrentPhase('recording');
      setIsDefaultAudioPlaying(true);
      setStatus("playing_start");
      
      playAudioUrl(
        startAudio.audio_url,
        () => {}, // onSuccess
        () => {
          // onError - start recording
          console.log("[Speaking] Start audio failed, starting recording");
          setIsDefaultAudioPlaying(false);
          startRecording();
        }
      );
    } else {
      startRecording();
    }
  };

  const playQuestionAudio = () => {
    setCurrentPhase('question');
    console.log("[Speaking] Playing question audio:", currentQuestion?.audio_url);
    
    if (!currentQuestion?.audio_url) {
      console.log("[Speaking] No question audio, skipping");
      if (currentQuestion?.partNumber === 2) {
        playPrepAudio();
      } else {
        startCountdown();
      }
      return;
    }

    setStatus("playing_question");
    setIsDefaultAudioPlaying(false);
    
    playAudioUrl(
      currentQuestion.audio_url,
      () => {}, // onSuccess
      () => {
        // onError - skip to next step
        console.log("[Speaking] Question audio failed, continuing");
        if (currentQuestion?.partNumber === 2) {
          startPrepCountdown();
        } else {
          startCountdown();
        }
      }
    );
  };

  const startCountdown = () => {
    setCurrentPhase('recording');
    setStatus("countdown");
    const prepTime = currentQuestion?.preparation_time || 5;
    setCountdown(prepTime);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ---------------------------------------------------------------------------
  // RECORDING LOGIC
  // ---------------------------------------------------------------------------

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        handleRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setStatus("recording");
      recordingStartRef.current = Date.now();
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - recordingStartRef.current) / 1000);
        setRecordingDuration(duration);

        if (currentQuestion?.response_time && duration >= currentQuestion.response_time) {
          stopRecording();
        }
      }, 1000);

    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone access is required. Please enable permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("submitting");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleRecordingComplete = async (blob: Blob) => {
    if (!currentQuestion || !currentQuestion.question_key || !attemptUuid) {
      moveToNextQuestion();
      return;
    }

    setStatus("submitting");
    
    // Store blob locally
    setRecordedBlobs(prev => ({
      ...prev,
      [currentQuestion.question_key]: blob
    }));

    // Upload to server
    try {
      setUploadProgress(prev => ({ ...prev, [currentQuestion.question_key]: true }));
      
      await submitSpeakingAnswer(attemptUuid, currentQuestion.question_key, blob);
      console.log(`[Speaking] Recording uploaded for ${currentQuestion.question_key}`);
      
      setUploadProgress(prev => ({ ...prev, [currentQuestion.question_key]: false }));
    } catch (err) {
      console.error("Failed to upload recording:", err);
      setUploadProgress(prev => ({ ...prev, [currentQuestion.question_key]: false }));
    }
    
    moveToNextQuestion();
  };

  const moveToNextQuestion = () => {
    if (currentIndex < allQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setStatus("completed");
    }
  };

  // ---------------------------------------------------------------------------
  // EVALUATION
  // ---------------------------------------------------------------------------

  const handleCompleteAndEvaluate = async () => {
    if (!attemptUuid) return;
    
    setEvaluating(true);
    setStatus("evaluating");
    
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      // Trigger evaluation
      const evalResponse = await submitSpeakingComplete(attemptUuid, timeSpent);
      console.log("[Speaking] Evaluation response:", evalResponse);
      
      // Get detailed results
      const result = await getSpeakingResult(attemptUuid);
      setEvaluationResult(result);
      setStatus("results");
      
      // Redirect to results page
      router.push(`/practice-session/speaking/results/${attemptUuid}`);
      
    } catch (err: unknown) {
      console.error("Evaluation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to evaluate speaking";
      setError(errorMessage);
    } finally {
      setEvaluating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    router.push('/practice');
  };

  const getBandColor = (score: number): string => {
    if (score >= 7) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 6) return "text-blue-600 dark:text-blue-400";
    if (score >= 5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getBandBgColor = (score: number): string => {
    if (score >= 7) return "from-emerald-500 to-teal-600";
    if (score >= 6) return "from-blue-500 to-indigo-600";
    if (score >= 5) return "from-yellow-500 to-orange-600";
    return "from-red-500 to-rose-600";
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading speaking practice...</p>
        </div>
      </div>
    );
  }

  // Show preloading progress
  if (!audiosPreloaded && preloadProgress.total > 0) {
    const progressPercent = Math.round((preloadProgress.loaded / preloadProgress.total) * 100);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/20 dark:from-gray-950 dark:via-orange-950/20 dark:to-amber-950/10">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Headphones className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Preparing Your Exam</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Downloading audio files for smooth playback...</p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {preloadProgress.loaded} / {preloadProgress.total} audio files loaded ({progressPercent}%)
          </p>
        </div>
      </div>
    );
  }

  if (error || !practice) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error</h3>
          <p className="text-red-600 dark:text-red-300 mb-4">{error || 'Practice not found'}</p>
          <button
            onClick={() => router.push('/practice')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!speakingContent || allQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 bg-gray-50 dark:bg-gray-900">
        <p className="text-lg text-gray-600 dark:text-gray-400">No speaking questions available.</p>
        <button
          onClick={() => router.push('/practice')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RESULTS SCREEN
  // ---------------------------------------------------------------------------

  if (status === "results" && evaluationResult) {
    const eval_ = evaluationResult.evaluation;
    const overallBand = evaluationResult.score ?? 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Speaking Results</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{practice.title}</p>
              </div>
            </div>
            <button
              onClick={handleFinish}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Practice
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Overall Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
            <div className={`bg-gradient-to-r ${getBandBgColor(overallBand)} p-8 text-white text-center`}>
              <p className="text-lg opacity-90 mb-2">Overall Band Score</p>
              <div className="text-7xl font-bold mb-2">{overallBand.toFixed(1)}</div>
              <p className="text-sm opacity-75">
                {formatTime(evaluationResult.time_spent_seconds)} total time
              </p>
            </div>
            
            {/* Criteria Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
              {[
                { key: 'fluency_and_coherence', label: 'Fluency & Coherence', icon: MessageCircle },
                { key: 'lexical_resource', label: 'Lexical Resource', icon: BookOpen },
                { key: 'grammatical_range_and_accuracy', label: 'Grammar', icon: CheckCircle },
                { key: 'pronunciation', label: 'Pronunciation', icon: Volume2 },
              ].map(({ key, label, icon: Icon }) => {
                const criterion = eval_?.[key as keyof SpeakingEvaluation] as { score: number; feedback: string } | undefined;
                const score = criterion?.score ?? 0;
                
                return (
                  <div key={key} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${getBandColor(score)}`} />
                    <div className={`text-2xl font-bold ${getBandColor(score)}`}>
                      {score.toFixed(1)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Azure Pronunciation Scores */}
          {evaluationResult.azure_scores && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-blue-500" />
                Speech Analysis Scores
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'pronunciation', label: 'Pronunciation', value: evaluationResult.azure_scores.pronunciation },
                  { key: 'fluency', label: 'Fluency', value: evaluationResult.azure_scores.fluency },
                  { key: 'accuracy', label: 'Accuracy', value: evaluationResult.azure_scores.accuracy },
                ].map(({ key, label, value }) => (
                  <div key={key} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
                        <circle 
                          cx="40" cy="40" r="35" 
                          stroke="currentColor" 
                          strokeWidth="8" 
                          fill="none" 
                          className={value >= 70 ? "text-emerald-500" : value >= 50 ? "text-yellow-500" : "text-red-500"}
                          strokeDasharray={`${(value / 100) * 220} 220`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(value)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Feedback */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Strengths */}
            {eval_?.strengths && eval_.strengths.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {eval_.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {eval_?.areas_for_improvement && eval_.areas_for_improvement.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {eval_.areas_for_improvement.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                      <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Pronunciation Improvements */}
          {eval_?.pronunciation_improvements && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-purple-500" />
                Pronunciation Tips
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {eval_.pronunciation_improvements.specific_words?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Words to Practice</h4>
                    <div className="flex flex-wrap gap-2">
                      {eval_.pronunciation_improvements.specific_words.map((word, idx) => (
                        <span key={idx} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {eval_.pronunciation_improvements.phonetic_tips?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Phonetic Tips</h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {eval_.pronunciation_improvements.phonetic_tips.map((tip, idx) => (
                        <li key={idx}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {eval_.pronunciation_improvements.practice_exercises?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Practice Exercises</h4>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {eval_.pronunciation_improvements.practice_exercises.map((exercise, idx) => (
                        <li key={idx}>• {exercise}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Criteria Feedback */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Detailed Feedback</h2>
            <div className="space-y-4">
              {[
                { key: 'fluency_and_coherence', label: 'Fluency & Coherence' },
                { key: 'lexical_resource', label: 'Lexical Resource' },
                { key: 'grammatical_range_and_accuracy', label: 'Grammatical Range & Accuracy' },
                { key: 'pronunciation', label: 'Pronunciation' },
              ].map(({ key, label }) => {
                const criterion = eval_?.[key as keyof SpeakingEvaluation] as { score: number; feedback: string } | undefined;
                
                return criterion?.feedback ? (
                  <div key={key} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">{label}</h4>
                      <span className={`font-bold ${getBandColor(criterion.score)}`}>
                        Band {criterion.score.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{criterion.feedback}</p>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Transcripts */}
          {evaluationResult.transcripts && evaluationResult.transcripts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Responses</h2>
              <div className="space-y-4">
                {evaluationResult.transcripts.map((t, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Q{idx + 1}: {t.question_text || t.question_key}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm italic">
                      &quot;{t.transcript || 'No transcript available'}&quot;
                    </p>
                    {t.mispronounced_words && t.mispronounced_words.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.mispronounced_words.slice(0, 5).map((w, widx) => (
                          <span key={widx} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                            {w.word}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pb-8">
            <button
              onClick={() => router.push('/practice')}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Back to Practice
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-colors flex items-center gap-2 shadow-lg"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // COMPLETION / EVALUATING SCREEN
  // ---------------------------------------------------------------------------

  if (status === "completed" || status === "evaluating") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full p-10 text-center">
          {evaluating || status === "evaluating" ? (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Evaluating Your Speaking
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                AI is analyzing your pronunciation, fluency, and content...
              </p>
              <div className="flex justify-center gap-2 mt-6">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Practice Complete!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You&apos;ve completed all {allQuestions.length} speaking questions.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
                {Object.keys(recordedBlobs).length} recordings captured
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCompleteAndEvaluate}
                  disabled={evaluating}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5" />
                  Get AI Evaluation
                </button>
                <button
                  onClick={handleFinish}
                  className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Skip & Go Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN PRACTICE UI
  // ---------------------------------------------------------------------------

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10 overflow-hidden transition-all duration-500">
      
      {/* HIDDEN AUDIO ELEMENT */}
      <audio 
        ref={audioRef}
        onEnded={handleAudioEnded}
        onTimeUpdate={(e) => {
          const currentTime = e.currentTarget?.currentTime ?? 0;
          setAudioParams(prev => ({ ...prev, currentTime }));
        }}
        onLoadedMetadata={(e) => {
          const duration = e.currentTarget?.duration ?? 0;
          setAudioParams(prev => ({ ...prev, duration }));
        }}
        className="hidden"
      />

      {/* LEFT SIDE - CONTENT (70%) */}
      <div className="w-[70%] flex flex-col h-full relative backdrop-blur-sm">
        
        {/* HEADER */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-10">
          {/* Progress Bar */}
          <div className="relative h-1.5 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out shadow-lg shadow-indigo-500/50"
              style={{ width: `${((currentIndex) / allQuestions.length) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/practice')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30">
                    <Headphones className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
                      {practice.title}
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Speaking Practice</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    <span className="text-sm font-bold text-white">
                      {currentIndex + 1} / {allQuestions.length}
                    </span>
                  </div>
                </div>
              </div>
             
              {/* Question Progress Dots */}
              <div className="flex items-center justify-center gap-2">
                {allQuestions.map((q, idx) => {
                  const isActive = idx === currentIndex;
                  const isCompleted = idx < currentIndex;
                  
                  return (
                    <div 
                      key={idx}
                      className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                        isActive 
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 scale-150 shadow-lg shadow-indigo-600/60 ring-2 ring-indigo-300 dark:ring-indigo-700" 
                          : isCompleted 
                            ? "bg-emerald-500 scale-110 shadow-md shadow-emerald-500/50" 
                            : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* QUESTION DISPLAY */}
        <div className="flex-1 h-full overflow-y-auto p-10 flex items-center justify-center relative">
          <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-bold mb-4 shadow-lg shadow-indigo-500/10">
               <Circle className="w-3 h-3 fill-current animate-pulse" />
               {currentQuestion?.partTitle || speakingContent.speaking_type_display}
            </div>

            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-800/50">
              <h2 className={`font-bold text-gray-900 dark:text-white leading-tight ${
                currentQuestion?.partNumber === 2 ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"
              }`}>
                {currentQuestion?.question_text}
              </h2>
            </div>
            
            {/* Cue Card for Part 2 */}
            {currentQuestion?.partNumber === 2 && currentQuestion?.cue_card_points && currentQuestion.cue_card_points.length > 0 && (
               <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-yellow-900/10 dark:to-amber-900/10 border-2 border-amber-200 dark:border-yellow-900/30 p-6 rounded-2xl mt-8 shadow-xl shadow-amber-500/10">
                 <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-500 mb-3">You should say:</h3>
                 <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                   {currentQuestion.cue_card_points.map((point, idx) => (
                     <li key={idx} className="flex items-start gap-2">
                       <span className="text-amber-500 dark:text-yellow-500 mt-1">•</span>
                       <span>{point}</span>
                     </li>
                   ))}
                 </ul>
               </div>
            )}

            {(status === "playing_question" || status === "playing_intro" || status === "playing_prep" || status === "playing_start") && (
              <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl mt-8 shadow-lg">
                <div className="flex gap-1.5 h-8 items-end">
                   {[...Array(5)].map((_, i) => (
                     <div 
                       key={i} 
                       className="w-1.5 bg-gradient-to-t from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 rounded-full animate-music-bar"
                       style={{ 
                         height: `${Math.random() * 100}%`,
                         animationDelay: `${i * 0.1}s` 
                       }}
                     />
                   ))}
                </div>
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  {status === "playing_intro" && "Listening to instructions..."}
                  {status === "playing_question" && "Reading question..."}
                  {status === "playing_prep" && "Preparation instructions..."}
                  {status === "playing_start" && "Starting soon..."}
                </span>
              </div>
            )}
          </div>
          
          {/* Background Decoration */}
          <div className="absolute top-0 left-0 p-12 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <Mic className="w-96 h-96 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - RECORDING UI (30%) */}
      <div className="w-[30%] bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-l border-gray-200/50 dark:border-gray-800/50 flex flex-col relative shadow-2xl z-10 backdrop-blur-xl">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
          
          {/* STATUS INDICATOR */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Radio className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-xs">
                Current Status
              </h2>
            </div>
            <div className={`text-3xl font-bold transition-all duration-300 ${
              status === "recording" ? "text-transparent bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text animate-pulse" : 
              (status === "countdown" || status === "prep_countdown") ? "text-transparent bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text" :
              (status === "playing_intro" || status === "playing_question" || status === "playing_prep" || status === "playing_start") ? "text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text" :
              "text-gray-900 dark:text-white"
            }`}>
              {status === "idle" && "Ready"}
              {status === "playing_intro" && "Listen to Instructions"}
              {status === "playing_question" && "Listen Carefully"}
              {status === "playing_prep" && "Preparation Time"}
              {status === "playing_start" && "Get Ready to Speak"}
              {status === "countdown" && "Get Ready..."}
              {status === "prep_countdown" && "Prepare Your Answer"}
              {status === "recording" && "Recording..."}
              {status === "submitting" && "Saving..."}
            </div>
          </div>

          {/* MAIN VISUALIZER / COUNTDOWN */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Outer Rings */}
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
              status === "recording" ? "border-4 border-red-500/20 scale-110 animate-ping" : "border-2 border-gray-100 dark:border-gray-800"
            }`} />
            <div className={`absolute inset-4 rounded-full transition-all duration-500 ${
              status === "recording" ? "border-4 border-red-500/30 scale-105 animate-pulse" : "border-2 border-gray-200 dark:border-gray-700"
            }`} />
            <div className={`absolute inset-8 rounded-full transition-all duration-500 ${
              status === "recording" ? "bg-gradient-to-br from-red-500/10 to-pink-500/10 scale-100" : "bg-gray-50 dark:bg-gray-800/50"
            }`} />

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {(status === "countdown" || status === "prep_countdown") && (
                <div className="flex flex-col items-center">
                  <div className="text-8xl font-bold text-transparent bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 bg-clip-text tabular-nums animate-bounce">
                    {countdown}
                  </div>
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2">
                    {status === "prep_countdown" ? "seconds to prepare" : "seconds"}
                  </div>
                </div>
              )}
              
              {status === "recording" && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                    <Mic className="w-20 h-20 text-red-500 relative z-10 animate-pulse" />
                  </div>
                  <div className="text-5xl font-mono font-bold text-transparent bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text tabular-nums">
                    {formatTime(recordingDuration)}
                  </div>
                  <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">REC</span>
                  </div>
                </div>
              )}

              {(status === "playing_question" || status === "playing_intro" || status === "playing_prep" || status === "playing_start" || status === "idle" || status === "submitting") && (
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 ${
                    (status === "playing_question" || status === "playing_intro" || status === "playing_prep" || status === "playing_start") ? "bg-indigo-500/30 animate-pulse" : 
                    status === "submitting" ? "bg-purple-500/30 animate-pulse" : 
                    "bg-gray-300/20"
                  }`} />
                  <div className="bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-850 p-8 rounded-full shadow-xl relative z-10">
                     {status === "submitting" ? (
                       <div className="w-16 h-16 border-4 border-transparent border-t-indigo-500 border-r-purple-500 rounded-full animate-spin" />
                     ) : (
                       <Volume2 className={`w-16 h-16 ${(status === "playing_question" || status === "playing_intro" || status === "playing_prep" || status === "playing_start") ? "text-indigo-500 animate-pulse" : "text-gray-400"}`} />
                     )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CONTROLS */}
          <div className="w-full max-w-xs space-y-4">
             {status === "recording" && (
               <button
                 onClick={stopRecording}
                 className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-2xl font-bold shadow-xl shadow-red-500/40 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
               >
                 <Square className="w-5 h-5 fill-current" />
                 Stop Recording
               </button>
             )}
             
             <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700">
               <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">Time Limit</div>
               <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                 {currentQuestion?.response_time ? formatTime(currentQuestion.response_time) : "No limit"}
               </div>
             </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes music-bar {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-music-bar {
          animation: music-bar 0.8s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
