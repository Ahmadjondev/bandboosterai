from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from accounts.models import User
import random
import string
import uuid


class MockExam(models.Model):
    """
    Represents an IELTS Mock Exam
    """

    EXAM_TYPE_CHOICES = (
        ("LISTENING", "Listening"),
        ("READING", "Reading"),
        ("WRITING", "Writing"),
        ("SPEAKING", "Speaking"),
        ("LISTENING_READING", "Listening + Reading"),
        ("LISTENING_READING_WRITING", "Listening + Reading + Writing"),
        ("FULL_TEST", "Full Test"),
    )

    # IELTS Standard Section Durations (in minutes)
    SECTION_DURATIONS = {
        "LISTENING": 30,  # 30 minutes (including 10 minutes transfer time)
        "READING": 60,  # 60 minutes
        "WRITING": 60,  # 60 minutes (Task 1: 20 min, Task 2: 40 min)
        "SPEAKING": 14,  # 11-14 minutes
    }

    # Total durations for combined exam types
    EXAM_DURATIONS = {
        "LISTENING": 30,
        "READING": 60,
        "WRITING": 60,
        "SPEAKING": 14,
        "LISTENING_READING": 90,  # 30 + 60
        "LISTENING_READING_WRITING": 150,  # 30 + 60 + 60
        "FULL_TEST": 164,  # 30 + 60 + 60 + 14
    }

    # Unique identifier for secure URL access
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
        help_text="Unique identifier for secure access",
    )

    # Creator/Owner
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_mock_exams",
        verbose_name="Created By",
        help_text="Teacher or Manager who created this mock exam",
    )

    title = models.CharField(max_length=255, verbose_name="Exam Title")
    exam_type = models.CharField(
        max_length=30, choices=EXAM_TYPE_CHOICES, verbose_name="Exam Type"
    )
    description = models.TextField(null=True, blank=True, verbose_name="Description")

    # Duration (optional - uses IELTS defaults if not set)
    duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name="Duration (minutes)",
        help_text="Leave empty to use IELTS standard duration",
    )

    # Reading, Listening, Writing, Speaking
    reading_passages = models.ManyToManyField(
        "ReadingPassage", related_name="mock_tests", blank=True
    )
    listening_parts = models.ManyToManyField("ListeningPart", related_name="mock_tests")
    writing_tasks = models.ManyToManyField("WritingTask", related_name="mock_tests")
    speaking_topics = models.ManyToManyField("SpeakingTopic", related_name="mock_tests")

    # Difficulty and categorization
    difficulty_level = models.CharField(
        max_length=20,
        choices=(
            ("BEGINNER", "Beginner (Band 3-4)"),
            ("INTERMEDIATE", "Intermediate (Band 5-6)"),
            ("ADVANCED", "Advanced (Band 7-8)"),
            ("EXPERT", "Expert (Band 8.5-9)"),
        ),
        default="INTERMEDIATE",
        verbose_name="Difficulty Level",
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Active")
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "exams"
        verbose_name = "Mock Exam"
        verbose_name_plural = "Mock Exams"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["exam_type"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_exam_type_display()})"

    def get_default_duration(self):
        """Get the standard IELTS duration for this exam type"""
        return self.EXAM_DURATIONS.get(self.exam_type, 60)

    def get_section_duration(self, section_type):
        """Get the duration for a specific section (LISTENING, READING, WRITING, SPEAKING)"""
        return self.SECTION_DURATIONS.get(section_type.upper(), 60)

    def get_total_questions(self):
        """Get total number of questions in this exam"""
        if self.exam_type == "LISTENING":
            return (
                self.listening_parts.aggregate(
                    total=models.Count("test_heads__questions")
                )["total"]
                or 0
            )
        elif self.exam_type == "READING":
            return (
                self.reading_passages.aggregate(
                    total=models.Count("test_heads__questions")
                )["total"]
                or 0
            )
        return 0


class ReadingPassage(models.Model):
    passage_number = models.PositiveSmallIntegerField(
        choices=[(1, "Passage 1"), (2, "Passage 2"), (3, "Passage 3")],
        validators=[MinValueValidator(1), MaxValueValidator(3)],
    )
    is_authentic = models.BooleanField(default=False)
    is_practice = models.BooleanField(default=False)
    title = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Optional title for the reading passage.",
    )
    summary = models.TextField(
        null=True,
        blank=True,
        help_text="A brief summary or introduction to the passage.",
    )
    content = models.TextField(help_text="The full text of the reading passage.")
    difficulty = models.CharField(
        max_length=20,
        choices=(
            ("BEGINNER", "Beginner (Band 3-4)"),
            ("INTERMEDIATE", "Intermediate (Band 5-6)"),
            ("ADVANCED", "Advanced (Band 7-8)"),
            ("EXPERT", "Expert (Band 8.5-9)"),
        ),
        default="INTERMEDIATE",
        verbose_name="Difficulty Level",
    )
    # Word count for reference
    word_count = models.PositiveIntegerField(
        null=True, blank=True, help_text="Approximate word count of the passage"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["passage_number"]

    def __str__(self):
        base = f"Passage {self.passage_number}"
        if self.title:
            base += f": {self.title}"
        return base

    def save(self, *args, **kwargs):
        # Auto-calculate word count
        if self.content and not self.word_count:
            self.word_count = len(self.content.split())
        super().save(*args, **kwargs)


class ListeningPart(models.Model):

    part_number = models.PositiveSmallIntegerField(
        choices=[(1, "Part 1"), (2, "Part 2"), (3, "Part 3"), (4, "Part 4")],
        validators=[MinValueValidator(1), MaxValueValidator(4)],
    )
    is_authentic = models.BooleanField(default=False)
    is_practice = models.BooleanField(default=False)
    title = models.CharField(max_length=150, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    audio_file = models.FileField(
        upload_to="ielts/listening_audio/",
        null=True,
        blank=True,
        help_text="Upload the audio file for this listening part",
    )
    difficulty = models.CharField(
        max_length=20,
        choices=(
            ("BEGINNER", "Beginner (Band 3-4)"),
            ("INTERMEDIATE", "Intermediate (Band 5-6)"),
            ("ADVANCED", "Advanced (Band 7-8)"),
            ("EXPERT", "Expert (Band 8.5-9)"),
        ),
        default="INTERMEDIATE",
        verbose_name="Difficulty Level",
    )
    # Duration in seconds
    duration_seconds = models.PositiveIntegerField(
        null=True, blank=True, help_text="Duration of the audio in seconds"
    )

    # Transcript for reference
    transcript = models.TextField(
        null=True, blank=True, help_text="Full transcript of the audio"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["part_number"]

    def __str__(self):
        base = f"Listening Part {self.part_number}"
        if self.title:
            base += f": {self.title}"
        return base


class TestHead(models.Model):
    # All IELTS Reading and Listening questions are of a specific type.
    class QuestionType(models.TextChoices):
        # Common Types
        MULTIPLE_CHOICE = "MCQ", "Multiple Choice"
        MULTIPLE_CHOICE_MULTIPLE_ANSWERS = "MCMA", "Multiple Choice (Multiple Answers)"
        SHORT_ANSWER = "SA", "Short Answer Questions"
        # Completions
        SENTENCE_COMPLETION = "SC", "Sentence Completion"
        SUMMARY_COMPLETION = "SUC", "Summary Completion"
        NOTE_COMPLETION = "NC", "Note Completion"
        # FORM_COMPLETION = "FC", "Form Completion"
        FLOW_CHART_COMPLETION = "FCC", "Flow Chart Completion"
        TABLE_COMPLETION = "TC", "Table Completion"
        # Reading Specific
        TRUE_FALSE_NOT_GIVEN = "TFNG", "True/False/Not Given"
        YES_NO_NOT_GIVEN = "YNNG", "Yes/No/Not Given"
        # Matching
        MATCHING_HEADINGS = "MH", "Matching Headings"
        MATCHING_INFORMATION = "MI", "Matching Information"
        MATCHING_FEATURES = "MF", "Matching Features"

        # Listening Specific
        FORM_COMPLETION = "FC", "Form Completion"
        MAP_LABELLING = "ML", "Map Labelling"
        DIAGRAM_LABELLING = "DL", "Diagram Labelling"

    listening = models.ForeignKey(
        ListeningPart,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_heads",
        verbose_name="Listening",
    )
    reading = models.ForeignKey(
        ReadingPassage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_heads",
        verbose_name="Reading",
    )
    title = models.CharField(
        max_length=150,
        verbose_name="Sarlavha",
        null=True,
        blank=True,
        default="",
    )

    description = models.TextField(verbose_name="Description", null=True, blank=True)
    question_type = models.CharField(
        max_length=10,
        choices=QuestionType.choices,
        null=True,
        blank=True,
        verbose_name="Savol turi",
        help_text="The type of question this test head represents.",
    )
    question_data = models.JSONField(null=True, blank=True)
    # Example question/answer for this question group (common in IELTS materials)
    # Structure: {"question": "Example question text", "answer": "Example answer", "explanation": "Optional explanation"}
    example = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Example",
        help_text="Example question and answer to show users before the actual questions.",
    )
    picture = models.ImageField(
        upload_to="tests/pictures/", null=True, blank=True, verbose_name="Rasm"
    )

    def __str__(self):
        if self.title:
            return f"{self.title}"
        elif self.description:
            return f"{self.description}"
        else:
            return str(self.id)


class Question(models.Model):
    test_head = models.ForeignKey(
        TestHead,
        on_delete=models.CASCADE,
        related_name="questions",
        null=True,
        blank=True,
    )
    question_text = models.TextField(null=True, blank=True)
    order = models.PositiveSmallIntegerField(
        help_text="The order in which the question appears for this passage.",
        validators=[MinValueValidator(1)],
    )
    correct_answer_text = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="The correct answer for T/F/NG or Short Answer questions.",
    )
    # For Multiple Choice (Multiple Answers)
    answer_two_text = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Second correct answer for MCMA questions",
    )

    # Additional answer options for MCMA
    answer_three_text = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Third correct answer for MCMA questions",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            "order",
        ]
        unique_together = [["test_head", "order"]]

    def get_correct_answer(self):
        """
        Gets the correct answer for the question.
        For MCQ/MCMA, it constructs the answer from correct choices.
        Otherwise, it returns the pre-defined text answer.
        """
        test_head = self.test_head
        if test_head and test_head.question_type in [
            TestHead.QuestionType.MULTIPLE_CHOICE,
            TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS,
        ]:
            # Ensure choices are ordered to get consistent keys (A, B, C...)
            correct_choices = self.choices.filter(is_correct=True).order_by("id")
            all_choices = list(self.choices.all().order_by("id"))

            correct_keys = []
            for choice in correct_choices:
                try:
                    index = all_choices.index(choice)
                    correct_keys.append(chr(65 + index))
                except ValueError:
                    # This case should ideally not happen if choice belongs to the question
                    continue

            return "".join(sorted(correct_keys))

        return self.correct_answer_text

    def get_question_weight(self):
        """
        Returns the weight of this question toward the 40-question total.
        For MCMA questions, each correct answer counts as 1 question.
        For all other question types, returns 1.
        """
        if (
            self.test_head
            and self.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            # Count the number of correct answers
            correct_count = self.choices.filter(is_correct=True).count()
            return max(1, correct_count)  # At least 1 even if no choices marked
        return 1

    def __str__(self):
        return f"Q{self.order}: for {self.test_head}"


class Choice(models.Model):
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="choices"
    )
    choice_text = models.CharField(max_length=255)
    is_correct = models.BooleanField(
        default=False,
        help_text="Mark this if it is the correct answer for the multiple-choice question.",
    )

    def __str__(self):
        return f"Choice for Q{self.question.order}: {self.choice_text}"


class WritingTask(models.Model):

    class TaskType(models.TextChoices):
        TASK_1 = "TASK_1", "Task 1"
        TASK_2 = "TASK_2", "Task 2"

    class ChartType(models.TextChoices):
        """Chart types for IELTS Writing Task 1 Academic"""

        LINE_GRAPH = "LINE_GRAPH", "Line Graph"
        BAR_CHART = "BAR_CHART", "Bar Chart"
        PIE_CHART = "PIE_CHART", "Pie Chart"
        TABLE = "TABLE", "Table"
        MAP = "MAP", "Map"
        PROCESS = "PROCESS", "Process Diagram"
        FLOW_CHART = "FLOW_CHART", "Flow Chart"
        MIXED = "MIXED", "Mixed/Multiple Charts"
        OTHER = "OTHER", "Other"

    is_authentic = models.BooleanField(default=False)
    is_practice = models.BooleanField(default=False)
    task_type = models.CharField(max_length=10, choices=TaskType.choices)

    # Chart type for Task 1 (Academic) - helps with filtering and categorization
    chart_type = models.CharField(
        max_length=20,
        choices=ChartType.choices,
        null=True,
        blank=True,
        verbose_name="Chart Type",
        help_text="Type of visual for Task 1 (Academic). Leave empty for Task 2.",
        db_index=True,
    )

    prompt = models.TextField(help_text="The full text of the task prompt.")
    picture = models.ImageField(
        upload_to="writing_tasks/pictures/",
        null=True,
        blank=True,
        verbose_name="Task Picture",
    )
    data = models.JSONField(
        null=True, blank=True, help_text="For Task 1, stores graph/chart data."
    )

    # Word count requirements
    min_words = models.PositiveIntegerField(
        default=150, help_text="Minimum word count (150 for Task 1, 250 for Task 2)"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["task_type"]

    def __str__(self):
        return f"Writing {self.get_task_type_display()}"

    def save(self, *args, **kwargs):
        # Set default word counts based on task type
        if self.task_type == self.TaskType.TASK_1:
            if not self.min_words or self.min_words == 150:
                self.min_words = 150

        elif self.task_type == self.TaskType.TASK_2:
            if not self.min_words or self.min_words == 150:
                self.min_words = 250
        super().save(*args, **kwargs)


class SpeakingTopic(models.Model):
    """
    Speaking Topic model - represents a topic for IELTS speaking test.
    Questions are stored separately in SpeakingQuestion model.
    """

    class PartType(models.TextChoices):
        PART_1 = "PART_1", "Part 1: Introduction & Interview"
        PART_2 = "PART_2", "Part 2: Individual Long Turn"
        PART_3 = "PART_3", "Part 3: Two-way Discussion"

    is_authentic = models.BooleanField(default=False)
    is_practice = models.BooleanField(default=False)
    topic = models.CharField(max_length=255)
    speaking_type = models.CharField(
        max_length=10,
        choices=PartType.choices,
        default=PartType.PART_1,
        verbose_name="Speaking Part",
        help_text="The part of speaking test",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["speaking_type", "id"]

    def __str__(self):
        return f"{self.get_speaking_type_display()}: {self.topic}"

    @property
    def question_count(self):
        """Return the number of questions for this topic"""
        return self.questions.count()

    @property
    def has_audio(self):
        """Check if any question has audio"""
        return (
            self.questions.filter(audio_url__isnull=False)
            .exclude(audio_url="")
            .exists()
        )


class SpeakingDefaultAudio(models.Model):
    """
    Default audio files that play before each speaking part.
    These are intro/instruction audios that the examiner reads before each part.
    """

    class AudioType(models.TextChoices):
        PART_1_INTRO = "PART_1_INTRO", "Part 1 Introduction"
        PART_2_INTRO = "PART_2_INTRO", "Part 2 Introduction (Before Cue Card)"
        PART_2_PREP = "PART_2_PREP", "Part 2 Preparation Time Announcement"
        PART_2_START = "PART_2_START", "Part 2 Start Speaking"
        PART_3_INTRO = "PART_3_INTRO", "Part 3 Introduction"
        TEST_END = "TEST_END", "Test Ending Message"

    audio_type = models.CharField(
        max_length=20,
        choices=AudioType.choices,
        unique=True,
        verbose_name="Audio Type",
    )
    audio_url = models.URLField(
        help_text="URL to the default audio file",
    )
    description = models.TextField(
        null=True,
        blank=True,
        help_text="Description of what this audio says",
    )
    # Store the script that was used to generate this audio
    script = models.TextField(
        null=True,
        blank=True,
        help_text="The text/script used to generate this audio",
    )
    voice = models.CharField(
        max_length=50,
        default="en-GB-SoniaNeural",
        help_text="Voice used for TTS generation",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Speaking Default Audio"
        verbose_name_plural = "Speaking Default Audios"
        ordering = ["audio_type"]

    def __str__(self):
        return self.get_audio_type_display()


class SpeakingQuestion(models.Model):
    """
    Individual questions for a speaking topic.
    For Part 2, the first question is the main cue card prompt, and cue_card_points stores the bullet points.
    """

    topic = models.ForeignKey(
        SpeakingTopic, related_name="questions", on_delete=models.CASCADE
    )
    question_text = models.TextField()

    # For Part 2: Cue card points (only for the main question)
    cue_card_points = models.JSONField(
        null=True,
        blank=True,
        help_text="JSON array of cue card points (for Part 2 main question only)",
    )

    # audio is generated with Microsoft TTS
    audio_url = models.URLField(null=True, blank=True)

    order = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["topic", "order"]

    def __str__(self):
        return f"Q{self.order} - {self.topic.topic}"

    @property
    def is_cue_card(self):
        """Check if this is a cue card question (Part 2 main question)"""
        return (
            self.topic.speaking_type == "PART_2"
            and self.order == 1
            and self.cue_card_points
        )


class ExamAttempt(models.Model):
    """
    Represents a student's attempt at an exam
    """

    STATUS_CHOICES = (
        ("NOT_STARTED", "Not Started"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("EVALUATED", "Evaluated"),
    )
    CURRENT_SECTION_CHOICES = (
        ("NOT_STARTED", "Not Started"),
        ("IN_PROGRESS", "In Progress"),
        ("COMPLETED", "Completed"),
        ("EVALUATED", "Evaluated"),
    )

    # Unique identifier for secure URL access
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
        help_text="Unique identifier for secure access",
    )

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="exam_attempts",
        limit_choices_to={"role": "STUDENT"},
        verbose_name="Student",
    )
    exam = models.ForeignKey(
        "Exam", on_delete=models.CASCADE, related_name="attempts", verbose_name="Exam"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NOT_STARTED",
        verbose_name="Status",
    )

    # Timing
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Started At")
    completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Completed At"
    )

    # Current progress
    current_section = models.CharField(
        max_length=20,
        choices=CURRENT_SECTION_CHOICES,
        default="NOT_STARTED",
        verbose_name="Current Section",
    )

    # Section Scores
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
    overall_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Overall Score",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "exam_attempts"
        verbose_name = "Exam Attempt"
        verbose_name_plural = "Exam Attempts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student"]),
            models.Index(fields=["exam", "status"]),
        ]

    def __str__(self):
        return f"{self.student.username} - {self.exam.name} - {self.status}"

    def start_exam(self):
        """Start the exam attempt"""
        if self.status == "NOT_STARTED":
            self.status = "IN_PROGRESS"
            self.started_at = timezone.now()
            first_section = (
                self.exam.sections.filter(is_active=True).order_by("order").first()
            )
            if first_section:
                self.current_section = first_section
            self.save()

    def complete_exam(self):
        """Complete the exam attempt"""
        if self.status == "IN_PROGRESS":
            self.status = "COMPLETED"
            self.completed_at = timezone.now()
            self.save()

    # def get_result(self):
    #     """Get the result for this attempt"""
    #     return ExamResult.objects.filter(attempt=self).first()

    def get_duration_minutes(self):
        """Calculate duration in minutes"""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return round(delta.total_seconds() / 60, 2)
        return None

    def is_overdue(self):
        """Check if exam attempt is overdue"""
        if self.status == "IN_PROGRESS" and self.started_at:
            # Get duration from mock test, fallback to default
            duration = self.exam.mock_test.get_default_duration()
            elapsed = timezone.now() - self.started_at
            return elapsed.total_seconds() / 60 > duration
        return False

    def get_progress_percentage(self):
        """Calculate progress percentage based on answered questions"""
        if self.exam.mock_test.exam_type in ["LISTENING", "READING"]:
            total_questions = self.exam.mock_test.get_total_questions()
            if total_questions > 0:
                answered = self.user_answers.count()
                return round((answered / total_questions) * 100, 2)
        return 0

    def calculate_overall_score(self):
        """Calculate overall score from individual section scores"""
        from decimal import Decimal

        scores = [
            self.listening_score,
            self.reading_score,
            self.writing_score,
            self.speaking_score,
        ]
        valid_scores = [s for s in scores if s is not None]
        if valid_scores:
            # Sum Decimal values directly
            total = sum(valid_scores)
            avg = total / len(valid_scores)
            # Round to nearest 0.5 (IELTS band score format)
            # Convert to float for rounding, then back to Decimal
            return Decimal(str(round(float(avg) * 2) / 2))
        return None


class WritingAttempt(models.Model):
    class EvaluationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    # Unique identifier for secure URL access
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
        help_text="Unique identifier for secure access",
    )

    exam_attempt = models.ForeignKey(
        ExamAttempt, on_delete=models.CASCADE, related_name="writing_attempts"
    )
    task = models.ForeignKey(WritingTask, on_delete=models.CASCADE)
    answer_text = models.TextField()

    # Word count
    word_count = models.PositiveIntegerField(
        null=True, blank=True, help_text="Actual word count of the answer"
    )

    evaluation_status = models.CharField(
        max_length=20,
        choices=EvaluationStatus.choices,
        default=EvaluationStatus.PENDING,
    )
    band_score = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )
    task_response_or_achievement = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )
    coherence_and_cohesion = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )
    lexical_resource = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )
    grammatical_range_and_accuracy = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )

    # Use a callable for default to avoid sharing the same dict instance across rows.
    def _default_feedback():  # noqa: D401, E301 - simple factory function
        return {
            "task_response_or_achievement": "",
            "coherence_and_cohesion": "",
            "lexical_resource": "",
            "grammatical_range_and_accuracy": "",
            "overall": ["", "", ""],
        }

    feedback = models.JSONField(
        null=True,
        blank=True,
        help_text="Detailed feedback from AI on the writing task.",
        default=_default_feedback,
    )

    # ============================================================================
    # AI GRAMMARLY-STYLE CHECKER FIELDS
    # ============================================================================
    ai_inline = models.TextField(
        null=True,
        blank=True,
        help_text="Essay with inline highlights using <g>, <v>, <s>, <p> tags",
    )
    ai_sentences = models.JSONField(
        null=True,
        blank=True,
        help_text="Array of corrected sentences with explanations",
    )
    ai_summary = models.TextField(
        null=True, blank=True, help_text="AI summary of mistakes and improvements"
    )
    ai_band_score = models.CharField(
        max_length=10, null=True, blank=True, help_text="Estimated band score from AI"
    )
    ai_corrected_essay = models.TextField(
        null=True, blank=True, help_text="Fully corrected version of the essay"
    )

    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True)
    evaluated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("exam_attempt", "task")
        ordering = ["submitted_at"]

    def save(self, *args, **kwargs):
        # Auto-calculate word count
        if self.answer_text and not self.word_count:
            self.word_count = len(self.answer_text.split())

        # Calculate overall band score from criteria
        if (
            self.task_response_or_achievement
            and self.coherence_and_cohesion
            and self.lexical_resource
            and self.grammatical_range_and_accuracy
        ):
            total = (
                float(self.task_response_or_achievement)
                + float(self.coherence_and_cohesion)
                + float(self.lexical_resource)
                + float(self.grammatical_range_and_accuracy)
            )
            self.band_score = round(total / 4 * 2) / 2  # Round to nearest 0.5

        if (
            self.evaluation_status == self.EvaluationStatus.COMPLETED
            and not self.evaluated_at
        ):
            self.evaluated_at = timezone.now()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Writing Attempt - {self.task.get_task_type_display()} by {self.exam_attempt.student.username}"


class SpeakingAttempt(models.Model):
    class EvaluationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    # Unique identifier for secure URL access
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
        help_text="Unique identifier for secure access",
    )

    exam_attempt = models.OneToOneField(
        ExamAttempt, on_delete=models.CASCADE, related_name="speaking_attempt"
    )
    # Storing audio file paths in a JSONField is flexible for multiple parts
    audio_files = models.JSONField(
        null=True, blank=True, help_text="e.g., {'part_1': 'path/to/audio1.mp3', ...}"
    )

    # Transcripts for each part
    transcripts = models.JSONField(
        null=True, blank=True, help_text="Transcripts for each speaking part"
    )

    def _default_feedback_speaking():
        return {
            "fluency_and_coherence": {"score": 0.0, "feedback": "..."},
            "lexical_resource": {"score": 0.0, "feedback": "..."},
            "grammatical_range_and_accuracy": {"score": 0.0, "feedback": "..."},
            "pronunciation": {"score": 0.0, "feedback": "..."},
            "overall_band_score": 0.0,
            "overall_feedback": "...",
        }

    feedback = models.JSONField(
        null=True,
        blank=True,
        default=_default_feedback_speaking,
        help_text="Stores detailed AI feedback and scores for each criterion.",
    )
    evaluation_status = models.CharField(
        max_length=20,
        choices=EvaluationStatus.choices,
        default=EvaluationStatus.PENDING,
    )
    band_score = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )
    fluency_and_coherence = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )
    lexical_resource = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )
    grammatical_range_and_accuracy = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )
    pronunciation = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
    )

    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True)
    evaluated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["submitted_at"]

    def save(self, *args, **kwargs):
        # Calculate overall band score from criteria
        if (
            self.fluency_and_coherence
            and self.lexical_resource
            and self.grammatical_range_and_accuracy
            and self.pronunciation
        ):
            total = (
                float(self.fluency_and_coherence)
                + float(self.lexical_resource)
                + float(self.grammatical_range_and_accuracy)
                + float(self.pronunciation)
            )
            self.band_score = round(total / 4 * 2) / 2  # Round to nearest 0.5

        if (
            self.evaluation_status == self.EvaluationStatus.COMPLETED
            and not self.evaluated_at
        ):
            self.evaluated_at = timezone.now()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Speaking Attempt by {self.exam_attempt.student.username}"


class SpeakingAnswer(models.Model):
    """
    Stores individual speaking answer (audio file) for a specific question.
    Links SpeakingAttempt with SpeakingQuestion.
    """

    speaking_attempt = models.ForeignKey(
        SpeakingAttempt,
        on_delete=models.CASCADE,
        related_name="answers",
        verbose_name="Speaking Attempt",
    )
    question = models.ForeignKey(
        SpeakingQuestion,
        on_delete=models.CASCADE,
        related_name="user_answers",
        verbose_name="Question",
    )

    # Audio file for this specific question
    audio_file = models.FileField(
        upload_to="speaking_answers/", help_text="Audio recording for this question"
    )

    # Transcript (can be generated later via STT)
    transcript = models.TextField(
        null=True, blank=True, help_text="Transcript of the audio answer"
    )

    # Duration in seconds
    duration_seconds = models.PositiveIntegerField(
        null=True, blank=True, help_text="Duration of the audio recording in seconds"
    )

    # Individual question feedback (optional, for detailed analysis)
    feedback = models.JSONField(
        null=True, blank=True, help_text="AI feedback for this specific answer"
    )

    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "speaking_answers"
        verbose_name = "Speaking Answer"
        verbose_name_plural = "Speaking Answers"
        unique_together = ("speaking_attempt", "question")
        ordering = ["question__order"]
        indexes = [
            models.Index(fields=["speaking_attempt", "question"]),
        ]

    def __str__(self):
        return f"Answer for {self.question} by {self.speaking_attempt.exam_attempt.student.username}"

    def get_audio_url(self):
        """Get the full URL for the audio file."""
        if self.audio_file:
            return self.audio_file.url
        return None


class UserAnswer(models.Model):
    """
    Stores a user's single answer to a specific question for a given attempt.
    """

    exam_attempt = models.ForeignKey(
        ExamAttempt, on_delete=models.CASCADE, related_name="user_answers"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="user_answers"
    )
    answer_text = models.CharField(max_length=255, blank=True)

    # Correctness flag (calculated)
    is_correct = models.BooleanField(
        default=False, help_text="Whether the answer is correct"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Ensures a user has only one answer per question in an attempt
        unique_together = ("exam_attempt", "question")
        ordering = ["question__order"]
        indexes = [
            models.Index(fields=["exam_attempt", "is_correct"]),
        ]

    def __str__(self):
        return (
            f"Answer by {self.exam_attempt.student.username} for Q{self.question.order}"
        )

    def check_correctness(self):
        """Check if the answer is correct and update the is_correct field"""
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


class Exam(models.Model):
    """
    Represents a scheduled exam session that students can attend
    Managers create exams based on MockExam templates
    """

    STATUS_CHOICES = (
        ("SCHEDULED", "Scheduled"),
        ("ACTIVE", "Active"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )

    # Unique identifier for secure URL access
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name="UUID",
        help_text="Unique identifier for secure access",
    )

    # Basic Info
    name = models.CharField(
        max_length=255, verbose_name="Exam Name", help_text="Name of the scheduled exam"
    )

    mock_test = models.ForeignKey(
        MockExam,
        on_delete=models.CASCADE,
        related_name="scheduled_exams",
        verbose_name="Mock Test",
        help_text="The mock test template to use for this exam",
    )

    # Pricing
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Price",
        help_text="Price for attending this exam (so'm). Leave empty for free exams.",
    )

    # Schedule
    start_date = models.DateTimeField(
        verbose_name="Start Date", help_text="When the exam becomes available"
    )

    expire_date = models.DateTimeField(
        verbose_name="Expire Date", help_text="When the exam is no longer available"
    )

    # Access Control
    pin_code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="PIN Code",
        help_text="PIN code for students to attend this exam",
    )

    max_students = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name="Max Students",
        help_text="Maximum number of students allowed. Leave empty for unlimited.",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="SCHEDULED",
        verbose_name="Status",
    )

    # Additional info
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name="Description",
        help_text="Additional information about this exam",
    )

    # Enrolled students
    enrolled_students = models.ManyToManyField(
        User,
        related_name="enrolled_exams",
        blank=True,
        limit_choices_to={"role": "STUDENT"},
        verbose_name="Enrolled Students",
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "scheduled_exams"
        verbose_name = "Scheduled Exam"
        verbose_name_plural = "Scheduled Exams"
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["pin_code"]),
            models.Index(fields=["start_date", "expire_date"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.start_date.strftime('%Y-%m-%d')})"

    def clean(self):
        """Validate exam data"""
        if self.start_date and self.expire_date:
            if self.start_date >= self.expire_date:
                raise ValidationError(
                    {"expire_date": "Expire date must be after start date"}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        # Auto-update status based on dates (unless manually set to CANCELLED)
        if self.status != "CANCELLED":
            self.update_status()
        super().save(*args, **kwargs)

    def update_status(self):
        """Automatically update status based on current time and dates"""
        now = timezone.now()

        # If expired, mark as completed
        if now > self.expire_date:
            if self.status != "COMPLETED":
                self.status = "COMPLETED"
        # If within the exam period, mark as active
        elif self.start_date <= now <= self.expire_date:
            if self.status == "SCHEDULED":
                self.status = "ACTIVE"
        # If not yet started, keep as scheduled
        elif now < self.start_date:
            if self.status not in ["SCHEDULED", "CANCELLED"]:
                self.status = "SCHEDULED"

    @property
    def is_active(self):
        """Check if exam is currently active"""
        now = timezone.now()
        self.update_status()
        return self.status == "ACTIVE" and self.start_date <= now <= self.expire_date

    @property
    def is_upcoming(self):
        """Check if exam is upcoming"""
        self.update_status()
        return self.status == "SCHEDULED" and self.start_date > timezone.now()

    @property
    def is_expired(self):
        """Check if exam has expired"""
        return timezone.now() > self.expire_date

    @property
    def enrolled_count(self):
        """Get number of enrolled students"""
        return self.enrolled_students.count()

    @property
    def available_slots(self):
        """Get number of available slots"""
        if self.max_students is None:
            return None  # Unlimited
        return max(0, self.max_students - self.enrolled_count)

    @property
    def is_full(self):
        """Check if exam is full"""
        if self.max_students is None:
            return False  # Unlimited capacity
        return self.enrolled_count >= self.max_students
        return self.enrolled_count >= self.max_students

    def can_enroll(self, student):
        """Check if a student can enroll"""
        if self.is_full:
            return False, "Exam is full"

        if self.is_expired:
            return False, "Exam has expired"

        if student in self.enrolled_students.all():
            return False, "Already enrolled"

        if not self.is_active and not self.is_upcoming:
            return False, "Exam is not available"

        return True, "Can enroll"

    def enroll_student(self, student, pin_code):
        """Enroll a student in this exam"""
        if pin_code != self.pin_code:
            raise ValidationError("Invalid PIN code")

        can_enroll, message = self.can_enroll(student)
        if not can_enroll:
            raise ValidationError(message)

        self.enrolled_students.add(student)
        return True
