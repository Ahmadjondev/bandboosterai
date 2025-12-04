from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from accounts.models import User
from ielts.models import (
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
    Question,
)
import uuid


class SectionPractice(models.Model):
    """
    Represents a single-section practice item.
    This allows students to practice individual IELTS sections
    (Listening, Reading, Writing, Speaking) separately.
    """

    SECTION_TYPE_CHOICES = (
        ("LISTENING", "Listening"),
        ("READING", "Reading"),
        ("WRITING", "Writing"),
        ("SPEAKING", "Speaking"),
    )

    DIFFICULTY_CHOICES = (
        ("EASY", "Easy (Band 4-5)"),
        ("MEDIUM", "Medium (Band 5.5-6.5)"),
        ("HARD", "Hard (Band 7-8)"),
        ("EXPERT", "Expert (Band 8.5-9)"),
    )

    # Standard IELTS section durations (in minutes)
    SECTION_DURATIONS = {
        "LISTENING": 30,  # 30 minutes
        "READING": 20,  # 20 minutes per passage (60 min / 3 passages)
        "WRITING": 20,  # 20 minutes for Task 1, 40 for Task 2
        "SPEAKING": 14,  # 11-14 minutes
    }

    # Unique identifier
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
    )

    title = models.CharField(
        max_length=255,
        verbose_name="Title",
        help_text="Practice section title",
    )
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name="Description",
    )
    section_type = models.CharField(
        max_length=20,
        choices=SECTION_TYPE_CHOICES,
        verbose_name="Section Type",
        db_index=True,
    )
    difficulty = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default="MEDIUM",
        verbose_name="Difficulty",
    )

    # Duration (optional - uses standard if not set)
    duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name="Duration (minutes)",
        help_text="Leave empty to use IELTS standard duration",
    )

    # Content links (only one should be set based on section_type)
    reading_passage = models.ForeignKey(
        ReadingPassage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="section_practices",
        verbose_name="Reading Passage",
    )
    listening_part = models.ForeignKey(
        ListeningPart,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="section_practices",
        verbose_name="Listening Part",
    )
    writing_task = models.ForeignKey(
        WritingTask,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="section_practices",
        verbose_name="Writing Task",
    )
    speaking_topic = models.ForeignKey(
        SpeakingTopic,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="section_practices",
        verbose_name="Speaking Topic",
    )

    # Metadata
    total_questions = models.PositiveIntegerField(
        default=0,
        verbose_name="Total Questions",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active",
        db_index=True,
    )
    is_free = models.BooleanField(
        default=False,
        verbose_name="Free Access",
        help_text="Available without premium subscription",
    )

    # Ordering for display
    order = models.PositiveIntegerField(
        default=0,
        verbose_name="Display Order",
    )

    # Creator
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_section_practices",
        verbose_name="Created By",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "section_practices"
        verbose_name = "Section Practice"
        verbose_name_plural = "Section Practices"
        ordering = ["section_type", "order", "-created_at"]
        indexes = [
            models.Index(fields=["section_type", "is_active"]),
            models.Index(fields=["difficulty"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_section_type_display()})"

    def get_default_duration(self):
        """Get the standard IELTS duration for this section type"""
        return self.SECTION_DURATIONS.get(self.section_type, 20)

    @property
    def actual_duration(self):
        """Get the actual duration (custom or default)"""
        return self.duration_minutes or self.get_default_duration()

    def get_content_object(self):
        """Get the linked content object based on section type"""
        content_map = {
            "READING": self.reading_passage,
            "LISTENING": self.listening_part,
            "WRITING": self.writing_task,
            "SPEAKING": self.speaking_topic,
        }
        return content_map.get(self.section_type)

    def calculate_total_questions(self):
        """Calculate and update total questions based on linked content"""
        content = self.get_content_object()
        if not content:
            return 0

        if self.section_type == "READING" and self.reading_passage:
            count = Question.objects.filter(
                test_head__reading=self.reading_passage
            ).count()
        elif self.section_type == "LISTENING" and self.listening_part:
            count = Question.objects.filter(
                test_head__listening=self.listening_part
            ).count()
        else:
            # Writing and Speaking don't have numbered questions
            count = 1

        self.total_questions = count
        return count


class SectionPracticeAttempt(models.Model):
    """
    Tracks a student's attempt at a section practice
    """

    STATUS_CHOICES = (
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("ABANDONED", "Abandoned"),
    )

    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
    )

    practice = models.ForeignKey(
        SectionPractice,
        on_delete=models.CASCADE,
        related_name="attempts",
        verbose_name="Section Practice",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="section_practice_attempts",
        verbose_name="Student",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="IN_PROGRESS",
        db_index=True,
    )

    # Timing
    started_at = models.DateTimeField(auto_now_add=True, verbose_name="Started At")
    completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Completed At"
    )
    time_spent_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name="Time Spent (seconds)",
    )

    # Results
    score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Band Score",
    )
    correct_answers = models.PositiveIntegerField(
        default=0,
        verbose_name="Correct Answers",
    )
    total_questions = models.PositiveIntegerField(
        default=0,
        verbose_name="Total Questions",
    )

    # Store answers as JSON
    answers = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Submitted Answers",
    )

    # For Writing and Speaking - AI feedback
    ai_feedback = models.TextField(
        null=True,
        blank=True,
        verbose_name="AI Feedback",
    )
    ai_evaluation = models.JSONField(
        null=True,
        blank=True,
        verbose_name="AI Evaluation Details",
    )

    class Meta:
        db_table = "section_practice_attempts"
        verbose_name = "Section Practice Attempt"
        verbose_name_plural = "Section Practice Attempts"
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["practice", "student"]),
        ]

    def __str__(self):
        return f"{self.student.username} - {self.practice.title} ({self.status})"

    @property
    def accuracy_percentage(self):
        """Calculate accuracy percentage"""
        if self.total_questions == 0:
            return 0
        return round((self.correct_answers / self.total_questions) * 100, 1)

    def complete(self, score=None, correct_answers=0, total_questions=0):
        """Mark the attempt as completed"""
        self.status = "COMPLETED"
        self.completed_at = timezone.now()
        if score is not None:
            self.score = score
        self.correct_answers = correct_answers
        self.total_questions = total_questions

        # Calculate time spent
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.time_spent_seconds = int(delta.total_seconds())

        self.save()

        # Trigger analytics cache refresh (non-blocking)
        try:
            from ielts.tasks import refresh_user_analytics_after_completion

            refresh_user_analytics_after_completion.delay(self.student_id, "practice")
        except Exception:
            pass  # Don't fail completion if analytics refresh fails


class SpeakingPracticeRecording(models.Model):
    """
    Stores audio recordings for speaking practice attempts.
    Each recording corresponds to a specific question/part in the speaking test.
    """

    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
    )

    attempt = models.ForeignKey(
        SectionPracticeAttempt,
        on_delete=models.CASCADE,
        related_name="recordings",
        verbose_name="Practice Attempt",
    )

    # Question identifier (e.g., "part1_q1", "part2", "part3_q1")
    question_key = models.CharField(
        max_length=50,
        verbose_name="Question Key",
        help_text="Identifier for the question (e.g., part1_q1, part2, part3_q1)",
    )

    # Audio file
    audio_file = models.FileField(
        upload_to="speaking_practice_recordings/%Y/%m/%d/",
        verbose_name="Audio Recording",
    )

    # Duration in seconds
    duration_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name="Duration (seconds)",
    )

    # Transcription (if available)
    transcription = models.TextField(
        null=True,
        blank=True,
        verbose_name="Transcription",
    )

    # Individual question evaluation
    ai_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="AI Score",
    )
    ai_feedback = models.TextField(
        null=True,
        blank=True,
        verbose_name="AI Feedback",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        db_table = "speaking_practice_recordings"
        verbose_name = "Speaking Practice Recording"
        verbose_name_plural = "Speaking Practice Recordings"
        ordering = ["attempt", "question_key"]
        unique_together = [["attempt", "question_key"]]
        indexes = [
            models.Index(fields=["attempt", "question_key"]),
        ]

    def __str__(self):
        return f"{self.attempt.student.username} - {self.question_key}"
