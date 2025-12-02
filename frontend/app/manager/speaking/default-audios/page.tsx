'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Edit2,
  Save,
  X,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { managerAPI } from '@/lib/manager/api-client';
import {
  LoadingSpinner,
  useToast,
  createToastHelpers,
} from '@/components/manager/shared';

interface DefaultAudio {
  id?: number;
  audio_type: string;
  label: string;
  audio_url: string | null;
  default_script: string;
  script?: string;
  voice?: string;
  exists: boolean;
}

export default function DefaultSpeakingAudiosPage() {
  const [loading, setLoading] = useState(true);
  const [audios, setAudios] = useState<DefaultAudio[]>([]);
  const [stats, setStats] = useState({ total: 0, generated: 0 });
  const [error, setError] = useState<string | null>(null);
  
  // TTS state
  const [ttsVoice, setTtsVoice] = useState<string>('female_primary');
  const [ttsVoices, setTtsVoices] = useState<Array<{ id: string; name: string; gender: string; recommended: boolean }>>([]);
  const [generatingAudio, setGeneratingAudio] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Edit state
  const [editingAudio, setEditingAudio] = useState<string | null>(null);
  const [editScript, setEditScript] = useState<string>('');
  const [savingScript, setSavingScript] = useState(false);
  
  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);

  // Load voices on mount
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const data = await managerAPI.getTTSVoices();
        setTtsVoices(data.voices);
        setTtsVoice(data.default);
      } catch (error) {
        console.error('Failed to load TTS voices:', error);
        setTtsVoices([
          { id: 'female_primary', name: 'Sonia (British Female)', gender: 'female', recommended: true },
          { id: 'male_primary', name: 'Ryan (British Male)', gender: 'male', recommended: true },
        ]);
      }
    };
    loadVoices();
    loadDefaultAudios();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadDefaultAudios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await managerAPI.getDefaultSpeakingAudios();
      setAudios(data.audios);
      setStats({ total: data.total, generated: data.generated });
    } catch (err: any) {
      setError(err.message || 'Failed to load default audios');
      toast.error(err.message || 'Failed to load default audios');
    } finally {
      setLoading(false);
    }
  };

  const generateAudio = async (audioType: string) => {
    setGeneratingAudio(audioType);
    try {
      const result = await managerAPI.generateDefaultSpeakingAudio(audioType, undefined, ttsVoice);
      if (result.success) {
        // Update the audio in the list
        setAudios(prev => prev.map(a => 
          a.audio_type === audioType 
            ? { ...a, audio_url: result.audio_url, exists: true, voice: result.voice }
            : a
        ));
        setStats(prev => ({ ...prev, generated: prev.generated + (result.created ? 1 : 0) }));
        toast.success('Audio generated successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate audio');
    } finally {
      setGeneratingAudio(null);
    }
  };

  const generateAllAudios = async () => {
    setGeneratingAll(true);
    try {
      const result = await managerAPI.generateAllDefaultSpeakingAudios(ttsVoice);
      if (result.success || result.total_generated > 0) {
        // Reload to get updated data
        await loadDefaultAudios();
        toast.success(`Generated ${result.total_generated} audio files`);
      }
      if (result.total_errors > 0) {
        toast.warning(`${result.total_errors} audio(s) failed to generate`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate audios');
    } finally {
      setGeneratingAll(false);
    }
  };

  const toggleAudioPlayback = (audioType: string, audioUrl: string) => {
    if (playingAudio === audioType && audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlayingAudio(null);
      audioRef.current.onerror = () => {
        toast.error('Failed to play audio');
        setPlayingAudio(null);
      };
      audioRef.current.play();
      setPlayingAudio(audioType);
    }
  };

  const getPartColor = (audioType: string) => {
    if (audioType.includes('PART_1')) return 'green';
    if (audioType.includes('PART_2')) return 'orange';
    if (audioType.includes('PART_3')) return 'blue';
    return 'purple';
  };

  const startEditing = (audio: DefaultAudio) => {
    setEditingAudio(audio.audio_type);
    setEditScript(audio.script || audio.default_script);
  };

  const cancelEditing = () => {
    setEditingAudio(null);
    setEditScript('');
  };

  const saveScript = async () => {
    if (!editingAudio) return;
    
    setSavingScript(true);
    try {
      const result = await managerAPI.updateDefaultSpeakingAudio(editingAudio, editScript, ttsVoice);
      if (result.success) {
        // Update the audio in the list
        setAudios(prev => prev.map(a => 
          a.audio_type === editingAudio 
            ? { ...a, script: editScript, audio_url: result.audio_url, exists: true, voice: result.voice }
            : a
        ));
        toast.success('Audio updated successfully');
        setEditingAudio(null);
        setEditScript('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update audio');
    } finally {
      setSavingScript(false);
    }
  };

  const deleteAudio = async (audioType: string) => {
    if (!confirm('Are you sure you want to delete this audio? The default script will be restored.')) {
      return;
    }
    
    try {
      const result = await managerAPI.deleteDefaultSpeakingAudio(audioType);
      if (result.success) {
        // Update the audio in the list - mark as not generated
        setAudios(prev => prev.map(a => 
          a.audio_type === audioType 
            ? { ...a, audio_url: null, exists: false, script: undefined, voice: undefined }
            : a
        ));
        setStats(prev => ({ ...prev, generated: prev.generated - 1 }));
        toast.success('Audio deleted successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete audio');
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/manager/speaking"
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Default Speaking Audios</h1>
              <p className="mt-1 text-white/80">
                Manage examiner intro audios for each speaking part
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Voice Selector */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <Volume2 className="h-4 w-4" />
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer"
              >
                {ttsVoices.map((v) => (
                  <option key={v.id} value={v.id} className="text-gray-900">
                    {v.name} {v.recommended ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Generate All Button */}
            <button
              onClick={generateAllAudios}
              disabled={generatingAll}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50"
            >
              {generatingAll ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              {generatingAll ? 'Generating...' : 'Generate All'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Audios</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Generated</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.generated}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Missing</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.total - stats.generated}</div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button
              onClick={loadDefaultAudios}
              className="ml-auto text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Audio Cards */}
      <div className="space-y-4">
        {audios.map((audio) => {
          const color = getPartColor(audio.audio_type);
          const isEditing = editingAudio === audio.audio_type;
          
          return (
            <div
              key={audio.audio_type}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-${color}-100 dark:bg-${color}-900/30 text-${color}-800 dark:text-${color}-300`}
                      >
                        {audio.audio_type.replace(/_/g, ' ')}
                      </span>
                      {audio.exists ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          Generated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                          <AlertCircle className="h-3 w-3" />
                          Not Generated
                        </span>
                      )}
                      {audio.script && audio.script !== audio.default_script && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          Custom Script
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {audio.label}
                    </h3>
                    
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editScript}
                          onChange={(e) => setEditScript(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Enter custom script..."
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveScript}
                            disabled={savingScript}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            {savingScript ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            Save & Generate
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                          <button
                            onClick={() => setEditScript(audio.default_script)}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 underline"
                          >
                            Reset to default
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 italic">
                          "{audio.script || audio.default_script}"
                        </p>
                        {audio.voice && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Voice: {audio.voice}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      {audio.exists && audio.audio_url ? (
                        <button
                          onClick={() => toggleAudioPlayback(audio.audio_type, audio.audio_url!)}
                          className={`p-3 rounded-full transition-all ${
                            playingAudio === audio.audio_type
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'
                          }`}
                        >
                          {playingAudio === audio.audio_type ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </button>
                      ) : null}
                      <button
                        onClick={() => startEditing(audio)}
                        className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                        title="Edit script"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => generateAudio(audio.audio_type)}
                        disabled={generatingAudio === audio.audio_type || generatingAll}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {generatingAudio === audio.audio_type ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                        {audio.exists ? 'Regenerate' : 'Generate'}
                      </button>
                      {audio.exists && (
                        <button
                          onClick={() => deleteAudio(audio.audio_type)}
                          className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                          title="Delete audio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
