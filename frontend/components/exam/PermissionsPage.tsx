/**
 * Permissions Page Component
 * System check and permissions verification before exam starts
 */

"use client";

import { useExam } from "./ExamContext";

export default function PermissionsPage() {
  const {
    permissions,
    systemCheck,
    audioPreloading,
    checkMicrophonePermission,
    proceedToInstructions,
  } = useExam();

  const allPermissionsGranted =
    permissions.microphone.granted && permissions.fullscreen.granted;

  const canProceed =
    permissions.microphone.granted &&
    !audioPreloading.isPreloading &&
    systemCheck.connection !== "checking";

  return (
    <div className="h-screen bg-linear-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            System Check
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please allow the required permissions to start your IELTS test
          </p>
        </div>

        {/* System Information */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            System Information
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Browser</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {systemCheck.browser || "Detecting..."}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Operating System</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {systemCheck.os || "Detecting..."}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Connection</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                {systemCheck.connection === "checking" && "Checking..."}
                {systemCheck.connection === "good" && (
                  <span className="text-green-600 dark:text-green-400">Good</span>
                )}
                {systemCheck.connection === "poor" && (
                  <span className="text-yellow-600 dark:text-yellow-400">Poor</span>
                )}
                {systemCheck.connection === "offline" && (
                  <span className="text-red-600 dark:text-red-400">Offline</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Required Permissions
          </h2>

          {/* Microphone Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  permissions.microphone.granted
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    permissions.microphone.granted
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Microphone Access
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {permissions.microphone.granted
                    ? "Access granted"
                    : "Required for Speaking section"}
                </p>
                {permissions.microphone.error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {permissions.microphone.error}
                  </p>
                )}
              </div>
            </div>
            {!permissions.microphone.granted && (
              <button
                onClick={checkMicrophonePermission}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Allow
              </button>
            )}
          </div>

          {/* Fullscreen Permission */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  permissions.fullscreen.granted
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <svg
                  className={`w-5 h-5 ${
                    permissions.fullscreen.granted
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Fullscreen Mode
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {permissions.fullscreen.granted
                    ? "Supported"
                    : "Not supported by browser"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Preloading */}
        {audioPreloading.isPreloading && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="shrink-0">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Preloading Audio Files
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Please wait while we prepare your listening test...
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {audioPreloading.progress}%
                </p>
              </div>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800/50 rounded-full h-3 mb-2 overflow-hidden">
              <div
                className="bg-linear-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${audioPreloading.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                {audioPreloading.currentFile || "Preparing..."}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {audioPreloading.loadedFiles} / {audioPreloading.totalFiles} files
              </p>
            </div>
          </div>
        )}
        
        {/* Show completed preloading state */}
        {!audioPreloading.isPreloading && audioPreloading.loadedFiles > 0 && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Audio Files Ready
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                  {audioPreloading.loadedFiles} audio file{audioPreloading.loadedFiles !== 1 ? 's' : ''} preloaded successfully
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {audioPreloading.errors.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
              Some audio files failed to preload
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Audio will load during the test, which may cause delays.
            </p>
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={proceedToInstructions}
          disabled={!canProceed}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            canProceed
              ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          }`}
        >
          {audioPreloading.isPreloading
            ? "Preparing Test..."
            : systemCheck.connection === "checking"
            ? "Checking System..."
            : !permissions.microphone.granted
            ? "Grant Microphone Permission to Continue"
            : "Continue to Test"}
        </button>

        {/* Help Text */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          Having trouble? Contact support or try a different browser
        </p>
      </div>
    </div>
  );
}
