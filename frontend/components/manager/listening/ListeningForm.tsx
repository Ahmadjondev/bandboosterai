/**
 * ListeningForm
 * Reusable form for create/edit/view modes for ListeningPart
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { managerAPI } from '@/lib/manager/api-client';
import type { ListeningPart } from '@/types/manager';

interface Props {
  mode: 'create' | 'edit' | 'view';
  id?: number;
}

export default function ListeningForm({ mode, id }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
        })
        .catch((err) => {
          console.error('Failed to load listening part', err);
          alert('Failed to load listening part');
        })
        .finally(() => setLoading(false));
    }
  }, [mode, id]);

  const handleChange = (key: keyof ListeningPart, value: any) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (mode === 'create') {
        await managerAPI.createListeningPart(form as any);
      } else if (mode === 'edit' && id) {
        await managerAPI.updateListeningPart(id, form as any);
      }
      router.push('/manager/listening');
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save listening part');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white p-6 rounded dark:bg-gray-800 dark:text-gray-100">
      <div className="grid grid-cols-1 gap-4">
        <label>
          Part Number
          <input type="number" value={form.part_number ?? 1} onChange={(e) => handleChange('part_number', parseInt(e.target.value || '1'))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
        </label>

        <label>
          Title
          <input value={form.title ?? ''} onChange={(e) => handleChange('title', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
        </label>

        <label>
          Description
          <textarea value={form.description ?? ''} onChange={(e) => handleChange('description', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" rows={4} />
        </label>

        <label>
          Transcript
          <textarea value={form.transcript ?? ''} onChange={(e) => handleChange('transcript', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" rows={6} />
        </label>

        <label>
          Duration (seconds)
          <input type="number" value={form.duration_seconds ?? 0} onChange={(e) => handleChange('duration_seconds', parseInt(e.target.value || '0'))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
        </label>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Cancel</button>
          {mode !== 'view' && (
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded dark:bg-emerald-500 dark:hover:bg-emerald-600">Save</button>
          )}
        </div>
      </div>
    </form>
  );
}
