from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from accounts.models import User
from ielts.models import MockExam, Question
import uuid


class TeacherExam(models.Model):
    """
    Represents an exam created by a teacher
    Teachers can create custom exams for their students
    """

    STATUS_CHOICES = (
        ("DRAFT", "Draft"),
        ("PUBLISHED", "Published"),
        ("ARCHIVED", "Archived"),
    )

    # Unique identifier
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
        help_text="Unique identifier for secure access",
    )

    # Basic Info
    teacher = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_exams",
        limit_choices_to={"role": "TEACHER"},
        verbose_name="Teacher",
    )
    title = models.CharField(max_length=255, verbose_name="Exam Title")
    description = models.TextField(null=True, blank=True, verbose_name="Description")

    # Link to MockExam template (teachers can use existing IELTS content)
    mock_exam = models.ForeignKey(
        MockExam,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teacher_exams",
        verbose_name="IELTS Mock Exam Template",
        help_text="Optional: Use an existing IELTS mock exam as template",
    )

    # Schedule
    start_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Start Date",
        help_text="When students can start taking this exam",
    )
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="End Date",
        help_text="When the exam closes",
    )

    # Duration in minutes
    duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name="Duration (minutes)",
        help_text="Time limit for completing the exam",
    )

    # Access Control
    is_public = models.BooleanField(
        default=False,
        verbose_name="Public",
        help_text="If true, all students can access. If false, only assigned students.",
    )
    access_code = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="Access Code",
        help_text="Optional access code for students",
    )

    # Assigned students (for private exams)
    assigned_students = models.ManyToManyField(
        User,
        related_name="assigned_exams",
        blank=True,
        limit_choices_to={"role": "STUDENT"},
        verbose_name="Assigned Students",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT",
        verbose_name="Status",
    )

    # Auto-grading settings
    auto_grade_reading = models.BooleanField(
        default=True, verbose_name="Auto-grade Reading"
    )
    auto_grade_listening = models.BooleanField(
        default=True, verbose_name="Auto-grade Listening"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "teacher_exams"
        verbose_name = "Teacher Exam"
        verbose_name_plural = "Teacher Exams"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["teacher", "status"]),
            models.Index(fields=["status", "start_date"]),
        ]

    def __str__(self):
        return f"{self.title} by {self.teacher.get_full_name()}"

    @property
    def is_active(self):
        """Check if exam is currently active"""
        if self.status != "PUBLISHED":
            return False
        now = timezone.now()
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True

    @property
    def total_attempts(self):
        """Get total number of attempts"""
        return self.attempts.count()

    @property
    def completed_attempts(self):
        """Get number of completed attempts"""
        return self.attempts.filter(status="COMPLETED").count()

    def can_student_access(self, student):
        """Check if a student can access this exam"""
        if self.status != "PUBLISHED":
            return False, "Exam is not published"

        if not self.is_active:
            return False, "Exam is not active"

        if self.is_public:
            return True, "Public exam"

        if student in self.assigned_students.all():
            return True, "Student is assigned"

        return False, "Access denied"


class TeacherExamAttempt(models.Model):
    """
    Represents a student's attempt at a teacher-created exam
    """

    STATUS_CHOICES = (
        ("NOT_STARTED", "Not Started"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("GRADED", "Graded"),
    )

    # Unique identifier
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
    )

    # Relations
    exam = models.ForeignKey(
        TeacherExam,
        on_delete=models.CASCADE,
        related_name="attempts",
        verbose_name="Exam",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="teacher_exam_attempts",
        limit_choices_to={"role": "STUDENT"},
        verbose_name="Student",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NOT_STARTED",
        verbose_name="Status",
    )

    # Current section being attempted
    current_section = models.CharField(
        max_length=20,
        default="NOT_STARTED",
        verbose_name="Current Section",
        help_text="Current section: NOT_STARTED, listening, reading, writing, speaking, or COMPLETED",
    )

    # Timing
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Started At")
    submitted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Submitted At"
    )
    graded_at = models.DateTimeField(null=True, blank=True, verbose_name="Graded At")

    # Scores (IELTS band scores 0-9)
    listening_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Listening Score",
    )
    reading_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Reading Score",
    )
    writing_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Writing Score",
    )
    speaking_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Speaking Score",
    )
    overall_band = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Overall Band Score",
    )

    # Detailed scores (stored as JSON for flexibility)
    detailed_scores = models.JSONField(
        null=True,
        blank=True,
        help_text="Detailed breakdown of scores by question, section, criteria, etc.",
    )

    # Strengths and Weaknesses (auto-calculated or teacher-entered)
    strengths = models.JSONField(
        null=True,
        blank=True,
        help_text="List of student's strong areas",
        default=list,
    )
    weaknesses = models.JSONField(
        null=True,
        blank=True,
        help_text="List of student's weak areas",
        default=list,
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "teacher_exam_attempts"
        verbose_name = "Teacher Exam Attempt"
        verbose_name_plural = "Teacher Exam Attempts"
        ordering = ["-created_at"]
        unique_together = ("exam", "student")
        indexes = [
            models.Index(fields=["exam", "status"]),
            models.Index(fields=["student", "status"]),
        ]

    def __str__(self):
        return f"{self.student.get_full_name()} - {self.exam.title}"

    def calculate_overall_band(self):
        """Calculate overall band score from section scores"""
        from decimal import Decimal

        scores = [
            self.listening_score,
            self.reading_score,
            self.writing_score,
            self.speaking_score,
        ]
        valid_scores = [s for s in scores if s is not None]

        if not valid_scores:
            return None

        # Calculate average
        total = sum(valid_scores)
        avg = total / len(valid_scores)

        # Round to nearest 0.5 (IELTS standard)
        return Decimal(str(round(float(avg) * 2) / 2))

    def save(self, *args, **kwargs):
        # Auto-calculate overall band if section scores are present
        if any(
            [
                self.listening_score,
                self.reading_score,
                self.writing_score,
                self.speaking_score,
            ]
        ):
            self.overall_band = self.calculate_overall_band()

        # Update graded_at timestamp when status changes to GRADED
        if self.status == "GRADED" and not self.graded_at:
            self.graded_at = timezone.now()

        super().save(*args, **kwargs)

    def get_duration_minutes(self):
        """Calculate attempt duration in minutes"""
        if self.started_at and self.submitted_at:
            delta = self.submitted_at - self.started_at
            return round(delta.total_seconds() / 60, 2)
        return None

    @property
    def is_overdue(self):
        """Check if attempt is overdue"""
        if (
            self.status == "IN_PROGRESS"
            and self.started_at
            and self.exam.duration_minutes
        ):
            elapsed = timezone.now() - self.started_at
            return elapsed.total_seconds() / 60 > self.exam.duration_minutes
        return False


class TeacherFeedback(models.Model):
    """
    Teacher's feedback on a student's exam attempt
    Allows teachers to provide detailed comments and suggestions
    """

    FEEDBACK_TYPE_CHOICES = (
        ("GENERAL", "General Feedback"),
        ("LISTENING", "Listening Feedback"),
        ("READING", "Reading Feedback"),
        ("WRITING", "Writing Feedback"),
        ("SPEAKING", "Speaking Feedback"),
    )

    # Relations
    attempt = models.ForeignKey(
        TeacherExamAttempt,
        on_delete=models.CASCADE,
        related_name="teacher_feedbacks",
        verbose_name="Exam Attempt",
    )
    teacher = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="given_feedbacks",
        limit_choices_to={"role": "TEACHER"},
        verbose_name="Teacher",
    )

    # Feedback details
    feedback_type = models.CharField(
        max_length=20,
        choices=FEEDBACK_TYPE_CHOICES,
        default="GENERAL",
        verbose_name="Feedback Type",
    )
    comment = models.TextField(verbose_name="Comment")

    # Optional: Specific criteria feedback for Writing/Speaking
    task_achievement = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Task Achievement/Response",
    )
    coherence_cohesion = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Coherence and Cohesion",
    )
    lexical_resource = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Lexical Resource",
    )
    grammatical_range = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Grammatical Range and Accuracy",
    )
    # For Speaking only
    pronunciation = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Pronunciation",
    )
    fluency_coherence = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Fluency and Coherence",
    )

    # Visibility
    is_visible_to_student = models.BooleanField(
        default=True, verbose_name="Visible to Student"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "teacher_feedbacks"
        verbose_name = "Teacher Feedback"
        verbose_name_plural = "Teacher Feedbacks"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["attempt", "feedback_type"]),
            models.Index(fields=["teacher"]),
        ]

    def __str__(self):
        return f"Feedback by {self.teacher.get_full_name()} on {self.attempt}"


class TeacherUserAnswer(models.Model):
    """
    Stores a user's answer to a question for a teacher exam attempt.
    Similar to UserAnswer but for TeacherExamAttempt.
    """

    exam_attempt = models.ForeignKey(
        TeacherExamAttempt, on_delete=models.CASCADE, related_name="user_answers"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="teacher_user_answers"
    )
    answer_text = models.CharField(max_length=255, blank=True)

    # Correctness flag (calculated)
    is_correct = models.BooleanField(
        default=False, help_text="Whether the answer is correct"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "teacher_user_answers"
        verbose_name = "Teacher User Answer"
        verbose_name_plural = "Teacher User Answers"
        # Ensures a user has only one answer per question in an attempt
        unique_together = ("exam_attempt", "question")
        ordering = ["question__order"]
        indexes = [
            models.Index(fields=["exam_attempt", "is_correct"]),
        ]

    def __str__(self):
        return f"Answer by {self.exam_attempt.student.get_full_name()} for Q{self.question.order}"

    def check_correctness(self):
        """Check if the answer is correct and update the is_correct field"""
        from ielts.models import TestHead

        correct_answer = self.question.get_correct_answer()
        if correct_answer:
            # Normalize both answers for comparison (lowercase, strip whitespace)
            user_ans = self.answer_text.strip().lower() if self.answer_text else ""
            correct_ans = correct_answer.strip().lower()

            # For TFNG, YNNG questions
            if self.question.test_head and self.question.test_head.question_type in [
                TestHead.QuestionType.TRUE_FALSE_NOT_GIVEN,
                TestHead.QuestionType.YES_NO_NOT_GIVEN,
            ]:
                self.is_correct = user_ans == correct_ans
            # For short answer questions (allow slight variations)
            elif (
                self.question.test_head
                and self.question.test_head.question_type
                == TestHead.QuestionType.SHORT_ANSWER
            ):
                # Check if the answer contains the correct answer or vice versa
                self.is_correct = correct_ans in user_ans or user_ans in correct_ans
            # For MCQ and other types
            else:
                self.is_correct = user_ans == correct_ans

        return self.is_correct

    def save(self, *args, **kwargs):
        # Auto-check correctness before saving
        self.check_correctness()
        super().save(*args, **kwargs)
