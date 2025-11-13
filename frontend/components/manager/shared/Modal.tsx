'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/manager/utils';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({
  show,
  onClose,
  title,
  size = 'medium',
  children,
  footer,
}: ModalProps) {
  if (!show) return null;

  const sizeClasses = {
    small: 'sm:max-w-md',
    medium: 'sm:max-w-lg',
    large: 'sm:max-w-2xl',
    xlarge: 'sm:max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">

        {/* Background overlay (below the modal) */}
        <div
          className="fixed inset-0 z-40 bg-gray-500/75 dark:bg-black/80 backdrop-blur-sm transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        >
        </div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div
          className={cn(
            'relative z-50 inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full border border-gray-200 dark:border-gray-700',
            sizeClasses[size]
          )}
        >
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                {title}
              </h3>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {children}
          </div>

          {footer && (
            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2 border-t border-gray-200 dark:border-gray-700">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
