/**
 * BandBooster Classroom Command: TypeScript Types
 * 
 * Type definitions for the Classroom module - managing classrooms, enrollments,
 * assignment bundles, and student submissions.
 */

// ============================================
// User Types
// ============================================

export interface UserBasic {
  id: number;
  username: string;
  name: string;
  full_name: string;
  email: string;
  profile_image: string | null;
}

// ============================================
// Classroom Types
// ============================================

export type ClassroomStatus = 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';

export interface Classroom {
  id: number;
  uuid: string;
  teacher: UserBasic;
  name: string;
  description: string | null;
  target_band: number | null;
  invite_code: string;
  invite_enabled: boolean;
  max_students: number;
  status: ClassroomStatus;
  student_count: number;
  is_full: boolean;
  magic_link: string;
  created_at: string;
  updated_at: string;
}

export interface ClassroomDetail extends Classroom {
  enrollments: Enrollment[];
  assignment_count: number;
  active_assignments: number;
}

export interface ClassroomList {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  teacher_name: string;
  target_band: number | null;
  status: ClassroomStatus;
  student_count: number;
  assignment_count: number;
  pending_grading: number;
  invite_code: string;
  invite_enabled: boolean;
  created_at: string;
}

export interface ClassroomFormData {
  name: string;
  description?: string;
  subject?: string;
  target_band?: number;
  max_students?: number;
  invite_enabled?: boolean;
}

// ============================================
// Enrollment Types
// ============================================

export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'LEFT' | 'REMOVED';

export interface Enrollment {
  id: number;
  uuid: string;
  classroom: ClassroomList;
  student: UserBasic;
  status: EnrollmentStatus;
  current_band: number | null;
  listening_band: number | null;
  reading_band: number | null;
  writing_band: number | null;
  speaking_band: number | null;
  notes: string | null;
  last_active: string | null;
  enrolled_at: string;
  updated_at: string;
}

export interface StudentRoster {
  student: UserBasic;
  status: EnrollmentStatus;
  current_band: number | null;
  listening_band: number | null;
  reading_band: number | null;
  writing_band: number | null;
  speaking_band: number | null;
  notes: string | null;
  completed_assignments: number;
  pending_assignments: number;
  average_score: number | null;
  enrolled_at: string;
}

export interface JoinClassroomResponse {
  valid: boolean;
  message: string | null;
  classroom: {
    name: string;
    teacher: string;
    description: string | null;
    target_band: number | null;
    student_count: number;
  } | null;
}

// ============================================
// Bundle Item Types
// ============================================

export type BundleItemType = 
  | 'MOCK_EXAM' 
  | 'TEACHER_EXAM' 
  | 'WRITING_TASK' 
  | 'SPEAKING_TOPIC' 
  | 'READING_PASSAGE' 
  | 'LISTENING_PART';

export interface MockExamBasic {
  id: number;
  uuid: string;
  title: string;
  exam_type: string;
  exam_type_display: string;
  difficulty_level: string;
}

export interface TeacherExamBasic {
  id: number;
  uuid: string;
  title: string;
  status: string;
}

export interface WritingTaskBasic {
  id: number;
  task_type: string;
  task_type_display: string;
  prompt: string;
}

export interface SpeakingTopicBasic {
  id: number;
  topic: string;
  speaking_type: string;
}

export interface ReadingPassageBasic {
  id: number;
  passage_number: number;
  title: string;
  difficulty: string;
}

export interface ListeningPartBasic {
  id: number;
  part_number: number;
  title: string;
}

export interface BundleItem {
  id: number;
  uuid: string;
  item_type: BundleItemType;
  content_type: BundleItemType;
  content_id: number;
  mock_exam: MockExamBasic | null;
  teacher_exam: TeacherExamBasic | null;
  writing_task: WritingTaskBasic | null;
  speaking_topic: SpeakingTopicBasic | null;
  reading_passage: ReadingPassageBasic | null;
  listening_part: ListeningPartBasic | null;
  item_instructions: string | null;
  order: number;
  points: number;
  is_required: boolean;
  content_title: string;
  content_object: MockExamBasic | TeacherExamBasic | WritingTaskBasic | SpeakingTopicBasic | ReadingPassageBasic | ListeningPartBasic | null;
  created_at: string;
}

export interface BundleItemFormData {
  content_type: BundleItemType;
  content_id: number;
  item_instructions?: string;
  order?: number;
  points?: number;
  is_required?: boolean;
}

// ============================================
// Assignment Bundle Types
// ============================================

export type AssignmentBundleStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type AssignmentType = 'HOMEWORK' | 'QUIZ' | 'PRACTICE' | 'EXAM' | 'REMEDIAL';

export interface AssignmentBundle {
  id: number;
  uuid: string;
  classroom: ClassroomList;
  created_by: UserBasic;
  title: string;
  description: string | null;
  assignment_type: AssignmentType;
  teacher_instructions: string | null;
  available_from: string | null;
  due_date: string | null;
  allow_late_submission: boolean;
  time_limit_minutes: number | null;
  target_min_band: number | null;
  target_max_band: number | null;
  status: AssignmentBundleStatus;
  require_teacher_approval: boolean;
  auto_release_results: boolean;
  items: BundleItem[];
  total_items: number;
  is_available: boolean;
  is_overdue: boolean;
  submission_count: number;
  pending_review_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface AssignmentBundleList {
  id: number;
  uuid: string;
  title: string;
  classroom_name: string;
  assignment_type: AssignmentType;
  status: AssignmentBundleStatus;
  due_date: string | null;
  item_count: number;
  assigned_count: number;
  completed_count: number;
  is_available: boolean;
  is_overdue: boolean;
  created_at: string;
}

export interface AssignmentBundleFormData {
  classroom: number;
  title: string;
  description?: string;
  assignment_type?: AssignmentType;
  teacher_instructions?: string;
  available_from?: string;
  due_date?: string;
  allow_late_submission?: boolean;
  time_limit_minutes?: number;
  target_min_band?: number;
  target_max_band?: number;
  require_teacher_approval?: boolean;
  auto_release_results?: boolean;
  items?: BundleItemFormData[];
}

// ============================================
// Student Assignment Types
// ============================================

export type StudentAssignmentStatus = 
  | 'NOT_STARTED' 
  | 'IN_PROGRESS' 
  | 'SUBMITTED' 
  | 'AI_PROCESSED' 
  | 'PENDING_REVIEW' 
  | 'TEACHER_REVIEWED' 
  | 'RETURNED' 
  | 'COMPLETED';

export interface StudentAssignment {
  id: number;
  uuid: string;
  bundle: AssignmentBundleList;
  student: UserBasic;
  status: StudentAssignmentStatus;
  started_at: string | null;
  submitted_at: string | null;
  ai_processed_at: string | null;
  teacher_reviewed_at: string | null;
  completed_at: string | null;
  overall_score: number | null;
  band_score: number | null;
  ai_feedback: string | null;
  ai_band_score: number | null;
  ai_criteria_scores: {
    task_achievement: number;
    coherence_cohesion: number;
    lexical_resource: number;
    grammatical_accuracy: number;
  } | null;
  teacher_feedback: string | null;
  teacher_reviewed_by: UserBasic | null;
  score_overridden: boolean;
  item_progress: Record<string, { completed: boolean; score?: number }>;
  is_late: boolean;
  results_visible: boolean;
  progress_percentage: number;
  items: StudentItemSubmission[];
  item_submissions: StudentItemSubmission[];
  created_at: string;
  updated_at: string;
}

export interface StudentAssignmentList {
  id: number;
  uuid: string;
  bundle_title: string;
  student_name: string;
  classroom_name: string;
  status: StudentAssignmentStatus;
  band_score: number | null;
  ai_tentative_score: number | null;
  is_late: boolean;
  progress_percentage: number;
  submitted_at: string | null;
  created_at: string;
}

export interface AIFeedback {
  item_id: number;
  item_type: BundleItemType;
  score: number | null;
  feedback?: WritingAIFeedback;
  correct?: number;
  total?: number;
}

export interface WritingAIFeedback {
  inline: string;
  sentences: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  summary: string;
  band_score: string;
  corrected_essay: string;
  task_response_or_achievement: number;
  coherence_and_cohesion: number;
  lexical_resource: number;
  grammatical_range_and_accuracy: number;
}

// ============================================
// Student Item Submission Types
// ============================================

export type ItemSubmissionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'AI_GRADED' | 'TEACHER_REVIEWED';

export interface StudentItemSubmission {
  id: number;
  uuid: string;
  bundle_item: BundleItem;
  content_type: BundleItemType;
  content_title: string;
  content_id: number;
  status: ItemSubmissionStatus;
  writing_answer: string | null;
  writing_prompt: string | null;
  word_count: number;
  speaking_audio_url: string | null;
  speaking_prompt: string | null;
  speaking_transcript: string | null;
  answers_json: Record<string, string> | null;
  score: number | null;
  max_score: number | null;
  band_score: number | null;
  ai_feedback: WritingAIFeedback | null;
  ai_inline_corrections: string | null;
  teacher_feedback: string | null;
  teacher_score_override: number | null;
  time_spent_seconds: number;
  final_score: number | null;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Grading Types
// ============================================

export interface GradingQueueItem {
  id: number;
  uuid: string;
  student_name: string;
  student_id: number;
  classroom_name: string;
  classroom_id: number;
  content_type: string;
  content_title: string;
  content_id: number;
  has_ai_feedback: boolean;
  ai_band_score: number | null;
  submitted_at: string;
  time_since_submission: number | null;
}

export interface GradingQueueResponse {
  count: number;
  pending_items: GradingQueueItem[];
}

export type GradingAction = 'approve' | 'override' | 'return';

export interface GradingSubmission {
  band_score: number;
  criteria_scores: {
    task_achievement: number;
    coherence_cohesion: number;
    lexical_resource: number;
    grammatical_accuracy: number;
  };
  feedback: string;
  is_draft?: boolean;
}

export interface GradingStats {
  pending_count: number;
  graded_today: number;
  ai_pending: number;
  avg_grading_time: number | null;
  total_graded: number;
}

// ============================================
// Analytics Types
// ============================================

export interface ClassroomAnalytics {
  total_students: number;
  active_students: number;
  average_band: number | null;
  assignments_published: number;
  total_submissions: number;
  pending_grading: number;
  completion_rate: number;
  section_averages: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
  skill_breakdown: Record<string, { average: number; count: number }>;
}

export interface StudentProgress {
  student: UserBasic;
  current_band: number | null;
  section_scores: {
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
  };
  assignments_completed: number;
  assignments_total: number;
  score_trend: { date: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
}

// ============================================
// Content Search Types
// ============================================

export interface ContentSearchFilters {
  q?: string;
  type?: string;
  difficulty?: string;
  part?: number;
}
