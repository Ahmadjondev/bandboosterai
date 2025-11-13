/**
 * Instructions Page Component
 * Displays IELTS standard instructions before section starts
 */

"use client";

import { useExam } from "./ExamContext";
import { getSectionInstructions, capitalizeSectionName } from "@/lib/exam-utils";

export default function InstructionsPage() {
  const { currentSection, startSection } = useExam();

  const instructions = getSectionInstructions(currentSection);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-3xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 transition-colors duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 transition-colors duration-300">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {instructions.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {instructions.time}
          </p>
        </div>

        {/* Test Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {instructions.totalQuestions}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Questions
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {instructions.parts}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Parts
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Instructions
          </h2>
          <ul className="space-y-2">
            {instructions.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Information */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Important Information
          </h2>
          <ul className="space-y-2">
            {instructions.information.map((info, index) => (
              <li key={index} className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{info}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                Once you start, you cannot return to this page
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Make sure you're ready before clicking the Start button below. The test will
                enter fullscreen mode and the timer will begin immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={startSection}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          Start {capitalizeSectionName(currentSection)} Section
        </button>

        {/* Footer Note */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          Timer will start automatically when you begin the test
        </p>
      </div>
    </div>
  );
}
