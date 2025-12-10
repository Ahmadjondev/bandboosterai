"use client";

import { useState, useEffect } from "react";
import { Lightbulb, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface StudyTip {
  id: number;
  title: string;
  content: string;
  category: 'listening' | 'reading' | 'writing' | 'speaking' | 'general';
}

const studyTips: StudyTip[] = [
  {
    id: 1,
    title: "Improve Listening",
    content: "Listen to English podcasts and BBC news daily. Focus on understanding the main ideas before catching details.",
    category: "listening",
  },
  {
    id: 2,
    title: "Reading Strategy",
    content: "Skim the passage first for the main idea, then scan for specific information. Don't read word by word!",
    category: "reading",
  },
  {
    id: 3,
    title: "Writing Task 2",
    content: "Always plan your essay for 5 minutes before writing. Include a clear thesis statement and topic sentences.",
    category: "writing",
  },
  {
    id: 4,
    title: "Speaking Fluency",
    content: "Record yourself speaking and listen back. Focus on natural pauses and avoid long silences.",
    category: "speaking",
  },
  {
    id: 5,
    title: "Time Management",
    content: "Practice under timed conditions. For the reading section, spend no more than 20 minutes per passage.",
    category: "general",
  },
  {
    id: 6,
    title: "Vocabulary Building",
    content: "Learn collocations, not just individual words. 'Make a decision' sounds more natural than 'do a decision'.",
    category: "general",
  },
];

const categoryColors = {
  listening: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  reading: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  writing: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
  speaking: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  general: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
};

export default function StudyTips() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      nextTip();
    }, 10000); // Change every 10 seconds

    return () => clearInterval(interval);
  }, [currentIndex]);

  const nextTip = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % studyTips.length);
      setIsAnimating(false);
    }, 150);
  };

  const prevTip = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + studyTips.length) % studyTips.length);
      setIsAnimating(false);
    }, 150);
  };

  const currentTip = studyTips[currentIndex];

  return (
    <div className="bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50 p-5">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 rounded-xl shrink-0">
          <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        
        <div className={`flex-1 min-w-0 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${categoryColors[currentTip.category]}`}>
              {currentTip.category}
            </span>
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3 h-3" />
              <span className="text-xs font-medium">Pro Tip</span>
            </div>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
            {currentTip.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {currentTip.content}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={prevTip}
            className="p-1.5 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors"
            aria-label="Previous tip"
          >
            <ChevronLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>
          <button
            onClick={nextTip}
            className="p-1.5 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors"
            aria-label="Next tip"
          >
            <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {studyTips.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsAnimating(true);
              setTimeout(() => {
                setCurrentIndex(index);
                setIsAnimating(false);
              }, 150);
            }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === currentIndex 
                ? 'w-4 bg-amber-500' 
                : 'bg-amber-300 dark:bg-amber-700 hover:bg-amber-400'
            }`}
            aria-label={`Go to tip ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
