"use client";

/**
 * Exam Page - Main container for IELTS exam interface
 * Handles permissions, instructions, section navigation, and exam flow
 */

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ExamProvider, useExam } from "@/components/exam/ExamContext";
import PermissionsPage from "@/components/exam/PermissionsPage";
import InstructionsPage from "@/components/exam/InstructionsPage";
import ListeningSection from "@/components/exam/ListeningSection";
import ReadingSection from "@/components/exam/ReadingSection";
import WritingSection from "@/components/exam/WritingSection";
import SpeakingSection from "@/components/exam/SpeakingSection";
import ExamHeader from "@/components/exam/ExamHeader";
import ConfirmDialog from "@/components/exam/ConfirmDialog";
import FullscreenWarning from "@/components/exam/FullscreenWarning";
import LoadingScreen from "@/components/exam/LoadingScreen";
import ErrorScreen from "@/components/exam/ErrorScreen";
import { SectionName } from "@/types/exam";

function ExamContent() {
  const {
    currentSection,
    sectionData,
    isLoading,
    error,
    showPermissionsPage,
    showInstructions,
    showFullscreenWarning,
    dismissFullscreenWarning,
    enterFullscreenFromWarning,
    isDarkTheme,
  } = useExam();

  // Keep the global <html> dark class in sync while on the exam page only
  useEffect(() => {
    // Theme is now handled by the blocking script in root layout.tsx
    // This effect just syncs with isDarkTheme state changes from ExamContext
    const root = document.documentElement;
    
    if (isDarkTheme) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkTheme]); // Only react to isDarkTheme changes, not on mount

  // Show fullscreen warning overlay
  const FullscreenWarningOverlay = showFullscreenWarning && (
    <FullscreenWarning
      onDismiss={dismissFullscreenWarning}
      onEnterFullscreen={enterFullscreenFromWarning}
    />
  );

  // Wrap everything in a theme-aware container (scoped to exam page only)
  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Show permissions check first */}
      {showPermissionsPage && (
        <div className="min-h-screen bg-linear-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
          <PermissionsPage />
        </div>
      )}

      {/* Show instructions before section starts */}
      {showInstructions && !showPermissionsPage && (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <InstructionsPage />
        </div>
      )}

      {/* Show loading state */}
      {isLoading && !showPermissionsPage && !showInstructions && (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <LoadingScreen />
        </div>
      )}

      {/* Show error state */}
      {error && !showPermissionsPage && !showInstructions && !isLoading && (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <ErrorScreen error={error} />
        </div>
      )}

      {/* Main exam content */}
      {!showPermissionsPage && !showInstructions && !isLoading && !error && currentSection && (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <ExamHeader />
          
          <main className="flex-1 overflow-hidden">
            {currentSection === SectionName.LISTENING && <ListeningSection />}
            {currentSection === SectionName.READING && <ReadingSection />}
            {currentSection === SectionName.WRITING && <WritingSection />}
            {currentSection === SectionName.SPEAKING && <SpeakingSection />}
          </main>

          {FullscreenWarningOverlay}
          <ConfirmDialog />
        </div>
      )}
    </div>
  );
}

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const attemptUuid = params.attemptUuid as string;

  // UUID validation regex (strict format check)
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidUuid = attemptUuid && UUID_REGEX.test(attemptUuid);

  // Redirect invalid UUIDs to dashboard
  useEffect(() => {
    if (!isValidUuid) {
      console.error('Invalid exam UUID:', attemptUuid);
      router.push("/dashboard");
    }
  }, [isValidUuid, attemptUuid, router]);

  // Show error state for invalid UUID
  if (!isValidUuid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Exam Link</h2>
          <p className="text-slate-400 mb-4">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ExamProvider attemptId={attemptUuid}>
      <ExamContent />
    </ExamProvider>
  );
}
