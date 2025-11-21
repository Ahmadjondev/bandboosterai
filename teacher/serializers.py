from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TeacherExam, TeacherExamAttempt, TeacherFeedback
from ielts.models import MockExam

User = get_user_model()


class TeacherBasicSerializer(serializers.ModelSerializer):
    """Basic teacher information"""

    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "email", "profile_image"]
        read_only_fields = fields


class StudentBasicSerializer(serializers.ModelSerializer):
    """Basic student information"""

    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "email", "profile_image"]
        read_only_fields = fields


class MockExamBasicSerializer(serializers.ModelSerializer):
    """Basic mock exam information"""

    exam_type_display = serializers.CharField(
        source="get_exam_type_display", read_only=True
    )

    class Meta:
        model = MockExam
        fields = [
            "id",
            "uuid",
            "title",
            "exam_type",
            "exam_type_display",
            "difficulty_level",
            "duration_minutes",
        ]
        read_only_fields = fields


class TeacherExamSerializer(serializers.ModelSerializer):
    """Serializer for TeacherExam model"""

    teacher = TeacherBasicSerializer(read_only=True)
    mock_exam = MockExamBasicSerializer(read_only=True)
    mock_exam_id = serializers.PrimaryKeyRelatedField(
        queryset=MockExam.objects.all(),
        source="mock_exam",
        write_only=True,
        required=False,
        allow_null=True,
    )
    assigned_students_count = serializers.IntegerField(
        source="assigned_students.count", read_only=True
    )
    is_active = serializers.BooleanField(read_only=True)
    total_attempts = serializers.IntegerField(read_only=True)
    completed_attempts = serializers.IntegerField(read_only=True)

    class Meta:
        model = TeacherExam
        fields = [
            "id",
            "uuid",
            "teacher",
            "title",
            "description",
            "mock_exam",
            "mock_exam_id",
            "start_date",
            "end_date",
            "duration_minutes",
            "is_public",
            "access_code",
            "assigned_students_count",
            "status",
            "auto_grade_reading",
            "auto_grade_listening",
            "is_active",
            "total_attempts",
            "completed_attempts",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "teacher", "created_at", "updated_at"]

    def create(self, validated_data):
        # Set teacher from request context
        validated_data["teacher"] = self.context["request"].user
        return super().create(validated_data)


class TeacherExamDetailSerializer(TeacherExamSerializer):
    """Detailed serializer with assigned students"""

    assigned_students = StudentBasicSerializer(many=True, read_only=True)

    class Meta(TeacherExamSerializer.Meta):
        fields = TeacherExamSerializer.Meta.fields + ["assigned_students"]


class TeacherFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for TeacherFeedback model"""

    teacher = TeacherBasicSerializer(read_only=True)

    class Meta:
        model = TeacherFeedback
        fields = [
            "id",
            "attempt",
            "teacher",
            "feedback_type",
            "comment",
            "task_achievement",
            "coherence_cohesion",
            "lexical_resource",
            "grammatical_range",
            "pronunciation",
            "fluency_coherence",
            "is_visible_to_student",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "teacher", "created_at", "updated_at"]

    def create(self, validated_data):
        # Set teacher from request context
        validated_data["teacher"] = self.context["request"].user
        return super().create(validated_data)


class TeacherExamAttemptSerializer(serializers.ModelSerializer):
    """Serializer for TeacherExamAttempt model"""

    student = StudentBasicSerializer(read_only=True)
    exam = TeacherExamSerializer(read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    feedback_count = serializers.IntegerField(
        source="teacher_feedbacks.count", read_only=True
    )

    class Meta:
        model = TeacherExamAttempt
        fields = [
            "id",
            "uuid",
            "exam",
            "student",
            "status",
            "started_at",
            "submitted_at",
            "graded_at",
            "listening_score",
            "reading_score",
            "writing_score",
            "speaking_score",
            "overall_band",
            "detailed_scores",
            "strengths",
            "weaknesses",
            "duration_minutes",
            "is_overdue",
            "feedback_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "uuid",
            "student",
            "exam",
            "started_at",
            "submitted_at",
            "overall_band",
            "created_at",
            "updated_at",
        ]

    def get_duration_minutes(self, obj):
        return obj.get_duration_minutes()


class TeacherExamAttemptDetailSerializer(TeacherExamAttemptSerializer):
    """Detailed serializer with feedback"""

    teacher_feedbacks = TeacherFeedbackSerializer(many=True, read_only=True)

    class Meta(TeacherExamAttemptSerializer.Meta):
        fields = TeacherExamAttemptSerializer.Meta.fields + ["teacher_feedbacks"]


class StudentResultSerializer(serializers.Serializer):
    """
    Serializer for student result view
    Combines attempt data with analysis
    """

    student = StudentBasicSerializer()
    attempt = TeacherExamAttemptDetailSerializer()
    section_analysis = serializers.DictField()
    recommendations = serializers.ListField()


class DashboardStatsSerializer(serializers.Serializer):
    """
    Serializer for teacher dashboard statistics
    """

    total_exams = serializers.IntegerField()
    active_exams = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_attempts = serializers.IntegerField()
    completed_attempts = serializers.IntegerField()
    pending_grading = serializers.IntegerField()
    average_score = serializers.DecimalField(max_digits=3, decimal_places=1)
    recent_activities = serializers.ListField()


class ExamPerformanceSummarySerializer(serializers.Serializer):
    """
    Summary of exam performance for all students
    """

    exam = TeacherExamSerializer()
    total_students = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    average_scores = serializers.DictField()
    score_distribution = serializers.DictField()
    top_performers = serializers.ListField()
    low_performers = serializers.ListField()
