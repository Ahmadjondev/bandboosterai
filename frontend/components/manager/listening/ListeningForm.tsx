/**
 * ListeningForm
 * Reusable form for create/edit/view modes for ListeningPart
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/manager/auth-client';
import { API_BASE_URL } from '@/config/api';
import { managerAPI } from '@/lib/manager/api-client';
import AudioUploader from './AudioUploader';
import { uploadWithProgress } from '@/lib/manager/upload';
import type { ListeningPart } from '@/types/manager';

interface Props {
  mode: 'create' | 'edit' | 'view';
  id?: number;
}

export default function ListeningForm({ mode, id }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [removeExistingAudio, setRemoveExistingAudio] = useState(false);
  const [initialForm, setInitialForm] = useState<Partial<ListeningPart> | null>(null);
  const [initialAudioUrl, setInitialAudioUrl] = useState<string | null>(null);
  const [initialAudioFilename, setInitialAudioFilename] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const BASE_API_URL = `${API_BASE_URL}/manager/api`;
  const [form, setForm] = useState<Partial<ListeningPart>>({
    part_number: 1,
    title: '',
    description: '',
    transcript: '',
    duration_seconds: 0,
  });

  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && id) {
      setLoading(true);
      managerAPI.getListeningPart(id)
        .then((data: any) => {
          setForm({
            part_number: data.part_number,
            title: data.title,
            description: data.description,
            transcript: data.transcript,
            duration_seconds: data.duration_seconds,
          });
          if (data.audio_url) {
            setAudioPreviewUrl(data.audio_url);
            setInitialAudioUrl(data.audio_url);
            setAudioFileName(data.audio_filename || 'existing audio');
            setInitialAudioFilename(data.audio_filename || 'existing audio');
            setRemoveExistingAudio(false);
            setAudioFile(null);
          }
          setInitialForm({
            part_number: data.part_number,
            title: data.title,
            description: data.description,
            transcript: data.transcript,
            duration_seconds: data.duration_seconds,
          });
        })
        .catch((err) => {
          console.error('Failed to load listening part', err);
          alert('Failed to load listening part');
        })
        .finally(() => setLoading(false));
    }
  }, [mode, id]);

  const handleChange = (key: keyof ListeningPart, value: any) => {
    setServerError(null);
    setForm((s) => ({ ...s, [key]: value }));
  };

  const isDirty = () => {
    if (!initialForm) return true; // Creating new form is considered dirty
    const current = JSON.stringify({ ...form });
    const initial = JSON.stringify({ ...initialForm });
    return current !== initial || !!audioFile || removeExistingAudio;
  };

  const handleReset = () => {
    if (initialForm) setForm(initialForm);
    setAudioFile(null);
    setAudioPreviewUrl(initialAudioUrl);
    setAudioFileName(initialAudioFilename ?? '');
    setRemoveExistingAudio(false);
  };

  // The audio file handling has been delegated to AudioUploader component

  useEffect(() => {
    return () => {
      if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  // triggerFileInput unused now that AudioUploader handles file inputs

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    try {
      setLoading(true);
      const isEdit = mode === 'edit' && !!id;
      // When there's a new file or the existing audio should be removed, use FormData to include file or remove flag
      if (audioFile || removeExistingAudio) {
        const formData = new FormData();
        formData.append('title', form.title || '');
        formData.append('part_number', String(form.part_number || 1));
        formData.append('description', form.description || '');
        if (form.duration_seconds !== undefined && form.duration_seconds !== null) {
          formData.append('duration_seconds', String(form.duration_seconds));
        }
        if (form.transcript) formData.append('transcript', String(form.transcript));
        if (audioFile) {
          formData.append('audio_file', audioFile);
        }
        if (removeExistingAudio && !audioFile) {
          formData.append('remove_audio', 'true');
        }

        const endpoint = isEdit
          ? `${BASE_API_URL}/tests/listening/${id}/update/`
          : `${BASE_API_URL}/tests/listening/create/`;

        const token = authClient.getAccessToken();
        setUploadProgress(0);
        setUploading(true);
        try {
          await uploadWithProgress(endpoint, formData, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            onProgress: (pct) => setUploadProgress(pct),
          });
        } finally {
          setUploadProgress(0);
          setUploading(false);
        }
      } else {
        // JSON-based create/update
        const jsonPayload = {
          title: form.title || '',
          part_number: form.part_number || 1,
          description: form.description || '',
          transcript: form.transcript || '',
        } as any;
        if (form.duration_seconds !== undefined && form.duration_seconds !== null) jsonPayload.duration_seconds = form.duration_seconds;

        const token = authClient.getAccessToken();
        if (mode === 'create') {
          await fetch(`${BASE_API_URL}/tests/listening/create/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(jsonPayload),
          }).then(async (r) => {
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              throw new Error(d.error || 'Failed to create listening part');
            }
          });
        } else if (mode === 'edit' && id) {
          await fetch(`${BASE_API_URL}/tests/listening/${id}/update/`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(jsonPayload),
          }).then(async (r) => {
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              throw new Error(d.error || 'Failed to update listening part');
            }
          });
        }
      }
      router.push('/manager/listening');
    } catch (err: any) {
      console.error('Save failed', err);
      setServerError(err.message || 'Failed to save listening part');
    } finally {
      setLoading(false);
    }
  };

  // We use frontend/lib/manager/upload.ts uploadWithProgress helper now via import

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white p-6 rounded dark:bg-gray-800 dark:text-gray-100">
      <div className="grid grid-cols-1 gap-4">
        <label>
          Part Number
          <input disabled={mode === 'view'} type="number" value={form.part_number ?? 1} onChange={(e) => handleChange('part_number', parseInt(e.target.value || '1'))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
        </label>

        <label>
          Title
          <input disabled={mode === 'view'} value={form.title ?? ''} onChange={(e) => handleChange('title', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
        </label>

        <label>
          Description
          <textarea readOnly={mode === 'view'} value={form.description ?? ''} onChange={(e) => handleChange('description', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" rows={4} />
        </label>

        <label>
          Transcript
          <textarea readOnly={mode === 'view'} value={form.transcript ?? ''} onChange={(e) => handleChange('transcript', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" rows={6} />
        </label>

        <label>
          Duration (seconds)
          <input disabled={mode === 'view'} type="number" value={form.duration_seconds ?? 0} onChange={(e) => handleChange('duration_seconds', parseInt(e.target.value || '0'))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
        </label>

        {/* Audio Upload */}
        {mode !== 'view' ? (
        <div>
          <AudioUploader
            mode={mode}
            existingAudioUrl={audioPreviewUrl}
            existingAudioFilename={audioFileName}
            onFileChange={(file) => { setServerError(null); setAudioFile(file); }}
            onDurationChange={(duration) => { if (duration !== null) setForm((s) => ({ ...s, duration_seconds: duration })); }}
            onRemoveExisting={(remove) => { setServerError(null); setRemoveExistingAudio(remove); }}
            removeExistingAudio={removeExistingAudio}
            uploading={uploading}
            uploadProgress={uploadProgress}
          />
          {form.duration_seconds ? (
            <div className="text-sm text-slate-600 mt-2">Detected duration: <strong className="text-slate-900">{form.duration_seconds} s</strong></div>
          ) : null}
        </div>
      ) : (
        // View mode: display preview only
          audioPreviewUrl ? (
            <div className="mt-2">
              <audio controls src={audioPreviewUrl} className="w-full" />
              <div className="mt-2 flex items-center gap-2">
                <a href={audioPreviewUrl || '#'} target="_blank" rel="noreferrer" className="text-sm text-emerald-600 hover:underline">Open audio</a>
                <a download href={audioPreviewUrl || '#'} className="text-sm text-slate-600 hover:underline">Download</a>
              </div>
              {form.duration_seconds ? <div className="text-sm text-slate-600 mt-2">Duration: <strong className="text-slate-900">{form.duration_seconds} s</strong></div> : null}
          </div>
          ) : null
        )}

          {serverError && (
            <div className="mb-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded">
              {serverError}
            </div>
          )}
          <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Cancel</button>
          {mode !== 'view' && (
            <>
              <button type="button" onClick={() => handleReset()} disabled={!isDirty()} className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">Reset</button>
              <button type="submit" disabled={loading || uploading || !isDirty()} className="px-4 py-2 bg-emerald-600 text-white rounded dark:bg-emerald-500 dark:hover:bg-emerald-600 disabled:opacity-50">
                    {(loading || uploading) ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
