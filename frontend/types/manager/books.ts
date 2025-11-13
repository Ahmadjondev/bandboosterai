/**
 * Manager Panel - Books & Sections Types
 * For CRUD operations on books and sections
 */

import { Book, BookSection } from '../books';

// Re-export types for convenience
export type IELTSLevel = 'B1' | 'B2' | 'C1' | 'C2';
export type SectionType = 'READING' | 'LISTENING';

/**
 * Book Form Data for create/update
 */
export interface BookForm {
  title: string;
  description?: string;
  level: IELTSLevel;
  cover_image?: File | string | null;
  author?: string;
  publisher?: string;
  publication_year?: number;
  is_active?: boolean;
}

/**
 * Section Form Data for create/update
 */
export interface SectionForm {
  book: number;
  section_type: SectionType;
  title?: string;
  reading_passage?: number | null;
  listening_part?: number | null;
  order?: number;
  description?: string;
  duration_minutes?: number;
  is_locked?: boolean;
}

/**
 * Book with stats for manager view
 */
export interface BookWithStats extends Book {
  sections_count: number;
  enrolled_count: number;
  average_progress: number;
}

/**
 * Available content for linking
 */
export interface AvailableContent {
  id: number;
  title: string;
  passage_number?: number;
  part_number?: number;
  difficulty?: string;
  word_count?: number;
  duration?: number;
}

/**
 * Reorder sections data
 */
export interface ReorderSectionsData {
  sections: Array<{
    id: number;
    order: number;
  }>;
}

/**
 * Book statistics response
 */
export interface BookStats {
  book: {
    id: number;
    title: string;
    total_sections: number;
  };
  users: {
    total: number;
    started: number;
    completed: number;
    completion_rate: number;
  };
  progress: {
    average_progress: number;
    average_score: number;
  };
  sections: Array<{
    id: number;
    title: string;
    order: number;
    attempts_count: number;
  }>;
}

/**
 * Paginated response for manager lists
 */
export interface PaginatedBooksResponse {
  books: BookWithStats[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface PaginatedSectionsResponse {
  sections: BookSection[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

/**
 * Filter options for books list
 */
export interface BooksFilters {
  level?: IELTSLevel;
  is_active?: boolean;
  search?: string;
  sort?: string;
  page?: number;
}

/**
 * Filter options for sections list
 */
export interface SectionsFilters {
  book_id?: number;
  section_type?: SectionType;
  search?: string;
  sort?: string;
  page?: number;
}
