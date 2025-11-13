from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from accounts.models import User
from ielts.models import ReadingPassage, ListeningPart


class Book(models.Model):
    """
    Represents an IELTS practice book (e.g., Cambridge IELTS 15)
    """

    LEVEL_CHOICES = (
        ("B1", "B1 - Intermediate"),
        ("B2", "B2 - Upper Intermediate"),
        ("C1", "C1 - Advanced"),
        ("C2", "C2 - Proficient"),
    )

    title = models.CharField(
        max_length=255, verbose_name="Book Title", help_text="e.g., Cambridge IELTS 15"
    )
    description = models.TextField(
        null=True, blank=True, verbose_name="Description", help_text="Book description"
    )
    cover_image = models.ImageField(
        upload_to="books/covers/",
        null=True,
        blank=True,
        verbose_name="Cover Image",
        help_text="Book cover image",
    )
    level = models.CharField(
        max_length=2,
        choices=LEVEL_CHOICES,
        default="B2",
        verbose_name="CEFR Level",
        help_text="Common European Framework of Reference level",
    )
    total_sections = models.PositiveIntegerField(
        default=0,
        verbose_name="Total Sections",
        help_text="Total number of practice sections in this book",
    )

    # Author and publisher info
    author = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Author"
    )
    publisher = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Publisher"
    )
    publication_year = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Publication Year"
    )

    # Status
    is_active = models.BooleanField(
        default=True, verbose_name="Active", help_text="Whether this book is available"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "books"
        verbose_name = "Book"
        verbose_name_plural = "Books"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["level"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_level_display()})"

    def update_total_sections(self):
        """Update total sections count based on related sections"""
        self.total_sections = self.sections.count()
        self.save(update_fields=["total_sections"])


class BookSection(models.Model):
    """
    Represents a section in a book (e.g., Test 1 - Reading Passage 1, Test 2 - Listening Part 3)
    Links to existing ReadingPassage or ListeningPart from ielts app
    """

    SECTION_TYPE_CHOICES = (
        ("READING", "Reading"),
        ("LISTENING", "Listening"),
    )

    book = models.ForeignKey(
        Book, on_delete=models.CASCADE, related_name="sections", verbose_name="Book"
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Section Title",
        help_text="e.g., Test 1 - Reading Passage 1 (auto-generated if empty)",
    )
    section_type = models.CharField(
        max_length=20,
        choices=SECTION_TYPE_CHOICES,
        verbose_name="Section Type",
        help_text="Reading or Listening",
    )
    order = models.PositiveIntegerField(
        default=1,
        verbose_name="Order",
        help_text="Order of this section within the book",
    )

    # Link to existing IELTS content
    reading_passage = models.ForeignKey(
        ReadingPassage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="book_sections",
        verbose_name="Reading Passage",
        help_text="Link to an existing reading passage",
    )
    listening_part = models.ForeignKey(
        ListeningPart,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="book_sections",
        verbose_name="Listening Part",
        help_text="Link to an existing listening part",
    )

    # Section metadata
    description = models.TextField(
        null=True, blank=True, verbose_name="Description", help_text="Section overview"
    )
    total_questions = models.PositiveIntegerField(
        default=0,
        verbose_name="Total Questions",
        help_text="Total number of questions in this section",
    )
    duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Duration (minutes)",
        help_text="Expected time to complete this section",
    )

    # Status
    is_locked = models.BooleanField(
        default=False,
        verbose_name="Locked",
        help_text="Whether this section is locked (requires previous sections completed)",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "book_sections"
        verbose_name = "Book Section"
        verbose_name_plural = "Book Sections"
        ordering = ["book", "order"]
        unique_together = [["book", "order"]]
        indexes = [
            models.Index(fields=["book", "section_type"]),
            models.Index(fields=["book", "order"]),
        ]

    def __str__(self):
        return f"{self.book.title} - {self.get_title()}"

    def get_title(self):
        """Get the section title, auto-generate if empty"""
        if self.title:
            return self.title

        # Auto-generate title based on section type and order
        content_title = ""
        if self.section_type == "READING" and self.reading_passage:
            content_title = self.reading_passage.title
        elif self.section_type == "LISTENING" and self.listening_part:
            content_title = self.listening_part.title

        if content_title:
            return (
                f"Section {self.order}: {self.section_type.title()} - {content_title}"
            )
        return f"Section {self.order}: {self.section_type.title()}"

    def get_content(self):
        """Get the linked content (ReadingPassage or ListeningPart)"""
        if self.section_type == "READING" and self.reading_passage:
            return self.reading_passage
        elif self.section_type == "LISTENING" and self.listening_part:
            return self.listening_part
        return None

    def update_total_questions(self):
        """Update total questions count based on linked content"""
        content = self.get_content()
        if content:
            self.total_questions = (
                content.test_heads.aggregate(total=models.Count("questions"))["total"]
                or 0
            )
            self.save(update_fields=["total_questions"])


class UserBookProgress(models.Model):
    """
    Tracks user's overall progress in a book
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="book_progress",
        verbose_name="User",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="user_progress",
        verbose_name="Book",
    )

    # Progress tracking
    completed_sections = models.PositiveIntegerField(
        default=0, verbose_name="Completed Sections"
    )
    total_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.0,
        verbose_name="Total Score",
        help_text="Sum of all section scores",
    )
    average_score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Average Band Score",
        help_text="Average IELTS band score across all completed sections",
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Completion Percentage",
    )

    # Status
    is_started = models.BooleanField(
        default=False,
        verbose_name="Started",
        help_text="Has the user started this book",
    )
    is_completed = models.BooleanField(
        default=False,
        verbose_name="Completed",
        help_text="Has the user completed all sections",
    )

    # Timestamps
    last_accessed = models.DateTimeField(
        auto_now=True,
        verbose_name="Last Accessed",
        help_text="Last time user accessed this book",
    )
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Started At")
    completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Completed At"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "user_book_progress"
        verbose_name = "User Book Progress"
        verbose_name_plural = "User Book Progress"
        ordering = ["-last_accessed"]
        unique_together = [["user", "book"]]
        indexes = [
            models.Index(fields=["user", "is_completed"]),
            models.Index(fields=["user", "last_accessed"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.book.title} ({self.percentage:.0f}%)"

    def update_progress(self):
        """Update progress based on completed sections"""
        # Get all section results for this user and book
        section_results = UserSectionResult.objects.filter(
            user=self.user, section__book=self.book, is_completed=True
        )

        self.completed_sections = section_results.count()
        self.total_score = sum(
            result.score for result in section_results if result.score
        )

        if self.completed_sections > 0:
            self.average_score = self.total_score / self.completed_sections
        else:
            self.average_score = None

        # Calculate percentage
        if self.book.total_sections > 0:
            self.percentage = (self.completed_sections / self.book.total_sections) * 100
        else:
            self.percentage = 0

        # Update completion status
        if not self.is_started and self.completed_sections > 0:
            self.is_started = True
            self.started_at = timezone.now()

        if (
            self.book.total_sections > 0
            and self.completed_sections >= self.book.total_sections
        ):
            self.is_completed = True
            if not self.completed_at:
                self.completed_at = timezone.now()
        else:
            self.is_completed = False

        self.save()


class UserSectionResult(models.Model):
    """
    Stores results of a user's attempt at a specific book section
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="section_results",
        verbose_name="User",
    )
    section = models.ForeignKey(
        BookSection,
        on_delete=models.CASCADE,
        related_name="user_results",
        verbose_name="Section",
    )

    # Results
    score = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(9)],
        verbose_name="Band Score",
        help_text="IELTS band score (0-9)",
    )
    correct_answers = models.PositiveIntegerField(
        default=0, verbose_name="Correct Answers"
    )
    total_questions = models.PositiveIntegerField(
        default=0, verbose_name="Total Questions"
    )
    accuracy_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Accuracy %",
    )

    # User answers (JSON)
    answers = models.JSONField(
        null=True,
        blank=True,
        verbose_name="User Answers",
        help_text="Stores user's answers in JSON format",
    )

    # Timing
    time_spent = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Time Spent (seconds)",
        help_text="Time taken to complete the section in seconds",
    )

    # Status
    is_completed = models.BooleanField(default=False, verbose_name="Completed")

    # Timestamps
    attempt_date = models.DateTimeField(auto_now_add=True, verbose_name="Attempt Date")
    completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Completed At"
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "user_section_results"
        verbose_name = "User Section Result"
        verbose_name_plural = "User Section Results"
        ordering = ["-attempt_date"]
        indexes = [
            models.Index(fields=["user", "section"]),
            models.Index(fields=["user", "is_completed"]),
            models.Index(fields=["section", "score"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.section.title} - {self.score or 'N/A'}"

    def calculate_score(self):
        """Calculate IELTS band score based on correct answers"""
        if self.total_questions == 0:
            return None

        self.accuracy_percentage = (self.correct_answers / self.total_questions) * 100

        # IELTS band score conversion (approximate)
        # Reading/Listening out of 40 questions
        if self.section.section_type == "READING":
            score_map = {
                39: 9.0,
                37: 8.5,
                35: 8.0,
                33: 7.5,
                30: 7.0,
                27: 6.5,
                23: 6.0,
                19: 5.5,
                15: 5.0,
                13: 4.5,
                10: 4.0,
                8: 3.5,
                6: 3.0,
            }
        else:  # LISTENING
            score_map = {
                39: 9.0,
                37: 8.5,
                35: 8.0,
                32: 7.5,
                30: 7.0,
                26: 6.5,
                23: 6.0,
                18: 5.5,
                16: 5.0,
                13: 4.5,
                10: 4.0,
            }

        # Find appropriate band score
        for threshold, band in sorted(score_map.items(), reverse=True):
            if self.correct_answers >= threshold:
                self.score = band
                return band

        # Default minimum score
        self.score = 2.5
        return 2.5

    def mark_completed(self):
        """Mark this section result as completed"""
        if not self.is_completed:
            self.is_completed = True
            self.completed_at = timezone.now()
            # Score is already calculated in the serializer using exam logic
            # Just calculate accuracy percentage
            if self.total_questions > 0:
                self.accuracy_percentage = (
                    self.correct_answers / self.total_questions
                ) * 100
            self.save()

            # Update user's book progress
            try:
                progress = UserBookProgress.objects.get(
                    user=self.user, book=self.section.book
                )
                progress.update_progress()
            except UserBookProgress.DoesNotExist:
                # Create progress if it doesn't exist
                progress = UserBookProgress.objects.create(
                    user=self.user, book=self.section.book
                )
                progress.update_progress()

    def save(self, *args, **kwargs):
        # Auto-calculate accuracy
        if self.total_questions > 0:
            self.accuracy_percentage = (
                self.correct_answers / self.total_questions
            ) * 100
        super().save(*args, **kwargs)
