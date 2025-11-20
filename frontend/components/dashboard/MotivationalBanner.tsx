"use client";

import { MotivationalMessage } from "@/lib/exam-api";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

interface MotivationalBannerProps {
  message: MotivationalMessage;
}

export default function MotivationalBanner({ message }: MotivationalBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const getColorClasses = (color: string) => {
    switch (color) {
      case "orange":
        return "bg-linear-to-r from-orange-500 to-red-500 border-orange-200 dark:border-orange-800";
      case "green":
        return "bg-linear-to-r from-green-500 to-emerald-500 border-green-200 dark:border-green-800";
      case "blue":
        return "bg-linear-to-r from-blue-500 to-cyan-500 border-blue-200 dark:border-blue-800";
      case "purple":
        return "bg-linear-to-r from-purple-500 to-pink-500 border-purple-200 dark:border-purple-800";
      default:
        return "bg-linear-to-r from-blue-500 to-indigo-500 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-lg border ${getColorClasses(message.color)} p-6 text-white shadow-lg`}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-black/10">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="relative flex items-start gap-4">
        <div className="shrink-0 p-3 bg-white/20 rounded-full backdrop-blur-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">{message.title}</h3>
          <p className="text-white/90">{message.message}</p>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-2 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
