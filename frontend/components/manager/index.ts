/**
 * Manager Components - Main Export Index
 * Central export point for all manager panel components
 */

// AI Content Generator
export { default as AIContentGenerator } from './AIContentGenerator';

// Question Partials
export {
  BulkAdd,
  TFNGBuilder,
  MCQBuilder,
  MatchingBuilder,
  StandardQuestionForm,
  QuestionList,
} from './question-partials';

// Reading Components
export { PassageForm } from './reading';
export { ListeningTests } from './listening/ListeningTests';

// Shared Components
export {
  LoadingSpinner,
  EmptyState,
  StatsCard,
  Modal,
  ToastProvider,
  ToastContainer,
  useToast,
  Alert,
  Badge,
  Pagination,
  AdvancedFilter,
  ThemeToggle,
} from './shared';

// Layout Components
export { ManagerLayout, ManagerHeader, ManagerSidebar } from './layout';
