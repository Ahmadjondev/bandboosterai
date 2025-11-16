import React, { useEffect, useRef, useState } from 'react';

interface Props {
  mode: 'create' | 'edit' | 'view';
  existingAudioUrl?: string | null;
  existingAudioFilename?: string | null;
  onFileChange?: (file: File | null) => void;
  onDurationChange?: (seconds: number | null) => void;
  onRemoveExisting?: (remove: boolean) => void;
  removeExistingAudio?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
}

export default function AudioUploader({
  mode,
  existingAudioUrl,
  existingAudioFilename,
  onFileChange,
  onDurationChange,
  onRemoveExisting,
  removeExistingAudio: removeExistingAudioProp = false,
  uploading = false,
  uploadProgress = 0,
}: Props) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(existingAudioUrl || null);
  const [audioFileName, setAudioFileName] = useState<string>(existingAudioFilename || '');
  const [isDragging, setIsDragging] = useState(false);
  const [removeExistingAudio, setRemoveExistingAudio] = useState<boolean>(removeExistingAudioProp);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAudioPreviewUrl(existingAudioUrl || null);
    setAudioFileName(existingAudioFilename || '');
    setRemoveExistingAudio(removeExistingAudioProp);
    if (removeExistingAudioProp && onRemoveExisting) onRemoveExisting(removeExistingAudioProp);
  }, [existingAudioUrl, existingAudioFilename, removeExistingAudioProp]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  const processFile = (file: File) => {
    if (!file) return;

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    const isValidType = validTypes.includes(file.type) || file.name.match(/\.(mp3|wav|ogg|m4a)$/i);
    if (!isValidType) return alert('Invalid file type. Please select an audio file.');

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) return alert('File is too large. Maximum size is 50MB.');

    if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);

    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioFileName(file.name);
    setAudioPreviewUrl(url);
    setRemoveExistingAudio(false);
    if (onFileChange) onFileChange(file);
    getAudioDuration(file);
  };

  const getAudioDuration = (file: File) => {
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.addEventListener('loadedmetadata', () => {
      const dur = Math.floor(audio.duration);
      if (onDurationChange) onDurationChange(dur);
    });
    audio.addEventListener('error', () => {});
  };

  const removeFile = () => {
    if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);

    setAudioFile(null);
    setAudioFileName('');
    setAudioPreviewUrl(null);
    if (onFileChange) onFileChange(null);
    // If we removed a selected file (client-selected), but there's an existing audio URL, we keep the existing audio URL until user removes it explicitly.
    if (onDurationChange) onDurationChange(null);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div>
      {mode !== 'view' ? (
        <div>
          {audioPreviewUrl && !audioFile && !removeExistingAudio && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-900/10 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <span className="text-sm text-emerald-700 flex-1 dark:text-emerald-300">Existing audio</span>
                <button type="button" onClick={() => { setRemoveExistingAudio(true); if (onRemoveExisting) onRemoveExisting(true); }} className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200">Remove</button>
              </div>
            </div>
          )}

          {removeExistingAudio && !audioFile && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg dark:bg-rose-900/10 dark:border-rose-800">
              <div className="flex items-center gap-2">
                <span className="text-sm text-rose-700 flex-1 dark:text-rose-300">Audio file will be removed</span>
                <button type="button" onClick={() => { setRemoveExistingAudio(false); if (onRemoveExisting) onRemoveExisting(false); }} className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200">Undo</button>
              </div>
            </div>
          )}

          {!audioFile && !removeExistingAudio && (
            <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onClick={() => triggerFileInput()} role="button" aria-label="Upload or drag and drop audio file" className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-300 bg-slate-50 dark:bg-gray-700 dark:border-gray-600'}`}>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.5" /></svg>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-gray-100">{isDragging ? 'Drop audio file here' : 'Upload Audio File'}</p>
                <p className="text-xs text-slate-400 dark:text-gray-400">MP3, WAV, OGG, M4A • Max 50MB</p>
              </div>
              <input aria-hidden="true" ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a" onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); }} className="hidden" />
            </div>
          )}

          {audioFile && (
            <div className="border border-slate-300 rounded-lg p-4 mt-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate dark:text-gray-100">{audioFileName}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">{(audioFile.size / (1024*1024)).toFixed(2)} MB</p>
                    </div>
                    <button type="button" onClick={removeFile} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors dark:text-gray-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/10">Remove</button>
                  </div>
                  {audioPreviewUrl && (
                    <audio controls src={audioPreviewUrl} className="w-full" />
                  )}

                  {uploading && uploadProgress > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-gray-300 mb-1">
                        <span>Uploading...</span>
                        <span className="font-medium">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden dark:bg-gray-700">
                        <div style={{ width: `${uploadProgress}%` }} className="bg-emerald-600 h-2 rounded-full transition-all" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        audioPreviewUrl ? (
          <div className="mt-2">
            <audio controls src={audioPreviewUrl} className="w-full" />
          </div>
        ) : null
      )}
    </div>
  );
}
