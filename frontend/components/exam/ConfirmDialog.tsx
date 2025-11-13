/**
 * Confirm Dialog Component
 * Modal confirmation dialog with customizable actions
 */

"use client";

import { useExam } from "./ExamContext";

export default function ConfirmDialog() {
  const { showConfirmDialog, confirmDialogData } = useExam();

  if (!showConfirmDialog) return null;

  const handleConfirm = () => {
    confirmDialogData.onConfirm?.();
  };

  const handleCancel = () => {
    confirmDialogData.onCancel?.();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full pointer-events-auto transform transition-all duration-300 border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 transition-colors duration-300">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300">
              {confirmDialogData.title}
            </h3>
          </div>

          {/* Body */}
          <div className="px-6 py-4 transition-colors duration-300">
            <p className="text-gray-700 dark:text-gray-200 whitespace-pre-line transition-colors duration-300 leading-relaxed">
              {confirmDialogData.message}
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/70 rounded-b-lg flex gap-3 justify-end transition-colors duration-300 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors duration-200 border border-gray-300 dark:border-gray-600"
            >
              {confirmDialogData.cancelText}
            </button>
            
            <button
              onClick={handleConfirm}
              className={`px-5 py-2.5 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm ${confirmDialogData.confirmClass}`}
            >
              {confirmDialogData.confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
