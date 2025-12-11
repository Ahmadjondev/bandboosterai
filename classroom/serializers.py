"""
BandBooster Classroom Command: Serializers

DRF serializers for Classroom module - handling classrooms, enrollments,
assignment bundles, and student submissions.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Classroom,
    Enrollment,
    AssignmentBundle,
    BundleItem,
    StudentAssignment,
    StudentItemSubmission,
)
from ielts.models import (
    MockExam,
    WritingTask,
    SpeakingTopic,
    ReadingPassage,
    ListeningPart,
)
from teacher.models import TeacherExam

User = get_user_model()


# ============================================
# Basic/Nested Serializers
# ============================================


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for nested serialization"""

    name = serializers.CharField(source="get_full_name", read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "name", "full_name", "email", "profile_image"]
        read_only_fields = fields


class MockExamBasicSerializer(serializers.ModelSerializer):
    """Basic mock exam info for bundle items"""

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
        ]
        read_only_fields = fields


class TeacherExamBasicSerializer(serializers.ModelSerializer):
    """Basic teacher exam info for bundle items"""

    class Meta:
        model = TeacherExam
        fields = ["id", "uuid", "title", "status"]
        read_only_fields = fields


class WritingTaskBasicSerializer(serializers.ModelSerializer):
    """Basic writing task info for bundle items"""

    task_type_display = serializers.CharField(
        source="get_task_type_display", read_only=True
    )

    class Meta:
        model = WritingTask
        fields = ["id", "task_type", "task_type_display", "prompt"]
        read_only_fields = fields


class SpeakingTopicBasicSerializer(serializers.ModelSerializer):
    """Basic speaking topic info for bundle items"""

    class Meta:
        model = SpeakingTopic
        fields = ["id", "topic", "speaking_type"]
        read_only_fields = fields


class ReadingPassageBasicSerializer(serializers.ModelSerializer):
    """Basic reading passage info for bundle items"""

    class Meta:
        model = ReadingPassage
        fields = ["id", "passage_number", "title", "difficulty"]
        read_only_fields = fields


class ListeningPartBasicSerializer(serializers.ModelSerializer):
    """Basic listening part info for bundle items"""

    class Meta:
        model = ListeningPart
        fields = ["id", "part_number", "title"]
        read_only_fields = fields


# ============================================
# Classroom Serializers
# ============================================


class ClassroomSerializer(serializers.ModelSerializer):
    """Serializer for Classroom model"""

    teacher = UserBasicSerializer(read_only=True)
    student_count = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    magic_link = serializers.CharField(read_only=True)

    class Meta:
        model = Classroom
        fields = [
            "id",
            "uuid",
            "teacher",
            "name",
            "description",
            "target_band",
            "invite_code",
            "invite_enabled",
            "max_students",
            "status",
            "student_count",
            "is_full",
            "magic_link",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "uuid",
            "teacher",
            "invite_code",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        validated_data["teacher"] = self.context["request"].user
        return super().create(validated_data)


class ClassroomDetailSerializer(ClassroomSerializer):
    """Detailed classroom serializer with enrollments"""

    enrollments = serializers.SerializerMethodField()
    assignment_count = serializers.SerializerMethodField()
    active_assignments = serializers.SerializerMethodField()

    class Meta(ClassroomSerializer.Meta):
        fields = ClassroomSerializer.Meta.fields + [
            "enrollments",
            "assignment_count",
            "active_assignments",
        ]

    def get_enrollments(self, obj):
        active_enrollments = obj.enrollments.filter(status="ACTIVE").select_related(
            "student"
        )
        return EnrollmentSerializer(active_enrollments, many=True).data

    def get_assignment_count(self, obj):
        return obj.assignment_bundles.count()

    def get_active_assignments(self, obj):
        return obj.assignment_bundles.filter(status="PUBLISHED").count()


class ClassroomListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing classrooms"""

    teacher_name = serializers.CharField(source="teacher.get_full_name", read_only=True)
    student_count = serializers.IntegerField(read_only=True)
    assignment_count = serializers.SerializerMethodField()
    pending_grading = serializers.SerializerMethodField()
    description = serializers.CharField(allow_null=True, allow_blank=True)

    class Meta:
        model = Classroom
        fields = [
            "id",
            "uuid",
            "name",
            "description",
            "teacher_name",
            "target_band",
            "status",
            "student_count",
            "assignment_count",
            "pending_grading",
            "invite_code",
            "invite_enabled",
            "created_at",
        ]
        read_only_fields = fields

    def get_assignment_count(self, obj):
        return obj.assignment_bundles.count()

    def get_pending_grading(self, obj):
        from .models import StudentAssignment

        return StudentAssignment.objects.filter(
            bundle__classroom=obj,
            status__in=["SUBMITTED", "AI_PROCESSED", "PENDING_REVIEW"],
        ).count()


# ============================================
# Enrollment Serializers
# ============================================


class EnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for Enrollment model"""

    student = UserBasicSerializer(read_only=True)
    classroom = ClassroomListSerializer(read_only=True)
    classroom_id = serializers.PrimaryKeyRelatedField(
        queryset=Classroom.objects.all(),
        source="classroom",
        write_only=True,
    )

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "uuid",
            "classroom",
            "classroom_id",
            "student",
            "status",
            "current_band",
            "listening_band",
            "reading_band",
            "writing_band",
            "speaking_band",
            "notes",
            "last_active",
            "enrolled_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "student", "enrolled_at", "updated_at"]


class EnrollmentCreateSerializer(serializers.Serializer):
    """Serializer for creating enrollment via invite code"""

    invite_code = serializers.CharField(max_length=20)

    def validate_invite_code(self, value):
        try:
            classroom = Classroom.objects.get(invite_code=value)
        except Classroom.DoesNotExist:
            raise serializers.ValidationError("Invalid invite code")

        can_accept, message = classroom.can_accept_student()
        if not can_accept:
            raise serializers.ValidationError(message)

        return value

    def create(self, validated_data):
        classroom = Classroom.objects.get(invite_code=validated_data["invite_code"])
        student = self.context["request"].user

        # Check if already enrolled
        existing = Enrollment.objects.filter(
            classroom=classroom, student=student
        ).first()
        if existing:
            if existing.status == "ACTIVE":
                raise serializers.ValidationError("Already enrolled in this classroom")
            # Re-activate if previously left
            existing.status = "ACTIVE"
            existing.save()
            return existing

        return Enrollment.objects.create(
            classroom=classroom,
            student=student,
            status="ACTIVE",
        )


class StudentRosterSerializer(serializers.ModelSerializer):
    """Serializer for teacher's roster view of students"""

    student = UserBasicSerializer(read_only=True)
    assignments_completed = serializers.SerializerMethodField()
    assignments_pending = serializers.SerializerMethodField()
    average_score = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "uuid",
            "student",
            "status",
            "current_band",
            "listening_band",
            "reading_band",
            "writing_band",
            "speaking_band",
            "last_active",
            "enrolled_at",
            "assignments_completed",
            "assignments_pending",
            "average_score",
            "notes",
        ]

    def get_assignments_completed(self, obj):
        return StudentAssignment.objects.filter(
            student=obj.student, bundle__classroom=obj.classroom, status="COMPLETED"
        ).count()

    def get_assignments_pending(self, obj):
        return StudentAssignment.objects.filter(
            student=obj.student,
            bundle__classroom=obj.classroom,
            status__in=[
                "NOT_STARTED",
                "IN_PROGRESS",
                "SUBMITTED",
                "AI_PROCESSED",
                "PENDING_REVIEW",
            ],
        ).count()

    def get_average_score(self, obj):
        from django.db.models import Avg

        avg = StudentAssignment.objects.filter(
            student=obj.student,
            bundle__classroom=obj.classroom,
            band_score__isnull=False,
        ).aggregate(avg=Avg("band_score"))["avg"]
        return float(avg) if avg else None


# ============================================
# Bundle Item Serializers
# ============================================


class BundleItemSerializer(serializers.ModelSerializer):
    """Serializer for BundleItem model"""

    content_title = serializers.CharField(source="get_content_title", read_only=True)
    content_object = serializers.SerializerMethodField()
    content_type = serializers.CharField(source="item_type", read_only=True)
    content_id = serializers.SerializerMethodField()

    class Meta:
        model = BundleItem
        fields = [
            "id",
            "uuid",
            "item_type",
            "content_type",
            "content_id",
            "mock_exam",
            "teacher_exam",
            "writing_task",
            "speaking_topic",
            "reading_passage",
            "listening_part",
            "item_instructions",
            "order",
            "points",
            "is_required",
            "content_title",
            "content_object",
            "created_at",
        ]
        read_only_fields = ["id", "uuid", "created_at"]

    def get_content_id(self, obj):
        """Return the ID of the content object"""
        content = obj.get_content_object()
        return content.id if content else None

    def get_content_object(self, obj):
        """Return serialized content object based on type"""
        content = obj.get_content_object()
        if not content:
            return None

        serializer_map = {
            "MOCK_EXAM": MockExamBasicSerializer,
            "TEACHER_EXAM": TeacherExamBasicSerializer,
            "WRITING_TASK": WritingTaskBasicSerializer,
            "SPEAKING_TOPIC": SpeakingTopicBasicSerializer,
            "READING_PASSAGE": ReadingPassageBasicSerializer,
            "LISTENING_PART": ListeningPartBasicSerializer,
        }
        serializer_class = serializer_map.get(obj.item_type)
        if serializer_class:
            return serializer_class(content).data
        return None


class BundleItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bundle items"""

    class Meta:
        model = BundleItem
        fields = [
            "item_type",
            "mock_exam",
            "teacher_exam",
            "writing_task",
            "speaking_topic",
            "reading_passage",
            "listening_part",
            "item_instructions",
            "order",
            "points",
            "is_required",
        ]

    def validate(self, attrs):
        item_type = attrs.get("item_type")
        content_fields = {
            "MOCK_EXAM": "mock_exam",
            "TEACHER_EXAM": "teacher_exam",
            "WRITING_TASK": "writing_task",
            "SPEAKING_TOPIC": "speaking_topic",
            "READING_PASSAGE": "reading_passage",
            "LISTENING_PART": "listening_part",
        }

        expected_field = content_fields.get(item_type)
        if not expected_field:
            raise serializers.ValidationError({"item_type": "Invalid item type"})

        if not attrs.get(expected_field):
            raise serializers.ValidationError(
                {expected_field: f"This field is required for item type {item_type}"}
            )

        return attrs


# ============================================
# Assignment Bundle Serializers
# ============================================


class AssignmentBundleSerializer(serializers.ModelSerializer):
    """Serializer for AssignmentBundle model"""

    classroom = ClassroomListSerializer(read_only=True)
    classroom_id = serializers.PrimaryKeyRelatedField(
        queryset=Classroom.objects.all(),
        source="classroom",
        write_only=True,
    )
    created_by = UserBasicSerializer(read_only=True)
    items = BundleItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    submission_count = serializers.SerializerMethodField()
    pending_review_count = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentBundle
        fields = [
            "id",
            "uuid",
            "classroom",
            "classroom_id",
            "created_by",
            "title",
            "description",
            "assignment_type",
            "teacher_instructions",
            "available_from",
            "due_date",
            "allow_late_submission",
            "time_limit_minutes",
            "target_min_band",
            "target_max_band",
            "status",
            "require_teacher_approval",
            "auto_release_results",
            "items",
            "total_items",
            "is_available",
            "is_overdue",
            "submission_count",
            "pending_review_count",
            "created_at",
            "updated_at",
            "published_at",
        ]
        read_only_fields = [
            "id",
            "uuid",
            "created_by",
            "created_at",
            "updated_at",
            "published_at",
        ]

    def get_submission_count(self, obj):
        return obj.student_assignments.filter(status="SUBMITTED").count()

    def get_pending_review_count(self, obj):
        return obj.student_assignments.filter(status="PENDING_REVIEW").count()

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class AssignmentBundleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating assignment bundles with items"""

    items = BundleItemCreateSerializer(many=True, required=False)

    class Meta:
        model = AssignmentBundle
        fields = [
            "classroom",
            "title",
            "description",
            "assignment_type",
            "teacher_instructions",
            "available_from",
            "due_date",
            "allow_late_submission",
            "time_limit_minutes",
            "target_min_band",
            "target_max_band",
            "require_teacher_approval",
            "auto_release_results",
            "items",
        ]

    def validate(self, attrs):
        # Ensure classroom belongs to the requesting teacher
        classroom = attrs.get("classroom")
        request = self.context.get("request")
        if classroom and request and classroom.teacher != request.user:
            raise serializers.ValidationError(
                {"classroom": "You can only create assignments for your own classrooms"}
            )
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        validated_data["created_by"] = self.context["request"].user
        bundle = AssignmentBundle.objects.create(**validated_data)

        for item_data in items_data:
            BundleItem.objects.create(bundle=bundle, **item_data)

        return bundle


class AssignmentBundleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing bundles"""

    classroom_name = serializers.CharField(source="classroom.name", read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = AssignmentBundle
        fields = [
            "id",
            "uuid",
            "title",
            "classroom_name",
            "assignment_type",
            "status",
            "due_date",
            "total_items",
            "is_available",
            "is_overdue",
            "created_at",
        ]
        read_only_fields = fields


# ============================================
# Student Assignment Serializers
# ============================================


class StudentAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for StudentAssignment model"""

    bundle = AssignmentBundleListSerializer(read_only=True)
    student = UserBasicSerializer(read_only=True)
    teacher_reviewed_by = UserBasicSerializer(read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    item_submissions = serializers.SerializerMethodField()

    class Meta:
        model = StudentAssignment
        fields = [
            "id",
            "uuid",
            "bundle",
            "student",
            "status",
            "started_at",
            "submitted_at",
            "ai_processed_at",
            "teacher_reviewed_at",
            "completed_at",
            "overall_score",
            "band_score",
            "ai_feedback",
            "ai_tentative_score",
            "teacher_feedback",
            "teacher_reviewed_by",
            "score_overridden",
            "item_progress",
            "is_late",
            "results_visible",
            "progress_percentage",
            "item_submissions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "student", "created_at", "updated_at"]

    def get_item_submissions(self, obj):
        submissions = obj.item_submissions.all().select_related("bundle_item")
        return StudentItemSubmissionSerializer(submissions, many=True).data


class StudentAssignmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing student assignments"""

    bundle_title = serializers.CharField(source="bundle.title", read_only=True)
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    classroom_name = serializers.CharField(
        source="bundle.classroom.name", read_only=True
    )
    progress_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = StudentAssignment
        fields = [
            "id",
            "uuid",
            "bundle_title",
            "student_name",
            "classroom_name",
            "status",
            "band_score",
            "ai_tentative_score",
            "is_late",
            "progress_percentage",
            "submitted_at",
            "created_at",
        ]
        read_only_fields = fields


class GradingQueueSerializer(serializers.ModelSerializer):
    """Serializer for teacher's grading queue"""

    bundle = AssignmentBundleListSerializer(read_only=True)
    student = UserBasicSerializer(read_only=True)
    item_submissions = serializers.SerializerMethodField()
    time_since_submission = serializers.SerializerMethodField()

    class Meta:
        model = StudentAssignment
        fields = [
            "id",
            "uuid",
            "bundle",
            "student",
            "status",
            "ai_feedback",
            "ai_tentative_score",
            "is_late",
            "submitted_at",
            "ai_processed_at",
            "item_submissions",
            "time_since_submission",
        ]
        read_only_fields = fields

    def get_item_submissions(self, obj):
        """Get writing submissions for grading view"""
        submissions = obj.item_submissions.filter(
            bundle_item__item_type="WRITING_TASK"
        ).select_related("bundle_item")
        return StudentItemSubmissionSerializer(submissions, many=True).data

    def get_time_since_submission(self, obj):
        if not obj.submitted_at:
            return None
        delta = timezone.now() - obj.submitted_at
        return int(delta.total_seconds() / 3600)  # Hours


# ============================================
# Student Item Submission Serializers
# ============================================


class StudentItemSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for StudentItemSubmission model"""

    bundle_item = BundleItemSerializer(read_only=True)
    final_score = serializers.SerializerMethodField()

    class Meta:
        model = StudentItemSubmission
        fields = [
            "id",
            "uuid",
            "bundle_item",
            "status",
            "writing_answer",
            "word_count",
            "speaking_audio",
            "speaking_transcript",
            "answers_json",
            "score",
            "max_score",
            "band_score",
            "ai_feedback",
            "ai_inline_corrections",
            "teacher_feedback",
            "teacher_score_override",
            "time_spent_seconds",
            "final_score",
            "started_at",
            "submitted_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at"]

    def get_final_score(self, obj):
        return obj.get_final_score()


class StudentItemSubmissionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating item submissions"""

    class Meta:
        model = StudentItemSubmission
        fields = [
            "writing_answer",
            "speaking_audio",
            "speaking_transcript",
            "answers_json",
            "time_spent_seconds",
        ]


class TeacherGradeSubmissionSerializer(serializers.Serializer):
    """Serializer for teacher grading actions"""

    action = serializers.ChoiceField(choices=["approve", "override", "return"])
    score = serializers.DecimalField(
        max_digits=2,
        decimal_places=1,
        required=False,
        min_value=1,
        max_value=9,
    )
    feedback = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        action = attrs.get("action")
        if action == "override" and not attrs.get("score"):
            raise serializers.ValidationError(
                {"score": "Score is required when overriding grade"}
            )
        if action == "return" and not attrs.get("feedback"):
            raise serializers.ValidationError(
                {"feedback": "Feedback is required when returning to student"}
            )
        return attrs


# ============================================
# Analytics Serializers
# ============================================


class ClassroomAnalyticsSerializer(serializers.Serializer):
    """Serializer for classroom analytics data"""

    total_students = serializers.IntegerField()
    active_students = serializers.IntegerField()
    average_band = serializers.DecimalField(
        max_digits=2, decimal_places=1, allow_null=True
    )
    assignments_published = serializers.IntegerField()
    pending_reviews = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    section_averages = serializers.DictField()
    skill_breakdown = serializers.DictField()


class StudentProgressSerializer(serializers.Serializer):
    """Serializer for individual student progress in classroom"""

    student = UserBasicSerializer()
    current_band = serializers.DecimalField(
        max_digits=2, decimal_places=1, allow_null=True
    )
    section_scores = serializers.DictField()
    assignments_completed = serializers.IntegerField()
    assignments_total = serializers.IntegerField()
    score_trend = serializers.ListField(child=serializers.DictField())
    strengths = serializers.ListField(child=serializers.CharField())
    weaknesses = serializers.ListField(child=serializers.CharField())
