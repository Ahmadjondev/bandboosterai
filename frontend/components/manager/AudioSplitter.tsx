'use client';

/**
 * Audio Splitter Component
 * 
 * Allows admin to upload a full IELTS listening audio and split it into 4 parts.
 * Features:
 * - Waveform visualization
 * - Draggable markers for split points
 * - Preview each part before confirming
 * - Auto-suggest split points (equal division)
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Music,
  Loader2,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  Volume2,
  ChevronRight,
  GripVertical,
  RotateCcw,
  Wand2,
  Save,
} from 'lucide-react';
import { managerAPI } from '@/lib/manager/api-client';

interface SplitPoint {
  id: number;
  partNumber: number;
  startMs: number;
  endMs: number;
  startFormatted: string;
  endFormatted: string;
  durationSeconds: number;
  isValid: boolean;
}

interface SplitResult {
  part_number: number;
  audio_url: string;
  start_formatted: string;
  end_formatted: string;
  duration_seconds: number;
  targetPartIndex?: number; // Optional: admin-selected target part (0-indexed)
}

interface AudioInfo {
  duration_seconds: number;
  duration_ms: number;
  duration_formatted: string;
}

interface AudioSplitterProps {
  onSplitComplete: (parts: SplitResult[]) => void;
  onClose?: () => void;
  expectedParts?: number; // Default 4 for IELTS
  partLabels?: string[]; // Custom labels for parts
}

// Format milliseconds to mm:ss
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Parse time string to milliseconds
const parseTime = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  return 0;
};

const AudioSplitter: React.FC<AudioSplitterProps> = ({
  onSplitComplete,
  onClose,
  expectedParts = 4,
  partLabels = ['Part 1', 'Part 2', 'Part 3', 'Part 4'],
}) => {
  // States
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [tempAudioUrl, setTempAudioUrl] = useState<string | null>(null);
  const [tempId, setTempId] = useState<string | null>(null);
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
  const [selectedPart, setSelectedPart] = useState<number | null>(null);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitResults, setSplitResults] = useState<SplitResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedMarker, setDraggedMarker] = useState<{ partIndex: number; isStart: boolean } | null>(null);
  
  // Part assignment state: maps split index (0,1,2,3) to target part index (0,1,2,3)
  // Initially, split 0 → part 0, split 1 → part 1, etc.
  const [partAssignments, setPartAssignments] = useState<Record<number, number>>({});

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Part colors for visual distinction
  const partColors = useMemo(() => [
    { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-600' },
    { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-600' },
    { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-600' },
    { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-600' },
  ], []);

  // Initialize split points based on audio duration
  const initializeSplitPoints = useCallback((durationMs: number, suggestedSplits?: any[]) => {
    if (suggestedSplits && suggestedSplits.length === expectedParts) {
      const points: SplitPoint[] = suggestedSplits.map((split, idx) => ({
        id: idx,
        partNumber: idx + 1,
        startMs: split.start_ms,
        endMs: split.end_ms,
        startFormatted: split.start_formatted,
        endFormatted: split.end_formatted,
        durationSeconds: split.duration_seconds,
        isValid: true,
      }));
      setSplitPoints(points);
    } else {
      // Equal division
      const partDuration = durationMs / expectedParts;
      const points: SplitPoint[] = [];
      for (let i = 0; i < expectedParts; i++) {
        const startMs = Math.round(i * partDuration);
        const endMs = Math.round((i + 1) * partDuration);
        points.push({
          id: i,
          partNumber: i + 1,
          startMs,
          endMs,
          startFormatted: formatTime(startMs),
          endFormatted: formatTime(endMs),
          durationSeconds: (endMs - startMs) / 1000,
          isValid: true,
        });
      }
      setSplitPoints(points);
    }
  }, [expectedParts]);

  // Upload and analyze audio file
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setError('Please select a valid audio file');
      return;
    }

    // Validate file size (max 200MB for full listening audio)
    if (file.size > 200 * 1024 * 1024) {
      setError('Audio file size must be less than 200MB');
      return;
    }

    setAudioFile(file);
    setError(null);
    setIsLoading(true);
    setSplitResults(null);

    try {
      // Create local preview URL
      const localUrl = URL.createObjectURL(file);
      setAudioUrl(localUrl);

      // Upload to server for analysis using the API client
      const data = await managerAPI.uploadFullAudioForSplitting(file);
      
      if (data.success) {
        setTempId(data.temp_id);
        setTempAudioUrl(data.audio_url);
        setAudioInfo(data.duration);
        initializeSplitPoints(data.duration.duration_ms, data.suggested_splits);
      } else {
        throw new Error('Failed to analyze audio');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process audio file');
      console.error('Audio upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !audioInfo) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const durationMs = audioInfo.duration_ms;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    // Draw simple waveform representation (bars)
    const barCount = 200;
    const barWidth = width / barCount;
    
    for (let i = 0; i < barCount; i++) {
      // Generate pseudo-random height based on position (for visual effect)
      const seed = Math.sin(i * 0.1) * 43758.5453;
      const randomHeight = (Math.abs(seed - Math.floor(seed)) * 0.6 + 0.2) * height / 2;
      
      // Find which part this bar belongs to
      const barTime = (i / barCount) * durationMs;
      const partIndex = splitPoints.findIndex(p => barTime >= p.startMs && barTime < p.endMs);
      
      // Color based on part
      if (partIndex >= 0 && partIndex < partColors.length) {
        const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f97316'];
        ctx.fillStyle = colors[partIndex] + '60';
      } else {
        ctx.fillStyle = '#94a3b8';
      }
      
      const x = i * barWidth;
      const y = (height - randomHeight) / 2;
      ctx.fillRect(x, y, barWidth - 1, randomHeight);
    }

    // Draw playhead
    const playheadX = (currentTime / durationMs) * width;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(playheadX - 1, 0, 2, height);

    // Draw split markers
    splitPoints.forEach((point, idx) => {
      const colors = ['#3b82f6', '#22c55e', '#a855f7', '#f97316'];
      const color = colors[idx % colors.length];
      
      // Start marker (except for first part)
      if (idx > 0) {
        const x = (point.startMs / durationMs) * width;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        // Marker handle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, height / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [audioInfo, currentTime, splitPoints, partColors]);

  // Update waveform when relevant state changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Update canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = waveformRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 100;
      drawWaveform();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [drawWaveform]);

  // Audio playback handlers
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || !audioInfo) return;
    setCurrentTime(audioRef.current.currentTime * 1000);
  };

  const seekTo = (timeMs: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = timeMs / 1000;
    setCurrentTime(timeMs);
  };

  // Play specific part
  const playPart = (partIndex: number) => {
    const part = splitPoints[partIndex];
    if (!part || !audioRef.current) return;
    
    seekTo(part.startMs);
    audioRef.current.play();
    setIsPlaying(true);
    setSelectedPart(partIndex);
  };

  // Handle waveform click for seeking
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !audioInfo || isDragging) return;
    
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const timeMs = (clickX / rect.width) * audioInfo.duration_ms;
    seekTo(timeMs);
  };

  // Handle marker drag
  const handleMarkerDragStart = (partIndex: number, isStart: boolean) => {
    setIsDragging(true);
    setDraggedMarker({ partIndex, isStart });
  };

  const handleMarkerDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedMarker || !waveformRef.current || !audioInfo) return;

    const rect = waveformRef.current.getBoundingClientRect();
    const dragX = e.clientX - rect.left;
    const timeMs = Math.max(0, Math.min((dragX / rect.width) * audioInfo.duration_ms, audioInfo.duration_ms));

    setSplitPoints(prev => {
      const updated = [...prev];
      const { partIndex, isStart } = draggedMarker;

      if (isStart && partIndex > 0) {
        // Adjust start of this part and end of previous part
        const minStart = updated[partIndex - 1].startMs + 1000; // At least 1 second
        const maxStart = updated[partIndex].endMs - 1000;
        const newTime = Math.max(minStart, Math.min(maxStart, timeMs));
        
        updated[partIndex] = {
          ...updated[partIndex],
          startMs: newTime,
          startFormatted: formatTime(newTime),
          durationSeconds: (updated[partIndex].endMs - newTime) / 1000,
        };
        updated[partIndex - 1] = {
          ...updated[partIndex - 1],
          endMs: newTime,
          endFormatted: formatTime(newTime),
          durationSeconds: (newTime - updated[partIndex - 1].startMs) / 1000,
        };
      }

      return updated;
    });
  }, [isDragging, draggedMarker, audioInfo]);

  const handleMarkerDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedMarker(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMarkerDrag);
      window.addEventListener('mouseup', handleMarkerDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleMarkerDrag);
        window.removeEventListener('mouseup', handleMarkerDragEnd);
      };
    }
  }, [isDragging, handleMarkerDrag, handleMarkerDragEnd]);

  // Update split point time manually
  const updateSplitTime = (partIndex: number, field: 'start' | 'end', value: string) => {
    const timeMs = parseTime(value);
    if (isNaN(timeMs)) return;

    setSplitPoints(prev => {
      const updated = [...prev];
      
      if (field === 'start' && partIndex > 0) {
        // Update start of this part and end of previous part
        updated[partIndex] = {
          ...updated[partIndex],
          startMs: timeMs,
          startFormatted: value,
          durationSeconds: (updated[partIndex].endMs - timeMs) / 1000,
        };
        updated[partIndex - 1] = {
          ...updated[partIndex - 1],
          endMs: timeMs,
          endFormatted: value,
          durationSeconds: (timeMs - updated[partIndex - 1].startMs) / 1000,
        };
      } else if (field === 'end' && partIndex < updated.length - 1) {
        // Update end of this part and start of next part
        updated[partIndex] = {
          ...updated[partIndex],
          endMs: timeMs,
          endFormatted: value,
          durationSeconds: (timeMs - updated[partIndex].startMs) / 1000,
        };
        updated[partIndex + 1] = {
          ...updated[partIndex + 1],
          startMs: timeMs,
          startFormatted: value,
          durationSeconds: (updated[partIndex + 1].endMs - timeMs) / 1000,
        };
      }

      return updated;
    });
  };

  // Reset to suggested splits
  const resetToSuggested = () => {
    if (!audioInfo) return;
    initializeSplitPoints(audioInfo.duration_ms);
  };

  // Execute the split
  const handleSplit = async () => {
    if (!tempAudioUrl || !tempId || splitPoints.length === 0) return;

    setIsSplitting(true);
    setError(null);

    try {
      const data = await managerAPI.splitUploadedAudio(
        tempId,
        tempAudioUrl,
        splitPoints.map(p => ({
          start: p.startMs,
          end: p.endMs,
        })),
        'mp3'
      );
      
      if (data.success) {
        setSplitResults(data.parts);
        // Initialize default part assignments (split 0 → part 0, etc.)
        const defaultAssignments: Record<number, number> = {};
        data.parts.forEach((_: SplitResult, idx: number) => {
          defaultAssignments[idx] = idx;
        });
        setPartAssignments(defaultAssignments);
      } else {
        throw new Error(data.error || 'Failed to split audio');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to split audio');
      console.error('Split error:', err);
    } finally {
      setIsSplitting(false);
    }
  };

  // Confirm and use split results with part assignments
  const handleConfirm = () => {
    if (splitResults) {
      // Add targetPartIndex to each split result based on admin's assignment
      const resultsWithAssignments = splitResults.map((part, idx) => ({
        ...part,
        targetPartIndex: partAssignments[idx] ?? idx, // Use assignment or default to same index
      }));
      onSplitComplete(resultsWithAssignments);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audio Splitter</h2>
              <p className="text-sm text-slate-500">Split full listening audio into {expectedParts} parts</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Section */}
          {!audioFile && (
            <div className="text-center py-12">
              <label className="block max-w-md mx-auto cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 hover:border-purple-400 dark:hover:border-purple-500 transition-colors hover:bg-purple-50 dark:hover:bg-purple-900/10">
                  <Music className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Upload Full Listening Audio
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    Drag & drop or click to select • MP3, WAV, M4A • Max 200MB
                  </p>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                    <Upload className="w-4 h-4" />
                    Choose File
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Analyzing audio file...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
                <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          )}

          {/* Audio Editor */}
          {audioFile && audioInfo && !isLoading && !splitResults && (
            <div className="space-y-6">
              {/* Audio Info Bar */}
              <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Music className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white truncate max-w-xs">
                      {audioFile.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB • {audioInfo.duration_formatted}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAudioFile(null);
                    setAudioUrl(null);
                    setAudioInfo(null);
                    setSplitPoints([]);
                  }}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Waveform Visualization */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timeline
                  </h3>
                  <button
                    onClick={resetToSuggested}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset to Equal Split
                  </button>
                </div>

                {/* Waveform Canvas */}
                <div
                  ref={waveformRef}
                  onClick={handleWaveformClick}
                  className="relative h-[100px] bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden cursor-pointer"
                >
                  <canvas ref={canvasRef} className="absolute inset-0" />
                  
                  {/* Part Labels */}
                  {splitPoints.map((point, idx) => {
                    const startPercent = (point.startMs / audioInfo.duration_ms) * 100;
                    const widthPercent = ((point.endMs - point.startMs) / audioInfo.duration_ms) * 100;
                    return (
                      <div
                        key={idx}
                        className="absolute top-0 h-full flex items-end justify-center pb-1 pointer-events-none"
                        style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
                      >
                        <span className={`text-xs font-bold ${partColors[idx].text} bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded`}>
                          {partLabels[idx]}
                        </span>
                      </div>
                    );
                  })}

                  {/* Draggable Markers */}
                  {splitPoints.slice(1).map((point, idx) => {
                    const percent = (point.startMs / audioInfo.duration_ms) * 100;
                    return (
                      <div
                        key={idx}
                        className={`absolute top-0 bottom-0 w-4 cursor-col-resize z-10 group`}
                        style={{ left: `calc(${percent}% - 8px)` }}
                        onMouseDown={() => handleMarkerDragStart(idx + 1, true)}
                      >
                        <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-white dark:bg-slate-700 shadow-lg" />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-white dark:bg-slate-600 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <GripVertical className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Current Time */}
                <div className="text-center text-sm text-slate-500">
                  {formatTime(currentTime)} / {audioInfo.duration_formatted}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => seekTo(Math.max(0, currentTime - 5000))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  <SkipBack className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={togglePlayback}
                  className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition shadow-lg"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button
                  onClick={() => seekTo(Math.min(audioInfo.duration_ms, currentTime + 5000))}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  <SkipForward className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Hidden Audio Element */}
              {audioUrl && (
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              )}

              {/* Split Points Editor */}
              <div className="space-y-3">
                <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4" />
                  Split Points
                </h3>
                <p className="text-sm text-slate-500">
                  Drag the markers on the timeline or edit times directly. Click play button to preview each part.
                </p>
                
                <div className="grid gap-3">
                  {splitPoints.map((point, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border-2 ${partColors[idx].border} ${partColors[idx].bg} flex items-center gap-4`}
                    >
                      <div className="w-20 font-bold text-slate-900 dark:text-white">
                        {partLabels[idx]}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={point.startFormatted}
                          onChange={(e) => updateSplitTime(idx, 'start', e.target.value)}
                          disabled={idx === 0}
                          className="w-20 px-2 py-1 text-center rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm disabled:opacity-50"
                          placeholder="mm:ss"
                        />
                        <span className="text-slate-400">→</span>
                        <input
                          type="text"
                          value={point.endFormatted}
                          onChange={(e) => updateSplitTime(idx, 'end', e.target.value)}
                          disabled={idx === splitPoints.length - 1}
                          className="w-20 px-2 py-1 text-center rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm disabled:opacity-50"
                          placeholder="mm:ss"
                        />
                      </div>

                      <div className="text-sm text-slate-500 w-24 text-right">
                        {Math.floor(point.durationSeconds / 60)}:{Math.floor(point.durationSeconds % 60).toString().padStart(2, '0')}
                      </div>

                      <button
                        onClick={() => playPart(idx)}
                        className={`p-2 rounded-lg transition ${
                          selectedPart === idx && isPlaying
                            ? 'bg-purple-600 text-white'
                            : 'bg-white dark:bg-slate-600 hover:bg-slate-100 dark:hover:bg-slate-500'
                        }`}
                      >
                        {selectedPart === idx && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Split Results */}
          {splitResults && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Audio Split Successfully!
                </h3>
                <p className="text-slate-500 mb-2">
                  Your audio has been split into {splitResults.length} parts
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  💡 Tip: You can change which listening part each split audio is assigned to using the dropdown menus below.
                </p>
              </div>

              <div className="grid gap-3">
                {splitResults.map((part, idx) => {
                  // Get the current assignment for this split (default to same index)
                  const assignedPartIndex = partAssignments[idx] ?? idx;
                  
                  // Check if this target is already used by another split
                  const isTargetUsedByOther = Object.entries(partAssignments).some(
                    ([splitIdx, targetIdx]) => parseInt(splitIdx) !== idx && targetIdx === assignedPartIndex
                  );
                  
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border-2 ${partColors[idx].border} ${partColors[idx].bg}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-20 font-bold text-slate-900 dark:text-white shrink-0">
                          Split {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {part.start_formatted} → {part.end_formatted} ({Math.floor(part.duration_seconds / 60)}:{Math.floor(part.duration_seconds % 60).toString().padStart(2, '0')})
                          </p>
                        </div>
                        <audio controls src={part.audio_url} className="h-8 shrink-0" />
                      </div>
                      
                      {/* Part Assignment */}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <ChevronRight className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Assign to:</span>
                        <select
                          value={assignedPartIndex}
                          onChange={(e) => {
                            const newTarget = parseInt(e.target.value);
                            setPartAssignments(prev => ({
                              ...prev,
                              [idx]: newTarget
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition ${
                            isTargetUsedByOther
                              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                              : 'border-purple-300 dark:border-purple-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                          }`}
                        >
                          {partLabels.map((label, partIdx) => (
                            <option key={partIdx} value={partIdx}>
                              {label}
                            </option>
                          ))}
                        </select>
                        {isTargetUsedByOther && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Already assigned to another split
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Assignment Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Assignment Summary:</h4>
                <div className="flex flex-wrap gap-2">
                  {splitResults.map((_, idx) => {
                    const targetIdx = partAssignments[idx] ?? idx;
                    return (
                      <span 
                        key={idx} 
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                      >
                        Split {idx + 1} → {partLabels[targetIdx]}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {audioInfo && !splitResults && (
              <>Total duration: {audioInfo.duration_formatted}</>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
            )}
            
            {/* Split Button */}
            {audioFile && audioInfo && !splitResults && (
              <button
                onClick={handleSplit}
                disabled={isSplitting || splitPoints.length === 0}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSplitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Splitting...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    Split Audio
                  </>
                )}
              </button>
            )}

            {/* Confirm Button */}
            {splitResults && (
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition"
              >
                <CheckCircle className="w-4 h-4" />
                Use These Parts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioSplitter;
