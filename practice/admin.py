from django.contrib import admin
from .models import SectionPractice, SectionPracticeAttempt


@admin.register(SectionPractice)
class SectionPracticeAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "section_type",
        "difficulty",
        "total_questions",
        "is_active",
        "is_free",
        "order",
        "created_at",
    ]
    list_filter = ["section_type", "difficulty", "is_active", "is_free"]
    search_fields = ["title", "description"]
    ordering = ["section_type", "order", "-created_at"]
    readonly_fields = ["uuid", "created_at", "updated_at"]

    fieldsets = (
        (None, {"fields": ("title", "description", "section_type", "difficulty")}),
        (
            "Content",
            {
                "fields": (
                    "reading_passage",
                    "listening_part",
                    "writing_task",
                    "speaking_topic",
                ),
                "description": "Link to the appropriate content based on section type",
            },
        ),
        (
            "Settings",
            {
                "fields": (
                    "duration_minutes",
                    "total_questions",
                    "is_active",
                    "is_free",
                    "order",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": ("uuid", "created_by", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )


@admin.register(SectionPracticeAttempt)
class SectionPracticeAttemptAdmin(admin.ModelAdmin):
    list_display = [
        "student",
        "practice",
        "status",
        "score",
        "correct_answers",
        "total_questions",
        "started_at",
        "completed_at",
    ]
    list_filter = ["status", "practice__section_type"]
    search_fields = ["student__username", "practice__title"]
    ordering = ["-started_at"]
    readonly_fields = [
        "uuid",
        "started_at",
        "completed_at",
        "time_spent_seconds",
        "answers",
    ]

    fieldsets = (
        (None, {"fields": ("practice", "student", "status")}),
        (
            "Results",
            {"fields": ("score", "correct_answers", "total_questions", "answers")},
        ),
        ("Timing", {"fields": ("started_at", "completed_at", "time_spent_seconds")}),
        (
            "AI Feedback",
            {
                "fields": ("ai_feedback", "ai_evaluation"),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("uuid",),
                "classes": ("collapse",),
            },
        ),
    )
