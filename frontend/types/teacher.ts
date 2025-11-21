import type { User } from './auth';

export interface TeacherBasic {
  id: number;
  username: string;
  full_name: string;
  email: string;
  profile_image?: string;
}

export interface StudentBasic {
  id: number;
  username: string;
  full_name: string;
  email: string;
  profile_image?: string;
}

export interface MockExamBasic {
  id: number;
  uuid: string;
  title: string;
  exam_type: string;
  exam_type_display: string;
  difficulty_level: string;
  duration_minutes: number;
  description?: string;
  is_active?: boolean;
  created_by?: number;
  created_by_name?: string;
  created_by_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherExam {
  id: number;
  uuid: string;
  teacher: TeacherBasic;
  title: string;
  description?: string;
  mock_exam?: MockExamBasic;
  start_date?: string;
  end_date?: string;
  duration_minutes?: number;
  is_public: boolean;
  access_code?: string;
  assigned_students_count: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  auto_grade_reading: boolean;
  auto_grade_listening: boolean;
  is_active: boolean;
  total_attempts: number;
  completed_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherExamDetail extends TeacherExam {
  assigned_students: StudentBasic[];
}

export interface TeacherExamAttempt {
  id: number;
  uuid: string;
  exam: TeacherExam;
  student: StudentBasic;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'GRADED';
  started_at?: string;
  submitted_at?: string;
  graded_at?: string;
  listening_score?: number;
  reading_score?: number;
  writing_score?: number;
  speaking_score?: number;
  overall_band?: number;
  detailed_scores?: any;
  strengths?: string[];
  weaknesses?: string[];
  duration_minutes?: number;
  is_overdue: boolean;
  feedback_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeacherFeedback {
  id: number;
  attempt: number;
  teacher: TeacherBasic;
  feedback_type: 'GENERAL' | 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  comment: string;
  task_achievement?: number;
  coherence_cohesion?: number;
  lexical_resource?: number;
  grammatical_range?: number;
  pronunciation?: number;
  fluency_coherence?: number;
  is_visible_to_student: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeacherExamAttemptDetail extends TeacherExamAttempt {
  teacher_feedbacks: TeacherFeedback[];
}

export interface DashboardStats {
  total_exams: number;
  active_exams: number;
  total_students: number;
  total_attempts: number;
  completed_attempts: number;
  pending_grading: number;
  average_score: number;
  recent_activities: RecentActivity[];
}

export interface RecentActivity {
  id: number;
  student: string;
  exam: string;
  status: string;
  score?: number;
  timestamp: string;
}

export interface SectionAnalysis {
  listening: {
    score?: number;
    strength: string;
  };
  reading: {
    score?: number;
    strength: string;
  };
  writing: {
    score?: number;
    strength: string;
  };
  speaking: {
    score?: number;
    strength: string;
  };
}

export interface StudentResult {
  student: StudentBasic;
  attempt: TeacherExamAttemptDetail;
  section_analysis: SectionAnalysis;
  recommendations: string[];
}

export interface ExamPerformanceSummary {
  exam: TeacherExam;
  total_students?: number;
  completed_count: number;
  average_scores: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
    overall: number;
  };
  score_distribution: {
    '0-4.5': number;
    '5.0-5.5': number;
    '6.0-6.5': number;
    '7.0-7.5': number;
    '8.0-9.0': number;
  };
  top_performers: Array<{
    student: string;
    score: number;
    id: number;
  }>;
  low_performers: Array<{
    student: string;
    score: number;
    id: number;
  }>;
}

export interface CreateExamData {
  title: string;
  description?: string;
  mock_exam_id?: number;
  start_date?: string;
  end_date?: string;
  duration_minutes?: number;
  is_public: boolean;
  access_code?: string;
  auto_grade_reading: boolean;
  auto_grade_listening: boolean;
}

export interface UpdateExamData extends Partial<CreateExamData> {
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface GradeAttemptData {
  listening_score?: number;
  reading_score?: number;
  writing_score?: number;
  speaking_score?: number;
  strengths?: string[];
  weaknesses?: string[];
}

export interface CreateFeedbackData {
  attempt: number;
  feedback_type: 'GENERAL' | 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  comment: string;
  task_achievement?: number;
  coherence_cohesion?: number;
  lexical_resource?: number;
  grammatical_range?: number;
  pronunciation?: number;
  fluency_coherence?: number;
  is_visible_to_student?: boolean;
}
