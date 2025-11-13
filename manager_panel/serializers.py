"""
Manager Panel Serializers
Serializers for REST API endpoints
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from ielts.models import (
    MockExam,
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
    TestHead,
    Question,
    Choice,
    Exam,
    ExamAttempt,
)

User = get_user_model()


# ============================================================================
# USER SERIALIZERS
# ============================================================================


class UserSerializer(serializers.ModelSerializer):
    """Basic user information"""

    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "role",
            "role_display",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]


class UserDetailSerializer(UserSerializer):
    """Detailed user information"""

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + [
            "date_of_birth",
            "profile_image",
            "created_at",
            "updated_at",
        ]


# ============================================================================
# EXAM SERIALIZERS
# ============================================================================


class MockExamSerializer(serializers.ModelSerializer):
    """Mock exam serializer"""

    exam_type_display = serializers.CharField(
        source="get_exam_type_display", read_only=True
    )
    difficulty_display = serializers.CharField(
        source="get_difficulty_level_display", read_only=True
    )
    attempt_count = serializers.IntegerField(read_only=True, default=0)
    default_duration = serializers.SerializerMethodField()

    class Meta:
        model = MockExam
        fields = [
            "id",
            "title",
            "exam_type",
            "exam_type_display",
            "description",
            "duration_minutes",
            "default_duration",
            "difficulty_level",
            "difficulty_display",
            "is_active",
            "attempt_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "duration_minutes": {"required": False, "allow_null": True},
        }

    def get_default_duration(self, obj):
        """Get the default IELTS duration for this exam type."""
        return obj.get_default_duration()


class ChoiceSerializer(serializers.ModelSerializer):
    """Choice serializer for questions"""

    class Meta:
        model = Choice
        fields = ["id", "choice_text", "is_correct"]


class QuestionSerializer(serializers.ModelSerializer):
    """Question serializer"""

    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "test_head",
            "order",
            "question_text",
            "correct_answer_text",
            "answer_two_text",
            "answer_three_text",
            "choices",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TestHeadSerializer(serializers.ModelSerializer):
    """Test head (question group) serializer"""

    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TestHead
        fields = [
            "id",
            "listening",
            "reading",
            "title",
            "description",
            "question_type",
            "question_data",
            "picture",
            "questions",
            "question_count",
        ]
        read_only_fields = ["id", "question_count"]


class ReadingPassageSerializer(serializers.ModelSerializer):
    """Reading passage serializer"""

    test_heads = TestHeadSerializer(many=True, read_only=True)

    class Meta:
        model = ReadingPassage
        fields = [
            "id",
            "passage_number",
            "title",
            "summary",
            "content",
            "word_count",
            "created_at",
            "updated_at",
            "test_heads",
        ]
        read_only_fields = ["id", "word_count", "created_at", "updated_at"]


class ListeningPartSerializer(serializers.ModelSerializer):
    """Listening part serializer (lightweight for list/create/update)"""

    # Annotated fields from the queryset
    num_heads = serializers.IntegerField(read_only=True, default=0)
    num_questions = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ListeningPart
        fields = [
            "id",
            "part_number",
            "title",
            "description",
            "audio_file",
            "duration_seconds",
            "transcript",
            "created_at",
            "updated_at",
            "num_heads",
            "num_questions",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ListeningPartDetailSerializer(ListeningPartSerializer):
    """Listening part detail serializer with nested test heads"""

    test_heads = TestHeadSerializer(many=True, read_only=True)

    class Meta(ListeningPartSerializer.Meta):
        fields = ListeningPartSerializer.Meta.fields + ["test_heads"]


class WritingTaskSerializer(serializers.ModelSerializer):
    """Writing task serializer"""

    task_type_display = serializers.CharField(
        source="get_task_type_display", read_only=True
    )

    class Meta:
        model = WritingTask
        fields = [
            "id",
            "task_type",
            "task_type_display",
            "prompt",
            "picture",
            "data",
            "min_words",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SpeakingTopicSerializer(serializers.ModelSerializer):
    """Speaking topic serializer"""

    speaking_type_display = serializers.CharField(
        source="get_speaking_type_display", read_only=True
    )

    class Meta:
        model = SpeakingTopic
        fields = [
            "id",
            "topic",
            "speaking_type",
            "speaking_type_display",
            "question",
            "cue_card",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ExamResultSerializer removed - ExamResult model no longer exists
# Use ExamAttempt directly for result tracking


# ============================================================================
# DASHBOARD SERIALIZERS
# ============================================================================


class DashboardStatsSerializer(serializers.Serializer):
    """Dashboard statistics"""

    total_students = serializers.IntegerField()
    active_students = serializers.IntegerField()
    total_exams = serializers.IntegerField()
    total_results = serializers.IntegerField()
    average_score = serializers.FloatField()
    recent_students = UserSerializer(many=True)
    # recent_results = ExamResultSerializer(many=True)  # Removed - use ExamAttempt


# ============================================================================
# MOCK EXAM DETAIL SERIALIZER (After all dependencies are defined)
# ============================================================================


class MockExamDetailSerializer(MockExamSerializer):
    """Detailed mock exam serializer with nested content"""

    reading_passages = ReadingPassageSerializer(many=True, read_only=True)
    listening_parts = ListeningPartSerializer(many=True, read_only=True)
    writing_tasks = WritingTaskSerializer(many=True, read_only=True)
    speaking_topics = SpeakingTopicSerializer(many=True, read_only=True)

    class Meta(MockExamSerializer.Meta):
        fields = MockExamSerializer.Meta.fields + [
            "reading_passages",
            "listening_parts",
            "writing_tasks",
            "speaking_topics",
        ]


# ============================================================================
# EXAM (SCHEDULED EXAM) SERIALIZERS
# ============================================================================


class ExamSerializer(serializers.ModelSerializer):
    """Serializer for scheduled exams"""

    mock_test_title = serializers.CharField(source="mock_test.title", read_only=True)
    mock_test_type = serializers.CharField(source="mock_test.exam_type", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    # Make price and max_students optional (allow null/blank for free exams and unlimited enrollment)
    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="Leave empty for free exam",
    )
    max_students = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        help_text="Leave empty for unlimited enrollment",
    )

    # Use SerializerMethodField for model properties to avoid annotation conflicts
    enrolled_count = serializers.SerializerMethodField()
    available_slots = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            "id",
            "name",
            "mock_test",
            "mock_test_title",
            "mock_test_type",
            "price",
            "start_date",
            "expire_date",
            "pin_code",
            "max_students",
            "status",
            "description",
            "enrolled_count",
            "available_slots",
            "is_full",
            "is_active",
            "is_upcoming",
            "is_expired",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        """Get creator's full name"""
        if obj.created_by:
            return (
                f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
                or obj.created_by.username
            )
        return None

    def get_enrolled_count(self, obj):
        """Get number of enrolled students"""
        return obj.enrolled_count

    def get_available_slots(self, obj):
        """Get available slots"""
        return obj.available_slots

    def get_is_full(self, obj):
        """Check if exam is full"""
        return obj.is_full

    def get_is_active(self, obj):
        """Check if exam is active"""
        return obj.is_active

    def get_is_upcoming(self, obj):
        """Check if exam is upcoming"""
        return obj.is_upcoming

    def get_is_expired(self, obj):
        """Check if exam is expired"""
        return obj.is_expired


class ExamDetailSerializer(ExamSerializer):
    """Detailed exam serializer with enrolled students"""

    mock_test_details = MockExamSerializer(source="mock_test", read_only=True)
    enrolled_students = UserSerializer(many=True, read_only=True)

    class Meta(ExamSerializer.Meta):
        fields = ExamSerializer.Meta.fields + [
            "mock_test_details",
            "enrolled_students",
        ]
