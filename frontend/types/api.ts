export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
}

export interface ApiError {
  message: string;
  status: number;
  details?: Record<string, string[] | string>;
  endpoint?: string;
  method?: string;
  baseUrl?: string;
  // Unified fields that some backend endpoints return
  success?: boolean;
  code?: string;
  errors?: Record<string, string[] | string>;
}
