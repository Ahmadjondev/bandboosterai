/**
 * Manager Panel Utility Functions
 * Port of Vue.js helpers to React
 */

/**
 * Format a date string to relative time
 */
export function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format a date string to readable format
 */
export function formatDate(dateString: string, includeTime: boolean = false): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return date.toLocaleDateString('en-US', options);
}

/**
 * Get color class for band score
 */
export function getBandScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600 font-bold';
  if (score >= 7) return 'text-green-600 font-bold';
  if (score >= 6) return 'text-orange-600 font-semibold';
  if (score >= 5) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
}

/**
 * Get background color class for band score
 */
export function getBandScoreBgColor(score: number): string {
  if (score >= 8) return 'bg-emerald-100 text-emerald-800';
  if (score >= 7) return 'bg-green-100 text-green-800';
  if (score >= 6) return 'bg-orange-100 text-orange-800';
  if (score >= 5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

/**
 * Get initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return first + last || 'U';
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format duration in minutes to readable format
 */
export function formatDuration(minutes: number): string {
  if (!minutes) return 'N/A';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  } else if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  }
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(
  status: string
): { bg: string; text: string; dot: string } {
  const statusColors: Record<
    string,
    { bg: string; text: string; dot: string }
  > = {
    ACTIVE: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
    },
    INACTIVE: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
    },
    SCHEDULED: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
    },
    COMPLETED: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
    },
    IN_PROGRESS: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-500',
    },
    EXPIRED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
    },
    DRAFT: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
    },
    CANCELLED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-500',
    },
  };

  return (
    statusColors[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
    }
  );
}

/**
 * Get difficulty badge color
 */
export function getDifficultyBadgeColor(
  difficulty: string
): { bg: string; text: string } {
  const difficultyColors: Record<string, { bg: string; text: string }> = {
    EASY: { bg: 'bg-green-100', text: 'text-green-800' },
    MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    HARD: { bg: 'bg-red-100', text: 'text-red-800' },
  };

  return (
    difficultyColors[difficulty] || { bg: 'bg-gray-100', text: 'text-gray-800' }
  );
}

/**
 * Debounce function to limit the rate of function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length > 11) {
    return `+${cleaned.slice(0, -10)} (${cleaned.slice(-10, -7)}) ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
  }
  
  return phone;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Validate phone format (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Get section icon name (for Feather icons or similar)
 */
export function getSectionIcon(section: string): string {
  const icons: Record<string, string> = {
    Listening: 'headphones',
    Reading: 'book-open',
    Writing: 'edit-3',
    Speaking: 'mic',
  };
  return icons[section] || 'activity';
}

/**
 * Parse error message from API response
 */
export function parseErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  if (error?.detail) return error.detail;
  return 'An unexpected error occurred';
}

/**
 * Download file from blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

/**
 * Format test type label
 */
export function formatTestTypeLabel(testType: string): string {
  const labels: Record<string, string> = {
    LISTENING_READING: 'Listening + Reading',
    LISTENING_READING_WRITING: 'L + R + W',
    FULL_TEST: 'Full Test (L + R + W + S)',
  };
  return labels[testType] || testType;
}

/**
 * Get rank badge color by index
 */
export function getRankBadgeColor(index: number): string {
  if (index === 0)
    return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white';
  if (index === 1)
    return 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700';
  if (index === 2)
    return 'bg-gradient-to-br from-orange-400 to-orange-500 text-white';
  return 'bg-gray-200 text-gray-600';
}

/**
 * Class names utility (similar to clsx)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
