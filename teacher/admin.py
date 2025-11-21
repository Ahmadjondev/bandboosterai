from django.contrib import admin
from .models import TeacherExam, TeacherExamAttempt, TeacherFeedback, TeacherUserAnswer


@admin.register(TeacherExam)
class TeacherExamAdmin(admin.ModelAdmin):
    """
    Admin interface for TeacherExam model
    """

    list_display = [
        "title",
        "teacher",
        "status",
        "get_attempts_count",
        "is_public",
        "is_active_display",
        "start_date",
        "end_date",
        "created_at",
    ]
    list_filter = [
        "status",
        "is_public",
        "created_at",
        "teacher",
        "auto_grade_reading",
        "auto_grade_listening",
    ]
    search_fields = [
        "title",
        "description",
        "teacher__username",
        "teacher__email",
        "access_code",
    ]
    readonly_fields = [
        "uuid",
        "created_at",
        "updated_at",
        "get_attempts_count",
        "get_completed_attempts",
    ]
    filter_horizontal = ["assigned_students"]
    list_editable = ["status"]
    date_hierarchy = "created_at"
    actions = ["publish_exams", "archive_exams", "duplicate_exam"]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "uuid",
                    "teacher",
                    "title",
                    "description",
                    "mock_exam",
                )
            },
        ),
        (
            "Schedule",
            {
                "fields": (
                    "start_date",
                    "end_date",
                    "duration_minutes",
                )
            },
        ),
        (
            "Access Control",
            {
                "fields": (
                    "is_public",
                    "access_code",
                    "assigned_students",
                )
            },
        ),
        (
            "Settings",
            {
                "fields": (
                    "status",
                    "auto_grade_reading",
                    "auto_grade_listening",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_attempts_count(self, obj):
        """Display total attempts count"""
        return obj.total_attempts

    get_attempts_count.short_description = "Attempts"
    get_attempts_count.admin_order_field = "attempts__count"

    def get_completed_attempts(self, obj):
        """Display completed attempts count"""
        return obj.completed_attempts

    get_completed_attempts.short_description = "Completed"

    def is_active_display(self, obj):
        """Display if exam is currently active"""
        return obj.is_active

    is_active_display.short_description = "Active"
    is_active_display.boolean = True

    def publish_exams(self, request, queryset):
        """Bulk action to publish exams"""
        updated = queryset.update(status="PUBLISHED")
        self.message_user(request, f"{updated} exam(s) published successfully.")

    publish_exams.short_description = "Publish selected exams"

    def archive_exams(self, request, queryset):
        """Bulk action to archive exams"""
        updated = queryset.update(status="ARCHIVED")
        self.message_user(request, f"{updated} exam(s) archived successfully.")

    archive_exams.short_description = "Archive selected exams"

    def duplicate_exam(self, request, queryset):
        """Duplicate selected exams"""
        count = 0
        for exam in queryset:
            exam.pk = None
            exam.uuid = None
            exam.title = f"{exam.title} (Copy)"
            exam.status = "DRAFT"
            exam.save()
            count += 1
        self.message_user(request, f"{count} exam(s) duplicated successfully.")

    duplicate_exam.short_description = "Duplicate selected exams"


class TeacherUserAnswerInline(admin.TabularInline):
    """Inline for viewing user answers within attempt"""

    model = TeacherUserAnswer
    extra = 0
    readonly_fields = ["question", "answer_text", "is_correct", "created_at"]
    can_delete = False
    fields = ["question", "answer_text", "is_correct"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(TeacherExamAttempt)
class TeacherExamAttemptAdmin(admin.ModelAdmin):
    """
    Admin interface for TeacherExamAttempt model
    """

    list_display = [
        "get_student_name",
        "exam",
        "status",
        "current_section",
        "get_all_scores",
        "overall_band",
        "get_duration_display",
        "started_at",
    ]
    list_filter = ["status", "current_section", "exam", "exam__teacher", "created_at"]
    search_fields = [
        "student__username",
        "student__email",
        "student__first_name",
        "student__last_name",
        "exam__title",
    ]
    readonly_fields = [
        "uuid",
        "overall_band",
        "created_at",
        "updated_at",
        "get_duration",
        "get_answers_summary",
    ]
    date_hierarchy = "created_at"
    actions = ["mark_as_graded", "recalculate_scores"]
    inlines = [TeacherUserAnswerInline]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "uuid",
                    "exam",
                    "student",
                    "status",
                    "current_section",
                )
            },
        ),
        (
            "Timing",
            {
                "fields": (
                    "started_at",
                    "submitted_at",
                    "graded_at",
                    "get_duration",
                )
            },
        ),
        (
            "Scores",
            {
                "fields": (
                    "listening_score",
                    "reading_score",
                    "writing_score",
                    "speaking_score",
                    "overall_band",
                )
            },
        ),
        (
            "Analysis",
            {
                "fields": (
                    "detailed_scores",
                    "strengths",
                    "weaknesses",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_student_name(self, obj):
        """Display student full name"""
        return obj.student.get_full_name() or obj.student.username

    get_student_name.short_description = "Student"
    get_student_name.admin_order_field = "student__first_name"

    def get_all_scores(self, obj):
        """Display all section scores in compact format"""
        scores = []
        if obj.listening_score:
            scores.append(f"L:{obj.listening_score}")
        if obj.reading_score:
            scores.append(f"R:{obj.reading_score}")
        if obj.writing_score:
            scores.append(f"W:{obj.writing_score}")
        if obj.speaking_score:
            scores.append(f"S:{obj.speaking_score}")
        return " | ".join(scores) if scores else "-"

    get_all_scores.short_description = "Scores (L/R/W/S)"

    def get_duration(self, obj):
        """Display attempt duration"""
        duration = obj.get_duration_minutes()
        if duration:
            return f"{duration} minutes"
        return "-"

    get_duration.short_description = "Duration"

    def get_duration_display(self, obj):
        """Display duration in list view"""
        duration = obj.get_duration_minutes()
        if duration:
            hours = int(duration // 60)
            mins = int(duration % 60)
            if hours > 0:
                return f"{hours}h {mins}m"
            return f"{mins}m"
        return "-"

    get_duration_display.short_description = "Duration"

    def get_answers_summary(self, obj):
        """Display summary of answers"""
        total = obj.user_answers.count()
        correct = obj.user_answers.filter(is_correct=True).count()
        if total > 0:
            percentage = (correct / total) * 100
            return f"{correct}/{total} correct ({percentage:.1f}%)"
        return "No answers"

    get_answers_summary.short_description = "Answers Summary"

    def mark_as_graded(self, request, queryset):
        """Mark attempts as graded"""
        from django.utils import timezone

        updated = queryset.update(status="GRADED", graded_at=timezone.now())
        self.message_user(request, f"{updated} attempt(s) marked as graded.")

    mark_as_graded.short_description = "Mark as graded"

    def recalculate_scores(self, request, queryset):
        """Recalculate overall band scores"""
        count = 0
        for attempt in queryset:
            attempt.overall_band = attempt.calculate_overall_band()
            attempt.save()
            count += 1
        self.message_user(request, f"Recalculated scores for {count} attempt(s).")

    recalculate_scores.short_description = "Recalculate overall band"


@admin.register(TeacherFeedback)
class TeacherFeedbackAdmin(admin.ModelAdmin):
    """
    Admin interface for TeacherFeedback model
    """

    list_display = [
        "get_teacher_name",
        "get_student_name",
        "get_exam_title",
        "feedback_type",
        "is_visible_to_student",
        "get_comment_preview",
        "created_at",
    ]
    list_filter = [
        "feedback_type",
        "is_visible_to_student",
        "created_at",
        "teacher",
        "attempt__exam",
    ]
    search_fields = [
        "teacher__username",
        "teacher__first_name",
        "teacher__last_name",
        "attempt__student__username",
        "attempt__student__first_name",
        "attempt__student__last_name",
        "attempt__exam__title",
        "comment",
    ]
    readonly_fields = ["created_at", "updated_at", "get_attempt_info"]
    list_editable = ["is_visible_to_student"]
    date_hierarchy = "created_at"
    actions = ["make_visible", "make_hidden"]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "get_attempt_info",
                    "attempt",
                    "teacher",
                    "feedback_type",
                    "comment",
                )
            },
        ),
        (
            "Writing Criteria (Optional)",
            {
                "fields": (
                    "task_achievement",
                    "coherence_cohesion",
                    "lexical_resource",
                    "grammatical_range",
                ),
                "classes": ("collapse",),
                "description": "For writing feedback only",
            },
        ),
        (
            "Speaking Criteria (Optional)",
            {
                "fields": (
                    "pronunciation",
                    "fluency_coherence",
                ),
                "classes": ("collapse",),
                "description": "For speaking feedback only",
            },
        ),
        (
            "Settings",
            {"fields": ("is_visible_to_student",)},
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_teacher_name(self, obj):
        """Display teacher full name"""
        return obj.teacher.get_full_name() or obj.teacher.username

    get_teacher_name.short_description = "Teacher"
    get_teacher_name.admin_order_field = "teacher__first_name"

    def get_student_name(self, obj):
        """Display student full name"""
        return obj.attempt.student.get_full_name() or obj.attempt.student.username

    get_student_name.short_description = "Student"
    get_student_name.admin_order_field = "attempt__student__first_name"

    def get_exam_title(self, obj):
        """Display exam title"""
        return obj.attempt.exam.title

    get_exam_title.short_description = "Exam"
    get_exam_title.admin_order_field = "attempt__exam__title"

    def get_comment_preview(self, obj):
        """Display comment preview"""
        if len(obj.comment) > 50:
            return f"{obj.comment[:50]}..."
        return obj.comment

    get_comment_preview.short_description = "Comment"

    def get_attempt_info(self, obj):
        """Display attempt information"""
        return f"Student: {obj.attempt.student.get_full_name()} | Exam: {obj.attempt.exam.title} | Status: {obj.attempt.status}"

    get_attempt_info.short_description = "Attempt Info"

    def make_visible(self, request, queryset):
        """Make feedback visible to students"""
        updated = queryset.update(is_visible_to_student=True)
        self.message_user(request, f"{updated} feedback(s) made visible.")

    make_visible.short_description = "Make visible to students"

    def make_hidden(self, request, queryset):
        """Hide feedback from students"""
        updated = queryset.update(is_visible_to_student=False)
        self.message_user(request, f"{updated} feedback(s) hidden from students.")

    make_hidden.short_description = "Hide from students"


@admin.register(TeacherUserAnswer)
class TeacherUserAnswerAdmin(admin.ModelAdmin):
    """
    Admin interface for TeacherUserAnswer model
    """

    list_display = [
        "get_student_name",
        "get_exam_title",
        "get_question_order",
        "get_question_type",
        "answer_text",
        "get_correct_answer",
        "is_correct",
    ]
    list_filter = [
        "is_correct",
        "exam_attempt__exam",
        "exam_attempt__student",
        "question__test_head__question_type",
        "created_at",
    ]
    search_fields = [
        "exam_attempt__student__username",
        "exam_attempt__student__first_name",
        "exam_attempt__student__last_name",
        "exam_attempt__exam__title",
        "question__question_text",
        "answer_text",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "get_question_info",
        "get_correct_answer",
    ]
    date_hierarchy = "created_at"
    actions = ["recheck_correctness"]

    fieldsets = (
        (
            "Answer Information",
            {
                "fields": (
                    "exam_attempt",
                    "question",
                    "get_question_info",
                    "answer_text",
                    "get_correct_answer",
                    "is_correct",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_student_name(self, obj):
        """Display student name"""
        return (
            obj.exam_attempt.student.get_full_name()
            or obj.exam_attempt.student.username
        )

    get_student_name.short_description = "Student"
    get_student_name.admin_order_field = "exam_attempt__student__first_name"

    def get_exam_title(self, obj):
        """Display exam title"""
        return obj.exam_attempt.exam.title

    get_exam_title.short_description = "Exam"
    get_exam_title.admin_order_field = "exam_attempt__exam__title"

    def get_question_order(self, obj):
        """Display question number"""
        return f"Q{obj.question.order}"

    get_question_order.short_description = "Question"
    get_question_order.admin_order_field = "question__order"

    def get_question_type(self, obj):
        """Display question type"""
        if obj.question.test_head:
            return obj.question.test_head.get_question_type_display()
        return "-"

    get_question_type.short_description = "Type"

    def get_correct_answer(self, obj):
        """Display correct answer"""
        return obj.question.get_correct_answer() or "-"

    get_correct_answer.short_description = "Correct Answer"

    def get_question_info(self, obj):
        """Display question details"""
        return f"Q{obj.question.order}: {obj.question.question_text[:100]}"

    get_question_info.short_description = "Question Details"

    def recheck_correctness(self, request, queryset):
        """Recheck correctness for selected answers"""
        count = 0
        for answer in queryset:
            answer.check_correctness()
            answer.save()
            count += 1
        self.message_user(request, f"Rechecked {count} answer(s).")

    recheck_correctness.short_description = "Recheck correctness"
