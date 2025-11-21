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
        "mock_exam",
        "is_public",
        "start_date",
        "end_date",
        "created_at",
    ]
    list_filter = ["status", "is_public", "created_at", "teacher"]
    search_fields = ["title", "description", "teacher__username", "teacher__email"]
    readonly_fields = ["uuid", "created_at", "updated_at"]
    filter_horizontal = ["assigned_students"]

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


@admin.register(TeacherExamAttempt)
class TeacherExamAttemptAdmin(admin.ModelAdmin):
    """
    Admin interface for TeacherExamAttempt model
    """

    list_display = [
        "student",
        "exam",
        "status",
        "overall_band",
        "started_at",
        "submitted_at",
        "graded_at",
    ]
    list_filter = ["status", "exam", "created_at"]
    search_fields = [
        "student__username",
        "student__email",
        "exam__title",
    ]
    readonly_fields = [
        "uuid",
        "overall_band",
        "created_at",
        "updated_at",
        "get_duration",
    ]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "uuid",
                    "exam",
                    "student",
                    "status",
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

    def get_duration(self, obj):
        """Display attempt duration"""
        duration = obj.get_duration_minutes()
        if duration:
            return f"{duration} minutes"
        return "-"

    get_duration.short_description = "Duration"


@admin.register(TeacherFeedback)
class TeacherFeedbackAdmin(admin.ModelAdmin):
    """
    Admin interface for TeacherFeedback model
    """

    list_display = [
        "teacher",
        "attempt",
        "feedback_type",
        "is_visible_to_student",
        "created_at",
    ]
    list_filter = ["feedback_type", "is_visible_to_student", "created_at", "teacher"]
    search_fields = [
        "teacher__username",
        "attempt__student__username",
        "attempt__exam__title",
        "comment",
    ]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "attempt",
                    "teacher",
                    "feedback_type",
                    "comment",
                )
            },
        ),
        (
            "Detailed Criteria (Optional)",
            {
                "fields": (
                    "task_achievement",
                    "coherence_cohesion",
                    "lexical_resource",
                    "grammatical_range",
                    "pronunciation",
                    "fluency_coherence",
                ),
                "classes": ("collapse",),
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


@admin.register(TeacherUserAnswer)
class TeacherUserAnswerAdmin(admin.ModelAdmin):
    """
    Admin interface for TeacherUserAnswer model
    """

    list_display = [
        "exam_attempt",
        "question",
        "answer_text",
        "is_correct",
        "created_at",
    ]
    list_filter = ["is_correct", "created_at"]
    search_fields = [
        "exam_attempt__student__username",
        "exam_attempt__exam__title",
        "question__question_text",
        "answer_text",
    ]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Answer Information",
            {
                "fields": (
                    "exam_attempt",
                    "question",
                    "answer_text",
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
