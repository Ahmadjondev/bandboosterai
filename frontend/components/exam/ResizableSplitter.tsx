/**
 * Resizable Splitter Component - React Version
 * A draggable divider that allows resizing of two panels
 * 
 * Features:
 * - Smooth horizontal dragging
 * - Visual feedback on hover and drag
 * - Constraints to prevent panels from becoming too small
 * - Clean, minimal Tailwind styling
 * - Responsive to window resize
 * - localStorage persistence
 */

"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";

interface ResizableSplitterProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  splitterWidth?: number;
  storageKey?: string;
  onResize?: (leftWidth: number, rightWidth: number) => void;
}

export default function ResizableSplitter({
  leftPanel,
  rightPanel,
  initialLeftWidth = 50,
  minLeftWidth = 30,
  maxLeftWidth = 70,
  splitterWidth = 8,
  storageKey = "reading-splitter-position",
  onResize,
}: ResizableSplitterProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);
  const containerWidthRef = useRef(0);
  const startXRef = useRef(0);
  const startLeftWidthRef = useRef(0);

  const rightWidth = 100 - leftWidth;

  /**
   * Load saved position from localStorage
   */
  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem(storageKey);
      if (savedPosition) {
        const position = parseFloat(savedPosition);
        if (position >= minLeftWidth && position <= maxLeftWidth) {
          setLeftWidth(position);
        }
      }
    } catch (e) {
      console.warn("Could not load splitter position:", e);
    }
  }, [storageKey, minLeftWidth, maxLeftWidth]);

  /**
   * Update container width on window resize
   */
  useEffect(() => {
    const handleResize = () => {
      const container = splitterRef.current?.parentElement;
      if (container) {
        containerWidthRef.current = container.offsetWidth;
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial size

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  /**
   * Handle drag movement
   */
  const onDrag = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || containerWidthRef.current === 0) return;

      const deltaX = event.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidthRef.current) * 100;
      const newLeftWidth = startLeftWidthRef.current + deltaPercent;

      // Apply constraints
      if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
        setLeftWidth(newLeftWidth);

        // Emit event for parent component
        if (onResize) {
          onResize(newLeftWidth, 100 - newLeftWidth);
        }
      }
    },
    [isDragging, minLeftWidth, maxLeftWidth, onResize]
  );

  /**
   * Stop dragging
   */
  const stopDrag = useCallback(() => {
    setIsDragging(false);

    // Remove event listeners
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);

    // Restore text selection
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    // Save to localStorage for persistence
    try {
      localStorage.setItem(storageKey, leftWidth.toString());
    } catch (e) {
      console.warn("Could not save splitter position:", e);
    }
  }, [leftWidth, storageKey, onDrag]);

  /**
   * Start dragging
   */
  const startDrag = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true);
      startXRef.current = event.clientX;
      startLeftWidthRef.current = leftWidth;

      // Get container width
      const container = splitterRef.current?.parentElement;
      if (container) {
        containerWidthRef.current = container.offsetWidth;
      }

      // Add event listeners for drag
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", stopDrag);

      // Prevent text selection during drag
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      event.preventDefault();
    },
    [leftWidth, onDrag, stopDrag]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", stopDrag);
    };
  }, [onDrag, stopDrag]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel */}
      <div style={{ width: `${leftWidth}%` }} className="overflow-hidden">
        {leftPanel}
      </div>

      {/* Draggable Splitter */}
      <div
        ref={splitterRef}
        onMouseDown={startDrag}
        className={`relative shrink-0 cursor-col-resize transition-colors ${
          isDragging
            ? "bg-indigo-400 dark:bg-indigo-500"
            : "bg-slate-200 dark:bg-gray-600 hover:bg-indigo-300 dark:hover:bg-indigo-600"
        }`}
        style={{ width: `${splitterWidth}px` }}
      >
        {/* Visual Handle */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-slate-400 dark:bg-gray-500 opacity-50"></div>

        {/* Hover/Drag Indicator */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-12 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-lg"></div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div style={{ width: `${rightWidth}%` }} className="overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
}
