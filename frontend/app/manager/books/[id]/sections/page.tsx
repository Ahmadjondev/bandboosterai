"use client";

import { useRouter, useParams } from "next/navigation";
import BulkSectionsManager from '@/components/manager/books/BulkSectionsManager';

export default function BookSectionsPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manage Book Sections</h1>
          <p className="text-sm text-gray-500">Add, edit, reorder and delete multiple sections in one batch.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="px-3 py-2 bg-gray-200 rounded">Back</button>
        </div>
      </div>

      <BulkSectionsManager bookId={bookId} />
    </div>
  );
}
