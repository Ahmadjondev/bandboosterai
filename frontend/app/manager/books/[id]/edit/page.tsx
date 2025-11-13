'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { managerAPI } from '@/lib/manager';
import type { Book } from '@/types/books';
import BookFormComponent from '@/components/manager/books/BookForm';
import { LoadingSpinner, Alert } from '@/components/manager/shared';
import { ManagerLayout } from '@/components/manager/layout';

export default function EditBookPage() {
  const params = useParams();
  const bookId = parseInt(params.id as string);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const data = await managerAPI.getBook(bookId);
        setBook(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load book');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [bookId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div>
        <Alert type="error" message={error || 'Book not found'} />
      </div>
    );
  }

  return <BookFormComponent bookId={bookId} initialData={book} />;
}
