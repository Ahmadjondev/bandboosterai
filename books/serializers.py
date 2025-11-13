from rest_framework import serializers
from django.db.models import Count
from .models import Book, BookSection, UserBookProgress, UserSectionResult
from ielts.serializers import ReadingPassageSerializer, ListeningPartSerializer


class BookSerializer(serializers.ModelSerializer):
    """
    Serializer for Book model
    """

    level_display = serializers.CharField(source="get_level_display", read_only=True)
    enrolled_count = serializers.SerializerMethodField()
    average_progress = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "description",
            "cover_image",
            "level",
            "level_display",
            "total_sections",
            "author",
            "publisher",
            "publication_year",
            "is_active",
            "enrolled_count",
            "average_progress",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_enrolled_count(self, obj):
        """Get number of users who have started this book"""
        return obj.user_progress.filter(is_started=True).count()

    def get_average_progress(self, obj):
        """Get average progress percentage across all users"""
        from django.db.models import Avg

        avg = obj.user_progress.filter(is_started=True).aggregate(Avg("percentage"))[
            "percentage__avg"
        ]
        return round(avg, 2) if avg else 0.0


class BookSectionSerializer(serializers.ModelSerializer):
    """
    Serializer for BookSection model
    """

    section_type_display = serializers.CharField(
        source="get_section_type_display", read_only=True
    )
    title = serializers.SerializerMethodField()
    # content = serializers.SerializerMethodField()
    user_status = serializers.SerializerMethodField()

    class Meta:
        model = BookSection
        fields = [
            "id",
            "book",
            "title",
            "section_type",
            "section_type_display",
            "order",
            "description",
            "total_questions",
            "duration_minutes",
            "is_locked",
            # "content",
            "user_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_title(self, obj):
        """Get the section title (auto-generated if empty)"""
        return obj.get_title()

    def get_content(self, obj):
        """Get the linked content (ReadingPassage or ListeningPart)"""
        if obj.section_type == "READING" and obj.reading_passage:
            return {
                "type": "reading",
                "data": ReadingPassageSerializer(obj.reading_passage).data,
            }
        elif obj.section_type == "LISTENING" and obj.listening_part:
            return {
                "type": "listening",
                "data": ListeningPartSerializer(obj.listening_part).data,
            }
        return None

    def get_user_status(self, obj):
        """Get user's status for this section with score and attempt count"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return {
                "completed": False,
                "score": None,
                "attempt_count": 0,
                "is_accessible": not obj.is_locked,  # First section is always accessible if not locked
            }

        # Get all results for this section
        all_results = UserSectionResult.objects.filter(user=request.user, section=obj)
        attempt_count = all_results.count()
        # Check if user has completed this section
        completed_result = all_results.filter(is_completed=True).first()

        if completed_result:
            return {
                "completed": True,
                "score": (
                    float(completed_result.score) if completed_result.score else None
                ),
                "attempt_count": attempt_count,
                "is_accessible": True,  # Completed sections are always accessible
            }

        # Check if section is locked and previous section requirements
        is_accessible = True
        if obj.is_locked:
            # Check if previous section is completed
            previous_section = (
                BookSection.objects.filter(book=obj.book, order__lt=obj.order)
                .order_by("-order")
                .first()
            )
            if previous_section:
                previous_result = UserSectionResult.objects.filter(
                    user=request.user, section=previous_section, is_completed=True
                ).exists()
                is_accessible = previous_result
            else:
                # No previous section, first section is accessible
                is_accessible = True

        # Section is not completed but may or may not be accessible
        return {
            "completed": False,
            "score": None,
            "attempt_count": attempt_count,
            "is_accessible": is_accessible,
        }


class BookSectionDetailSerializer(BookSectionSerializer):
    """
    Detailed serializer for BookSection with full content
    """

    reading_passage = ReadingPassageSerializer(read_only=True)
    listening_part = ListeningPartSerializer(read_only=True)
    book = serializers.SerializerMethodField()
    total_question = serializers.SerializerMethodField()

    class Meta(BookSectionSerializer.Meta):
        fields = BookSectionSerializer.Meta.fields + [
            "reading_passage",
            "listening_part",
            "total_question",
        ]

    def question_count(self, obj):
        return ""

    def get_total_question(self, obj):
        """Return total questions for this book section.

        Prefer the stored `total_questions` field on the BookSection. If it's
        not set (0), attempt to compute from the linked content (reading
        passage or listening part) by aggregating questions on its test heads.
        """
        # Use stored field if available
        if getattr(obj, "total_questions", None):
            return obj.total_questions

        # Try to compute from linked content
        content = obj.get_content()
        if content:
            try:
                total = content.test_heads.aggregate(total=Count("questions"))["total"]
                return total or 0
            except Exception:
                return 0

        return 0

    def get_book(self, obj):
        """Get minimal book info"""
        return {
            "id": obj.book.id,
            "title": obj.book.title,
        }


class UserBookProgressSerializer(serializers.ModelSerializer):
    """
    Serializer for UserBookProgress model
    """

    book = BookSerializer(read_only=True)
    book_id = serializers.IntegerField(write_only=True)
    status = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()

    class Meta:
        model = UserBookProgress
        fields = [
            "id",
            "user",
            "book",
            "book_id",
            "completed_sections",
            "total_score",
            "average_score",
            "percentage",
            "is_started",
            "is_completed",
            "status",
            "time_remaining",
            "last_accessed",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "completed_sections",
            "total_score",
            "average_score",
            "percentage",
            "is_started",
            "is_completed",
            "last_accessed",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def get_status(self, obj):
        """Get current status message"""
        if obj.is_completed:
            return "completed"
        elif obj.is_started:
            remaining = obj.book.total_sections - obj.completed_sections
            return f"in_progress - {remaining} sections remaining"
        else:
            return "not_started"

    def get_time_remaining(self, obj):
        """Estimate time remaining to complete the book"""
        if obj.is_completed:
            return 0

        remaining_sections = obj.book.total_sections - obj.completed_sections
        # Assume average 60 minutes per section
        return remaining_sections * 60


class UserSectionResultSerializer(serializers.ModelSerializer):
    """
    Serializer for UserSectionResult model
    """

    section = serializers.SerializerMethodField()
    section_id = serializers.IntegerField(write_only=True)
    user_display = serializers.SerializerMethodField()
    book = serializers.SerializerMethodField()
    attempt_count = serializers.SerializerMethodField()

    class Meta:
        model = UserSectionResult
        fields = [
            "id",
            "user",
            "user_display",
            "section",
            "section_id",
            "book",
            "score",
            "correct_answers",
            "total_questions",
            "accuracy_percentage",
            "answers",
            "time_spent",
            "is_completed",
            "attempt_count",
            "attempt_date",
            "completed_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "accuracy_percentage",
            "attempt_date",
            "completed_at",
            "updated_at",
        ]

    def get_section(self, obj):
        """Get minimal section info"""
        return {
            "id": obj.section.id,
            "title": obj.section.get_title(),
            "order": obj.section.order,
        }

    def get_book(self, obj):
        """Get minimal book info"""
        return {
            "id": obj.section.book.id,
            "title": obj.section.book.title,
        }

    def get_user_display(self, obj):
        """Get user's full name or username"""
        return obj.user.get_full_name() or obj.user.username

    def get_attempt_count(self, obj):
        """Get total number of attempts for this section"""
        return UserSectionResult.objects.filter(
            user=obj.user, section=obj.section
        ).count()


class BookWithProgressSerializer(serializers.ModelSerializer):
    """
    Book serializer with user progress information
    """

    level_display = serializers.CharField(source="get_level_display", read_only=True)
    user_progress = serializers.SerializerMethodField()
    # sections = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "description",
            "cover_image",
            "level",
            "level_display",
            "total_sections",
            "author",
            "publisher",
            "publication_year",
            "is_active",
            "user_progress",
            # "sections",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    # def get_sections(self, obj):
    #     """Get minimal section info - only for detail view"""
    #     # Check if this is a detail view (single book) or list view (multiple books)
    #     request = self.context.get("request")
    #     # If we're serializing a single book (detail view), include sections
    #     # If we're serializing many books (list view), skip sections
    #     if self.context.get("include_sections", False):
    #         return BookSectionSerializer(
    #             obj.sections.all().order_by("order"), many=True, context=self.context
    #         ).data
    #     return []

    def get_user_progress(self, obj):
        """Get user's progress for this book"""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        try:
            progress = UserBookProgress.objects.get(user=request.user, book=obj)
            return {
                "completed_sections": progress.completed_sections,
                "total_sections": obj.total_sections,
                "percentage": float(progress.percentage),
                "average_score": (
                    float(progress.average_score) if progress.average_score else None
                ),
                "is_started": progress.is_started,
                "is_completed": progress.is_completed,
                "last_accessed": progress.last_accessed,
            }
        except UserBookProgress.DoesNotExist:
            return {
                "completed_sections": 0,
                "total_sections": obj.total_sections,
                "percentage": 0.0,
                "average_score": None,
                "is_started": False,
                "is_completed": False,
                "last_accessed": None,
            }


class SectionResultCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating section results with automatic score calculation
    """

    class Meta:
        model = UserSectionResult
        fields = [
            "section",
            "answers",  # Now only need answers and time_spent
            "time_spent",
        ]

    def create(self, validated_data):
        """Create a section result with automatic score calculation"""
        from .api_views import _calculate_section_score

        user = self.context["request"].user
        section = validated_data["section"]
        user_answers = validated_data.get("answers", {})
        time_spent = validated_data.get("time_spent")

        # Calculate scores using the same logic as exam scoring
        score_data = _calculate_section_score(section, user_answers)

        # Check if result already exists
        result, created = UserSectionResult.objects.get_or_create(
            user=user,
            section=section,
            defaults={
                "answers": user_answers,
                "time_spent": time_spent,
                "correct_answers": score_data["correct_answers"],
                "total_questions": score_data["total_questions"],
                "score": score_data["band_score"],
            },
        )

        if not created:
            # Update existing result
            result.answers = user_answers
            result.time_spent = time_spent
            result.correct_answers = score_data["correct_answers"]
            result.total_questions = score_data["total_questions"]
            result.score = score_data["band_score"]
            result.save()

        # Mark as completed and calculate accuracy
        result.mark_completed()

        return result
