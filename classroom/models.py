"""
BandBooster Classroom Command: Classroom Management Models

This module implements the "Assign, Analyze, Automate" classroom feature
allowing teachers to manage classrooms, create assignment bundles, and
track student progress with AI-assisted grading.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from accounts.models import User
from teacher.models import TeacherExam
from ielts.models import (
    MockExam,
    WritingTask,
    SpeakingTopic,
    ReadingPassage,
    ListeningPart,
)
import uuid
import secrets
import string


def generate_invite_code():
    """Generate a short, readable invite code (8 characters)"""
    alphabet = string.ascii_uppercase + string.digits
    # Remove confusing characters (0, O, I, 1, L)
    alphabet = (
        alphabet.replace("0", "")
        .replace("O", "")
        .replace("I", "")
        .replace("1", "")
        .replace("L", "")
    )
    return "".join(secrets.choice(alphabet) for _ in range(8))


class Classroom(models.Model):
    """
    Represents a teacher's classroom where students can be enrolled.
    Teachers can have multiple classrooms (e.g., for different groups/levels).
    """

    STATUS_CHOICES = (
        ("ACTIVE", "Active"),
        ("ARCHIVED", "Archived"),
        ("SUSPENDED", "Suspended"),
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
        related_name="classrooms",
        limit_choices_to={"role": "TEACHER"},
        verbose_name="Teacher",
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Classroom Name",
        help_text="e.g., 'IELTS Band 7 Group A', 'Evening Class 2024'",
    )
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name="Description",
        help_text="Additional details about the classroom",
    )

    # Target level for the class
    target_band = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Target Band Score",
        help_text="The target IELTS band score for this class",
    )

    # Magic Link / Invite System
    invite_code = models.CharField(
        max_length=20,
        unique=True,
        default=generate_invite_code,
        db_index=True,
        verbose_name="Invite Code",
        help_text="Code for students to join this classroom",
    )
    invite_enabled = models.BooleanField(
        default=True,
        verbose_name="Invite Enabled",
        help_text="Allow new students to join via invite link",
    )
    max_students = models.PositiveIntegerField(
        default=50,
        validators=[MinValueValidator(1), MaxValueValidator(500)],
        verbose_name="Maximum Students",
        help_text="Maximum number of students allowed in this classroom",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE",
        verbose_name="Status",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "classrooms"
        verbose_name = "Classroom"
        verbose_name_plural = "Classrooms"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["teacher", "status"]),
            models.Index(fields=["invite_code"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.teacher.get_full_name()})"

    @property
    def student_count(self):
        """Get the current number of enrolled students"""
        return self.enrollments.filter(status="ACTIVE").count()

    @property
    def is_full(self):
        """Check if classroom has reached maximum capacity"""
        return self.student_count >= self.max_students

    @property
    def magic_link(self):
        """Generate the magic invite link"""
        # This will be populated with the actual domain in the view
        return f"/join/{self.invite_code}"

    def can_accept_student(self):
        """Check if classroom can accept new students"""
        if self.status != "ACTIVE":
            return False, "Classroom is not active"
        if not self.invite_enabled:
            return False, "Invitations are disabled"
        if self.is_full:
            return False, "Classroom is full"
        return True, "OK"

    def regenerate_invite_code(self):
        """Generate a new invite code"""
        self.invite_code = generate_invite_code()
        self.save(update_fields=["invite_code", "updated_at"])
        return self.invite_code


class Enrollment(models.Model):
    """
    Represents a student's enrollment in a classroom.
    Tracks the relationship between students and classrooms.
    """

    STATUS_CHOICES = (
        ("PENDING", "Pending Approval"),
        ("ACTIVE", "Active"),
        ("SUSPENDED", "Suspended"),
        ("LEFT", "Left"),
        ("REMOVED", "Removed by Teacher"),
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
    classroom = models.ForeignKey(
        Classroom,
        on_delete=models.CASCADE,
        related_name="enrollments",
        verbose_name="Classroom",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="classroom_enrollments",
        limit_choices_to={"role": "STUDENT"},
        verbose_name="Student",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE",
        verbose_name="Status",
    )

    # Performance tracking
    current_band = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Current Estimated Band",
        help_text="Current estimated band score based on performance",
    )

    # Detailed section scores
    listening_band = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Listening Band",
    )
    reading_band = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Reading Band",
    )
    writing_band = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Writing Band",
    )
    speaking_band = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Speaking Band",
    )

    # Teacher's notes on the student
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="Teacher Notes",
        help_text="Private notes about this student",
    )

    # Activity tracking
    last_active = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Last Active",
        help_text="When the student was last active in this classroom",
    )

    # Timestamps
    enrolled_at = models.DateTimeField(auto_now_add=True, verbose_name="Enrolled At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "classroom_enrollments"
        verbose_name = "Enrollment"
        verbose_name_plural = "Enrollments"
        unique_together = ("classroom", "student")
        ordering = ["-enrolled_at"]
        indexes = [
            models.Index(fields=["classroom", "status"]),
            models.Index(fields=["student", "status"]),
        ]

    def __str__(self):
        return f"{self.student.get_full_name()} in {self.classroom.name}"

    def update_activity(self):
        """Update the last_active timestamp"""
        self.last_active = timezone.now()
        self.save(update_fields=["last_active", "updated_at"])


class AssignmentBundle(models.Model):
    """
    A collection of content items assigned to students.
    Think of it as a "playlist" or "homework packet" containing multiple
    exercises from different sections.
    """

    STATUS_CHOICES = (
        ("DRAFT", "Draft"),
        ("PUBLISHED", "Published"),
        ("CLOSED", "Closed"),
        ("ARCHIVED", "Archived"),
    )

    ASSIGNMENT_TYPE_CHOICES = (
        ("HOMEWORK", "Homework"),
        ("QUIZ", "Quiz"),
        ("PRACTICE", "Practice"),
        ("EXAM", "Exam"),
        ("REMEDIAL", "Remedial Practice"),
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
    classroom = models.ForeignKey(
        Classroom,
        on_delete=models.CASCADE,
        related_name="assignment_bundles",
        verbose_name="Classroom",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_bundles",
        verbose_name="Created By",
    )

    # Basic Info
    title = models.CharField(
        max_length=255,
        verbose_name="Title",
        help_text="e.g., 'Week 1 Homework', 'Reading Practice Set 3'",
    )
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name="Description",
        help_text="Instructions or description for students",
    )
    assignment_type = models.CharField(
        max_length=20,
        choices=ASSIGNMENT_TYPE_CHOICES,
        default="HOMEWORK",
        verbose_name="Type",
    )

    # Custom instructions for AI grading
    teacher_instructions = models.TextField(
        null=True,
        blank=True,
        verbose_name="Teacher Instructions for AI",
        help_text="Special instructions to pass to the AI grader (e.g., 'Focus on passive voice', 'Check for academic vocabulary')",
    )

    # Scheduling
    available_from = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Available From",
        help_text="When students can start working on this assignment",
    )
    due_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Due Date",
        help_text="When the assignment is due",
    )
    allow_late_submission = models.BooleanField(
        default=True,
        verbose_name="Allow Late Submission",
    )

    # Duration (optional, for timed assignments)
    time_limit_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name="Time Limit (minutes)",
        help_text="Optional time limit for completing the bundle",
    )

    # Differentiation (future scope - for targeting specific students)
    target_min_band = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Target Minimum Band",
        help_text="Only assign to students with band >= this value",
    )
    target_max_band = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Target Maximum Band",
        help_text="Only assign to students with band <= this value",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="DRAFT",
        verbose_name="Status",
    )

    # Grading settings
    require_teacher_approval = models.BooleanField(
        default=True,
        verbose_name="Require Teacher Approval",
        help_text="If true, AI grades go to 'pending_review' status; if false, auto-released to students",
    )

    # Auto-release settings
    auto_release_results = models.BooleanField(
        default=False,
        verbose_name="Auto-Release Results",
        help_text="Automatically release results to students after AI grading",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")
    published_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Published At"
    )

    class Meta:
        db_table = "assignment_bundles"
        verbose_name = "Assignment Bundle"
        verbose_name_plural = "Assignment Bundles"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["classroom", "status"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.classroom.name})"

    @property
    def is_available(self):
        """Check if the assignment is currently available"""
        if self.status != "PUBLISHED":
            return False
        now = timezone.now()
        if self.available_from and now < self.available_from:
            return False
        return True

    @property
    def is_overdue(self):
        """Check if the assignment is past due date"""
        if not self.due_date:
            return False
        return timezone.now() > self.due_date

    @property
    def total_items(self):
        """Get total number of items in this bundle"""
        return self.items.count()

    def publish(self):
        """Publish the assignment and create student assignments"""
        if self.status == "PUBLISHED":
            return

        self.status = "PUBLISHED"
        self.published_at = timezone.now()
        self.save(update_fields=["status", "published_at", "updated_at"])

        # Create StudentAssignment for each eligible student
        self._create_student_assignments()

    def _create_student_assignments(self):
        """Create StudentAssignment entries for eligible students"""
        enrollments = self.classroom.enrollments.filter(status="ACTIVE")

        for enrollment in enrollments:
            # Check differentiation criteria
            if self.target_min_band and enrollment.current_band:
                if enrollment.current_band < self.target_min_band:
                    continue
            if self.target_max_band and enrollment.current_band:
                if enrollment.current_band > self.target_max_band:
                    continue

            # Create the assignment if not exists
            StudentAssignment.objects.get_or_create(
                bundle=self,
                student=enrollment.student,
                defaults={"status": "NOT_STARTED"},
            )


class BundleItem(models.Model):
    """
    Individual item within an AssignmentBundle.
    Can be a mock exam, writing task, speaking topic, reading passage, etc.
    """

    ITEM_TYPE_CHOICES = (
        ("MOCK_EXAM", "Full Mock Exam"),
        ("TEACHER_EXAM", "Teacher Exam"),
        ("WRITING_TASK", "Writing Task"),
        ("SPEAKING_TOPIC", "Speaking Topic"),
        ("READING_PASSAGE", "Reading Passage"),
        ("LISTENING_PART", "Listening Part"),
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
    bundle = models.ForeignKey(
        AssignmentBundle,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Bundle",
    )

    # Item type and reference
    item_type = models.CharField(
        max_length=20,
        choices=ITEM_TYPE_CHOICES,
        verbose_name="Item Type",
    )

    # References to different content types (only one will be set)
    mock_exam = models.ForeignKey(
        MockExam,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bundle_items",
        verbose_name="Mock Exam",
    )
    teacher_exam = models.ForeignKey(
        TeacherExam,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bundle_items",
        verbose_name="Teacher Exam",
    )
    writing_task = models.ForeignKey(
        WritingTask,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bundle_items",
        verbose_name="Writing Task",
    )
    speaking_topic = models.ForeignKey(
        SpeakingTopic,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bundle_items",
        verbose_name="Speaking Topic",
    )
    reading_passage = models.ForeignKey(
        ReadingPassage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bundle_items",
        verbose_name="Reading Passage",
    )
    listening_part = models.ForeignKey(
        ListeningPart,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bundle_items",
        verbose_name="Listening Part",
    )

    # Custom instructions for this specific item
    item_instructions = models.TextField(
        null=True,
        blank=True,
        verbose_name="Item-Specific Instructions",
        help_text="Additional instructions specific to this item",
    )

    # Ordering
    order = models.PositiveIntegerField(
        default=0,
        verbose_name="Order",
        help_text="Display order within the bundle",
    )

    # Points/Weight (for grading)
    points = models.PositiveIntegerField(
        default=100,
        verbose_name="Points",
        help_text="Points this item is worth",
    )

    # Required vs Optional
    is_required = models.BooleanField(
        default=True,
        verbose_name="Required",
        help_text="Whether this item is required for completion",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "bundle_items"
        verbose_name = "Bundle Item"
        verbose_name_plural = "Bundle Items"
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(fields=["bundle", "item_type"]),
        ]

    def __str__(self):
        return f"{self.get_item_type_display()} in {self.bundle.title}"

    def get_content_object(self):
        """Return the actual content object based on item_type"""
        content_map = {
            "MOCK_EXAM": self.mock_exam,
            "TEACHER_EXAM": self.teacher_exam,
            "WRITING_TASK": self.writing_task,
            "SPEAKING_TOPIC": self.speaking_topic,
            "READING_PASSAGE": self.reading_passage,
            "LISTENING_PART": self.listening_part,
        }
        return content_map.get(self.item_type)

    def get_content_title(self):
        """Get the title of the content object"""
        content = self.get_content_object()
        if content:
            return getattr(content, "title", str(content))
        return "Unknown Item"


class StudentAssignment(models.Model):
    """
    Tracks a student's progress and submission for an assignment bundle.
    This is the main tracking entity for student work.
    """

    STATUS_CHOICES = (
        ("NOT_STARTED", "Not Started"),
        ("IN_PROGRESS", "In Progress"),
        ("SUBMITTED", "Submitted"),
        ("AI_PROCESSED", "AI Processed"),
        ("PENDING_REVIEW", "Pending Teacher Review"),
        ("TEACHER_REVIEWED", "Teacher Reviewed"),
        ("RETURNED", "Returned to Student"),
        ("COMPLETED", "Completed"),
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
    bundle = models.ForeignKey(
        AssignmentBundle,
        on_delete=models.CASCADE,
        related_name="student_assignments",
        verbose_name="Assignment Bundle",
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="student_assignments",
        limit_choices_to={"role": "STUDENT"},
        verbose_name="Student",
    )

    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NOT_STARTED",
        verbose_name="Status",
    )

    # Timing
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Started At",
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Submitted At",
    )
    ai_processed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="AI Processed At",
    )
    teacher_reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Teacher Reviewed At",
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Completed At",
    )

    # Scores (calculated after completion)
    overall_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Overall Score",
        help_text="Overall percentage or band score",
    )
    band_score = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Band Score",
    )

    # AI-generated feedback (before teacher review)
    ai_feedback = models.JSONField(
        null=True,
        blank=True,
        verbose_name="AI Feedback",
        help_text="Feedback generated by AI grading system",
    )
    ai_tentative_score = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="AI Tentative Score",
    )

    # Teacher feedback (after review)
    teacher_feedback = models.TextField(
        null=True,
        blank=True,
        verbose_name="Teacher Feedback",
    )
    teacher_reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_assignments",
        verbose_name="Reviewed By",
    )

    # Track if teacher overrode AI score
    score_overridden = models.BooleanField(
        default=False,
        verbose_name="Score Overridden",
        help_text="Whether the teacher overrode the AI's tentative score",
    )

    # Detailed item-level scores and progress
    item_progress = models.JSONField(
        default=dict,
        verbose_name="Item Progress",
        help_text="Progress tracking for each item in the bundle",
    )

    # Late submission flag
    is_late = models.BooleanField(
        default=False,
        verbose_name="Late Submission",
    )

    # Visibility to student
    results_visible = models.BooleanField(
        default=False,
        verbose_name="Results Visible",
        help_text="Whether the student can see their results",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "student_assignments"
        verbose_name = "Student Assignment"
        verbose_name_plural = "Student Assignments"
        unique_together = ("bundle", "student")
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["bundle", "status"]),
            models.Index(fields=["student", "status"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.student.get_full_name()} - {self.bundle.title}"

    def start(self):
        """Mark assignment as started"""
        if self.status == "NOT_STARTED":
            self.status = "IN_PROGRESS"
            self.started_at = timezone.now()
            self.save(update_fields=["status", "started_at", "updated_at"])

    def submit(self):
        """Submit the assignment for grading"""
        if self.status in ["IN_PROGRESS", "NOT_STARTED"]:
            self.status = "SUBMITTED"
            self.submitted_at = timezone.now()

            # Check if late
            if self.bundle.due_date and self.submitted_at > self.bundle.due_date:
                self.is_late = True

            self.save(update_fields=["status", "submitted_at", "is_late", "updated_at"])

    def mark_ai_processed(self, ai_feedback, tentative_score):
        """Mark as AI processed with feedback"""
        self.status = (
            "AI_PROCESSED"
            if not self.bundle.require_teacher_approval
            else "PENDING_REVIEW"
        )
        self.ai_feedback = ai_feedback
        self.ai_tentative_score = tentative_score
        self.ai_processed_at = timezone.now()

        # If auto-release is enabled and no teacher approval required
        if (
            self.bundle.auto_release_results
            and not self.bundle.require_teacher_approval
        ):
            self.band_score = tentative_score
            self.results_visible = True
            self.status = "COMPLETED"
            self.completed_at = timezone.now()

        self.save()

    def approve_ai_grade(self, teacher):
        """Teacher approves the AI grade without changes"""
        self.status = "TEACHER_REVIEWED"
        self.teacher_reviewed_at = timezone.now()
        self.teacher_reviewed_by = teacher
        self.band_score = self.ai_tentative_score
        self.results_visible = True
        self.completed_at = timezone.now()
        self.status = "COMPLETED"
        self.save()

    def override_grade(self, teacher, new_score, feedback=None):
        """Teacher overrides the AI grade"""
        self.status = "TEACHER_REVIEWED"
        self.teacher_reviewed_at = timezone.now()
        self.teacher_reviewed_by = teacher
        self.band_score = new_score
        self.score_overridden = True
        if feedback:
            self.teacher_feedback = feedback
        self.results_visible = True
        self.completed_at = timezone.now()
        self.status = "COMPLETED"
        self.save()

    def return_to_student(self, teacher, feedback):
        """Return assignment to student for revision"""
        self.status = "RETURNED"
        self.teacher_reviewed_at = timezone.now()
        self.teacher_reviewed_by = teacher
        self.teacher_feedback = feedback
        self.save()

    @property
    def progress_percentage(self):
        """Calculate completion percentage based on item progress"""
        if not self.item_progress:
            return 0

        total_items = self.bundle.items.filter(is_required=True).count()
        if total_items == 0:
            return 100

        completed_items = sum(
            1
            for item_id, progress in self.item_progress.items()
            if progress.get("completed", False)
        )
        return round((completed_items / total_items) * 100, 1)


class StudentItemSubmission(models.Model):
    """
    Individual submission for a single item within an assignment.
    Stores the student's work for each bundle item.
    """

    STATUS_CHOICES = (
        ("NOT_STARTED", "Not Started"),
        ("IN_PROGRESS", "In Progress"),
        ("SUBMITTED", "Submitted"),
        ("AI_GRADED", "AI Graded"),
        ("TEACHER_REVIEWED", "Teacher Reviewed"),
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
    student_assignment = models.ForeignKey(
        StudentAssignment,
        on_delete=models.CASCADE,
        related_name="item_submissions",
        verbose_name="Student Assignment",
    )
    bundle_item = models.ForeignKey(
        BundleItem,
        on_delete=models.CASCADE,
        related_name="submissions",
        verbose_name="Bundle Item",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NOT_STARTED",
        verbose_name="Status",
    )

    # Content (depends on item type)
    # For Writing
    writing_answer = models.TextField(
        null=True,
        blank=True,
        verbose_name="Writing Answer",
    )
    word_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Word Count",
    )

    # For Speaking (audio file reference)
    speaking_audio = models.FileField(
        upload_to="classroom/speaking_submissions/%Y/%m/",
        null=True,
        blank=True,
        verbose_name="Speaking Audio",
    )
    speaking_transcript = models.TextField(
        null=True,
        blank=True,
        verbose_name="Speaking Transcript",
    )

    # For Reading/Listening (JSON of answers)
    answers_json = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Answers",
        help_text="JSON containing question IDs and user answers",
    )

    # Scoring
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Score",
    )
    max_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Maximum Score",
    )
    band_score = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Band Score",
    )

    # AI Feedback
    ai_feedback = models.JSONField(
        null=True,
        blank=True,
        verbose_name="AI Feedback",
    )
    ai_inline_corrections = models.TextField(
        null=True,
        blank=True,
        verbose_name="AI Inline Corrections",
        help_text="Text with inline error tags from AI",
    )

    # Teacher Feedback
    teacher_feedback = models.TextField(
        null=True,
        blank=True,
        verbose_name="Teacher Feedback",
    )
    teacher_score_override = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        verbose_name="Teacher Score Override",
    )

    # Time tracking
    time_spent_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name="Time Spent (seconds)",
    )

    # Timestamps
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "student_item_submissions"
        verbose_name = "Student Item Submission"
        verbose_name_plural = "Student Item Submissions"
        unique_together = ("student_assignment", "bundle_item")
        ordering = ["bundle_item__order"]
        indexes = [
            models.Index(fields=["student_assignment", "status"]),
        ]

    def __str__(self):
        return f"{self.student_assignment.student.get_full_name()} - {self.bundle_item}"

    def get_final_score(self):
        """Get the final score (teacher override or AI score)"""
        if self.teacher_score_override is not None:
            return self.teacher_score_override
        return self.band_score
