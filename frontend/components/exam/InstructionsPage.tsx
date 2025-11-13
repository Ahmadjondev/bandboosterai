/**
 * Instructions Page Component
 * Displays IELTS standard instructions before section starts
 * Matches Vue.js implementation with section progress indicator
 */

"use client";

import { useExam } from "./ExamContext";
import { getSectionInstructions } from "@/lib/exam-utils";
import { SectionName } from "@/types/exam";

export default function InstructionsPage() {
  const { currentSection, startSection } = useExam();

  const instructions = getSectionInstructions(currentSection);

  return (
    <div className="h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-8 transition-colors duration-300">
      <div className="max-w-3xl w-full">
        {/* Section Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-gray-100 mb-3">
            {instructions.title}
          </h1>
          <p className="text-base text-slate-600 dark:text-gray-400">
            Duration: {instructions.time}
          </p>
        </div>

        {/* Instructions to Candidates */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
            Instructions to Candidates
          </h2>
          <ul className="space-y-3 ml-1">
            {instructions.instructions.map((instruction, index) => (
              <li
                key={`inst-${index}`}
                className="flex items-start gap-3 text-base text-slate-700 dark:text-gray-300"
              >
                <span className="text-slate-400 dark:text-gray-500 mt-0.5">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Information for Candidates */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-slate-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
            Information for Candidates
          </h2>
          <ul className="space-y-3 ml-1">
            {instructions.information.map((info, index) => (
              <li
                key={`info-${index}`}
                className="flex items-start gap-3 text-base text-slate-700 dark:text-gray-300"
              >
                <span className="text-slate-400 dark:text-gray-500 mt-0.5">•</span>
                <span>{info}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Start Test Button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={startSection}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 px-8 py-3 text-base font-semibold text-white transition-colors shadow-md hover:shadow-lg"
          >
            Start test
          </button>
        </div>

        {/* Section Progress Indicator */}
        <div className="flex items-center justify-center gap-8 pt-6 border-t border-slate-200 dark:border-gray-700">
          <SectionProgressStep
            number={1}
            label="Listening"
            isActive={currentSection === SectionName.LISTENING}
          />
          <SectionProgressStep
            number={2}
            label="Reading"
            isActive={currentSection === SectionName.READING}
          />
          <SectionProgressStep
            number={3}
            label="Writing"
            isActive={currentSection === SectionName.WRITING}
          />
          <SectionProgressStep
            number={4}
            label="Speaking"
            isActive={currentSection === SectionName.SPEAKING}
          />
        </div>
      </div>
    </div>
  );
}

// Section Progress Step Component
function SectionProgressStep({
  number,
  label,
  isActive,
}: {
  number: number;
  label: string;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${
        isActive ? "opacity-100" : "opacity-30"
      }`}
    >
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full text-base font-semibold border-2 transition-all duration-300 ${
          isActive
            ? "bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500"
            : "bg-white dark:bg-gray-800 text-slate-500 dark:text-gray-400 border-slate-300 dark:border-gray-600"
        }`}
      >
        {number}
      </div>
      <span className="text-xs text-slate-600 dark:text-gray-400 font-medium">
        {label}
      </span>
    </div>
  );
}
