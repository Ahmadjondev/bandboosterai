"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useExam } from "./ExamContext";
import { 
  SpeakingSection as SpeakingSectionType, 
  SpeakingQuestion,
  SectionName 
} from "@/types/exam";
import { 
  Mic, 
  Play, 
  Square, 
  Volume2, 
  Clock, 
  CheckCircle, 
  Circle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Radio,
  Headphones
} from "lucide-react";

// Extended type to include part info and audio_url (as mentioned by user)
interface FlattenedQuestion extends SpeakingQuestion {
  partNumber: 1 | 2 | 3;
  partTitle: string;
  topicId: number;
  globalIndex: number;
  indexInPart: number;
  totalInPart: number;
  audio_url?: string; // User mentioned this exists
}

type SpeakingStatus = 
  | "idle" 
  | "playing_question" 
  | "countdown" 
  | "recording" 
  | "submitting" 
  | "completed";

export default function SpeakingSection() {
  const { 
    sectionData, 
    submitSpeaking, 
    handleNextSection,
    isDarkTheme
  } = useExam();

  // Cast sectionData to SpeakingSectionType
  const speakingData = sectionData as SpeakingSectionType;

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [countdown, setCountdown] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioParams, setAudioParams] = useState({
    isPlaying: false,
    duration: 0,
    currentTime: 0
  });

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Flatten questions for linear navigation
  const allQuestions = useMemo(() => {
    if (!speakingData?.topics) return [];
    
    const questions: FlattenedQuestion[] = [];
    let globalIdx = 0;

    speakingData.topics.forEach(topic => {
      // Extract part number from speaking_type (PART_1 -> 1, PART_2 -> 2, PART_3 -> 3)
      const partNumber = parseInt(topic.speaking_type.split('_')[1]) as 1 | 2 | 3;
      
      topic.questions.forEach((q, idx) => {
        questions.push({
          ...q,
          partNumber: partNumber,
          partTitle: topic.part_display,
          topicId: topic.id,
          globalIndex: globalIdx++,
          indexInPart: idx,
          totalInPart: topic.questions.length,
          question_key: `speaking_${topic.speaking_type}_q${q.order}`
        });
      });
    });

    return questions;
  }, [speakingData]);

  const currentQuestion = allQuestions[currentIndex];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Initialize first question
  useEffect(() => {
    if (allQuestions.length > 0 && status === "idle") {
      playQuestionAudio();
    }
  }, [allQuestions, status]);

  // Watch for question change to auto-play and scroll to top
  useEffect(() => {
    if (currentQuestion) {
      // Scroll to top when question changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Reset states
      setRecordingDuration(0);
      setCountdown(0);
      chunksRef.current = [];
      
      // Start flow
      playQuestionAudio();
    }
  }, [currentIndex, currentQuestion]);

  // ---------------------------------------------------------------------------
  // LOGIC
  // ---------------------------------------------------------------------------

  const playQuestionAudio = () => {
    if (!currentQuestion?.audio_url) {
      // If no audio, jump straight to recording preparation or start
      startCountdown();
      return;
    }

    setStatus("playing_question");
    
    if (audioRef.current) {
      audioRef.current.src = currentQuestion.audio_url;
      audioRef.current.play().catch(err => {
        console.error("Audio playback failed:", err);
        // Fallback if autoplay fails (browsers might block it)
        // Maybe show a "Click to Start" button? 
        // For now, we'll just proceed to countdown to avoid getting stuck
        startCountdown();
      });
    }
  };

  const handleAudioEnded = () => {
    startCountdown();
  };

  const startCountdown = () => {
    setStatus("countdown");
    // Use preparation_time if available, otherwise default to 5 seconds
    const prepTime = currentQuestion?.preparation_time || 5;
    setCountdown(prepTime);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        uploadRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setStatus("recording");
      recordingStartRef.current = Date.now();
      
      // Start duration timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - recordingStartRef.current) / 1000);
        setRecordingDuration(duration);

        // Auto-stop if exceeds response_time (plus a buffer)
        if (currentQuestion.response_time && duration >= currentQuestion.response_time) {
            stopRecording();
        }
      }, 1000);

    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone access is required. Please enable permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("submitting");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadRecording = async (blob: Blob) => {
    if (!currentQuestion || !currentQuestion.question_key) return;

    try {
      await submitSpeaking(currentQuestion.question_key, blob);
      console.log("Recording uploaded successfully");
      
      // Move to next question or finish
      if (currentIndex < allQuestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setStatus("completed");
        handleNextSection();
      }
    } catch (err) {
      console.error("Failed to upload recording:", err);
      // Handle error - maybe retry? For now, just move on or let user retry manually?
      // Ideally we'd show an error state.
      // For this implementation, we'll try to move on to keep flow.
      if (currentIndex < allQuestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        handleNextSection();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (!speakingData || !speakingData.topics || speakingData.topics.length === 0) {
    return <div className="flex items-center justify-center h-full">Loading speaking section...</div>;
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10 overflow-hidden transition-all duration-500">
      
      {/* HIDDEN AUDIO ELEMENT */}
      <audio 
        ref={audioRef}
        onEnded={handleAudioEnded}
        onTimeUpdate={(e) => setAudioParams(prev => ({ ...prev, currentTime: e.currentTarget.currentTime }))}
        onLoadedMetadata={(e) => setAudioParams(prev => ({ ...prev, duration: e.currentTarget.duration }))}
        className="hidden"
      />

      {/* LEFT SIDE - CONTENT (70%) */}
      <div className="w-[70%] flex flex-col h-full relative backdrop-blur-sm">
        
        {/* TIMELINE HEADER */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl  z-10">
          {/* Overall Progress Bar */}
          <div className="relative h-1.5 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out shadow-lg shadow-indigo-500/50"
              style={{ width: `${((currentIndex) / allQuestions.length) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30">
                    <Headphones className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">Speaking Section</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">IELTS Speaking Test</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    <span className="text-sm font-bold text-white">
                      {currentIndex + 1} / {allQuestions.length}
                    </span>
                  </div>
                  <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {Math.round((currentIndex / allQuestions.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
             
             {/* ENHANCED STEPPER */}
             <div className="relative">
               {/* Progress Background Line */}
               <div className="absolute top-1/2 left-0 right-0 h-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-750 dark:to-gray-700 -translate-y-1/2 z-0 rounded-full" />
               
               <div className="flex items-center w-full overflow-x-auto  pb-2 overflow-visible no-scrollbar relative z-10">
                {speakingData.topics.map((topic, tIdx) => {
                  const partNumber = parseInt(topic.speaking_type.split('_')[1]);
                  const partQuestions = allQuestions.filter(q => q.partNumber === partNumber);
                  const partCompleted = partQuestions.every(q => q.globalIndex < currentIndex);
                  const partActive = partQuestions.some(q => q.globalIndex === currentIndex);
                  
                  return (
                    <div key={`topic-${tIdx}`} className="flex items-center shrink-0 mr-12 last:mr-0 overflow-visible">
                      {/* Part Badge */}
                      <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-3 transition-all duration-500 mr-4 ${
                        partCompleted 
                          ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-400 shadow-xl shadow-emerald-500/40" 
                          : partActive 
                            ? "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 shadow-xl shadow-indigo-600/50 animate-pulse" 
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-md"
                      }`}>
                        {partCompleted ? (
                          <CheckCircle className="w-6 h-6 text-white" />
                        ) : (
                          <span className={`text-base font-bold ${
                            partActive ? "text-white" : "text-gray-500 dark:text-gray-400"
                          }`}>
                            {partNumber}
                          </span>
                        )}
                        
                        {/* Active Ring Animation */}
                        {partActive && (
                          <>
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping" />
                            <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping" style={{ animationDelay: '0.3s' }} />
                          </>
                        )}
                      </div>
                      
                      {/* Part Info & Questions */}
                      <div className="flex flex-col gap-2.5">
                        <div className={`text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                          partActive 
                            ? "text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text dark:from-indigo-400 dark:to-purple-400" 
                            : partCompleted 
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-400 dark:text-gray-500"
                        }`}>
                          Part {partNumber}
                        </div>
                        
                        {/* Question Dots */}
                        <div className="flex items-center gap-1.5">
                          {partQuestions.map((q, qIdx) => {
                            const isActive = q.globalIndex === currentIndex;
                            const isCompleted = q.globalIndex < currentIndex;
                            
                            return (
                              <div 
                                key={`node-${q.globalIndex}`}
                                className="relative group"
                              >
                                <div className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                                  isActive 
                                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 scale-150 shadow-lg shadow-indigo-600/60 ring-2 ring-indigo-300 dark:ring-indigo-700" 
                                    : isCompleted 
                                      ? "bg-emerald-500 scale-110 shadow-md shadow-emerald-500/50" 
                                      : "bg-gray-300 dark:bg-gray-600"
                                }`} />
                                
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  Q{qIdx + 1}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Connector Line */}
                      {tIdx < speakingData.topics.length - 1 && (
                        <div className={`h-1 w-10 mx-4 rounded-full transition-all duration-500 ${
                          partCompleted ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-md shadow-emerald-500/30" : "bg-gray-300 dark:bg-gray-600"
                        }`} />
                      )}
                    </div>
                  );
                })}
               </div>
             </div>
          </div>
        </div>

        {/* QUESTION DISPLAY */}
        <div className="flex-1 h-full overflow-y-auto p-10 flex items-center justify-center relative">
          <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-bold mb-4 shadow-lg shadow-indigo-500/10">
               <Circle className="w-3 h-3 fill-current animate-pulse" />
               {currentQuestion?.partTitle || `Part ${currentQuestion?.partNumber}`}
            </div>

            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-800/50">
              <h2 className={`font-bold text-gray-900 dark:text-white leading-tight ${
                currentQuestion?.partNumber === 2 ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"
              }`}>
                {currentQuestion?.question_text}
              </h2>
            </div>
            
            {/* Optional Prompt/Cue Card Display for Part 2 */}
            {currentQuestion?.partNumber === 2 && (
               <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-yellow-900/10 dark:to-amber-900/10 border-2 border-amber-200 dark:border-yellow-900/30 p-6 rounded-2xl mt-8 shadow-xl shadow-amber-500/10">
                 <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-500 mb-3">Describe:</h3>
                 <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                    {/* If there's specific cue card text, render it here. 
                        Otherwise re-render question text or specific instructions if available.
                        Assuming question_text covers it for now.
                     */}
                     <p className="italic text-sm opacity-80">
                       You should say:
                       <br/>- What it is
                       <br/>- When you did it
                       <br/>- Who you did it with
                       <br/>- And explain why...
                       {/* Note: Real data might have these bullets in question_text or separate field */}
                     </p>
                 </div>
               </div>
            )}

            {status === "playing_question" && (
              <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl mt-8 shadow-lg">
                <div className="flex gap-1.5 h-8 items-end">
                   {[...Array(5)].map((_, i) => (
                     <div 
                       key={i} 
                       className="w-1.5 bg-gradient-to-t from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 rounded-full animate-music-bar"
                       style={{ 
                         height: `${Math.random() * 100}%`,
                         animationDelay: `${i * 0.1}s` 
                       }}
                     />
                   ))}
                </div>
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Reading question...</span>
              </div>
            )}
          </div>
          
          {/* Background Decoration */}
          <div className="absolute top-0 left-0 p-12 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <Mic className="w-96 h-96 text-indigo-600" />
          </div>
          <div className="absolute bottom-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.05] pointer-events-none rotate-180">
            <Headphones className="w-80 h-80 text-purple-600" />
          </div>
        </div>
      </div>
      </div>

      {/* RIGHT SIDE - RECORDING UI (30%) */}
      <div className="w-[30%] bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-l border-gray-200/50 dark:border-gray-800/50 flex flex-col relative shadow-2xl z-10 backdrop-blur-xl">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
          
          {/* STATUS INDICATOR */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Radio className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-xs">
                Current Status
              </h2>
            </div>
            <div className={`text-3xl font-bold transition-all duration-300 ${
              status === "recording" ? "text-transparent bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text animate-pulse" : 
              status === "countdown" ? "text-transparent bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text" :
              "text-gray-900 dark:text-white"
            }`}>
              {status === "idle" && "Ready"}
              {status === "playing_question" && "Listen Carefully"}
              {status === "countdown" && "Get Ready..."}
              {status === "recording" && "Recording..."}
              {status === "submitting" && "Saving..."}
              {status === "completed" && "Completed"}
            </div>
          </div>

          {/* MAIN VISUALIZER / COUNTDOWN */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Outer Rings */}
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
              status === "recording" ? "border-4 border-red-500/20 scale-110 animate-ping" : "border-2 border-gray-100 dark:border-gray-800"
            }`} />
            <div className={`absolute inset-4 rounded-full transition-all duration-500 ${
              status === "recording" ? "border-4 border-red-500/30 scale-105 animate-pulse" : "border-2 border-gray-200 dark:border-gray-700"
            }`} />
            <div className={`absolute inset-8 rounded-full transition-all duration-500 ${
              status === "recording" ? "bg-gradient-to-br from-red-500/10 to-pink-500/10 scale-100" : "bg-gray-50 dark:bg-gray-800/50"
            }`} />

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              {status === "countdown" && (
                <div className="flex flex-col items-center">
                  <div className="text-8xl font-bold text-transparent bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 bg-clip-text tabular-nums animate-bounce">
                    {countdown}
                  </div>
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2">seconds</div>
                </div>
              )}
              
              {status === "recording" && (
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                    <Mic className="w-20 h-20 text-red-500 relative z-10 animate-pulse" />
                  </div>
                  <div className="text-5xl font-mono font-bold text-transparent bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text tabular-nums">
                    {formatTime(recordingDuration)}
                  </div>
                  <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">REC</span>
                  </div>
                </div>
              )}

              {(status === "playing_question" || status === "idle" || status === "submitting") && (
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 ${
                    status === "playing_question" ? "bg-indigo-500/30 animate-pulse" : 
                    status === "submitting" ? "bg-purple-500/30 animate-pulse" : 
                    "bg-gray-300/20"
                  }`} />
                  <div className="bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-850 p-8 rounded-full shadow-xl relative z-10">
                     {status === "submitting" ? (
                       <div className="w-16 h-16 border-4 border-transparent border-t-indigo-500 border-r-purple-500 rounded-full animate-spin" />
                     ) : (
                       <Volume2 className={`w-16 h-16 ${status === "playing_question" ? "text-indigo-500 animate-pulse" : "text-gray-400"}`} />
                     )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CONTROLS */}
          <div className="w-full max-w-xs space-y-4">
             {status === "recording" && (
               <button
                 onClick={stopRecording}
                 className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-2xl font-bold shadow-xl shadow-red-500/40 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
               >
                 <Square className="w-5 h-5 fill-current" />
                 Stop Recording
               </button>
             )}
             
             <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700">
               <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">Time Limit</div>
               <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                 {currentQuestion?.response_time ? formatTime(currentQuestion.response_time) : "No limit"}
               </div>
             </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes music-bar {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-music-bar {
          animation: music-bar 0.8s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
