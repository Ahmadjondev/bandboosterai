from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Avg
from .models import Book, BookSection, UserBookProgress, UserSectionResult


class BookSectionInline(admin.TabularInline):
    model = BookSection
    extra = 0
    fields = (
        "order",
        "title",
        "section_type",
        "reading_passage",
        "listening_part",
        "is_locked",
    )
    ordering = ("order",)
    show_change_link = True


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "level",
        "total_sections",
        "get_enrolled_users",
        "is_active",
        "created_at",
    )
    list_filter = ("level", "is_active", "created_at")
    search_fields = ("title", "author", "publisher", "description")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "get_statistics")
    inlines = [BookSectionInline]
    list_per_page = 25

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("title", "description", "cover_image", "level")},
        ),
        (
            "Book Details",
            {"fields": ("author", "publisher", "publication_year")},
        ),
        (
            "Status & Sections",
            {"fields": ("is_active", "total_sections")},
        ),
        (
            "Statistics",
            {
                "fields": ("get_statistics", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            enrolled_count=Count("user_progress", distinct=True),
            avg_progress=Avg("user_progress__percentage"),
        )

    def get_enrolled_users(self, obj):
        count = getattr(obj, "enrolled_count", 0)
        if count > 0:
            return format_html("<strong>{}</strong> users", count)
        return "0"

    get_enrolled_users.short_description = "Enrolled"
    get_enrolled_users.admin_order_field = "enrolled_count"

    def get_statistics(self, obj):
        if not obj.pk:
            return "-"

        stats = []
        stats.append(f"<strong>Total Sections:</strong> {obj.total_sections}")

        # Get enrolled users
        enrolled = obj.user_progress.count()
        stats.append(f"<strong>Enrolled Users:</strong> {enrolled}")

        # Get average progress
        if enrolled > 0:
            avg_progress = obj.user_progress.aggregate(Avg("percentage"))[
                "percentage__avg"
            ]
            if avg_progress:
                stats.append(f"<strong>Average Progress:</strong> {avg_progress:.1f}%")

        # Get completion count
        completed = obj.user_progress.filter(is_completed=True).count()
        stats.append(f"<strong>Completed:</strong> {completed} users")

        return format_html("<br>".join(stats))

    get_statistics.short_description = "Statistics"


@admin.register(BookSection)
class BookSectionAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "get_book",
        "section_type",
        "order",
        "total_questions",
        "is_locked",
    )
    list_filter = ("section_type", "book__level", "is_locked", "book")
    search_fields = ("title", "description", "book__title")
    ordering = ("book", "order")
    readonly_fields = ("created_at", "updated_at", "total_questions")
    list_per_page = 30

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("book", "title", "section_type", "order")},
        ),
        (
            "Content Link",
            {
                "fields": ("reading_passage", "listening_part"),
                "description": "Link to existing reading passage or listening part",
            },
        ),
        (
            "Section Details",
            {
                "fields": (
                    "description",
                    "total_questions",
                    "duration_minutes",
                    "is_locked",
                )
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("book", "reading_passage", "listening_part")

    def get_book(self, obj):
        return format_html(
            '<a href="{}">{}</a>',
            f"/admin/books/book/{obj.book.id}/change/",
            obj.book.title,
        )

    get_book.short_description = "Book"
    get_book.admin_order_field = "book__title"


@admin.register(UserBookProgress)
class UserBookProgressAdmin(admin.ModelAdmin):
    list_display = (
        "get_user",
        "get_book",
        "get_progress_bar",
        "completed_sections",
        "average_score",
        "is_completed",
        "last_accessed",
    )
    list_filter = ("is_completed", "is_started", "book__level", "last_accessed")
    search_fields = ("user__username", "user__email", "book__title")
    ordering = ("-last_accessed",)
    readonly_fields = (
        "created_at",
        "updated_at",
        "last_accessed",
        "completed_sections",
        "total_score",
        "percentage",
    )
    list_per_page = 30
    date_hierarchy = "last_accessed"

    fieldsets = (
        (
            "User & Book",
            {"fields": ("user", "book")},
        ),
        (
            "Progress",
            {
                "fields": (
                    "completed_sections",
                    "percentage",
                    "total_score",
                    "average_score",
                )
            },
        ),
        (
            "Status",
            {"fields": ("is_started", "is_completed", "started_at", "completed_at")},
        ),
        (
            "Timestamps",
            {
                "fields": ("last_accessed", "created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("user", "book")

    def get_user(self, obj):
        return obj.user.get_full_name() or obj.user.username

    get_user.short_description = "User"
    get_user.admin_order_field = "user__username"

    def get_book(self, obj):
        return obj.book.title

    get_book.short_description = "Book"
    get_book.admin_order_field = "book__title"

    def get_progress_bar(self, obj):
        percentage = obj.percentage
        color = "green" if percentage >= 75 else "orange" if percentage >= 50 else "red"
        return format_html(
            '<div style="width: 100px; background: #f0f0f0; border-radius: 5px;">'
            '<div style="width: {}%; height: 20px; background: {}; border-radius: 5px; text-align: center; color: white; font-size: 11px; line-height: 20px;">{:.0f}%</div>'
            "</div>",
            percentage,
            color,
            percentage,
        )

    get_progress_bar.short_description = "Progress"
    get_progress_bar.admin_order_field = "percentage"


@admin.register(UserSectionResult)
class UserSectionResultAdmin(admin.ModelAdmin):
    list_display = (
        "get_user",
        "get_section",
        "score",
        "get_accuracy",
        "time_spent",
        "is_completed",
        "attempt_date",
    )
    list_filter = ("is_completed", "section__section_type", "attempt_date")
    search_fields = (
        "user__username",
        "user__email",
        "section__title",
        "section__book__title",
    )
    ordering = ("-attempt_date",)
    readonly_fields = (
        "attempt_date",
        "completed_at",
        "updated_at",
        "accuracy_percentage",
    )
    list_per_page = 30
    date_hierarchy = "attempt_date"

    fieldsets = (
        (
            "User & Section",
            {"fields": ("user", "section")},
        ),
        (
            "Results",
            {
                "fields": (
                    "score",
                    "correct_answers",
                    "total_questions",
                    "accuracy_percentage",
                )
            },
        ),
        (
            "Details",
            {
                "fields": ("answers", "time_spent", "is_completed"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("attempt_date", "completed_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("user", "section", "section__book")

    def get_user(self, obj):
        return obj.user.get_full_name() or obj.user.username

    get_user.short_description = "User"
    get_user.admin_order_field = "user__username"

    def get_section(self, obj):
        return f"{obj.section.book.title} - {obj.section.title}"

    get_section.short_description = "Section"

    def get_accuracy(self, obj):
        if obj.total_questions > 0:
            accuracy = obj.accuracy_percentage
            color = "green" if accuracy >= 75 else "orange" if accuracy >= 50 else "red"
            return format_html(
                '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
                color,
                accuracy,
            )
        return "-"

    get_accuracy.short_description = "Accuracy"
    get_accuracy.admin_order_field = "accuracy_percentage"
