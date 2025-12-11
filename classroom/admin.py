"""
BandBooster Classroom Command: Admin Configuration

Django admin registration for Classroom module models.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Classroom,
    Enrollment,
    AssignmentBundle,
    BundleItem,
    StudentAssignment,
    StudentItemSubmission,
)


class EnrollmentInline(admin.TabularInline):
    """Inline for viewing enrollments within Classroom admin"""

    model = Enrollment
    extra = 0
    readonly_fields = ["enrolled_at", "last_active"]
    fields = ["student", "status", "current_band", "enrolled_at", "last_active"]
    raw_id_fields = ["student"]


class BundleItemInline(admin.TabularInline):
    """Inline for viewing items within AssignmentBundle admin"""

    model = BundleItem
    extra = 0
    fields = ["item_type", "order", "points", "is_required"]


class StudentItemSubmissionInline(admin.TabularInline):
    """Inline for viewing submissions within StudentAssignment admin"""

    model = StudentItemSubmission
    extra = 0
    readonly_fields = ["bundle_item", "status", "band_score", "submitted_at"]
    fields = ["bundle_item", "status", "band_score", "submitted_at"]


@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    """Admin configuration for Classroom model"""

    list_display = [
        "name",
        "teacher",
        "status",
        "student_count_display",
        "invite_enabled",
        "invite_code",
        "created_at",
    ]
    list_filter = ["status", "invite_enabled", "created_at"]
    search_fields = ["name", "teacher__username", "teacher__email", "invite_code"]
    readonly_fields = ["uuid", "created_at", "updated_at"]
    raw_id_fields = ["teacher"]
    inlines = [EnrollmentInline]

    fieldsets = (
        (None, {"fields": ("name", "description", "teacher", "status")}),
        ("Target & Settings", {"fields": ("target_band", "max_students")}),
        (
            "Invite System",
            {
                "fields": ("invite_code", "invite_enabled"),
                "description": "Configure how students join this classroom",
            },
        ),
        (
            "Metadata",
            {"fields": ("uuid", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def student_count_display(self, obj):
        count = obj.student_count
        max_students = obj.max_students
        if count >= max_students:
            return format_html(
                '<span style="color: red;">{}/{}</span>', count, max_students
            )
        return f"{count}/{max_students}"

    student_count_display.short_description = "Students"


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    """Admin configuration for Enrollment model"""

    list_display = [
        "student",
        "classroom",
        "status",
        "current_band",
        "last_active",
        "enrolled_at",
    ]
    list_filter = ["status", "classroom", "enrolled_at"]
    search_fields = [
        "student__username",
        "student__email",
        "classroom__name",
    ]
    readonly_fields = ["uuid", "enrolled_at", "updated_at"]
    raw_id_fields = ["student", "classroom"]

    fieldsets = (
        (None, {"fields": ("student", "classroom", "status")}),
        (
            "Performance",
            {
                "fields": (
                    "current_band",
                    ("listening_band", "reading_band"),
                    ("writing_band", "speaking_band"),
                )
            },
        ),
        ("Activity", {"fields": ("last_active", "notes")}),
        (
            "Metadata",
            {"fields": ("uuid", "enrolled_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(AssignmentBundle)
class AssignmentBundleAdmin(admin.ModelAdmin):
    """Admin configuration for AssignmentBundle model"""

    list_display = [
        "title",
        "classroom",
        "assignment_type",
        "status",
        "total_items",
        "due_date",
        "created_at",
    ]
    list_filter = ["status", "assignment_type", "classroom", "created_at"]
    search_fields = ["title", "classroom__name", "created_by__username"]
    readonly_fields = ["uuid", "created_at", "updated_at", "published_at"]
    raw_id_fields = ["classroom", "created_by"]
    inlines = [BundleItemInline]

    fieldsets = (
        (
            None,
            {"fields": ("title", "description", "classroom", "created_by", "status")},
        ),
        (
            "Assignment Settings",
            {
                "fields": (
                    "assignment_type",
                    ("available_from", "due_date"),
                    ("allow_late_submission", "time_limit_minutes"),
                )
            },
        ),
        (
            "AI Grading",
            {
                "fields": (
                    "teacher_instructions",
                    ("require_teacher_approval", "auto_release_results"),
                )
            },
        ),
        (
            "Differentiation",
            {
                "fields": ("target_min_band", "target_max_band"),
                "classes": ("collapse",),
            },
        ),
        (
            "Metadata",
            {
                "fields": ("uuid", "created_at", "updated_at", "published_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def total_items(self, obj):
        return obj.items.count()

    total_items.short_description = "Items"


@admin.register(BundleItem)
class BundleItemAdmin(admin.ModelAdmin):
    """Admin configuration for BundleItem model"""

    list_display = [
        "bundle",
        "item_type",
        "get_content_title",
        "order",
        "points",
        "is_required",
    ]
    list_filter = ["item_type", "bundle__classroom", "is_required"]
    search_fields = ["bundle__title"]
    readonly_fields = ["uuid", "created_at", "updated_at"]
    raw_id_fields = [
        "bundle",
        "mock_exam",
        "teacher_exam",
        "writing_task",
        "speaking_topic",
        "reading_passage",
        "listening_part",
    ]

    fieldsets = (
        (None, {"fields": ("bundle", "item_type", "order", "points", "is_required")}),
        (
            "Content Reference",
            {
                "fields": (
                    "mock_exam",
                    "teacher_exam",
                    "writing_task",
                    "speaking_topic",
                    "reading_passage",
                    "listening_part",
                ),
                "description": "Select ONE content item based on the item type",
            },
        ),
        ("Instructions", {"fields": ("item_instructions",)}),
        (
            "Metadata",
            {"fields": ("uuid", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(StudentAssignment)
class StudentAssignmentAdmin(admin.ModelAdmin):
    """Admin configuration for StudentAssignment model"""

    list_display = [
        "student",
        "bundle",
        "status",
        "band_score",
        "ai_tentative_score",
        "is_late",
        "submitted_at",
    ]
    list_filter = [
        "status",
        "bundle__classroom",
        "is_late",
        "score_overridden",
        "results_visible",
    ]
    search_fields = [
        "student__username",
        "student__email",
        "bundle__title",
    ]
    readonly_fields = [
        "uuid",
        "created_at",
        "updated_at",
        "started_at",
        "submitted_at",
        "ai_processed_at",
        "teacher_reviewed_at",
        "completed_at",
    ]
    raw_id_fields = ["bundle", "student", "teacher_reviewed_by"]
    inlines = [StudentItemSubmissionInline]

    fieldsets = (
        (None, {"fields": ("student", "bundle", "status")}),
        (
            "Scores",
            {
                "fields": (
                    ("ai_tentative_score", "band_score"),
                    "overall_score",
                    "score_overridden",
                )
            },
        ),
        ("AI Feedback", {"fields": ("ai_feedback",), "classes": ("collapse",)}),
        (
            "Teacher Review",
            {
                "fields": (
                    "teacher_feedback",
                    "teacher_reviewed_by",
                )
            },
        ),
        (
            "Timing",
            {
                "fields": (
                    "started_at",
                    "submitted_at",
                    "ai_processed_at",
                    "teacher_reviewed_at",
                    "completed_at",
                )
            },
        ),
        ("Flags", {"fields": ("is_late", "results_visible")}),
        ("Progress", {"fields": ("item_progress",), "classes": ("collapse",)}),
        (
            "Metadata",
            {"fields": ("uuid", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(StudentItemSubmission)
class StudentItemSubmissionAdmin(admin.ModelAdmin):
    """Admin configuration for StudentItemSubmission model"""

    list_display = [
        "student_assignment",
        "bundle_item",
        "status",
        "band_score",
        "word_count",
        "submitted_at",
    ]
    list_filter = ["status", "bundle_item__item_type"]
    search_fields = [
        "student_assignment__student__username",
        "student_assignment__bundle__title",
    ]
    readonly_fields = ["uuid", "created_at", "updated_at", "started_at", "submitted_at"]
    raw_id_fields = ["student_assignment", "bundle_item"]

    fieldsets = (
        (None, {"fields": ("student_assignment", "bundle_item", "status")}),
        (
            "Writing Content",
            {"fields": ("writing_answer", "word_count"), "classes": ("collapse",)},
        ),
        (
            "Speaking Content",
            {
                "fields": ("speaking_audio", "speaking_transcript"),
                "classes": ("collapse",),
            },
        ),
        ("Objective Answers", {"fields": ("answers_json",), "classes": ("collapse",)}),
        (
            "Scoring",
            {
                "fields": (
                    ("score", "max_score"),
                    "band_score",
                    "teacher_score_override",
                )
            },
        ),
        (
            "Feedback",
            {
                "fields": (
                    "ai_feedback",
                    "ai_inline_corrections",
                    "teacher_feedback",
                ),
                "classes": ("collapse",),
            },
        ),
        ("Timing", {"fields": ("time_spent_seconds", "started_at", "submitted_at")}),
        (
            "Metadata",
            {"fields": ("uuid", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )
