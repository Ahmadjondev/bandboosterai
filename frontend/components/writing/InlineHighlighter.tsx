/**
 * InlineHighlighter Component
 * 
 * Renders essay text with inline error highlights using custom tags:
 * <g>...</g> - Grammar errors (red underline)
 * <v>...</v> - Vocabulary issues (blue underline)
 * <s>...</s> - Spelling errors (yellow underline)
 * <p>...</p> - Punctuation issues (purple underline)
 */

import React, { useMemo } from "react";

interface InlineHighlighterProps {
  text: string;
  className?: string;
}

const InlineHighlighter: React.FC<InlineHighlighterProps> = ({
  text,
  className = "",
}) => {
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

        let className = "";
        let title = "";

        switch (tagType) {
          case "g":
            className =
              "border-b-2 border-red-500 bg-red-50 hover:bg-red-100 cursor-help";
            title = "Grammar error";
            break;
          case "v":
            className =
              "border-b-2 border-blue-500 bg-blue-50 hover:bg-blue-100 cursor-help";
            title = "Vocabulary issue";
            break;
          case "s":
            className =
              "border-b-2 border-yellow-500 bg-yellow-50 hover:bg-yellow-100 cursor-help";
            title = "Spelling error";
            break;
          case "p":
            className =
              "border-b-2 border-purple-500 bg-purple-50 hover:bg-purple-100 cursor-help";
            title = "Punctuation issue";
            break;
        }

        nodes.push(
          <span key={`tag-${nodeKey++}`} className={className} title={title}>
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
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {renderHighlightedText}
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
    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2">
        <span className="border-b-2 border-red-500 px-2 py-1 bg-red-50">
          Grammar
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="border-b-2 border-blue-500 px-2 py-1 bg-blue-50">
          Vocabulary
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="border-b-2 border-yellow-500 px-2 py-1 bg-yellow-50">
          Spelling
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="border-b-2 border-purple-500 px-2 py-1 bg-purple-50">
          Punctuation
        </span>
      </div>
    </div>
  );
};
