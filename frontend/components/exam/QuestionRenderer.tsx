/**
 * Question Renderer Component
 * Reusable question rendering logic for Listening and Reading sections
 * 
 * Supports all 16 IELTS question types:
 * ✅ MCQ (Multiple Choice - Single Answer)
 * ✅ MCMA (Multiple Choice - Multiple Answers)
 * ✅ TFNG (True/False/Not Given)
 * ✅ YNNG (Yes/No/Not Given)
 * ✅ SA (Short Answer)
 * ✅ NC (Note Completion)
 * ✅ MH (Matching Headings)
 * ✅ MI (Matching Information)
 * ✅ MF (Matching Features)
 * ✅ SUC (Summary Completion)
 * ✅ TC (Table Completion)
 * ✅ FCC (Flow Chart Completion)
 * ✅ DL (Diagram Labelling)
 * ✅ ML (Map Labelling)
 * ✅ SC (Sentence Completion)
 * ✅ FC (Form Completion)
 * 
 * 100% Vue.js parity achieved - all question types fully implemented
 */

"use client";

import React from "react";

interface Question {
  id: number;
  order: number;
  question_text: string;
  options?: Array<{ key?: string; choice_text: string }>; // Made key optional to match Choice type
  question_data?: any;
  question_body?: any;
  max_selections?: number | string; // For MCMA questions
  stem?: string; // Question stem
  picture_url?: string; // For diagram/map labelling
}

interface TestHead {
  id: number;
  title: string;
  question_range?: string;
  description?: string;
  instruction?: string;
  answer_format?: string;
  question_type: string;
  view_type?: string;
  picture_url?: string;
  question_data?: any;
  questions: Question[];
}

interface UserAnswers {
  [questionId: number]: string;
}

interface QuestionRendererProps {
  group: TestHead;
  userAnswers: UserAnswers;
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void;
  onFocus?: (questionId: number) => void;
  renderedCache?: { [key: number]: boolean };
  fontSize?: string;
}

/**
 * Render question text with paragraph-awareness.
 * - If text contains HTML tags, render with dangerouslySetInnerHTML
 * - Otherwise, split on double newlines into paragraphs
 * - Single newlines become <br> tags
 */
const renderQuestionText = (text?: string): React.ReactNode => {
  if (!text) return null;
  
  // If it looks like HTML, render as HTML
  if (text.includes("<")) {
    return (
      <div
        className="text-slate-700 dark:text-slate-300 leading-relaxed"
        style={{ fontSize: "inherit" }}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  // Check if text contains newlines
  if (text.includes("\n")) {
    // Format newlines: double newlines become paragraph breaks, single newlines become <br>
    let formattedText = text
      .replace(/\n\n+/g, '</p><p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-2">')
      .replace(/\n/g, '<br>');
    
    // Wrap in paragraph tag
    formattedText = `<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-2">${formattedText}</p>`;
    
    return (
      <div
        className="text-slate-700 dark:text-slate-300 leading-relaxed"
        style={{ fontSize: "inherit" }}
        dangerouslySetInnerHTML={{ __html: formattedText }}
      />
    );
  }

  // Plain text without newlines
  return (
    <p className="text-slate-700 dark:text-slate-300 leading-relaxed" style={{ fontSize: "inherit" }}>
      {text}
    </p>
  );
};

/**
 * Render instruction/description header for question groups
 * Reusable for both listening and reading sections
 */
const renderInstruction = (group: TestHead | undefined): React.ReactNode => {
  // Guard against undefined/null group
  if (!group) return null;

  const parts: React.ReactNode[] = [];

  // Question range badge
  if (group.question_range) {
    const range = group.question_range;
    const [start, end] = range.split("-").map(Number);
    
    parts.push(
      <div
        key="badge"
        className="inline-flex items-center justify-center h-6 px-3 bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold rounded mb-3"
      >
        {group.title}
      </div>
    );
  }

  // Description/Instruction with newline formatting
  if (group.description || group.instruction) {
    const text = group.description || group.instruction || "";
    
    // Format newlines: double newlines become paragraphs, single newlines become <br>
    const formattedText = text
      .replace(/\n\n+/g, '</p><p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-2">')
      .replace(/\n/g, '<br>');
    
    parts.push(
      <div
        key="description"
        className="text-slate-700 dark:text-slate-300 leading-relaxed mb-2"
        style={{ fontSize: "inherit" }}
        dangerouslySetInnerHTML={{ __html: formattedText }}
      />
    );
  }

  // Answer format (for completion types)
  if (group.answer_format) {
    parts.push(
      <p
        key="answer-format"
        className="text-slate-700 dark:text-slate-300 leading-relaxed"
        style={{ fontSize: "inherit" }}
      ></p>
    );
  }

  if (parts.length === 0) return null;

  return <div className="mb-6">{parts}</div>;
};

/**
 * Render MCQ (Multiple Choice - Single Answer)
 */
const renderMCQ = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void
): React.ReactNode => {
  return (
    <div className="space-y-6">
      {group.questions.map((question) => (
        <div
          key={question.id}
          className="pb-6 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold rounded-full shrink-0">
              {question.order}
            </span>
            <div className="flex-1">
              <div style={{ fontSize: "inherit" }}>
                {renderQuestionText(question.question_text)}
              </div>
            </div>
          </div>
          <div className="ml-9 space-y-2">
            {(question.options || []).map((option) => {
              if (!option.key) return null; // Skip if no key
              const isSelected = userAnswers[question.id] === option.key;
              return (
                <label
                  key={option.key}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    value={option.key}
                    checked={isSelected}
                    onChange={() => onAnswer?.(question.id, option.key!, true)}
                    data-question-id={question.id}
                    data-answer={option.key}
                    data-immediate="true"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 focus:ring-2"
                  />
                  <span
                    className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    style={{ fontSize: "inherit" }}
                  >
                    <strong className="font-semibold">{option.key}</strong>
                    <span>{option.choice_text}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Render TFNG/YNNG (True/False/Not Given or Yes/No/Not Given)
 */
const renderTFNG = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void
): React.ReactNode => {
  const options =
    group.question_type === "YNNG"
      ? ["YES", "NO", "NOT GIVEN"]
      : ["TRUE", "FALSE", "NOT GIVEN"];

  return (
    <div className="space-y-4">
      {group.questions.map((question) => {
        const currentAnswer = userAnswers[question.id] || "";

        return (
          <div
            key={question.id}
            className="pb-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold rounded-full shrink-0">
                {question.order}
              </span>
              <div className="flex-1" style={{ fontSize: "inherit" }}>
                {renderQuestionText(question.question_text)}
              </div>
              <select
                id={`select-tfng-${question.id}`}
                data-question-id={question.id}
                value={currentAnswer}
                onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
                className="px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-indigo-600 focus:outline-none transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                style={{ fontSize: "inherit" }}
              >
                <option key={`placeholder-${question.id}`} value="">Select...</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Render SA (Short Answer)
 */
const renderShortAnswer = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  return (
    <div className="space-y-4">
      {group.questions.map((question) => {
        const currentAnswer = userAnswers[question.id] || "";

        return (
          <div key={question.id} className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold rounded-full shrink-0">
              {question.order}
            </span>
            <div className="flex-1">
              <div style={{ fontSize: "inherit" }}>{renderQuestionText(question.question_text)}</div>
              <input
                type="text"
                id={`input-${question.id}`}
                data-question-id={question.id}
                value={currentAnswer}
                onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
                onFocus={() => onFocus?.(question.id)}
                placeholder="Type your answer here"
                autoComplete="off"
                className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-indigo-600 focus:outline-none transition-colors bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Render MCMA (Multiple Choice - Multiple Answers)
 */
const renderMCMA = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void
): React.ReactNode => {
  return (
    <div className="space-y-6">
      {group.questions.map((question) => {
        // Handle different answer formats (string, array, or empty)
        const rawAnswer = userAnswers[question.id];
        let currentAnswers: string[] = [];

        if (Array.isArray(rawAnswer)) {
          currentAnswers = rawAnswer.filter((a) => a && a.trim());
        } else if (typeof rawAnswer === "string" && rawAnswer) {
          // Split into individual characters (backend stores as "ACE" not "A,C,E")
          currentAnswers = rawAnswer.split("").filter((a) => a.trim());
        }

        // Get max selections from question (stored directly on question object)
        let maxSelections = 999;
        if (question.max_selections) {
          maxSelections = typeof question.max_selections === 'string' 
            ? parseInt(question.max_selections) 
            : question.max_selections;
        } else if (question.options) {
          // Fallback to total number of options
          maxSelections = question.options.length;
        }

        const maxReached = currentAnswers.length >= maxSelections;

        const handleCheckboxChange = (optionKey: string, checked: boolean) => {
          let newAnswers: string[];

          if (checked) {
            if (maxReached) return;
            newAnswers = [...currentAnswers, optionKey];
          } else {
            newAnswers = currentAnswers.filter((a) => a !== optionKey);
          }

          // Sort and join WITHOUT comma (backend expects "ACE" not "A,C,E")
          const newAnswer = newAnswers.sort().join("");
          onAnswer?.(question.id, newAnswer, true);
        };

        return (
          <div
            key={question.id}
            className="pb-6 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold rounded-full shrink-0">
                {question.order}
              </span>
              <div className="flex-1">
                <div style={{ fontSize: "inherit" }}>{renderQuestionText(question.question_text)}</div>
                {maxSelections < 999 && (
                  <p
                    className="text-sm text-slate-600 dark:text-slate-400 mt-1"
                    style={{ fontSize: "inherit" }}
                  >
                    Choose up to <strong>{maxSelections}</strong> answers
                  </p>
                )}
              </div>
            </div>
            <div className="ml-9 space-y-2">
              {(question.options || []).map((option) => {
                if (!option.key) return null; // Skip if no key
                const isSelected = currentAnswers.includes(option.key);
                const isDisabled = !isSelected && maxReached;

                return (
                  <label
                    key={option.key}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-sm"
                        : isDisabled
                        ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={(e) =>
                        handleCheckboxChange(option.key!, e.target.checked)
                      }
                      data-question-id={question.id}
                      data-answer={option.key}
                      data-type="mcma"
                      data-max-selections={maxSelections}
                      data-immediate="true"
                      className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 focus:ring-2"
                    />
                    <span
                      className="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                      style={{ fontSize: "inherit" }}
                    >
                      <strong className="font-semibold">{option.key}</strong>
                      <span>{option.choice_text}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Render NC (Note Completion)
 * Uses question_data JSON to build hierarchical structure
 */
const renderNoteCompletion = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  const noteData = group.question_data;

  // If no question_data or invalid structure, fall back to simple rendering
  if (!noteData || !noteData.items) {
    return renderNoteCompletionSimple(group, userAnswers, onAnswer, onFocus);
  }

  // Create a map of questions by sequential index
  const questionMap: { [index: number]: Question } = {};
  group.questions.forEach((q, index) => {
    questionMap[index] = q;
  });

  let currentQuestionIndex = 0;

  // Recursive function to render items
  const renderItems = (items: any[], level: number = 0): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];

    for (const [itemIdx, item] of items.entries()) {
      if (typeof item === "string") {
        // Plain text or text with <input> placeholder
        if (item.includes("<input>")) {
          const parts = item.split("<input>");
          const lineElements: React.ReactNode[] = [];

          for (let idx = 0; idx < parts.length; idx++) {
            lineElements.push(
              <React.Fragment key={`text-${idx}`}>{parts[idx]}</React.Fragment>
            );

            if (idx < parts.length - 1) {
              const question = questionMap[currentQuestionIndex];
              if (!question) {
                lineElements.push(
                  <span key={`missing-${idx}`} className="text-red-500">
                    [Missing Question]
                  </span>
                );
                currentQuestionIndex++;
              } else {
                const currentAnswer = userAnswers[question.id] || "";
                lineElements.push(
                  <input
                    key={`input-${question.id}`}
                    type="text"
                    id={`q-${question.id}`}
                    data-question-id={question.id}
                    value={currentAnswer}
                    onChange={(e) =>
                      onAnswer?.(question.id, e.target.value, false)
                    }
                    onFocus={() => onFocus?.(question.id)}
                    placeholder={question.order.toString()}
                    autoComplete="off"
                    className="inline-block w-32 px-2 border-2 rounded-md border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-center focus:border-slate-600 dark:focus:border-slate-400 focus:outline-none transition-colors"
                  />
                );
                currentQuestionIndex++;
              }
            }
          }

          elements.push(
            <div
              key={`line-${itemIdx}`}
              className={`text-slate-700 dark:text-slate-300 leading-relaxed ${
                level > 0 ? "ml-4" : ""
              }`}
              style={{ fontSize: "inherit" }}
            >
              {lineElements}
            </div>
          );
        } else {
          // Plain text item
          elements.push(
            <div
              key={`text-${itemIdx}`}
              className={`text-slate-700 dark:text-slate-300 leading-relaxed ${
                level > 0 ? "ml-4" : ""
              }`}
              style={{ fontSize: "inherit" }}
            >
              {item.trim()}
            </div>
          );
        }
      } else if (typeof item === "object" && item.items) {
        // Nested structure with optional prefix/title
        const hasTitle = item.title;
        const hasPrefix = item.prefix;

        const nestedElements: React.ReactNode[] = [];

        if (hasTitle) {
          nestedElements.push(
            <div
              key="title"
              className={`font-bold text-slate-900 dark:text-slate-100 mt-3 mb-2 ${
                level > 0 ? "ml-4" : ""
              }`}
              style={{ fontSize: "inherit" }}
            >
              {item.title}
            </div>
          );
        }

        if (hasPrefix) {
          // Process prefix for <input> tags
          let processedPrefix = item.prefix;
          const prefixElements: React.ReactNode[] = [];

          if (processedPrefix.includes("<input>")) {
            const parts = processedPrefix.split("<input>");
            for (let idx = 0; idx < parts.length; idx++) {
              prefixElements.push(
                <React.Fragment key={`prefix-text-${idx}`}>
                  {parts[idx]}
                </React.Fragment>
              );

              if (idx < parts.length - 1) {
                const question = questionMap[currentQuestionIndex];
                if (!question) {
                  prefixElements.push(
                    <span key={`prefix-missing-${idx}`} className="text-red-500">
                      [Missing Question]
                    </span>
                  );
                  currentQuestionIndex++;
                } else {
                  const currentAnswer = userAnswers[question.id] || "";
                  prefixElements.push(
                    <input
                      key={`prefix-input-${question.id}`}
                      type="text"
                      id={`q-${question.id}`}
                      data-question-id={question.id}
                      value={currentAnswer}
                      onChange={(e) =>
                        onAnswer?.(question.id, e.target.value, false)
                      }
                      onFocus={() => onFocus?.(question.id)}
                      placeholder={question.order.toString()}
                      autoComplete="off"
                      className="inline-block w-32 px-2 border-2 rounded-md border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-center focus:border-slate-600 dark:focus:border-slate-400 focus:outline-none transition-colors"
                    />
                  );
                  currentQuestionIndex++;
                }
              }
            }

            nestedElements.push(
              <div
                key="prefix"
                className={`text-slate-700 dark:text-slate-300 font-medium ${
                  level > 0 ? "ml-4" : ""
                } mb-1`}
                style={{ fontSize: "inherit" }}
              >
                {prefixElements}
              </div>
            );
          } else {
            nestedElements.push(
              <div
                key="prefix"
                className={`text-slate-700 dark:text-slate-300 font-medium ${
                  level > 0 ? "ml-4" : ""
                } mb-1`}
                style={{ fontSize: "inherit" }}
              >
                {processedPrefix}
              </div>
            );
          }
        }

        // Recursively render nested items
        const nested = renderItems(item.items, level + 1);
        nestedElements.push(
          <div key="nested" className={hasPrefix || hasTitle ? "ml-4" : ""}>
            {nested}
          </div>
        );

        elements.push(
          <div key={`nested-${itemIdx}`}>{nestedElements}</div>
        );
      }
    }

    return elements;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg">
      <div className="border border-slate-300 dark:border-slate-600 rounded p-6 space-y-2">
        <h3
          className="text-center text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700"
          style={{ fontSize: "inherit" }}
        >
          {noteData.title || group.title || "Complete the notes below"}
        </h3>
        {renderItems(noteData.items)}
      </div>
    </div>
  );
};

/**
 * Render NC Simple (Fallback when no question_data)
 */
const renderNoteCompletionSimple = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-2">
      <div className="border border-slate-300 dark:border-slate-600 rounded p-6 space-y-3">
        <h3 className="text-center text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
          {group.title || "Complete the notes below"}
        </h3>
        {group.questions.map((question) => {
          const text = question.question_text || "";
          const currentAnswer = userAnswers[question.id] || "";

          if (text.includes("{{")) {
            // Inline format with placeholder
            const parts = text.split(/(\{\{\d+\}\})/g);
            return (
              <div
                key={question.id}
                className="text-slate-700 dark:text-slate-300 leading-relaxed"
                style={{ fontSize: "inherit" }}
              >
                {parts.map((part, idx) => {
                  const match = part.match(/\{\{(\d+)\}\}/);
                  if (match) {
                    return (
                      <input
                        key={idx}
                        type="text"
                        id={`q-${question.id}`}
                        data-question-id={question.id}
                        value={currentAnswer}
                        onChange={(e) =>
                          onAnswer?.(question.id, e.target.value, false)
                        }
                        onFocus={() => onFocus?.(question.id)}
                        placeholder={question.order.toString()}
                        autoComplete="off"
                        className="inline-block w-32 px-2 border-2 rounded-md border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-center focus:border-slate-600 dark:focus:border-slate-400 focus:outline-none transition-colors"
                      />
                    );
                  }
                  return <React.Fragment key={idx}>{part}</React.Fragment>;
                })}
              </div>
            );
          } else {
            // Standard question-answer format
            return (
              <div
                key={question.id}
                data-question-id={question.id}
                className="text-slate-700 dark:text-slate-300 leading-relaxed"
                style={{ fontSize: "inherit" }}
              >
                {text}{" "}
                <input
                  type="text"
                  id={`q-${question.id}`}
                  data-question-id={question.id}
                  value={currentAnswer}
                  onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
                  onFocus={() => onFocus?.(question.id)}
                  placeholder={question.order.toString()}
                  autoComplete="off"
                  className="inline-block w-32 ml-2 px-2 py-0.5 rounded-md border-b-2 border-slate-400 dark:border-slate-500 bg-transparent text-slate-900 dark:text-slate-100 font-medium text-center focus:border-indigo-600 focus:outline-none transition-colors"
                  style={{
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderRadius: 0,
                  }}
                />
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

/**
 * Render Matching Questions (MH, MI, MF)
 * Uses dropdown selects for answer selection
 */
const renderMatching = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void
): React.ReactNode => {
  // Common interface for all dropdown options
  interface DropdownOption {
    key: string;
    text: string;
  }
  
  // Parse matching data from question_data
  let headings: DropdownOption[] = [];
  let dropdownOptions: DropdownOption[] = [];
  
  if (group.question_data) {
    try {
      const data = typeof group.question_data === 'string' 
        ? JSON.parse(group.question_data) 
        : group.question_data;
      
      // For MH (Matching Headings), use headings array
      if (group.question_type === 'MH' && data.headings) {
        headings = data.headings.map((h: any) => ({
          key: h.key || '',
          text: h.text || ''
        }));
        dropdownOptions = headings;
      } else {
        // For MI, MF, use options array and normalize structure
        const rawOptions = data.options || [];
        dropdownOptions = rawOptions.map((opt: any) => ({
          key: opt.key || opt.value || '',
          text: opt.text || opt.label || ''
        }));
      }
    } catch (e) {
      console.error("Failed to parse matching data:", e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Display headings list for MH questions */}
      {group.question_type === 'MH' && headings.length > 0 && (
        <div className="border border-slate-300 dark:border-slate-600 rounded p-5 mb-6 bg-white dark:bg-slate-800">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 text-center border-b border-slate-200 dark:border-slate-700 pb-2" style={{ fontSize: "inherit" }}>
            List of Headings
          </h4>
          <div className="space-y-2.5">
            {headings.map((heading, idx) => (
              <div key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300" style={{ fontSize: "inherit" }}>
                <span className="font-bold min-w-8 text-slate-900 dark:text-slate-100">{heading.key}</span>
                <span className="flex-1">{heading.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Questions */}
      <div className="space-y-4">
        {group.questions.map((question) => {
          const currentAnswer = userAnswers[question.id] || "";
          return (
  <div
    key={question.id}
    className="pb-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
  >
    <div className="flex items-center gap-3">
      {/* Number bubble */}
      <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold rounded-full shrink-0">
        {question.order}
      </span>

      {/* Row container */}
      <div className="flex items-center w-full justify-between gap-4">
        {/* Text */}
        <div className="flex-1" style={{ fontSize: "inherit" }}>
          {renderQuestionText(question.question_text || question.stem)}
        </div>

        {/* Select */}
        <select
          id={`select-${question.id}`}
          data-question-id={question.id}
          value={currentAnswer}
          onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
          className="px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg 
                     focus:border-indigo-600 focus:outline-none transition-colors
                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium
                     w-48"
          style={{ fontSize: "inherit" }}
        >
          <option value="">Select heading...</option>
          {dropdownOptions.map((option, optionIdx) => (
            <option key={`${question.id}-option-${optionIdx}`} value={option.key}>
              {option.key}{option.text && ` - ${option.text}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
);
        })}
      </div>
    </div>
  );
};

/**
 * Render Summary Completion (SUC)
 * Displays summary text with inline blanks
 * Supports both free-form text input and word_list dropdown modes
 */
const renderSummaryCompletion = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  // Word list option interface
  interface WordOption {
    key: string;
    text: string;
  }

  // Get summary data from question_data
  let summaryData: { 
    title?: string; 
    text?: string; 
    prefix?: string;
    word_list?: WordOption[];
  } = {};
  
  if (group.question_data) {
    try {
      summaryData = typeof group.question_data === 'string'
        ? JSON.parse(group.question_data)
        : group.question_data;
    } catch (e) {
      console.error("Failed to parse summary data:", e);
    }
  }

  // Check if word_list mode is active
  const hasWordList = summaryData.word_list && summaryData.word_list.length > 0;
  const wordList = summaryData.word_list || [];

  // Create a map of questions by sequential index (0-based)
  const questionMap: Record<number, Question> = {};
  group.questions.forEach((q, index) => {
    questionMap[index] = q;
  });

  let blankIndex = 0;

  // Helper function to replace <input> tags with appropriate input element
  const replaceInputs = (text: string): React.ReactNode[] => {
    const parts = text.split("<input>");
    const elements: React.ReactNode[] = [];

    for (let idx = 0; idx < parts.length; idx++) {
      elements.push(<React.Fragment key={`text-${idx}`}>{parts[idx]}</React.Fragment>);

      if (idx < parts.length - 1) {
        const question = questionMap[blankIndex];
        if (!question) {
          elements.push(
            <span key={`missing-${idx}`} className="text-red-500">
              [Missing Question]
            </span>
          );
          blankIndex++;
        } else {
          const currentAnswer = userAnswers[question.id] || "";
          
          if (hasWordList) {
            // Dropdown mode for word list
            elements.push(
              <select
                key={`select-${question.id}`}
                id={`q-${question.id}`}
                data-question-id={question.id}
                value={currentAnswer}
                onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
                className="inline-block w-16 h-7 px-1 mx-1 text-center border-2 border-slate-400 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold focus:border-slate-600 dark:focus:border-slate-400 focus:outline-none transition-colors appearance-none cursor-pointer align-baseline"
                style={{ fontSize: "inherit" }}
              >
                <option value="">{question.order}</option>
                {wordList.map((option) => (
                  <option key={`${question.id}-opt-${option.key}`} value={option.key}>
                    {option.key}
                  </option>
                ))}
              </select>
            );
          } else {
            // Text input mode for free-form answers
            elements.push(
              <input
                key={`input-${question.id}`}
                type="text"
                id={`q-${question.id}`}
                data-question-id={question.id}
                value={currentAnswer}
                onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
                onFocus={() => onFocus?.(question.id)}
                placeholder={question.order.toString()}
                autoComplete="off"
                className="inline-block w-32 px-2 border-2 rounded-md border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-center focus:border-slate-600 dark:focus:border-slate-400 focus:outline-none transition-colors"
              />
            );
          }
          blankIndex++;
        }
      }
    }

    return elements;
  };

  // Process prefix if exists
  let processedPrefix: React.ReactNode[] = [];
  if (summaryData.prefix) {
    blankIndex = 0;
    processedPrefix = replaceInputs(summaryData.prefix);
  }

  // Process main text
  let summaryText: React.ReactNode[] = [];
  if (summaryData.text) {
    summaryText = replaceInputs(summaryData.text);
  }

  return (
    <div className="space-y-4">
      {/* Word List Box - Only shown when word_list exists */}
      {hasWordList && (
        <div className="border border-slate-300 dark:border-slate-600 rounded p-4 bg-white dark:bg-slate-800">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {wordList.map((word) => (
              <div key={word.key} className="flex items-center gap-2 text-slate-700 dark:text-slate-300" style={{ fontSize: "inherit" }}>
                <span className="font-bold text-slate-900 dark:text-slate-100">{word.key}</span>
                <span>{word.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Content */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        {/* Display image if available */}
        {group.picture_url && (
          <div className="mb-6">
            <img
              src={group.picture_url}
              alt="Summary reference"
              className="w-full max-w-2xl mx-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-md"
            />
          </div>
        )}

        {/* Title */}
        {summaryData.title && (
          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4 text-center border-b border-slate-200 dark:border-slate-700 pb-2" style={{ fontSize: "inherit" }}>
            {summaryData.title}
          </h4>
        )}
        
        {processedPrefix.length > 0 && (
          <div
            className="text-slate-700 dark:text-slate-300 font-medium mb-3"
            style={{ fontSize: "inherit" }}
          >
            {processedPrefix}
          </div>
        )}
        <div
          className="text-slate-700 dark:text-slate-300 leading-relaxed"
          style={{ fontSize: "inherit" }}
        >
          {summaryText}
        </div>
      </div>
    </div>
  );
};

/**
 * Render Table Completion (TC)
 * Displays table with input fields in cells
 */
const renderTableCompletion = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  // Parse table data from question_data
  let tableData: any = null;
  if (group.question_data) {
    try {
      tableData = typeof group.question_data === 'string'
        ? JSON.parse(group.question_data)
        : group.question_data;
    } catch (e) {
      console.error("Failed to parse table data:", e);
    }
  }

  // Create question map by sequential index (0-based)
  const questionMap: Record<number, Question> = {};
  group.questions.forEach((q, index) => {
    questionMap[index] = q;
  });

  // Detect format and process accordingly
  let headers: string[] = [];
  let rows: any[][] = [];
  let tableTitle = "";
  let tablePrefix = "";

  if (tableData && tableData.items && Array.isArray(tableData.items)) {
    // New format
    headers = tableData.items[0] || [];
    rows = tableData.items.slice(1);
    tableTitle = tableData.title || "";
    tablePrefix = tableData.prefix || "";
  } else if (tableData) {
    // Old format
    headers = tableData.headers || [];
    rows = tableData.rows || [];
    tableTitle = tableData.title || "";
    tablePrefix = tableData.prefix || "";
  }

  let currentQuestionIndex = 0;

  // Helper function to replace <input> with actual input fields
  const replaceInputs = (text: string): React.ReactNode[] => {
    const parts = text.split("<input>");
    const elements: React.ReactNode[] = [];

    for (let idx = 0; idx < parts.length; idx++) {
      elements.push(<React.Fragment key={`text-${idx}`}>{parts[idx]}</React.Fragment>);

      if (idx < parts.length - 1) {
        const question = questionMap[currentQuestionIndex];
        if (!question) {
          elements.push(
            <span key={`missing-${idx}`} className="text-red-500">
              [Missing]
            </span>
          );
          currentQuestionIndex++;
        } else {
          const currentAnswer = userAnswers[question.id] || "";
          elements.push(
            <input
              key={`input-${question.id}`}
              type="text"
              id={`q-${question.id}`}
              data-question-id={question.id}
              value={currentAnswer}
              onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
              onFocus={() => onFocus?.(question.id)}
              placeholder={question.order.toString()}
              autoComplete="off"
              className="inline-block w-32 px-2 border-2 rounded-md border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-center focus:border-slate-600 dark:focus:border-slate-400 focus:outline-none transition-colors"
            />
          );
          currentQuestionIndex++;
        }
      }
    }

    return elements;
  };

  // Process prefix if exists
  let processedPrefix: React.ReactNode[] = [];
  if (tablePrefix) {
    currentQuestionIndex = 0;
    processedPrefix = replaceInputs(tablePrefix);
  }

  // Process cell content
  const processCellContent = (cell: any): React.ReactNode => {
    if (typeof cell === "string") {
      if (cell.includes("<input>")) {
        return <div>{replaceInputs(cell)}</div>;
      }
      return cell;
    } else if (Array.isArray(cell)) {
      return (
        <div className="space-y-1">
          {cell.map((line, idx) => (
            <div key={idx}>
              {typeof line === "string" && line.includes("<input>")
                ? replaceInputs(line)
                : line}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="overflow-x-auto">
      {processedPrefix.length > 0 && (
        <div className="text-slate-700 dark:text-slate-300 font-medium mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          {processedPrefix}
        </div>
      )}
      {tableTitle && (
        <h3 className="text-center text-lg font-bold text-slate-900 dark:text-slate-100 p-3 border-2 border-slate-400 dark:border-slate-600">
          {tableTitle}
        </h3>
      )}
      <table className="w-full border-collapse border-2 border-slate-400 dark:border-slate-600">
        {headers.length > 0 && (
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-700">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="border-2 border-slate-400 dark:border-slate-600 px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={rowIndex % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900"}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-2 border-slate-400 dark:border-slate-600 px-4 py-3 text-slate-700 dark:text-slate-300 align-top"
                >
                  {processCellContent(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Render Flow Chart Completion (FCC)
 * Similar to form completion but with visual flow indicators
 */
const renderFlowChartCompletion = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  // Parse question_data for prefix
  let fccData: { prefix?: string } = {};
  if (group.question_data) {
    try {
      fccData = typeof group.question_data === 'string'
        ? JSON.parse(group.question_data)
        : group.question_data;
    } catch (e) {
      console.error("Failed to parse FCC data:", e);
    }
  }

  // Create a map of questions by sequential index (0-based)
  const questionMap: Record<number, Question> = {};
  group.questions.forEach((q, index) => {
    questionMap[index] = q;
  });

  let currentQuestionIndex = 0;

  // Helper function to replace <input> tags in prefix
  const replaceInputs = (text: string): React.ReactNode[] => {
    const parts = text.split("<input>");
    const elements: React.ReactNode[] = [];

    for (let idx = 0; idx < parts.length; idx++) {
      elements.push(<React.Fragment key={`text-${idx}`}>{parts[idx]}</React.Fragment>);

      if (idx < parts.length - 1) {
        const question = questionMap[currentQuestionIndex];
        if (!question) {
          elements.push(
            <span key={`missing-${idx}`} className="text-red-500">
              [Missing]
            </span>
          );
          currentQuestionIndex++;
        } else {
          const currentAnswer = userAnswers[question.id] || "";
          elements.push(
            <input
              key={`input-${question.id}`}
              type="text"
              id={`q-${question.id}`}
              data-question-id={question.id}
              value={currentAnswer}
              onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
              onFocus={() => onFocus?.(question.id)}
              placeholder={question.order.toString()}
              autoComplete="off"
              className="inline-block w-32 px-2 border-2 rounded-md border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-center focus:border-slate-600 dark:focus:border-slate-400 focus:outline-none transition-colors"
            />
          );
          currentQuestionIndex++;
        }
      }
    }

    return elements;
  };

  // Process prefix if exists
  let processedPrefix: React.ReactNode[] = [];
  if (fccData.prefix) {
    currentQuestionIndex = 0;
    processedPrefix = replaceInputs(fccData.prefix);
  }

  return (
    <div className="space-y-3">
      {processedPrefix.length > 0 && (
        <div className="text-slate-700 dark:text-slate-300 font-medium mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          {processedPrefix}
        </div>
      )}
      {group.questions.map((question, index) => {
        const currentAnswer = userAnswers[question.id] || "";
        return (
          <div key={question.id}>
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold rounded-full shrink-0">
                {question.order}
              </span>
              <div className="flex-1">
                <input
                  type="text"
                  id={`q-${question.id}`}
                  data-question-id={question.id}
                  value={currentAnswer}
                  onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
                  onFocus={() => onFocus?.(question.id)}
                  placeholder="Type your answer"
                  autoComplete="off"
                  className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-indigo-600 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            {index < group.questions.length - 1 && (
              <div className="flex justify-center py-2">
                <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Render Diagram/Map Labelling (DL, ML)
 * Shows image with numbered labels in a structured list format
 */
const renderDiagramLabelling = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  // Get diagram data from question_data
  let diagramData: { title?: string; description?: string; imageUrl?: string; labels?: any[] } = {};
  if (group.question_data) {
    try {
      diagramData = typeof group.question_data === 'string'
        ? JSON.parse(group.question_data)
        : group.question_data;
    } catch (e) {
      console.error("Failed to parse diagram data:", e);
    }
  }

  // Use picture_url from group if available
  const imageUrl = group.picture_url || diagramData.imageUrl;

  return (
    <div className="space-y-4">
      {/* Map/Diagram Title and Description */}
      {(diagramData.title || diagramData.description) && (
        <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-4">
          {diagramData.title && (
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              {diagramData.title}
            </h3>
          )}
          {diagramData.description && (
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {diagramData.description}
            </p>
          )}
        </div>
      )}

      {/* Diagram/Map Image */}
      {imageUrl && (
        <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-4 flex justify-center">
          <img
            src={imageUrl}
            alt={diagramData.title || group.title || "Map/Diagram"}
            className="max-w-full h-auto rounded"
            style={{ maxHeight: "500px" }}
          />
        </div>
      )}

      {/* Label Inputs - List Format */}
      <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg p-4">
        <div className="space-y-3">
          {group.questions.map((question) => {
            const currentAnswer = userAnswers[question.id] || "";
            return (
              <div key={question.id} className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-bold rounded-full shrink-0">
                  {question.order}
                </span>
                <div className="flex-1">
                  <input
                    type="text"
                    id={`q-${question.id}`}
                    data-question-id={question.id}
                    value={currentAnswer}
                    onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
                    onFocus={() => onFocus?.(question.id)}
                    placeholder="Type your answer"
                    autoComplete="off"
                    className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-lg focus:border-indigo-600 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Render Sentence Completion (SC)
 * Handles inline <input> tags in question_text
 */
const renderSentenceCompletion = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  // Parse question_data for prefix
  let scData: { prefix?: string } = {};
  if (group.question_data) {
    try {
      scData = typeof group.question_data === 'string'
        ? JSON.parse(group.question_data)
        : group.question_data;
    } catch (e) {
      console.error("Failed to parse SC data:", e);
    }
  }

  // Create a map of questions by sequential index (0-based)
  const questionMap: Record<number, Question> = {};
  group.questions.forEach((q, index) => {
    questionMap[index] = q;
  });

  let currentQuestionIndex = 0;

  // Helper function to replace <input> tags
  const replaceInputs = (text: string, questionId?: number): React.ReactNode[] => {
    const parts = text.split("<input>");
    const elements: React.ReactNode[] = [];

    for (let idx = 0; idx < parts.length; idx++) {
      elements.push(<React.Fragment key={`text-${idx}`}>{parts[idx]}</React.Fragment>);

      if (idx < parts.length - 1) {
        const question = questionId
          ? group.questions.find(q => q.id === questionId)
          : questionMap[currentQuestionIndex];

        if (!question) {
          elements.push(
            <span key={`missing-${idx}`} className="text-red-500">
              [Missing]
            </span>
          );
          if (!questionId) currentQuestionIndex++;
        } else {
          const currentAnswer = userAnswers[question.id] || "";
          elements.push(
            <input
              key={`input-${question.id}`}
              type="text"
              id={`q-${question.id}`}
              data-question-id={question.id}
              value={currentAnswer}
              onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
              onFocus={() => onFocus?.(question.id)}
              placeholder={question.order.toString()}
              autoComplete="off"
              className="inline-block w-32 px-2 border-2 rounded-md border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-center focus:border-slate-600 dark:focus:border-slate-400 focus:outline-none transition-colors"
            />
          );
          if (!questionId) currentQuestionIndex++;
        }
      }
    }

    return elements;
  };

  // Process prefix if exists
  let processedPrefix: React.ReactNode[] = [];
  if (scData.prefix) {
    currentQuestionIndex = 0;
    processedPrefix = replaceInputs(scData.prefix);
  }

  return (
    <div className="space-y-4">
      {processedPrefix.length > 0 && (
        <div className="text-slate-700 dark:text-slate-300 font-medium mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
          {processedPrefix}
        </div>
      )}
      {group.questions.map((question) => {
        const text = question.question_text || "";
        return (
          <div
            key={question.id}
            className="pb-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold rounded-full shrink-0">
                {question.order}
              </span>
              <div className="flex-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                {text.includes("<input>") ? replaceInputs(text, question.id) : text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Render Form Completion (FC)
 * Uses question_data.items to build form structure with inline inputs
 */
const renderFormCompletion = (
  group: TestHead,
  userAnswers: UserAnswers,
  onAnswer?: (questionId: number, answer: string, immediate: boolean) => void,
  onFocus?: (questionId: number) => void
): React.ReactNode => {
  // Parse form data from question_data
  let formData: { title?: string; items?: string[] } | null = null;

  if (group.question_data) {
    try {
      formData = typeof group.question_data === 'string'
        ? JSON.parse(group.question_data)
        : group.question_data;
    } catch (e) {
      console.error("Failed to parse form data:", e);
    }
  }

  // If no question_data or invalid structure, fall back to simple rendering
  if (!formData || !formData.items) {
    return renderNoteCompletionSimple(group, userAnswers, onAnswer, onFocus);
  }

  // Create a map of questions by sequential index (0-based)
  const questionMap: Record<number, Question> = {};
  group.questions.forEach((q, index) => {
    questionMap[index] = q;
  });

  // Track current question index across all items
  let currentQuestionIndex = 0;

  // Recursive function to render items (handles nested objects/sections)
  const renderItem = (item: any, idx: number, level: number = 0): React.ReactNode => {
    // Handle nested object (sections)
    if (typeof item === 'object' && item !== null) {
      return (
        <div key={`section-${level}-${idx}`} className={`${level > 0 ? 'ml-4 mt-1' : ''} space-y-1`}>
          {item.prefix && (
            <div className="font-medium text-slate-700 dark:text-slate-300">
              {item.prefix}
            </div>
          )}
          {item.items && Array.isArray(item.items) && (
            <div className="space-y-1">
              {item.items.map((subItem: any, subIdx: number) => 
                renderItem(subItem, subIdx, level + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    // Handle string items
    if (typeof item === 'string') {
      if (!item.includes("<input>")) {
        return (
           <div key={`item-${level}-${idx}`} className="py-1 leading-relaxed">
             <span className="text-slate-900 dark:text-slate-100">{item}</span>
           </div>
        );
      }

      const parts = item.split("<input>");
      const elements: React.ReactNode[] = [];

      for (let i = 0; i < parts.length; i++) {
        elements.push(<React.Fragment key={`text-${i}`}>{parts[i]}</React.Fragment>);

        if (i < parts.length - 1) {
          const question = questionMap[currentQuestionIndex];
          if (!question) {
             elements.push(
               <span key={`missing-${i}`} className="text-red-500 mx-1 font-bold">
                 [?]
               </span>
             );
             currentQuestionIndex++;
          } else {
             const currentAnswer = userAnswers[question.id] || "";
             elements.push(
               <input
                  key={`input-${question.id}`}
                  type="text"
                  id={`q-${question.id}`}
                  data-question-id={question.id}
                  value={currentAnswer}
                  onChange={(e) => onAnswer?.(question.id, e.target.value, false)}
                  onFocus={() => onFocus?.(question.id)}
                  placeholder={question.order.toString()}
                  autoComplete="off"
                  className="inline-block w-32 mx-1 px-2 py-0.5 border-2 rounded-md border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-center focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none transition-colors"
               />
             );
             currentQuestionIndex++;
          }
        }
      }
      
      return (
        <div key={`item-${level}-${idx}`} className="py-1 leading-relaxed">
           <span className="text-slate-900 dark:text-slate-100">{elements}</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-400 dark:border-slate-600 p-6">
      {(formData.title || group.title) && (
        <h3 className="text-center text-base font-bold text-slate-900 dark:text-slate-100 mb-6 pb-3 border-b-2 border-slate-400 dark:border-slate-600">
          {formData.title || group.title}
        </h3>
      )}
      <div className="space-y-1.5">
        {formData.items.map((item, idx) => renderItem(item, idx))}
      </div>
    </div>
  );
};

/**
 * Component Export - Main QuestionRenderer
 */
export default function QuestionRenderer({
  group,
  userAnswers,
  onAnswer,
  onFocus,
  renderedCache = {},
  fontSize = "text-base",
}: QuestionRendererProps) {
  // Guard against undefined/null group
  if (!group) {
    console.error("[QuestionRenderer] Group is undefined or null");
    return (
      <div className="text-red-600 dark:text-red-400 p-4 border border-red-300 dark:border-red-700 rounded">
        <p className="font-semibold">Error: Question group data is missing</p>
        <p className="text-sm mt-1">Please contact support if this issue persists.</p>
      </div>
    );
  }

  // Guard against missing questions array
  if (!group.questions || !Array.isArray(group.questions)) {
    console.error("[QuestionRenderer] Group has no questions array:", group);
    return (
      <div className="text-yellow-600 dark:text-yellow-400 p-4 border border-yellow-300 dark:border-yellow-700 rounded">
        <p className="font-semibold">Warning: No questions found in this group</p>
        <p className="text-sm mt-1">Group: {group.title || "Untitled"}</p>
      </div>
    );
  }

  // Render instruction header
  const instruction = renderInstruction(group);

  // Route to appropriate renderer based on question type
  let content: React.ReactNode = null;

  if (group.question_type === "MCQ") {
    content = renderMCQ(group, userAnswers, onAnswer);
  } else if (group.question_type === "MCMA") {
    content = renderMCMA(group, userAnswers, onAnswer);
  } else if (group.question_type === "TFNG" || group.question_type === "YNNG") {
    content = renderTFNG(group, userAnswers, onAnswer);
  } else if (group.question_type === "SA") {
    content = renderShortAnswer(group, userAnswers, onAnswer, onFocus);
  } else if (group.question_type === "NC") {
    content = renderNoteCompletion(group, userAnswers, onAnswer, onFocus);
  } else if (group.question_type === "MH" || group.question_type === "MI" || group.question_type === "MF") {
    content = renderMatching(group, userAnswers, onAnswer);
  } else if (group.question_type === "SUC") {
    content = renderSummaryCompletion(group, userAnswers, onAnswer, onFocus);
  } else if (group.question_type === "TC") {
    content = renderTableCompletion(group, userAnswers, onAnswer, onFocus);
  } else if (group.question_type === "FCC") {
    content = renderFlowChartCompletion(group, userAnswers, onAnswer, onFocus);
  } else if (group.question_type === "DL" || group.question_type === "ML") {
    content = renderDiagramLabelling(group, userAnswers, onAnswer, onFocus);
  } else if (group.question_type === "SC") {
    content = renderSentenceCompletion(group, userAnswers, onAnswer, onFocus);
  } else if (group.question_type === "FC") {
    content = renderFormCompletion(group, userAnswers, onAnswer, onFocus);
  } else {
    // Fallback for unsupported types
    content = (
      <div className="text-slate-600 dark:text-slate-400 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="font-semibold mb-2">Question type "{group.question_type}" not yet supported.</p>
        <p className="text-sm">
          Supported types: MCQ, MCMA, TFNG, YNNG, SA, NC, MH, MI, MF, SUC, TC, FCC, DL, ML, SC, FC
        </p>
      </div>
    );
  }

  return (
    <div className={`${fontSize}`}>
      {instruction}
      {content}
    </div>
  );
}
