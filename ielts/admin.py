from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from django.utils import timezone
from .models import (
    MockExam,
    ReadingPassage,
    ListeningPart,
    TestHead,
    Question,
    Choice,
    WritingTask,
    SpeakingTopic,
    ExamAttempt,
    WritingAttempt,
    SpeakingAttempt,
    UserAnswer,
    Exam,
)


# ============================================================================
# INLINE ADMINS
# ============================================================================


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    fields = ("order", "question_text", "correct_answer_text", "answer_two_text")
    ordering = ("order",)
    show_change_link = True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("test_head")


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 0
    fields = ("choice_text", "is_correct")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("question")


class TestHeadInline(admin.TabularInline):
    model = TestHead
    extra = 0
    fields = ("title", "question_type", "description")
    show_change_link = True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related("questions")


@admin.register(MockExam)
class MockExamAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "exam_type",
        "get_duration_display",
        "difficulty_level",
        "get_sections_count",
        "get_total_questions",
        "get_attempts_count",
        "is_active",
        "created_at",
    )
    list_filter = (
        "exam_type",
        "difficulty_level",
        "is_active",
        "created_at",
    )
    search_fields = ("title", "description")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "get_statistics")
    filter_horizontal = (
        "reading_passages",
        "listening_parts",
        "writing_tasks",
        "speaking_topics",
    )
    list_per_page = 25
    date_hierarchy = "created_at"
    actions = ["activate_exams", "deactivate_exams", "duplicate_exam"]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": ("title", "exam_type", "description", "is_active"),
                "description": "Main exam configuration and description",
            },
        ),
        (
            "Duration & Difficulty",
            {
                "fields": ("duration_minutes", "difficulty_level"),
                "description": "Leave duration empty to use IELTS standard duration",
            },
        ),
        (
            "Content Sections",
            {
                "fields": (
                    "reading_passages",
                    "listening_parts",
                    "writing_tasks",
                    "speaking_topics",
                ),
                "classes": ("collapse",),
                "description": "Select content for each section",
            },
        ),
        (
            "Statistics & Timestamps",
            {
                "fields": ("get_statistics", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related(
            "reading_passages", "listening_parts", "writing_tasks", "speaking_topics"
        ).annotate(attempts_count=Count("scheduled_exams__attempts", distinct=True))

    def get_duration_display(self, obj):
        duration = obj.duration_minutes or obj.get_default_duration()
        hours = duration // 60
        minutes = duration % 60
        if hours > 0:
            return format_html("<strong>{}h {}m</strong>", hours, minutes)
        return format_html("<strong>{}m</strong>", minutes)

    get_duration_display.short_description = "Duration"
    get_duration_display.admin_order_field = "duration_minutes"

    def get_sections_count(self, obj):
        counts = []
        if obj.reading_passages.exists():
            counts.append(f"R:{obj.reading_passages.count()}")
        if obj.listening_parts.exists():
            counts.append(f"L:{obj.listening_parts.count()}")
        if obj.writing_tasks.exists():
            counts.append(f"W:{obj.writing_tasks.count()}")
        if obj.speaking_topics.exists():
            counts.append(f"S:{obj.speaking_topics.count()}")
        return " | ".join(counts) if counts else "-"

    get_sections_count.short_description = "Sections"

    def get_total_questions(self, obj):
        try:
            total = obj.get_total_questions()
            return format_html('<span style="color: green;">{}</span>', total)
        except:
            return "-"

    get_total_questions.short_description = "Questions"

    def get_attempts_count(self, obj):
        count = getattr(obj, "attempts_count", 0)
        if count > 0:
            return format_html(
                '<a href="?mock_test__id__exact={}">{} attempts</a>', obj.id, count
            )
        return "0"

    get_attempts_count.short_description = "Attempts"

    def get_statistics(self, obj):
        if not obj.pk:
            return "-"

        stats = []
        stats.append(
            f"<strong>Reading Passages:</strong> {obj.reading_passages.count()}"
        )
        stats.append(f"<strong>Listening Parts:</strong> {obj.listening_parts.count()}")
        stats.append(f"<strong>Writing Tasks:</strong> {obj.writing_tasks.count()}")
        stats.append(f"<strong>Speaking Topics:</strong> {obj.speaking_topics.count()}")

        try:
            total_q = obj.get_total_questions()
            stats.append(f"<strong>Total Questions:</strong> {total_q}")
        except:
            pass

        return format_html("<br>".join(stats))

    get_statistics.short_description = "Statistics"

    def activate_exams(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} exam(s) activated successfully.")

    activate_exams.short_description = "Activate selected exams"

    def deactivate_exams(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} exam(s) deactivated successfully.")

    deactivate_exams.short_description = "Deactivate selected exams"

    def duplicate_exam(self, request, queryset):
        for exam in queryset:
            exam.pk = None
            exam.title = f"{exam.title} (Copy)"
            exam.save()
        self.message_user(
            request, f"{queryset.count()} exam(s) duplicated successfully."
        )

    duplicate_exam.short_description = "Duplicate selected exams"


# ============================================================================
# READING PASSAGE ADMIN
# ============================================================================


@admin.register(ReadingPassage)
class ReadingPassageAdmin(admin.ModelAdmin):
    list_display = (
        "passage_number",
        "title",
        "get_summary_preview",
        "word_count",
        "get_test_heads_count",
        "created_at",
    )
    list_filter = ("passage_number", "created_at")
    search_fields = ("title", "summary", "content")
    ordering = ("passage_number",)
    readonly_fields = ("created_at", "updated_at", "word_count", "get_content_preview")
    inlines = [TestHeadInline]
    list_per_page = 20

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("passage_number", "title", "summary")},
        ),
        (
            "Content",
            {"fields": ("content", "get_content_preview", "word_count")},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related("test_heads")

    def get_summary_preview(self, obj):
        if obj.summary:
            preview = obj.summary[:50]
            return f"{preview}..." if len(obj.summary) > 50 else preview
        return "-"

    get_summary_preview.short_description = "Summary"

    def get_test_heads_count(self, obj):
        count = obj.test_heads.count()
        if count > 0:
            return format_html('<span style="color: green;">{} groups</span>', count)
        return format_html('<span style="color: red;">No groups</span>')

    get_test_heads_count.short_description = "Question Groups"

    def get_content_preview(self, obj):
        if obj.content:
            preview = obj.content[:200]
            return format_html(
                '<div style="max-width: 600px; padding: 10px; background: #f5f5f5; border-radius: 5px;">{}</div>',
                f"{preview}..." if len(obj.content) > 200 else preview,
            )
        return "-"

    get_content_preview.short_description = "Content Preview"


# ============================================================================
# LISTENING PART ADMIN
# ============================================================================


@admin.register(ListeningPart)
class ListeningPartAdmin(admin.ModelAdmin):
    list_display = (
        "part_number",
        "title",
        "get_audio_status",
        "get_duration_display",
        "get_test_heads_count",
        "created_at",
    )
    list_filter = ("part_number", "created_at")
    search_fields = ("title", "description", "transcript")
    ordering = ("part_number",)
    readonly_fields = ("created_at", "updated_at", "get_audio_player")
    inlines = [TestHeadInline]
    list_per_page = 20

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("part_number", "title", "description")},
        ),
        (
            "Audio File",
            {
                "fields": ("audio_file", "get_audio_player", "duration_seconds"),
                "description": "Upload audio file and set duration in seconds",
            },
        ),
        (
            "Transcript",
            {
                "fields": ("transcript",),
                "classes": ("collapse",),
                "description": "Full transcript for reference",
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related("test_heads")

    def get_audio_status(self, obj):
        if obj.audio_file:
            return format_html('<span style="color: green;">✓ Uploaded</span>')
        return format_html('<span style="color: red;">✗ No audio</span>')

    get_audio_status.short_description = "Audio"

    def get_duration_display(self, obj):
        if obj.duration_seconds:
            mins = obj.duration_seconds // 60
            secs = obj.duration_seconds % 60
            return f"{mins}:{secs:02d}"
        return "-"

    get_duration_display.short_description = "Duration"

    def get_test_heads_count(self, obj):
        count = obj.test_heads.count()
        if count > 0:
            return format_html('<span style="color: green;">{} groups</span>', count)
        return format_html('<span style="color: red;">No groups</span>')

    get_test_heads_count.short_description = "Question Groups"

    def get_audio_player(self, obj):
        if obj.audio_file:
            return format_html(
                '<audio controls style="width: 100%; max-width: 400px;"><source src="{}" type="audio/mpeg"></audio>',
                obj.audio_file.url,
            )
        return "No audio file uploaded"

    get_audio_player.short_description = "Audio Player"


# ============================================================================
# TEST HEAD ADMIN (Question Groups)
# ============================================================================


@admin.register(TestHead)
class TestHeadAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "question_type",
        "get_section",
        "get_question_range",
        "get_question_count",
        "get_data_status",
    )
    list_filter = ("question_type", "listening__part_number", "reading__passage_number")
    search_fields = ("title", "description", "instruction")
    ordering = ("listening__part_number", "reading__passage_number", "title")
    inlines = [QuestionInline]
    list_per_page = 30

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("title", "question_type", "description", "instruction")},
        ),
        (
            "Section Assignment",
            {
                "fields": ("listening", "reading"),
                "description": "Assign to either Listening part or Reading passage",
            },
        ),
        (
            "Question Configuration",
            {
                "fields": (
                    "question_data",
                    "question_body",
                    "picture",
                    "answer_format",
                ),
                "classes": ("collapse",),
                "description": "Advanced configuration for specific question types",
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("listening", "reading").prefetch_related("questions")

    def get_section(self, obj):
        if obj.listening:
            return format_html(
                '<span style="background: #e3f2fd; padding: 3px 8px; border-radius: 3px;">🎧 Part {}</span>',
                obj.listening.part_number,
            )
        elif obj.reading:
            return format_html(
                '<span style="background: #f3e5f5; padding: 3px 8px; border-radius: 3px;">📖 Passage {}</span>',
                obj.reading.passage_number,
            )
        return "-"

    get_section.short_description = "Section"

    def get_question_range(self, obj):
        questions = obj.questions.order_by("order")
        if questions.exists():
            first = questions.first().order
            last = questions.last().order
            if first == last:
                return f"Q{first}"
            return f"Q{first}-{last}"
        return "-"

    get_question_range.short_description = "Range"

    def get_question_count(self, obj):
        count = obj.questions.count()
        if count > 0:
            return format_html('<strong style="color: green;">{}</strong>', count)
        return format_html('<strong style="color: red;">0</strong>')

    get_question_count.short_description = "Questions"

    def get_data_status(self, obj):
        status = []
        if obj.question_data:
            status.append("📊 Data")
        if obj.question_body:
            status.append("📝 Body")
        if obj.picture:
            status.append("🖼️ Image")
        return " ".join(status) if status else "-"

    get_data_status.short_description = "Extra Data"


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        "get_question_preview",
        "test_head",
        "order",
        "get_answer_preview",
    )
    list_filter = ("test_head__question_type", "created_at")
    search_fields = ("question_text", "correct_answer_text")
    ordering = ("test_head", "order")
    readonly_fields = ("created_at", "updated_at")
    inlines = [ChoiceInline]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("test_head", "order", "question_text")},
        ),
        (
            "Answer Configuration",
            {
                "fields": (
                    "correct_answer_text",
                    "answer_two_text",
                    "answer_three_text",
                )
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_question_preview(self, obj):
        if obj.question_text:
            return f"Q{obj.order}: {obj.question_text[:50]}"
        return f"Q{obj.order}"

    get_question_preview.short_description = "Question"

    def get_answer_preview(self, obj):
        return obj.correct_answer_text[:30] if obj.correct_answer_text else "-"

    get_answer_preview.short_description = "Answer"


# ============================================================================
# WRITING TASK ADMIN
# ============================================================================


@admin.register(WritingTask)
class WritingTaskAdmin(admin.ModelAdmin):
    list_display = (
        "task_type",
        "get_prompt_preview",
        "min_words",
        "get_has_picture",
        "created_at",
    )
    list_filter = ("task_type", "created_at")
    search_fields = ("prompt",)
    ordering = ("task_type", "-created_at")
    readonly_fields = ("created_at", "updated_at", "get_picture_preview")
    list_per_page = 20

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("task_type", "min_words")},
        ),
        (
            "Task Content",
            {"fields": ("prompt",)},
        ),
        (
            "Visual Content",
            {
                "fields": ("picture", "get_picture_preview"),
                "description": "Optional: graph, chart, or diagram for Task 1",
            },
        ),
        (
            "Advanced Data",
            {
                "fields": ("data",),
                "classes": ("collapse",),
                "description": "JSON data for dynamic task generation",
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_prompt_preview(self, obj):
        if obj.prompt:
            preview = obj.prompt[:100]
            return format_html(
                '<span title="{}">{}</span>',
                obj.prompt,
                f"{preview}..." if len(obj.prompt) > 100 else preview,
            )
        return "-"

    get_prompt_preview.short_description = "Prompt"

    def get_has_picture(self, obj):
        if obj.picture:
            return format_html('<span style="color: green;">✓ Image</span>')
        return "-"

    get_has_picture.short_description = "Visual"

    def get_picture_preview(self, obj):
        if obj.picture:
            return format_html(
                '<img src="{}" style="max-width: 400px; max-height: 300px;" />',
                obj.picture.url,
            )
        return "No picture uploaded"

    get_picture_preview.short_description = "Picture Preview"


# ============================================================================
# SPEAKING TOPIC ADMIN
# ============================================================================


@admin.register(SpeakingTopic)
class SpeakingTopicAdmin(admin.ModelAdmin):
    list_display = (
        "get_part_display",
        "get_topic_preview",
        "get_question_preview",
        "created_at",
    )
    list_filter = ("speaking_type", "created_at")
    search_fields = ("topic", "question")
    ordering = ("speaking_type", "-created_at")
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 25

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("speaking_type", "topic")},
        ),
        (
            "Question/Prompt",
            {"fields": ("question",)},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_part_display(self, obj):
        colors = {
            "PART_1": "#e3f2fd",
            "PART_2": "#f3e5f5",
            "PART_3": "#fff3e0",
        }
        color = colors.get(obj.speaking_type, "#f5f5f5")
        return format_html(
            '<span style="background: {}; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_speaking_type_display(),
        )

    get_part_display.short_description = "Part"
    get_part_display.admin_order_field = "speaking_type"

    def get_topic_preview(self, obj):
        if obj.topic:
            preview = obj.topic[:60]
            return f"{preview}..." if len(obj.topic) > 60 else preview
        return "-"

    get_topic_preview.short_description = "Topic"

    def get_question_preview(self, obj):
        if obj.question:
            preview = obj.question[:80]
            return format_html(
                '<span title="{}">{}</span>',
                obj.question,
                f"{preview}..." if len(obj.question) > 80 else preview,
            )
        return "-"

    get_question_preview.short_description = "Question"

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("speaking_type", "topic")},
        ),
        (
            "Content",
            {"fields": ("question", "cue_card")},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


# ============================================================================
# EXAM ATTEMPT MANAGEMENT
# ============================================================================


class UserAnswerInline(admin.TabularInline):
    model = UserAnswer
    extra = 0
    can_delete = False
    fields = ("question", "answer_text", "is_correct")
    readonly_fields = ("question", "answer_text", "is_correct")
    ordering = ("question__test_head", "question__order")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("question", "question__test_head")


@admin.register(ExamAttempt)
class ExamAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "get_student_name",
        "get_exam_title",
        "status",
        "current_section",
        "get_score_display",
        "started_at",
        "get_duration",
    )
    list_filter = (
        "status",
        "current_section",
        "started_at",
        "exam__mock_test__exam_type",
    )
    search_fields = (
        "student__username",
        "student__email",
        "student__first_name",
        "student__last_name",
        "exam__mock_test__title",
    )
    readonly_fields = (
        "started_at",
        "completed_at",
        "get_detailed_info",
        "get_answers_summary",
    )
    inlines = [UserAnswerInline]
    list_per_page = 30
    date_hierarchy = "started_at"
    actions = ["mark_completed", "reset_attempts"]

    fieldsets = (
        (
            "Exam Information",
            {"fields": ("exam", "student", "status", "current_section")},
        ),
        (
            "Timing",
            {"fields": ("started_at", "completed_at")},
        ),
        (
            "Detailed Information",
            {
                "fields": ("get_detailed_info", "get_answers_summary"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("student", "exam", "exam__mock_test").prefetch_related(
            "user_answers"
        )

    def get_student_name(self, obj):
        return format_html(
            '<a href="{}">{}</a>',
            reverse("admin:accounts_user_change", args=[obj.student.id]),
            obj.student.get_full_name() or obj.student.username,
        )

    get_student_name.short_description = "Student"
    get_student_name.admin_order_field = "student__username"

    def get_exam_title(self, obj):
        return obj.exam.mock_test.title

    get_exam_title.short_description = "Exam"
    get_exam_title.admin_order_field = "exam__mock_test__title"

    def get_score_display(self, obj):
        try:
            result = obj.examresult_set.first()
            if result and result.overall_score:
                return format_html(
                    '<strong style="color: {};">Band {}</strong>',
                    "#4caf50" if result.overall_score >= 7.0 else "#ff9800",
                    result.overall_score,
                )
        except:
            pass
        return "-"

    get_score_display.short_description = "Score"

    def get_duration(self, obj):
        if obj.started_at and obj.completed_at:
            duration = obj.completed_at - obj.started_at
            hours = duration.seconds // 3600
            minutes = (duration.seconds % 3600) // 60
            if hours > 0:
                return f"{hours}h {minutes}m"
            return f"{minutes}m"
        return "-"

    get_duration.short_description = "Duration"

    def get_detailed_info(self, obj):
        if not obj.pk:
            return "-"

        info = []
        info.append(f"<strong>Attempt ID:</strong> {obj.id}")
        info.append(f"<strong>Status:</strong> {obj.get_status_display()}")
        info.append(f"<strong>Current Section:</strong> {obj.current_section}")

        # Count answers
        total_answers = obj.user_answers.count()
        correct_answers = obj.user_answers.filter(is_correct=True).count()
        if total_answers > 0:
            accuracy = (correct_answers / total_answers) * 100
            info.append(
                f"<strong>Answers:</strong> {correct_answers}/{total_answers} ({accuracy:.1f}%)"
            )

        return format_html("<br>".join(info))

    get_detailed_info.short_description = "Details"

    def get_answers_summary(self, obj):
        if not obj.pk:
            return "-"

        answers = obj.user_answers.select_related("question", "question__test_head")
        if not answers.exists():
            return "No answers yet"

        by_section = {}
        for answer in answers:
            test_head = answer.question.test_head
            if test_head.listening:
                section = f"Listening Part {test_head.listening.part_number}"
            elif test_head.reading:
                section = f"Reading Passage {test_head.reading.passage_number}"
            else:
                section = "Other"

            if section not in by_section:
                by_section[section] = {"correct": 0, "total": 0}
            by_section[section]["total"] += 1
            if answer.is_correct:
                by_section[section]["correct"] += 1

        summary = []
        for section, stats in sorted(by_section.items()):
            accuracy = (
                (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
            )
            summary.append(
                f"<strong>{section}:</strong> {stats['correct']}/{stats['total']} ({accuracy:.0f}%)"
            )

        return format_html("<br>".join(summary))

    get_answers_summary.short_description = "Answers by Section"

    def mark_completed(self, request, queryset):
        updated = queryset.filter(status="IN_PROGRESS").update(
            status="COMPLETED", current_section="COMPLETED", completed_at=timezone.now()
        )
        self.message_user(request, f"{updated} attempt(s) marked as completed.")

    mark_completed.short_description = "Mark as completed"

    def reset_attempts(self, request, queryset):
        for attempt in queryset:
            attempt.user_answers.all().delete()
            attempt.status = "NOT_STARTED"
            attempt.current_section = "NOT_STARTED"
            attempt.started_at = None
            attempt.completed_at = None
            attempt.save()
        self.message_user(request, f"{queryset.count()} attempt(s) reset successfully.")

    reset_attempts.short_description = "Reset selected attempts"


# ============================================================================
# WRITING & SPEAKING ATTEMPTS
# ============================================================================


@admin.register(WritingAttempt)
class WritingAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "get_student",
        "get_task_type",
        "get_word_count",
        "band_score",
        "evaluation_status",
        "submitted_at",
    )
    list_filter = ("evaluation_status", "task__task_type", "submitted_at")
    search_fields = ("exam_attempt__student__username", "exam_attempt__student__email")
    readonly_fields = (
        "submitted_at",
        "evaluated_at",
        "word_count",
        "get_answer_preview",
    )
    list_per_page = 30
    date_hierarchy = "submitted_at"

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("exam_attempt", "task", "evaluation_status")},
        ),
        (
            "Answer",
            {"fields": ("answer_text", "get_answer_preview", "word_count")},
        ),
        (
            "Evaluation",
            {
                "fields": (
                    "band_score",
                    "task_response_or_achievement",
                    "coherence_and_cohesion",
                    "lexical_resource",
                    "grammatical_range_and_accuracy",
                    "feedback",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {"fields": ("submitted_at", "evaluated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("exam_attempt__student", "task")

    def get_student(self, obj):
        return (
            obj.exam_attempt.student.get_full_name()
            or obj.exam_attempt.student.username
        )

    get_student.short_description = "Student"
    get_student.admin_order_field = "exam_attempt__student__username"

    def get_task_type(self, obj):
        return obj.task.get_task_type_display()

    get_task_type.short_description = "Task"

    def get_word_count(self, obj):
        if obj.word_count:
            min_words = obj.task.min_words
            color = "green" if obj.word_count >= min_words else "red"
            return format_html(
                '<span style="color: {};">{} words</span>', color, obj.word_count
            )
        return "-"

    get_word_count.short_description = "Words"

    def get_answer_preview(self, obj):
        if obj.answer_text:
            preview = obj.answer_text[:300]
            return format_html(
                '<div style="max-width: 600px; padding: 10px; background: #f5f5f5; border-radius: 5px; white-space: pre-wrap;">{}</div>',
                f"{preview}..." if len(obj.answer_text) > 300 else preview,
            )
        return "-"

    get_answer_preview.short_description = "Answer Preview"


@admin.register(SpeakingAttempt)
class SpeakingAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "get_student",
        "band_score",
        "evaluation_status",
        "get_score",
        "submitted_at",
    )
    list_filter = ("evaluation_status", "submitted_at")
    search_fields = ("exam_attempt__student__username", "exam_attempt__student__email")
    readonly_fields = ("submitted_at", "evaluated_at", "get_audio_files")
    list_per_page = 30
    date_hierarchy = "submitted_at"

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "exam_attempt",
                    "evaluation_status",
                    "submitted_at",
                    "evaluated_at",
                )
            },
        ),
        (
            "Audio & Transcripts",
            {"fields": ("audio_files", "get_audio_files", "transcripts")},
        ),
        (
            "Evaluation",
            {
                "fields": (
                    "band_score",
                    "fluency_and_coherence",
                    "lexical_resource",
                    "grammatical_range_and_accuracy",
                    "pronunciation",
                    "feedback",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("exam_attempt__student")

    def get_student(self, obj):
        return (
            obj.exam_attempt.student.get_full_name()
            or obj.exam_attempt.student.username
        )

    get_student.short_description = "Student"
    get_student.admin_order_field = "exam_attempt__student__username"

    def get_score(self, obj):
        if obj.band_score:
            return format_html("<strong>Band {:.1f}</strong>", obj.band_score)
        return "Not scored"

    get_score.short_description = "Score"

    def get_audio_files(self, obj):
        if obj.audio_files:
            parts = []
            for key, path in obj.audio_files.items():
                parts.append(f"<strong>{key}:</strong> {path}")
            return format_html("<br>".join(parts))
        return "No audio files"

    get_audio_files.short_description = "Audio Files"


# ============================================================================
# USER ANSWERS & RESULTS
# ============================================================================


@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = (
        "get_student",
        "get_question_number",
        "get_question_type",
        "answer_text",
        "is_correct",
        "get_time_spent",
    )
    list_filter = (
        "is_correct",
        "question__test_head__question_type",
        "created_at",
    )
    search_fields = (
        "attempt__student__username",
        "answer_text",
        "question__question_text",
    )
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 50
    date_hierarchy = "created_at"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("attempt__student", "question__test_head")

    def get_student(self, obj):
        return obj.attempt.student.username

    get_student.short_description = "Student"
    get_student.admin_order_field = "attempt__student__username"

    def get_question_number(self, obj):
        return f"Q{obj.question.order}"

    get_question_number.short_description = "Q#"
    get_question_number.admin_order_field = "question__order"

    def get_question_type(self, obj):
        return obj.question.test_head.get_question_type_display()

    get_question_type.short_description = "Type"

    def get_time_spent(self, obj):
        if obj.time_spent_seconds:
            return f"{obj.time_spent_seconds}s"
        return "-"

    get_time_spent.short_description = "Time"


# @admin.register(ExamResult)
# class ExamResultAdmin(admin.ModelAdmin):
#     # Commented out - ExamResult model not found
#     pass


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = (
        "mock_test",
        "get_exam_type",
        "get_attempts_count",
        "created_at",
    )
    list_filter = ("mock_test__exam_type", "created_at")
    search_fields = ("mock_test__title",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("mock_test").annotate(
            attempts_count=Count("examattempt")
        )

    def get_exam_type(self, obj):
        return obj.mock_test.get_exam_type_display()

    get_exam_type.short_description = "Type"
    get_exam_type.admin_order_field = "mock_test__exam_type"

    def get_attempts_count(self, obj):
        count = getattr(obj, "attempts_count", 0)
        if count > 0:
            return format_html("<strong>{}</strong> attempts", count)
        return "0"

    get_attempts_count.short_description = "Attempts"
