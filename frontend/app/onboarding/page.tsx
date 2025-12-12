"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getOnboardingData, submitOnboarding } from "@/lib/auth";
import type { OnboardingData, OnboardingOptions } from "@/types/auth";

// Animated background component
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-300 dark:bg-blue-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-70 animate-blob animation-delay-6000" />
    </div>
  );
}

// Custom Month/Year Date Picker Component (for exam date - future dates)
function CustomDatePicker({ 
  value, 
  onChange, 
  minDate, 
  maxDate,
  label 
}: { 
  value: string; 
  onChange: (date: string) => void;
  minDate?: Date;
  maxDate?: Date;
  label: string;
}) {
  const currentDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(currentDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);

  const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const daysInMonth = useMemo(() => {
    return new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  }, [viewDate]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  }, [viewDate]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (minDate && newDate < minDate) return;
    if (maxDate && newDate > maxDate) return;
    setSelectedDate(newDate);
    onChange(newDate.toISOString().split('T')[0]);
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewDate.getMonth() &&
      selectedDate.getFullYear() === viewDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    );
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-4 text-white">
          <p className="text-violet-200 text-sm">{label}</p>
          <p className="text-2xl font-bold">
            {selectedDate 
              ? `${fullMonths[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
              : "Select a date"
            }
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {fullMonths[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 px-4 py-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 px-4 pb-4">
          {/* Empty cells for days before the first day of month */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const disabled = isDateDisabled(day);
            const selected = isDateSelected(day);
            const today = isToday(day);

            return (
              <button
                key={day}
                onClick={() => !disabled && handleDateSelect(day)}
                disabled={disabled}
                className={`aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  disabled
                    ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                    : selected
                    ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg"
                    : today
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Birthday Picker with Year/Month/Day dropdowns - easy for old dates
function BirthdayPicker({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (date: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 100; // 100 years ago
  const maxYear = currentYear - 10;  // Must be at least 10 years old
  
  // Parse existing value or use defaults
  const parseDate = (dateStr: string) => {
    if (dateStr) {
      const d = new Date(dateStr);
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
    }
    return { year: 0, month: -1, day: 0 };
  };

  const [selected, setSelected] = useState(parseDate(value));
  
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // Generate years array (descending - recent first)
  const years = useMemo(() => {
    const arr = [];
    for (let y = maxYear; y >= minYear; y--) {
      arr.push(y);
    }
    return arr;
  }, []);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    if (selected.year && selected.month >= 0) {
      return new Date(selected.year, selected.month + 1, 0).getDate();
    }
    return 31;
  }, [selected.year, selected.month]);

  const handleYearChange = (year: number) => {
    const newSelected = { ...selected, year };
    setSelected(newSelected);
    updateDate(newSelected);
  };

  const handleMonthChange = (month: number) => {
    const newSelected = { ...selected, month };
    // Adjust day if it exceeds days in new month
    const maxDay = new Date(selected.year || currentYear, month + 1, 0).getDate();
    if (newSelected.day > maxDay) {
      newSelected.day = maxDay;
    }
    setSelected(newSelected);
    updateDate(newSelected);
  };

  const handleDayChange = (day: number) => {
    const newSelected = { ...selected, day };
    setSelected(newSelected);
    updateDate(newSelected);
  };

  const updateDate = (sel: { year: number; month: number; day: number }) => {
    if (sel.year && sel.month >= 0 && sel.day) {
      const date = new Date(sel.year, sel.month, sel.day);
      onChange(date.toISOString().split('T')[0]);
    }
  };

  const isComplete = selected.year && selected.month >= 0 && selected.day;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 text-white">
          <p className="text-pink-200 text-sm">Your Birthday</p>
          <p className="text-2xl font-bold">
            {isComplete 
              ? `${months[selected.month]} ${selected.day}, ${selected.year}`
              : "Select your birth date"
            }
          </p>
        </div>

        {/* Dropdowns */}
        <div className="p-6 space-y-4">
          {/* Year Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Year
            </label>
            <div className="relative">
              <select
                value={selected.year || ""}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-medium appearance-none cursor-pointer focus:border-pink-500 dark:focus:border-pink-500 focus:outline-none transition-colors"
              >
                <option value="">Select year</option>
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Month
            </label>
            <div className="relative">
              <select
                value={selected.month >= 0 ? selected.month : ""}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-medium appearance-none cursor-pointer focus:border-pink-500 dark:focus:border-pink-500 focus:outline-none transition-colors"
              >
                <option value="">Select month</option>
                {months.map((month, index) => (
                  <option key={month} value={index}>{month}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Day Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Day
            </label>
            <div className="relative">
              <select
                value={selected.day || ""}
                onChange={(e) => handleDayChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-medium appearance-none cursor-pointer focus:border-pink-500 dark:focus:border-pink-500 focus:outline-none transition-colors"
              >
                <option value="">Select day</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Age Display */}
          {isComplete && (
            <div className="pt-2 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
                <span className="text-2xl">🎂</span>
                <span className="text-pink-600 dark:text-pink-400 font-medium">
                  You&apos;re {currentYear - selected.year} years old
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Band Score Slider Component
function BandScoreSelector({ value, onChange }: { value: string; onChange: (score: string) => void }) {
  const scores = ["5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5"];
  const [selectedIndex, setSelectedIndex] = useState(scores.indexOf(value) !== -1 ? scores.indexOf(value) : -1);

  const scoreInfo: Record<string, { tier: string; color: string; emoji: string; desc: string }> = {
    "5.0": { tier: "Modest", color: "from-amber-400 to-orange-500", emoji: "🌱", desc: "Basic competence in limited situations" },
    "5.5": { tier: "Modest+", color: "from-amber-500 to-orange-600", emoji: "🌿", desc: "Partial command of the language" },
    "6.0": { tier: "Competent", color: "from-blue-400 to-blue-600", emoji: "💪", desc: "Effective communication despite inaccuracies" },
    "6.5": { tier: "Competent+", color: "from-blue-500 to-indigo-600", emoji: "🎯", desc: "Generally effective command" },
    "7.0": { tier: "Good", color: "from-emerald-400 to-teal-600", emoji: "⭐", desc: "Operational command with occasional errors" },
    "7.5": { tier: "Very Good", color: "from-emerald-500 to-green-600", emoji: "🌟", desc: "Fully operational command" },
    "8.0": { tier: "Expert", color: "from-violet-500 to-purple-600", emoji: "👑", desc: "Fully operational with rare errors" },
    "8.5": { tier: "Expert+", color: "from-purple-500 to-pink-600", emoji: "🏆", desc: "Near-native proficiency" },
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onChange(scores[index]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Score Display */}
      <div className="text-center mb-8">
        {selectedIndex >= 0 ? (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r ${scoreInfo[scores[selectedIndex]].color} text-white shadow-xl mb-3`}>
              <span className="text-3xl">{scoreInfo[scores[selectedIndex]].emoji}</span>
              <div className="text-left">
                <div className="text-3xl font-bold">Band {scores[selectedIndex]}</div>
                <div className="text-sm opacity-90">{scoreInfo[scores[selectedIndex]].tier}</div>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto">
              {scoreInfo[scores[selectedIndex]].desc}
            </p>
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400">Select your target band score</p>
          </div>
        )}
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-4 max-w-7xl sm:grid-cols-8 gap-2 sm:gap-3">
        {scores.map((score, index) => {
          const isSelected = selectedIndex === index;
          const info = scoreInfo[score];
          
          return (
            <button
              key={score}
              onClick={() => handleSelect(index)}
              className={`relative p-3 sm:p-4 rounded-2xl transition-all duration-300 ${
                isSelected
                  ? `bg-gradient-to-br ${info.color} text-white shadow-xl ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-violet-300 dark:ring-violet-600`
                  : "bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600"
              }`}
            >
              <div className="text-center">
                <span className={`text-xl sm:text-2xl font-bold ${isSelected ? "text-white" : "text-slate-800 dark:text-slate-200"}`}>
                  {score}
                </span>
                <div className={`text-[10px] sm:text-xs mt-1 font-medium ${isSelected ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}>
                  {info.tier.split('+')[0]}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Visual Scale */}
      <div className="mt-6 relative">
        <div className="h-2 bg-gradient-to-r from-amber-400 via-blue-500 via-emerald-500 to-purple-500 rounded-full opacity-30" />
        <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Modest</span>
          <span>Competent</span>
          <span>Good</span>
          <span>Expert</span>
        </div>
      </div>
    </div>
  );
}

// Step configurations
const steps = [
  {
    id: 1,
    title: "How did you discover us?",
    subtitle: "We'd love to know how you found BandBooster",
    field: "heard_from" as const,
    emoji: "🔍",
  },
  {
    id: 2,
    title: "What's driving your IELTS journey?",
    subtitle: "Your goal helps us personalize your experience",
    field: "main_goal" as const,
    emoji: "🎯",
  },
  {
    id: 3,
    title: "Which IELTS are you preparing for?",
    subtitle: "Select your exam type",
    field: "exam_type" as const,
    emoji: "📝",
  },
  {
    id: 4,
    title: "What band score are you aiming for?",
    subtitle: "Set your target and we'll help you get there",
    field: "target_score" as const,
    emoji: "⭐",
  },
  {
    id: 5,
    title: "When's your exam scheduled?",
    subtitle: "Optional - helps us create your study timeline",
    field: "exam_date" as const,
    type: "date" as const,
    optional: true,
    emoji: "📅",
  },
  {
    id: 6,
    title: "When's your birthday?",
    subtitle: "We might have a surprise for you! 🎂",
    field: "date_of_birth" as const,
    type: "date" as const,
    emoji: "🎈",
  },
];

// Option configurations
const sourceOptions = [
  { value: "GOOGLE", label: "Google", icon: "🔎" },
  { value: "SOCIAL_MEDIA", label: "Social Media", icon: "📱" },
  { value: "FRIEND", label: "Friend", icon: "👥" },
  { value: "YOUTUBE", label: "YouTube", icon: "▶️" },
  { value: "TELEGRAM", label: "Telegram", icon: "✈️" },
  { value: "OTHER", label: "Other", icon: "✨" },
];

const goalOptions = [
  { value: "STUDY_ABROAD", label: "Study Abroad", icon: "🎓", desc: "University & Education" },
  { value: "IMMIGRATION", label: "Immigration", icon: "🌍", desc: "New Country, New Life" },
  { value: "WORK", label: "Career", icon: "💼", desc: "Professional Growth" },
  { value: "PERSONAL", label: "Personal", icon: "🚀", desc: "Self Improvement" },
  { value: "OTHER", label: "Other", icon: "💡", desc: "Something Else" },
];

const examTypeOptions = [
  { value: "ACADEMIC", label: "Academic", icon: "📚", desc: "For university admissions" },
  { value: "GENERAL", label: "General Training", icon: "🏠", desc: "For work & migration" },
  { value: "UKVI", label: "UKVI", icon: "🇬🇧", desc: "UK Visas & Immigration" },
];

export default function OnboardingPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({});
  const [options, setOptions] = useState<OnboardingOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  useEffect(() => {
    async function loadOnboardingData() {
      if (!user) return;
      
      try {
        const data = await getOnboardingData();
        setOptions(data.options);
        setFormData(data.current_data);
        
        if (data.onboarding_completed) {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Failed to load onboarding data:", err);
        setError("Failed to load. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "STUDENT") {
        router.push(user.role === "MANAGER" ? "/manager" : "/teacher");
      } else {
        loadOnboardingData();
      }
    }
  }, [user, authLoading, router]);

  const handleSelect = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setDirection("forward");
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setDirection("backward");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await submitOnboarding(formData);
      await refreshUser();
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Failed to submit onboarding:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepData = steps[currentStep - 1];
  const canProceed =
    currentStepData.optional || formData[currentStepData.field as keyof OnboardingData];

  if (authLoading || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-900" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-600 animate-spin" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Setting up your journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      <AnimatedBackground />
      
      {/* Header */}
      <header className="flex-shrink-0 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <span className="text-white text-xl">✦</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            BandBooster
          </span>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`h-2 rounded-full transition-all duration-500 ${
                i + 1 === currentStep
                  ? "w-8 bg-gradient-to-r from-violet-500 to-indigo-500"
                  : i + 1 < currentStep
                  ? "w-2 bg-violet-500"
                  : "w-2 bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-2 min-h-0 overflow-hidden">
        <div 
          key={currentStep}
          className={`w-full max-w-3xl flex flex-col items-center animate-in duration-300 ${
            direction === "forward" ? "slide-in-from-right-4" : "slide-in-from-left-4"
          } fade-in`}
        >
          {/* Step emoji and title */}
          <div className="text-center mb-4 sm:mb-6">
            <span className="text-4xl sm:text-5xl mb-2 block">{currentStepData.emoji}</span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-1 sm:mb-2">
              {currentStepData.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm lg:text-base">
              {currentStepData.subtitle}
            </p>
          </div>

          {/* Options */}
          <div className="w-full flex-1 flex items-center justify-center px-2">
            {/* Source Selection - Step 1 */}
            {currentStepData.field === "heard_from" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 w-full max-w-3xl">
                {sourceOptions.map((option) => {
                  const isSelected = formData.heard_from === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect("heard_from", option.value)}
                      className={`relative p-5 sm:p-6 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[100px] sm:min-h-[120px] ${
                        isSelected
                          ? "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-500 shadow-lg shadow-violet-500/20"
                          : "bg-white/80 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600"
                      }`}
                    >
                      <span className="text-3xl sm:text-4xl">{option.icon}</span>
                      <span className={`text-sm sm:text-base font-medium text-center leading-tight ${
                        isSelected ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {option.label}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-md">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Goal Selection - Step 2 */}
            {currentStepData.field === "main_goal" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 w-full max-w-4xl">
                {goalOptions.map((option) => {
                  const isSelected = formData.main_goal === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect("main_goal", option.value)}
                      className={`relative p-5 sm:p-6 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[120px] sm:min-h-[140px] ${
                        isSelected
                          ? "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-500 shadow-lg shadow-violet-500/20"
                          : "bg-white/80 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600"
                      }`}
                    >
                      <span className="text-3xl sm:text-4xl">{option.icon}</span>
                      <span className={`text-sm sm:text-base font-semibold text-center ${
                        isSelected ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {option.label}
                      </span>
                      <span className={`text-xs sm:text-sm text-center ${
                        isSelected ? "text-violet-500 dark:text-violet-400" : "text-slate-500 dark:text-slate-400"
                      }`}>
                        {option.desc}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-md">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Exam Type Selection - Step 3 */}
            {currentStepData.field === "exam_type" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl">
                {examTypeOptions.map((option) => {
                  const isSelected = formData.exam_type === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect("exam_type", option.value)}
                      className={`relative p-6 sm:p-8 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[160px] sm:min-h-[180px] ${
                        isSelected
                          ? "bg-violet-100 dark:bg-violet-900/40 border-2 border-violet-500 shadow-lg shadow-violet-500/20"
                          : "bg-white/80 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600"
                      }`}
                    >
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl ${
                        isSelected
                          ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg"
                          : "bg-slate-100 dark:bg-slate-700"
                      }`}>
                        {option.icon}
                      </div>
                      <span className={`text-lg sm:text-xl font-bold ${
                        isSelected ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {option.label}
                      </span>
                      <span className={`text-sm sm:text-base text-center ${
                        isSelected ? "text-violet-500 dark:text-violet-400" : "text-slate-500 dark:text-slate-400"
                      }`}>
                        {option.desc}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-violet-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Target Score Selection - Step 4 */}
            {currentStepData.field === "target_score" && (
              <BandScoreSelector
                value={formData.target_score || ""}
                onChange={(score) => handleSelect("target_score", score)}
              />
            )}

            {/* Exam Date Selection - Step 5 */}
            {currentStepData.field === "exam_date" && (
              <div className="flex flex-col items-center gap-4 w-full">
                <CustomDatePicker
                  value={formData.exam_date || ""}
                  onChange={(date) => handleSelect("exam_date", date)}
                  minDate={new Date()}
                  label="Your Exam Date"
                />
                <button
                  onClick={handleNext}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors underline underline-offset-4"
                >
                  I don&apos;t know yet, skip for now →
                </button>
              </div>
            )}

            {/* Birthday Selection - Step 6 */}
            {currentStepData.field === "date_of_birth" && (
              <BirthdayPicker
                value={formData.date_of_birth || ""}
                onChange={(date) => handleSelect("date_of_birth", date)}
              />
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Footer with navigation */}
      <footer className="flex-shrink-0 px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              currentStep === 1
                ? "opacity-0 pointer-events-none"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            {currentStep} of {steps.length}
          </div>

          {currentStep === steps.length ? (
            <button
              onClick={handleSubmit}
              disabled={!canProceed || submitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
                canProceed && !submitting
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Let&apos;s Go!
                  <span className="text-lg">🚀</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${
                canProceed
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              Continue
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </footer>

      {/* CSS for blob animation */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-6000 {
          animation-delay: 6s;
        }
      `}</style>
    </div>
  );
}
