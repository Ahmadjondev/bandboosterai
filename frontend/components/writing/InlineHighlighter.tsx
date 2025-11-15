/**
 * InlineHighlighter Component
 * 
 * Renders essay text with inline error highlights using custom tags:
 * <g>...</g> - Grammar errors (red underline)
 * <v>...</v> - Vocabulary issues (blue underline)
 * <s>...</s> - Spelling errors (yellow underline)
 * <p>...</p> - Punctuation issues (purple underline)
 */

import React, { useMemo, useState, useRef, useEffect } from "react";

interface InlineHighlighterProps {
  text: string;
  className?: string;
  sentences?: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
}

const InlineHighlighter: React.FC<InlineHighlighterProps> = ({
  text,
  className = "",
  sentences = [],
}) => {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedCorrection, setSelectedCorrection] = useState<{
    original: string;
    corrected?: string | null;
    explanation?: string | null;
    x: number;
    y: number;
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover when user clicks outside or presses Escape
  useEffect(() => {
    if (!selectedCorrection) return;

    const onDocMouseDown = (e: Event) => {
      const target = e.target as Node | null;
      if (popoverRef.current && target && !popoverRef.current.contains(target)) {
        setSelectedCorrection(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCorrection(null);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('touchstart', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('touchstart', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedCorrection]);

  const handleMouseEnter = (
    e: React.MouseEvent,
    content: string,
    tagType: string
  ) => {
    setHoveredWord(content);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 5,
    });
  };

  const handleClick = (
    e: React.MouseEvent,
    content: string
  ) => {
    // Prevent parent click handlers from closing modals or clearing state
    e.stopPropagation();
    e.preventDefault();
    // Try to find a matching sentence in supplied sentences prop
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let found = sentences.find((s) => {
      try {
        if (!s) return false;
        const orig = stripInlineTags((s.original || "").toString());
        const corr = stripInlineTags((s.corrected || "").toString());
        const probe = stripInlineTags(content);
        return (
          orig.includes(probe) ||
          corr.includes(probe) ||
          probe.includes(orig) ||
          probe.includes(corr)
        );
      } catch (err) {
        return false;
      }
    });

    if (!found) {
      // fallback: show a minimal popover referencing the clicked fragment
      setSelectedCorrection({
        original: stripInlineTags(content),
        corrected: null,
        explanation: "Correction not available inline. See sentence-level corrections below.",
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
      return;
    }

    setSelectedCorrection({
      original: stripInlineTags(found.original),
      corrected: stripInlineTags(found.corrected),
      explanation: found.explanation,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, content: string) => {
    if (e.key === "Enter" || e.key === " ") {
      // synthesize a click position at center of viewport fallback
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      setSelectedCorrection({ original: content, corrected: null, explanation: "See sentence corrections below.", x, y });
    }
  };

  const handleMouseLeave = () => {
    setHoveredWord(null);
  };

  const stripInlineTags = (input: string | null | undefined) => {
    if (!input) return '';
    try {
      // Remove custom tags like <g>...</g>, <v>...</v>, <s>...</s>, <p>...</p>
      return input.replace(/<(?:g|v|s|p)>(.*?)<\/(?:g|v|s|p)>/g, '$1');
    } catch (err) {
      return input;
    }
  };

  const renderHighlightedText = useMemo(() => {
    // Parse the text and convert custom tags to styled spans
    const parseText = (input: string): React.ReactNode[] => {
      const nodes: React.ReactNode[] = [];
      let currentIndex = 0;
      let nodeKey = 0;

      // Regular expression to match our custom tags
      const tagRegex = /<(g|v|s|p)>(.*?)<\/\1>/g;
      let match;

      while ((match = tagRegex.exec(input)) !== null) {
        // Add text before the tag
        if (match.index > currentIndex) {
          nodes.push(
            <span key={`text-${nodeKey++}`}>
              {input.substring(currentIndex, match.index)}
            </span>
          );
        }

        // Add the highlighted text
        const tagType = match[1];
        const content = match[2];

        const styleMap: Record<string, { className: string; title: string; colorClass: string }> = {
          g: {
            className:
              "border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer transition-colors",
            title: "Grammar error",
            colorClass: "text-red-700 dark:text-red-300",
          },
          v: {
            className:
              "border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors",
            title: "Vocabulary issue",
            colorClass: "text-blue-700 dark:text-blue-300",
          },
          s: {
            className:
              "border-b-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 cursor-pointer transition-colors",
            title: "Spelling error",
            colorClass: "text-yellow-700 dark:text-yellow-300",
          },
          p: {
            className:
              "border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 cursor-pointer transition-colors",
            title: "Punctuation issue",
            colorClass: "text-purple-700 dark:text-purple-300",
          },
        };

        const { className, title, colorClass } = styleMap[tagType] || {
          className: "",
          title: "",
          colorClass: "",
        };

        const key = `tag-${nodeKey++}`;
        nodes.push(
          <span
            key={key}
            className={className}
            title={title}
            role="button"
            tabIndex={0}
            onMouseEnter={(e) => handleMouseEnter(e, content, tagType)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => handleClick(e, content)}
            onKeyDown={(e) => handleKeyDown(e as any, content)}
          >
            {content}
          </span>
        );

        currentIndex = tagRegex.lastIndex;
      }

      // Add remaining text
      if (currentIndex < input.length) {
        nodes.push(
          <span key={`text-${nodeKey++}`}>{input.substring(currentIndex)}</span>
        );
      }

      return nodes;
    };

    return parseText(text);
  }, [text]);
  
  return (
    <div className="relative">
      <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
        {renderHighlightedText}
      </div>

      {/* Tooltip */}
      {hoveredWord && (
        <div
          className="fixed z-50 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-lg shadow-xl px-3 py-2 max-w-xs pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-medium mb-1">Click for correction details</div>
          <div className="text-slate-300 text-[10px]">View full sentence corrections below</div>
          {/* Arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-900 rotate-45" />
        </div>
      )}

      {/* Popover when a highlighted fragment is clicked */}
      {selectedCorrection && (
        <div
          ref={popoverRef}
          className="fixed z-60 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-lg shadow-2xl px-4 py-3 max-w-sm pointer-events-auto"
          style={{
            left: `${selectedCorrection.x}px`,
            top: `${selectedCorrection.y}px`,
            transform: "translateX(-50%)",
            minWidth: '220px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-300">Original</div>
              <div className="font-medium mt-1">{selectedCorrection.original}</div>
            </div>
            <button
              aria-label="Close"
              className="ml-3 text-slate-400 hover:text-slate-600"
              onClick={() => setSelectedCorrection(null)}
            >
              ✕
            </button>
          </div>

          <div className="mt-3">
            <div className="text-xs text-slate-500 dark:text-slate-300">Corrected</div>
            <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">
              {selectedCorrection.corrected ?? <span className="text-slate-500">Not available</span>}
            </div>
          </div>

          {selectedCorrection.explanation && (
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              {selectedCorrection.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineHighlighter;

/**
 * ErrorLegend Component
 * Shows what each color means
 */
export const ErrorLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <span className="border-b-2 border-red-500 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-slate-700 dark:text-slate-300 text-xs">
          Grammar
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="border-b-2 border-blue-500 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-slate-700 dark:text-slate-300 text-xs">
          Vocabulary
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="border-b-2 border-yellow-500 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-slate-700 dark:text-slate-300 text-xs">
          Spelling
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="border-b-2 border-purple-500 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-slate-700 dark:text-slate-300 text-xs">
          Punctuation
        </span>
      </div>
    </div>
  );
};
