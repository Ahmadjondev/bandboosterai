"use client";

/**
 * Exam Context Provider
 * Manages global exam state, API calls, and exam flow logic
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  SectionName,
  type ExamContextType,
  type SectionData,
  type Permissions,
  type SystemCheck,
  type AudioPreloading,
  type ConfirmDialogData,
} from "@/types/exam";
import {
  getSectionData,
  submitAnswer as apiSubmitAnswer,
  submitWriting as apiSubmitWriting,
  submitSpeaking as apiSubmitSpeaking,
  nextSection as apiNextSection,
  submitTest as apiSubmitTest,
  pingAPI,
  preloadAudio,
  createAudioBlobUrl,
  revokeAudioBlobUrl,
} from "@/lib/exam-api";
import {
  detectBrowser,
  detectOS,
  isFullscreenSupported,
  requestFullscreen as utilRequestFullscreen,
  isFullscreen as utilIsFullscreen,
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
} from "@/lib/exam-utils";

const ExamContext = createContext<ExamContextType | undefined>(undefined);

export function useExam() {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error("useExam must be used within ExamProvider");
  }
  return context;
}

interface ExamProviderProps {
  children: React.ReactNode;
  attemptId: number | string;
}

export function ExamProvider({ children, attemptId }: ExamProviderProps) {
  const router = useRouter();

  // ============================================================================
  // STATE
  // ============================================================================

  const [currentSection, setCurrentSection] = useState<SectionName>(SectionName.LISTENING);
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionsPage, setShowPermissionsPage] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Permissions
  const [permissions, setPermissions] = useState<Permissions>({
    microphone: { granted: false, checked: false, error: null },
    camera: { granted: false, checked: false, error: null },
    fullscreen: { granted: false, checked: false, error: null },
  });

  const [systemCheck, setSystemCheck] = useState<SystemCheck>({
    browser: "",
    os: "",
    connection: "checking",
  });

  const [audioPreloading, setAudioPreloading] = useState<AudioPreloading>({
    isPreloading: false,
    progress: 0,
    currentFile: "",
    totalFiles: 0,
    loadedFiles: 0,
    errors: [],
    preloadedAudios: [],
  });

  // Confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState<ConfirmDialogData>({
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmClass: "bg-indigo-600 hover:bg-indigo-700",
    onConfirm: null,
    onCancel: null,
  });

  // Debounce timers for answer submission
  const debounceTimersRef = useRef<Record<number, NodeJS.Timeout>>({});
  
  // Track if audio preloading has been initiated (prevents React Strict Mode double-mounting issues)
  const audioPreloadingInitiatedRef = useRef(false);

  // Exposed context state
  const contextShowFullscreenWarning = showFullscreenWarning;
  const contextShowConfirmDialog = showConfirmDialog;
  const contextConfirmDialogData = confirmDialogData;

  // ============================================================================
  // API METHODS
  // ============================================================================

  const loadSectionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setShowInstructions(true);

    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    try {
      const data = await getSectionData(attemptId, currentSection);
      setSectionData(data);

      // Initialize timer
      const duration = data.time_remaining;
      if (duration !== undefined && duration !== null) {
        setTimeRemaining(duration);
      } else {
        // Fallback durations
        const defaultDurations = {
          [SectionName.LISTENING]: 40 * 60,
          [SectionName.READING]: 60 * 60,
          [SectionName.WRITING]: 60 * 60,
          [SectionName.SPEAKING]: 15 * 60,
        };
        setTimeRemaining(defaultDurations[currentSection] || 60 * 60);
      }

      // Load existing answers
      loadExistingAnswers(data);
    } catch (err: any) {
      console.error("Failed to load section:", err);
      setError(err.response?.data?.error || "Failed to load section data");
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, currentSection]);

  const loadExistingAnswers = (data: SectionData) => {
    const answers: Record<number, string> = {};

    if ("parts" in data && data.parts) {
      // Listening section
      data.parts.forEach((part) => {
        part.test_heads?.forEach((group) => {
          group.questions?.forEach((question) => {
            if (question.user_answer) {
              answers[question.id] = question.user_answer;
            }
          });
        });
      });
    } else if ("passages" in data && data.passages) {
      // Reading section
      data.passages.forEach((passage) => {
        passage.test_heads?.forEach((group) => {
          group.questions?.forEach((question) => {
            if (question.user_answer) {
              answers[question.id] = question.user_answer;
            }
          });
        });
      });
    }

    setUserAnswers(answers);
  };

  const startSection = useCallback(() => {
    setShowInstructions(false);
    startTimer();
    utilRequestFullscreen();
  }, []);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          handleNextSection(true); // Auto-advance when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const submitAnswer = useCallback(
    async (questionId: number, answer: string, immediate = false) => {
      // Clear existing timer for this question
      if (debounceTimersRef.current[questionId]) {
        clearTimeout(debounceTimersRef.current[questionId]);
      }

      // Immediate submission (MCQ, checkboxes, radio buttons, dropdowns)
      if (immediate) {
        // Optimistic update - update UI immediately for instant feedback
        setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
        try {
          await apiSubmitAnswer(attemptId, { question_id: questionId, answer });
          console.log(`✓ Answer saved for question ${questionId}`);
        } catch (err) {
          console.error("✗ Failed to submit answer:", err);
        }
        return;
      }

      // For text inputs: optimistic update + debounced API call
      // This prevents input lag by updating state immediately
      setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));

      // Debounce the API call only (not the state update)
      debounceTimersRef.current[questionId] = setTimeout(async () => {
        try {
          await apiSubmitAnswer(attemptId, { question_id: questionId, answer });
          console.log(`✓ Answer saved for question ${questionId}`);
        } catch (err) {
          console.error("✗ Failed to submit answer:", err);
          // On error, we could revert the optimistic update if needed
          // For now, we keep the user's input visible
        }
      }, 800);
    },
    [attemptId]
  );

  const submitWriting = useCallback(
    async (taskId: number, taskType: 1 | 2, answerText: string) => {
      try {
        const response = await apiSubmitWriting(attemptId, {
          task_id: taskId,
          task_type: taskType,
          answer_text: answerText,
        });
        return response;
      } catch (err) {
        console.error("Failed to submit writing:", err);
        throw err;
      }
    },
    [attemptId]
  );

  const submitSpeaking = useCallback(
    async (questionKey: string, audioBlob: Blob) => {
      try {
        const response = await apiSubmitSpeaking(attemptId, {
          question_key: questionKey,
          audio_file: audioBlob,
        });
        return response;
      } catch (err) {
        console.error("Failed to submit speaking:", err);
        throw err;
      }
    },
    [attemptId]
  );

  const handleNextSection = useCallback(
    async (skipConfirmation = false) => {
      if (isLoading) return;

      const nextSection = sectionData?.next_section_name;

      // No next section - finish test
      if (!nextSection) {
        if (!skipConfirmation) {
          const confirmed = await showConfirm({
            title: "Finish Test",
            message:
              "Are you sure you want to finish the test? Speaking section will be conducted offline.",
            confirmText: "Finish Test",
            confirmClass: "bg-emerald-600 hover:bg-emerald-700",
          });
          if (!confirmed) return;
        }
        await handleSubmitTest();
        return;
      }

      // Move to next section
      if (!skipConfirmation) {
        const confirmed = await showConfirm({
          title: "Move to Next Section",
          message:
            "Are you sure you want to move to the next section? You cannot return to this section.",
          confirmText: "Move to Next",
          confirmClass: "bg-indigo-600 hover:bg-indigo-700",
        });
        if (!confirmed) return;
      }

      try {
        setIsLoading(true);

        // Clear listening cache
        if (currentSection === SectionName.LISTENING) {
          removeFromStorage(`listening-progress-${attemptId}`);
        }

        const response = await apiNextSection(attemptId);

        console.log('[NEXT SECTION] API Response:', response);

        if (response.success && response.current_section) {
          // Check if section actually changed
          if (response.current_section.toLowerCase() === currentSection.toLowerCase()) {
            console.error('[NEXT SECTION] Section did not change! Still on:', currentSection);
            setError('Failed to move to next section. Please try again.');
            setIsLoading(false);
            return;
          }

          if (
            response.current_section === "COMPLETED" ||
            response.status === "COMPLETED"
          ) {
            await handleSubmitTest();
          } else {
            setCurrentSection(response.current_section as SectionName);
          }
        } else {
          await handleSubmitTest();
        }
      } catch (err: any) {
        console.error("Failed to move to next section:", err);
        setError("Failed to proceed to next section");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sectionData, attemptId, currentSection]
  );

  const handleSubmitTest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear highlights
      removeFromStorage(`highlights-${attemptId}`);
      removeFromStorage(`listening-progress-${attemptId}`);

      const response = await apiSubmitTest(attemptId);

      if (response.success) {
        console.log("Test submitted successfully!");
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push(`/dashboard/results?attempt=${attemptId}`);
      } else {
        throw new Error(response.message || "Submission failed");
      }
    } catch (err: any) {
      console.error("Failed to submit test:", err);
      setIsLoading(false);

      const errorMessage =
        err.response?.data?.error || err.message || "Failed to submit test";
      const retry = await showConfirm({
        title: "Submission Failed",
        message: `${errorMessage}\n\nWould you like to try again?`,
        confirmText: "Retry",
        cancelText: "Cancel",
        confirmClass: "bg-red-600 hover:bg-red-700",
      });

      if (retry) {
        await handleSubmitTest();
      }
    }
  }, [attemptId, router]);

  const handleExit = useCallback(async () => {
    const confirmed = await showConfirm({
      title: "Exit Test",
      message:
        "Are you sure you want to exit? Your progress will be saved, but you should complete the test in one session.",
      confirmText: "Exit",
      confirmClass: "bg-red-600 hover:bg-red-700",
    });

    if (confirmed) {
      removeFromStorage(`highlights-${attemptId}`);
      router.push("/dashboard");
    }
  }, [attemptId, router]);

  // ============================================================================
  // PERMISSIONS & SYSTEM CHECK
  // ============================================================================

  const checkMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissions((prev) => ({
        ...prev,
        microphone: { granted: true, checked: true, error: null },
      }));
    } catch (err: any) {
      setPermissions((prev) => ({
        ...prev,
        microphone: { granted: false, checked: true, error: err.message },
      }));
    }
  }, []);

  const performSystemCheck = useCallback(async () => {
    // Detect browser and OS
    setSystemCheck({
      browser: detectBrowser(),
      os: detectOS(),
      connection: "checking",
    });

    // Check internet connection
    try {
      const result = await pingAPI();
      setSystemCheck((prev) => ({
        ...prev,
        connection: result.success ? "good" : "poor",
      }));
    } catch {
      setSystemCheck((prev) => ({ ...prev, connection: "offline" }));
    }

    // Check permissions
    await checkMicrophonePermission();
    setPermissions((prev) => ({
      ...prev,
      fullscreen: {
        granted: isFullscreenSupported(),
        checked: true,
        error: null,
      },
    }));

    // Preload audio for listening section
    await preloadListeningAudio();
  }, [checkMicrophonePermission, attemptId]);

  const preloadListeningAudio = useCallback(async () => {
    // Prevent duplicate preloading (React Strict Mode causes double mounting in dev)
    // Use a ref instead of state to ensure synchronous check across all mount cycles
    if (audioPreloadingInitiatedRef.current) {
      console.log("[AUDIO PRELOAD] Already preloading or preloaded, skipping...");
      return;
    }
    
    // Mark as initiated immediately (synchronous, blocks subsequent calls)
    audioPreloadingInitiatedRef.current = true;

    console.log("[AUDIO PRELOAD] Starting audio preloading...");
    setAudioPreloading((prev) => ({ ...prev, isPreloading: true, progress: 0 }));

    try {
      const data = await getSectionData(attemptId, SectionName.LISTENING);
      const audioUrls: Array<{ url: string; partNumber: number }> = [];
      const seenUrls = new Set<string>(); // Track unique URLs to prevent duplicates

      if ("parts" in data && data.parts) {
        console.log(`[AUDIO PRELOAD] Found ${data.parts.length} parts in listening section`);
        
        data.parts.forEach((part) => {
          if (part.audio_url) {
            // Only add unique URLs
            if (!seenUrls.has(part.audio_url)) {
              audioUrls.push({ url: part.audio_url, partNumber: part.part_number });
              seenUrls.add(part.audio_url);
              console.log(`[AUDIO PRELOAD] Part ${part.part_number}: ${part.audio_url}`);
            } else {
              console.log(`[AUDIO PRELOAD] Skipping duplicate URL for Part ${part.part_number}`);
            }
          } else {
            console.log(`[AUDIO PRELOAD] Part ${part.part_number} has no audio_url`);
          }
        });
      }

      console.log(`[AUDIO PRELOAD] Total unique audio files to preload: ${audioUrls.length}`);
      setAudioPreloading((prev) => ({ ...prev, totalFiles: audioUrls.length }));

      if (audioUrls.length === 0) {
        console.log("[AUDIO PRELOAD] No audio files to preload");
        setAudioPreloading((prev) => ({ ...prev, isPreloading: false }));
        return;
      }

      for (let i = 0; i < audioUrls.length; i++) {
        const { url, partNumber } = audioUrls[i];
        console.log(`[AUDIO PRELOAD] Loading Part ${partNumber} (${i + 1}/${audioUrls.length})`);
        
        setAudioPreloading((prev) => ({
          ...prev,
          currentFile: `Part ${partNumber}`,
        }));

        try {
          const blob = await preloadAudio(url);
          const blobUrl = createAudioBlobUrl(blob);
          console.log(`[AUDIO PRELOAD] ✓ Part ${partNumber} loaded successfully (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
          setAudioPreloading((prev) => ({
            ...prev,
            preloadedAudios: [
              ...prev.preloadedAudios,
              { partNumber, originalUrl: url, blobUrl, blob },
            ],
            loadedFiles: prev.loadedFiles + 1,
            progress: Math.round(((prev.loadedFiles + 1) / prev.totalFiles) * 100),
          }));
        } catch (error: any) {
          console.error(`[AUDIO PRELOAD] ✗ Failed to load Part ${partNumber}:`, error);
          setAudioPreloading((prev) => ({
            ...prev,
            errors: [...prev.errors, { partNumber, error: error.message }],
            loadedFiles: prev.loadedFiles + 1, // Count failed attempts
            progress: Math.round(((prev.loadedFiles + 1) / prev.totalFiles) * 100),
          }));
        }
      }

      console.log("[AUDIO PRELOAD] Preloading complete!");
    } catch (error: any) {
      console.error("[AUDIO PRELOAD] Failed to fetch listening data:", error);
      setAudioPreloading((prev) => ({
        ...prev,
        errors: [...prev.errors, { partNumber: "all", error: error.message }],
      }));
    } finally {
      setAudioPreloading((prev) => ({ ...prev, isPreloading: false }));
    }
  }, [attemptId]);

  const proceedToInstructions = useCallback(() => {
    if (!permissions.microphone.granted) {
      alert(
        "Microphone access is required for the Speaking section. Please grant permission and try again."
      );
      return;
    }

    setShowPermissionsPage(false);
    setShowInstructions(true);
  }, [permissions.microphone.granted]);

  // ============================================================================
  // FULLSCREEN
  // ============================================================================

  const checkFullscreenState = useCallback(() => {
    const isCurrentlyFullscreen = utilIsFullscreen();
    setIsFullscreen(isCurrentlyFullscreen);

    if (!isCurrentlyFullscreen && !showInstructions) {
      setShowFullscreenWarning(true);
    }
  }, [showInstructions]);

  const dismissFullscreenWarning = useCallback(() => {
    setShowFullscreenWarning(false);
  }, []);

  const enterFullscreenFromWarning = useCallback(() => {
    setShowFullscreenWarning(false);
    utilRequestFullscreen();
  }, []);

  // ============================================================================
  // THEME MANAGEMENT (EXAM PAGE ONLY - SCOPED)
  // ============================================================================

  /**
   * Toggle between light and dark theme
   * Uses the main app theme from next-themes via localStorage
   * This ensures unified theme across the entire app
   */
  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prev) => {
      const newTheme = !prev;
      const themeValue = newTheme ? "dark" : "light";
      // Use the same storage key as the main app theme
      localStorage.setItem("app-theme", themeValue);
      console.log("🎨 Theme toggled:", { from: prev ? "dark" : "light", to: themeValue });
      
      // Defer storage event dispatch until after state update completes
      setTimeout(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'app-theme',
          newValue: themeValue,
          storageArea: localStorage
        }));
      }, 0);
      
      return newTheme;
    });
  }, []);

  /**
   * Initialize theme from main app localStorage on mount
   * Syncs with next-themes theme provider
   * Defaults to light theme if not set
   */
  useEffect(() => {
    // Use the same storage key as the main app
    const savedTheme = localStorage.getItem("app-theme");
    const shouldBeDark = savedTheme === "dark";
    console.log("🎨 ExamContext: Initializing theme from app-theme:", { savedTheme, shouldBeDark });
    setIsDarkTheme(shouldBeDark);
    
    // Clean up old exam-theme if it exists
    const oldExamTheme = localStorage.getItem("exam-theme");
    if (oldExamTheme) {
      localStorage.removeItem("exam-theme");
      console.log("🧹 ExamContext: Removed old exam-theme");
    }
  }, []);

  // ============================================================================
  // CONFIRM DIALOG
  // ============================================================================

  const showConfirm = useCallback(
    (options: Partial<ConfirmDialogData>): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmDialogData({
          title: options.title || "Confirm",
          message: options.message || "",
          confirmText: options.confirmText || "Confirm",
          cancelText: options.cancelText || "Cancel",
          confirmClass: options.confirmClass || "bg-indigo-600 hover:bg-indigo-700",
          onConfirm: () => {
            setShowConfirmDialog(false);
            resolve(true);
          },
          onCancel: () => {
            setShowConfirmDialog(false);
            resolve(false);
          },
        });
        setShowConfirmDialog(true);
      });
    },
    []
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    performSystemCheck();
    
    // Load section data only on mount (not when currentSection changes)
    // currentSection changes are handled separately in handleNextSection
    loadSectionData();

    // Setup fullscreen listeners
    document.addEventListener("fullscreenchange", checkFullscreenState);
    document.addEventListener("webkitfullscreenchange", checkFullscreenState);

    // Prevent page reload during test
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!showInstructions) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Cleanup
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      Object.values(debounceTimersRef.current).forEach(clearTimeout);
      audioPreloading.preloadedAudios.forEach((audio) => {
        revokeAudioBlobUrl(audio.blobUrl);
      });
      document.removeEventListener("fullscreenchange", checkFullscreenState);
      document.removeEventListener("webkitfullscreenchange", checkFullscreenState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // When section changes, reload section data
  useEffect(() => {
    if (currentSection) {
      loadSectionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: ExamContextType = {
    attemptId,
    currentSection,
    sectionData,
    userAnswers,
    isLoading,
    error,
    timeRemaining,
    showInstructions,
    showPermissionsPage,
    showFullscreenWarning: contextShowFullscreenWarning,
    showConfirmDialog: contextShowConfirmDialog,
    confirmDialogData: contextConfirmDialogData,
    permissions,
    systemCheck,
    audioPreloading,
    isDarkTheme,
    loadSectionData,
    startSection,
    submitAnswer,
    submitWriting,
    submitSpeaking,
    handleNextSection,
    handleExit,
    performSystemCheck,
    checkMicrophonePermission,
    proceedToInstructions,
    dismissFullscreenWarning,
    enterFullscreenFromWarning,
    toggleTheme,
  };

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}
