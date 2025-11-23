/**
 * Exam Utility Functions
 * Helper functions for formatting, validation, and calculations
 */

import { SectionName, QuestionType } from "@/types/exam";
import type { SectionData } from "@/types/exam";

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format time in seconds to MM:SS or H:MM:SS
 */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds === 0) {
    return "0:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Format audio time in seconds to M:SS
 */
export function formatAudioTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Check if time is in warning range (last 5 minutes)
 */
export function isTimeWarning(timeRemaining: number): boolean {
  return timeRemaining > 0 && timeRemaining <= 300; // 5 minutes
}

// ============================================================================
// SECTION HELPERS
// ============================================================================

/**
 * Get section instructions based on section name
 */
export function getSectionInstructions(section: SectionName | null) {
  const instructions = {
    listening: {
      title: "IELTS Listening",
      time: "Approximately 30 minutes",
      totalQuestions: 40,
      parts: 4,
      instructions: [
        "Answer all the questions.",
        "You can change your answers at any time during the test.",
      ],
      information: [
        "There are 40 questions in this test.",
        "Each question carries one mark.",
        "There are four parts to the test.",
        "Please note you will only hear each part once in your actual test.",
        "For each part of the test there will be time for you to look through the questions and time for you to check your answers.",
      ],
    },
    reading: {
      title: "IELTS Reading",
      time: "Approximately 60 minutes",
      totalQuestions: 40,
      parts: 3,
      instructions: [
        "Answer all the questions.",
        "You can change your answers at any time during the test.",
      ],
      information: [
        "There are 40 questions in this test.",
        "Each question carries one mark.",
        "There are three passages to read.",
        "The passages increase in difficulty as you progress through the test.",
      ],
    },
    writing: {
      title: "IELTS Writing",
      time: "Approximately 60 minutes",
      totalQuestions: 2,
      parts: 2,
      instructions: [
        "Complete both tasks.",
        "You should spend about 20 minutes on Task 1 and 40 minutes on Task 2.",
      ],
      information: [
        "There are 2 tasks in this test.",
        "Task 1: Write at least 150 words.",
        "Task 2: Write at least 250 words.",
        "Task 2 contributes twice as much as Task 1 to the Writing score.",
      ],
    },
    speaking: {
      title: "IELTS Speaking",
      time: "Approximately 11-14 minutes",
      totalQuestions: 3,
      parts: 3,
      instructions: [
        "Answer all the questions.",
        "Speak clearly and naturally.",
      ],
      information: [
        "There are 3 parts in this test.",
        "Part 1: Introduction and interview (4-5 minutes).",
        "Part 2: Individual long turn (3-4 minutes).",
        "Part 3: Two-way discussion (4-5 minutes).",
      ],
    },
  };

  return section ? (instructions[section] || instructions.listening) : instructions.listening;
}

/**
 * Capitalize first letter of section name
 */
export function capitalizeSectionName(section: SectionName | null): string {
  if (!section) return '';
  return section.charAt(0).toUpperCase() + section.slice(1);
}

// ============================================================================
// QUESTION HELPERS
// ============================================================================

/**
 * Get question type display name
 */
export function getQuestionTypeLabel(questionType: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    MCQ: "Multiple Choice (Single Answer)",
    MCMA: "Multiple Choice (Multiple Answers)",
    TFNG: "True/False/Not Given",
    YNNG: "Yes/No/Not Given",
    SA: "Short Answer",
    FC: "Form Completion",
    NC: "Note Completion",
    SC: "Sentence Completion",
    MH: "Matching Headings",
    MI: "Matching Information",
    MF: "Matching Features",
    SUC: "Summary Completion",
    TC: "Table Completion",
    FCC: "Flow Chart Completion",
    DL: "Diagram Labelling",
    ML: "Map Labelling",
  };

  return labels[questionType] || questionType;
}

/**
 * Check if question type allows multiple answers
 */
export function allowsMultipleAnswers(questionType: QuestionType): boolean {
  return questionType === QuestionType.MCMA;
}

/**
 * Check if question type uses text input
 */
export function usesTextInput(questionType: QuestionType): boolean {
  const textInputTypes: QuestionType[] = [
    QuestionType.SA,
    QuestionType.FC,
    QuestionType.NC,
    QuestionType.SC,
    QuestionType.SUC,
    QuestionType.TC,
    QuestionType.FCC,
    QuestionType.DL,
    QuestionType.ML,
  ];
  return textInputTypes.includes(questionType);
}

/**
 * Count total questions in section data
 */
export function countTotalQuestions(sectionData: any): number {
  if (!sectionData) return 0;

  // Listening section
  if (sectionData.parts) {
    return sectionData.parts.reduce((total: number, part: any) => {
      if (!part.test_heads) return total;
      return (
        total +
        part.test_heads.reduce((sum: number, group: any) => {
          return sum + (group.questions ? group.questions.length : 0);
        }, 0)
      );
    }, 0);
  }

  // Reading section
  if (sectionData.passages) {
    return sectionData.passages.reduce((total: number, passage: any) => {
      if (!passage.test_heads) return total;
      return (
        total +
        passage.test_heads.reduce((sum: number, group: any) => {
          return sum + (group.questions ? group.questions.length : 0);
        }, 0)
      );
    }, 0);
  }

  return 0;
}

// ============================================================================
// ANSWER VALIDATION
// ============================================================================

/**
 * Validate answer based on question type
 */
export function validateAnswer(
  answer: string,
  questionType: QuestionType,
  wordLimit?: number
): { valid: boolean; error?: string } {
  if (!answer || answer.trim() === "") {
    return { valid: false, error: "Answer cannot be empty" };
  }

  // Check word limit for text-based answers
  if (usesTextInput(questionType) && wordLimit) {
    const wordCount = answer.trim().split(/\s+/).length;
    if (wordCount > wordLimit) {
      return {
        valid: false,
        error: `Answer exceeds word limit (${wordCount}/${wordLimit} words)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  if (!text || text.trim() === "") return 0;
  return text.trim().split(/\s+/).length;
}

// ============================================================================
// BROWSER & SYSTEM DETECTION
// ============================================================================

/**
 * Detect browser name
 */
export function detectBrowser(): string {
  const userAgent = navigator.userAgent;
  let browser = "Unknown";

  if (userAgent.indexOf("Firefox") > -1) {
    browser = "Mozilla Firefox";
  } else if (userAgent.indexOf("Chrome") > -1) {
    browser = "Google Chrome";
  } else if (userAgent.indexOf("Safari") > -1) {
    browser = "Apple Safari";
  } else if (userAgent.indexOf("Edge") > -1) {
    browser = "Microsoft Edge";
  }

  return browser;
}

/**
 * Detect operating system
 */
export function detectOS(): string {
  const userAgent = navigator.userAgent;
  let os = "Unknown";

  if (userAgent.indexOf("Win") > -1) os = "Windows";
  else if (userAgent.indexOf("Mac") > -1) os = "macOS";
  else if (userAgent.indexOf("Linux") > -1) os = "Linux";
  else if (userAgent.indexOf("Android") > -1) os = "Android";
  else if (userAgent.indexOf("iOS") > -1) os = "iOS";

  return os;
}

/**
 * Check if fullscreen is supported
 */
export function isFullscreenSupported(): boolean {
  return !!(
    document.fullscreenEnabled ||
    // @ts-ignore - webkit prefix
    document.webkitFullscreenEnabled ||
    // @ts-ignore - ms prefix
    document.msFullscreenEnabled
  );
}

/**
 * Request fullscreen mode
 */
export function requestFullscreen(): void {
  const elem = document.documentElement;

  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch((err) => {
      console.log("Fullscreen request failed:", err);
    });
    // @ts-ignore - webkit prefix
  } else if (elem.webkitRequestFullscreen) {
    // @ts-ignore - webkit prefix
    elem.webkitRequestFullscreen();
    // @ts-ignore - ms prefix
  } else if (elem.msRequestFullscreen) {
    // @ts-ignore - ms prefix
    elem.msRequestFullscreen();
  }
}

/**
 * Exit fullscreen mode
 */
export function exitFullscreen(): void {
  if (document.exitFullscreen) {
    document.exitFullscreen();
    // @ts-ignore - webkit prefix
  } else if (document.webkitExitFullscreen) {
    // @ts-ignore - webkit prefix
    document.webkitExitFullscreen();
    // @ts-ignore - ms prefix
  } else if (document.msExitFullscreen) {
    // @ts-ignore - ms prefix
    document.msExitFullscreen();
  }
}

/**
 * Check if currently in fullscreen
 */
export function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    // @ts-ignore - webkit prefix
    document.webkitFullscreenElement ||
    // @ts-ignore - ms prefix
    document.msFullscreenElement
  );
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Save data to localStorage with error handling
 */
export function saveToStorage(key: string, data: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
    return false;
  }
}

/**
 * Load data from localStorage with error handling
 */
export function loadFromStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return null;
  }
}

/**
 * Remove data from localStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to remove from localStorage:", error);
  }
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Format passage content by converting newlines to HTML
 * - Double newlines (\n\n) become paragraph breaks
 * - Single newlines (\n) become line breaks
 */
export function formatPassageContent(content: string): string {
  if (!content) return "";
  
  // First, wrap the content in a paragraph tag if it doesn't start with one
  let formatted = content.trim();
  
  // Replace double newlines with paragraph breaks
  formatted = formatted.replace(/\n\n+/g, '</p><p class="mb-4">');
  
  // Replace single newlines with line breaks
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if not already wrapped
  if (!formatted.startsWith('<p')) {
    formatted = `<p class="mb-4">${formatted}</p>`;
  } else if (!formatted.includes('class="mb-4"')) {
    formatted = `<p class="mb-4">${formatted.substring(3)}`;
  }
  
  return formatted;
}

// ============================================================================
// DEBOUNCE HELPER
// ============================================================================

/**
 * Debounce function for text input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
