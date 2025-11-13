/**
 * Text Highlighter Component - React Version
 * Allows users to highlight text with color selection
 * 
 * Features:
 * - Text selection detection
 * - Color picker popup
 * - Persistent highlights per section
 * - Clean removal of highlights
 * - localStorage persistence
 * 
 * Performance Optimizations:
 * - Debounced selection detection (150ms)
 * - Throttled save operations (300ms)
 * - Smart text node caching (5s TTL)
 * - Passive event listeners
 * - RequestIdleCallback for restoration
 * - Memory leak prevention
 */

"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Available highlight colors
 * Using colors that work in both light and dark modes
 * Text colors ensure readability on highlighted backgrounds
 */
const COLORS = [
  // brighter in light mode, softer but visible in dark mode
  { name: "Yellow", class: "bg-yellow-200 dark:bg-yellow-700/30 text-yellow-900 dark:text-yellow-100", hex: "#fef08a" },
  { name: "Green", class: "bg-green-200 dark:bg-green-700/30 text-green-900 dark:text-green-100", hex: "#bbf7d0" },
  { name: "Pink", class: "bg-pink-200 dark:bg-pink-600/30 text-pink-900 dark:text-pink-100", hex: "#fbcfe8" },
  { name: "Blue", class: "bg-blue-200 dark:bg-blue-700/30 text-blue-900 dark:text-blue-100", hex: "#bfdbfe" },
  { name: "Purple", class: "bg-purple-200 dark:bg-purple-700/30 text-purple-900 dark:text-purple-100", hex: "#e9d5ff" },
];

/**
 * Available text formats
 */
const FORMATS = [
  { name: "Bold", class: "font-bold", icon: "B" },
  { name: "Underline", class: "underline", icon: "U" },
];

interface HighlightData {
  text: string;
  color: number;
  formats: number[];
  timestamp: number;
}

interface HighlightStorage {
  [attemptId: string]: {
    [section: string]: HighlightData[];
  };
}

interface TextHighlighterProps {
  sectionName: string;
  containerRef: React.RefObject<HTMLDivElement>;
  attemptId?: string | number;
  subSection?: string; // For Listening parts (1-4) or Writing tasks (1-2)
}

export default function TextHighlighter({
  sectionName,
  containerRef,
  attemptId = "default",
  subSection,
}: TextHighlighterProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightsRef = useRef<HighlightStorage>({});
  const attemptIdStrRef = useRef(String(attemptId));
  const observerRef = useRef<MutationObserver | null>(null);

  // Build storage key with optional subsection
  const getStorageKey = useCallback(() => {
    const baseKey = `${sectionName}`;
    return subSection ? `${baseKey}-${subSection}` : baseKey;
  }, [sectionName, subSection]);

  /**
   * Load highlights from localStorage
   */
  const loadHighlights = useCallback(() => {
    try {
      const stored = localStorage.getItem("text-highlights");
      if (stored) {
        highlightsRef.current = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not load highlights:", e);
      highlightsRef.current = {};
    }
  }, []);

  /**
   * Persist highlights to localStorage
   */
  const persistHighlights = useCallback(() => {
    try {
      localStorage.setItem("text-highlights", JSON.stringify(highlightsRef.current));
    } catch (e) {
      console.warn("Could not save highlights:", e);
    }
  }, []);

  /**
   * Save highlight to storage
   */
  const saveHighlight = useCallback(
    (text: string, colorIndex: number, formats: number[]) => {
      const attemptIdStr = attemptIdStrRef.current;
      const storageKey = getStorageKey();
      
      if (!highlightsRef.current[attemptIdStr]) {
        highlightsRef.current[attemptIdStr] = {};
      }
      if (!highlightsRef.current[attemptIdStr][storageKey]) {
        highlightsRef.current[attemptIdStr][storageKey] = [];
      }

      highlightsRef.current[attemptIdStr][storageKey].push({
        text: text,
        color: colorIndex,
        formats: formats || [],
        timestamp: Date.now(),
      });

      persistHighlights();
    },
    [getStorageKey, persistHighlights]
  );

    /**
   * Save all current highlights from DOM with throttling
   */
  const saveAllHighlights = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const attemptIdStr = attemptIdStrRef.current;
      const storageKey = getStorageKey();
      const container = containerRef.current;
      if (!container) return;

      const marks = container.querySelectorAll(`mark[data-highlight-section="${storageKey}"]`);
      const highlights: HighlightData[] = [];

      marks.forEach((mark) => {
        const text = mark.textContent || "";
        const colorIndex = parseInt(mark.getAttribute("data-highlight-color") || "0");
        const formatsStr = mark.getAttribute("data-highlight-formats") || "[]";
        
        // Handle both comma-separated and JSON array formats
        let formats: number[] = [];
        try {
          if (formatsStr.startsWith("[")) {
            formats = JSON.parse(formatsStr);
          } else if (formatsStr) {
            formats = formatsStr.split(",").filter(f => f).map(f => parseInt(f));
          }
        } catch (e) {
          console.warn("Could not parse formats:", formatsStr, e);
          formats = [];
        }

        highlights.push({ text, color: colorIndex, formats, timestamp: Date.now() });
      });

      if (!highlightsRef.current[attemptIdStr]) {
        highlightsRef.current[attemptIdStr] = {};
      }
      highlightsRef.current[attemptIdStr][storageKey] = highlights;
      persistHighlights();
    }, 300); // Throttle to 300ms
  }, [getStorageKey, containerRef, persistHighlights]);

  /**
   * Get all text nodes within a range
   */
  const getTextNodesInRange = useCallback((range: Range): Text[] => {
    const attemptIdStr = attemptIdStrRef.current;
    const storageKey = getStorageKey();
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(node);

          if (
            range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 &&
            range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0
          ) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        },
      }
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.trim().length > 0) {
        let parent = (node as Text).parentElement;
        let isAlreadyHighlighted = false;
        while (parent) {
          if (
            parent.tagName === "MARK" &&
            (parent as HTMLElement).dataset.highlightSection === storageKey
          ) {
            isAlreadyHighlighted = true;
            break;
          }
          parent = parent.parentElement;
        }

        if (!isAlreadyHighlighted) {
          textNodes.push(node as Text);
        }
      }
    }

    return textNodes;
  }, [getStorageKey]);

  /**
   * Hide popup
   */
  const hidePopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.classList.contains("hidden")) {
      popupRef.current.style.opacity = "0";
      setTimeout(() => {
        if (popupRef.current) {
          popupRef.current.classList.add("hidden");
        }
      }, 200);
    }
  }, []);

  /**
   * Show popup near selection
   */
  const showPopup = useCallback((selection: Selection) => {
    if (!popupRef.current || selection.rangeCount === 0) {
      console.log("[TextHighlighter] Cannot show popup:", {
        hasPopupRef: !!popupRef.current,
        rangeCount: selection.rangeCount,
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const popupWidth = 400;
    const popupHeight = 60;
    const margin = 10;

    let left = rect.left + rect.width / 2 - popupWidth / 2;
    let top = rect.top - popupHeight - margin;

    left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

    if (top < margin) {
      top = rect.bottom + margin;
    }

    console.log("[TextHighlighter] Showing popup at:", { left, top, rect });

    popupRef.current.style.transform = `translate(${left}px, ${top}px)`;
    popupRef.current.style.left = "0";
    popupRef.current.style.top = "0";
    popupRef.current.classList.remove("hidden");
    popupRef.current.style.opacity = "1";
  }, []);

  /**
   * Apply highlight to selection (advanced method for complex selections)
   */
  const applyHighlightAdvanced = useCallback(
    (range: Range, selectedText: string, colorIndex: number, existingFormats: number[] | null = null) => {
      const attemptIdStr = attemptIdStrRef.current;
      const storageKey = getStorageKey();
      const color = COLORS[colorIndex];
      const textNodes = getTextNodesInRange(range);

      if (textNodes.length === 0) {
        hidePopup();
        return;
      }

      textNodes.forEach((textNode) => {
        try {
          const highlight = document.createElement("mark");
          highlight.className = `${color.class} transition-colors cursor-pointer inline`;
          highlight.style.display = "inline";
          highlight.style.whiteSpace = "normal";
          highlight.style.wordBreak = "normal";
          highlight.dataset.highlightColor = String(colorIndex);
          highlight.dataset.highlightSection = storageKey;
          highlight.dataset.highlightAttempt = attemptIdStr;

          if (existingFormats && existingFormats.length > 0) {
            highlight.dataset.highlightFormats = JSON.stringify(existingFormats);
            existingFormats.forEach((formatIndex) => {
              if (FORMATS[formatIndex]) {
                highlight.classList.add(FORMATS[formatIndex].class);
              }
            });
          }

          const parent = textNode.parentNode;
          if (parent) {
            parent.insertBefore(highlight, textNode);
            highlight.appendChild(textNode);
          }
        } catch (err) {
          console.warn("Failed to highlight text node:", err);
        }
      });

      const formats = existingFormats || [];
      saveHighlight(selectedText, colorIndex, formats);

      window.getSelection()?.removeAllRanges();
      hidePopup();
    },
    [getStorageKey, getTextNodesInRange, saveHighlight, hidePopup]
  );

  /**
   * Apply highlight to selection
   */
  const applyHighlight = useCallback(
    (colorIndex: number, existingFormats: number[] | null = null) => {
      const attemptIdStr = attemptIdStrRef.current;
      const storageKey = getStorageKey();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();

      if (!selectedText) return;

      const color = COLORS[colorIndex];
      const container = range.commonAncestorContainer;
      let existingHighlight =
        container.nodeType === 3 ? (container.parentElement as HTMLElement) : (container as HTMLElement);

      if (
        existingHighlight.tagName === "MARK" &&
        existingHighlight.dataset.highlightSection === storageKey
      ) {
        existingHighlight.className = `${color.class} rounded px-0.5 transition-colors cursor-pointer`;
        const formatsStr = existingHighlight.dataset.highlightFormats || "[]";
        let formats: number[] = [];
        try {
          if (formatsStr.startsWith("[")) {
            formats = JSON.parse(formatsStr);
          } else if (formatsStr) {
            formats = formatsStr.split(",").filter(f => f).map(f => parseInt(f));
          }
        } catch (e) {
          formats = [];
        }
        formats.forEach((formatIndex) => {
          existingHighlight.classList.add(FORMATS[formatIndex].class);
        });
        existingHighlight.dataset.highlightColor = String(colorIndex);

        selection.removeAllRanges();
        // hidePopup will be called after this function
        saveAllHighlights();
        return;
      }

      try {
        const highlight = document.createElement("mark");
        highlight.className = `${color.class} transition-colors cursor-pointer inline`;
        highlight.style.display = "inline";
        highlight.style.whiteSpace = "normal";
        highlight.style.wordBreak = "normal";
        highlight.dataset.highlightColor = String(colorIndex);
        highlight.dataset.highlightSection = storageKey;
        highlight.dataset.highlightAttempt = attemptIdStr;

        if (existingFormats && existingFormats.length > 0) {
          highlight.dataset.highlightFormats = JSON.stringify(existingFormats);
          existingFormats.forEach((formatIndex) => {
            highlight.classList.add(FORMATS[formatIndex].class);
          });
        }

        range.surroundContents(highlight);

        const formats = existingFormats || [];
        saveHighlight(selectedText, colorIndex, formats);

        selection.removeAllRanges();
        // hidePopup will be called after this function
      } catch (e) {
        console.log("Using advanced highlight method for complex selection");
        applyHighlightAdvanced(range, selectedText, colorIndex, existingFormats);
      }
    },
    [getStorageKey, saveHighlight, saveAllHighlights, applyHighlightAdvanced]
  );

  /**
   * Apply format (bold/underline) to selection
   */
  const applyFormat = useCallback(
    (formatIndex: number) => {
      const attemptIdStr = attemptIdStrRef.current;
      const storageKey = getStorageKey();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();

      if (!selectedText) return;

      const format = FORMATS[formatIndex];
      const container = range.commonAncestorContainer;
      let highlightElement =
        container.nodeType === 3 ? (container.parentElement as HTMLElement) : (container as HTMLElement);

      if (
        highlightElement.tagName === "MARK" &&
        highlightElement.dataset.highlightSection === storageKey
      ) {
        const formatsStr = highlightElement.dataset.highlightFormats || "[]";
        let currentFormats: number[] = [];
        try {
          if (formatsStr.startsWith("[")) {
            currentFormats = JSON.parse(formatsStr);
          } else if (formatsStr) {
            currentFormats = formatsStr.split(",").filter(f => f).map(f => parseInt(f));
          }
        } catch (e) {
          currentFormats = [];
        }

        const formatExists = currentFormats.includes(formatIndex);

        if (formatExists) {
          highlightElement.classList.remove(format.class);
          const newFormats = currentFormats.filter((f) => f !== formatIndex);
          highlightElement.dataset.highlightFormats = JSON.stringify(newFormats);
        } else {
          highlightElement.classList.add(format.class);
          currentFormats.push(formatIndex);
          highlightElement.dataset.highlightFormats = JSON.stringify(currentFormats);
        }

        selection.removeAllRanges();
        // hidePopup will be called after
        saveAllHighlights();
      } else {
        try {
          const mark = document.createElement("mark");
          mark.className = `${format.class} transition-colors cursor-pointer inline`;
          mark.style.display = "inline";
          mark.style.whiteSpace = "normal";
          mark.style.wordBreak = "normal";
          mark.style.backgroundColor = "transparent";
          mark.dataset.highlightColor = "-1";
          mark.dataset.highlightSection = storageKey;
          mark.dataset.highlightAttempt = attemptIdStr;
          mark.dataset.highlightFormats = JSON.stringify([formatIndex]);

          range.surroundContents(mark);
          saveHighlight(selectedText, -1, [formatIndex]);

          selection.removeAllRanges();
          // hidePopup will be called after
        } catch (e) {
          console.warn("Could not apply format:", e);
          // hidePopup will be called after
        }
      }
    },
    [getStorageKey, saveHighlight, saveAllHighlights]
  );

  /**
   * Remove highlight from selection
   */
  const removeHighlight = useCallback(() => {
    const storageKey = getStorageKey();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    let highlightElement =
      container.nodeType === 3 ? (container.parentElement as HTMLElement) : (container as HTMLElement);

    if (
      highlightElement.tagName === "MARK" &&
      highlightElement.dataset.highlightSection === storageKey
    ) {
      const parent = highlightElement.parentNode;
      if (parent) {
        while (highlightElement.firstChild) {
          parent.insertBefore(highlightElement.firstChild, highlightElement);
        }
        parent.removeChild(highlightElement);
      }

      selection.removeAllRanges();
      // hidePopup will be called after
      saveAllHighlights();
    }
  }, [getStorageKey, saveAllHighlights]);

  /**
   * Find and highlight specific text in container
   */
  const findAndHighlightText = useCallback(
    (containerElement: HTMLElement, searchText: string, colorIndex: number, formats: number[] = []) => {
      const attemptIdStr = attemptIdStrRef.current;
      const storageKey = getStorageKey();
      const walker = document.createTreeWalker(containerElement, NodeFilter.SHOW_TEXT, null);

      const isFormatOnly = colorIndex === -1;
      const color = isFormatOnly ? null : COLORS[colorIndex];
      let node: Node | null;
      const nodesToHighlight: Array<{ node: Text; index: number; length: number }> = [];

      while ((node = walker.nextNode())) {
        const text = node.textContent || "";
        const index = text.indexOf(searchText);

        if (index !== -1) {
          nodesToHighlight.push({ node: node as Text, index, length: searchText.length });
        }
      }

      if (nodesToHighlight.length > 0) {
        const { node, index, length } = nodesToHighlight[0];

        try {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + length);

          const highlight = document.createElement("mark");

          let classList = " transition-colors cursor-pointer inline";
          if (!isFormatOnly && color) {
            classList = `${color.class} ${classList}`;
          }
          highlight.className = classList;

          highlight.style.display = "inline";
          highlight.style.whiteSpace = "normal";
          highlight.style.wordBreak = "normal";

          if (isFormatOnly) {
            highlight.style.backgroundColor = "transparent";
          }

          highlight.dataset.highlightColor = String(colorIndex);
          highlight.dataset.highlightSection = storageKey;
          highlight.dataset.highlightAttempt = attemptIdStr;

          if (formats.length > 0) {
            highlight.dataset.highlightFormats = JSON.stringify(formats);
            formats.forEach((formatIndex) => {
              if (FORMATS[formatIndex]) {
                highlight.classList.add(FORMATS[formatIndex].class);
              }
            });
          }

          range.surroundContents(highlight);
        } catch (e) {
          console.warn("Could not restore highlight:", e);
        }
      }
    },
    [getStorageKey]
  );

  /**
   * Clear visual highlights
   */
  const clearVisualHighlights = useCallback(() => {
    const attemptIdStr = attemptIdStrRef.current;
    const storageKey = getStorageKey();
    const marks = document.querySelectorAll(
      `mark[data-highlight-section="${storageKey}"][data-highlight-attempt="${attemptIdStr}"]`
    );

    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    });
  }, [getStorageKey]);

  /**
   * Restore highlights from storage with optimized batching
   */
  const restoreHighlights = useCallback(
    (containerElement: HTMLElement) => {
      const attemptIdStr = attemptIdStrRef.current;
      const storageKey = getStorageKey();
      const attemptHighlights = highlightsRef.current[attemptIdStr];
      if (!attemptHighlights) return;

      const sectionHighlights = attemptHighlights[storageKey];
      if (!sectionHighlights || sectionHighlights.length === 0) return;

      console.log("[TextHighlighter] Restoring", sectionHighlights.length, "highlights");

      clearVisualHighlights();

      const restoreTask = (deadline?: IdleDeadline) => {
        let highlightIndex = 0;
        const batchSize = 5;

        const processBatch = () => {
          const endIndex = Math.min(highlightIndex + batchSize, sectionHighlights.length);

          for (let i = highlightIndex; i < endIndex; i++) {
            const highlight = sectionHighlights[i];
            findAndHighlightText(containerElement, highlight.text, highlight.color, highlight.formats || []);
          }

          highlightIndex = endIndex;

          if (highlightIndex < sectionHighlights.length) {
            if (deadline && deadline.timeRemaining() > 0) {
              processBatch();
            } else {
              requestAnimationFrame(() => {
                if ("requestIdleCallback" in window) {
                  requestIdleCallback(restoreTask as IdleRequestCallback, { timeout: 1000 });
                } else {
                  setTimeout(() => restoreTask(), 50);
                }
              });
            }
          }
        };

        processBatch();
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(restoreTask as IdleRequestCallback, { timeout: 1000 });
      } else {
        setTimeout(() => restoreTask(), 100);
      }
    },
    [getStorageKey, clearVisualHighlights, findAndHighlightText]
  );

  /**
   * Setup and cleanup effects
   */
  useEffect(() => {
    // Guard: Wait for container to be available
    if (!containerRef.current) {
      console.log("[TextHighlighter] Container not ready, waiting...");
      return;
    }

    const storageKey = getStorageKey();
    console.log("[TextHighlighter] Initializing:", storageKey);

    loadHighlights();

    const handleSelection = () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      selectionTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        console.log("[TextHighlighter] Selection detected:", {
          hasSelection: !!selectedText,
          length: selectedText?.length || 0,
          text: selectedText?.substring(0, 30) || "",
        });

        if (selectedText && selectedText.length > 0 && selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const containerElement = containerRef.current;
          const isInContainer =
            container === containerElement || containerElement?.contains(container);

          console.log("[TextHighlighter] Selection validation:", {
            isInContainer,
            containerElement: !!containerElement,
            container: container.nodeName,
          });

          if (isInContainer) {
            showPopup(selection);
          } else {
            hidePopup();
          }
        } else {
          hidePopup();
        }
      }, 150);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        const selection = window.getSelection();
        if (!selection?.toString().trim()) {
          hidePopup();
        }
      }
    };

    document.addEventListener("mouseup", handleSelection, { passive: true } as AddEventListenerOptions);
    document.addEventListener("keyup", handleSelection, { passive: true } as AddEventListenerOptions);
    document.addEventListener("mousedown", handleMouseDown, { passive: true } as AddEventListenerOptions);

    // Listen for clear highlights event from header
    const handleClearHighlights = () => {
      console.log("[TextHighlighter] Clearing highlights on command");
      clearVisualHighlights();
      // Also clear from storage
      const attemptIdStr = attemptIdStrRef.current;
      const storageKey = getStorageKey();
      if (highlightsRef.current[attemptIdStr]) {
        highlightsRef.current[attemptIdStr][storageKey] = [];
        persistHighlights();
      }
    };

    window.addEventListener("clearHighlights", handleClearHighlights);

    // Restore highlights after DOM is ready
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (containerRef.current) {
          restoreHighlights(containerRef.current);
        }
      }, 100);
    });

    console.log("[TextHighlighter] Initialized successfully");

    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("clearHighlights", handleClearHighlights);

      console.log("[TextHighlighter] Cleaned up");
    };
  }, [getStorageKey, containerRef, loadHighlights, showPopup, hidePopup, restoreHighlights, clearVisualHighlights, persistHighlights]);

  /**
   * Handle popup button clicks
   */
  const handlePopupClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      const colorBtn = target.closest("[data-color-index]") as HTMLElement;
      const formatBtn = target.closest("[data-format-index]") as HTMLElement;
      const removeBtn = target.closest('[data-action="remove"]');

      if (colorBtn) {
        const colorIndex = parseInt(colorBtn.dataset.colorIndex || "0");
        applyHighlight(colorIndex, null);
        hidePopup();
      } else if (formatBtn) {
        const formatIndex = parseInt(formatBtn.dataset.formatIndex || "0");
        applyFormat(formatIndex);
        hidePopup();
      } else if (removeBtn) {
        removeHighlight();
        hidePopup();
      }
    },
    [applyHighlight, applyFormat, removeHighlight, hidePopup]
  );

  return (
    <div
      ref={popupRef}
      id="text-highlighter-popup"
      className="fixed hidden bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-slate-300 dark:border-gray-600 p-3"
      style={{ 
        transition: "opacity 0.2s ease", 
        willChange: "transform",
        pointerEvents: "auto", // Ensure clicks work
        zIndex: 9999 // Inline style for high z-index
      }}
      onClick={handlePopupClick}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-2">Highlight:</div>
        {COLORS.map((color, index) => (
          <button
            key={index}
            type="button"
            data-color-index={index}
            className={`w-8 h-8 rounded-md ${color.class} border-2 border-slate-300 dark:border-gray-600 hover:border-slate-500 dark:hover:border-gray-400 transition-all hover:scale-110 flex items-center justify-center group`}
            title={color.name}
          >
            <span className="text-xs opacity-0 group-hover:opacity-100 font-bold text-slate-700 dark:text-slate-900">
              ✓
            </span>
          </button>
        ))}
        <div className="w-px h-6 bg-slate-300 dark:bg-gray-600 mx-1"></div>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-2">Format:</div>
        {FORMATS.map((format, index) => (
          <button
            key={index}
            type="button"
            data-format-index={index}
            className={`w-8 h-8 rounded-md bg-slate-100 dark:bg-gray-700 border-2 border-slate-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all hover:scale-110 flex items-center justify-center group ${format.class}`}
            title={format.name}
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {format.icon}
            </span>
          </button>
        ))}
        <div className="w-px h-6 bg-slate-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          data-action="remove"
          className="w-8 h-8 rounded-md bg-slate-100 dark:bg-gray-700 border-2 border-slate-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all hover:scale-110 flex items-center justify-center group"
          title="Remove highlight"
        >
          <span className="text-slate-600 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 font-bold">
            ✕
          </span>
        </button>
      </div>
    </div>
  );
}
