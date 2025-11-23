from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    TeacherExam,
    TeacherExamAttempt,
    TeacherFeedback,
    TeacherWritingAttempt,
    TeacherUserAnswer,
)
from ielts.models import MockExam, WritingTask, Question

User = get_user_model()


def _build_regular_answer_response(user_answer, correct_answer):
    if not user_answer:
        return False
    """Build regular answer response (non-MCMA)."""
    corrects = correct_answer.lower().split("|")
    for cor_answer in corrects:
        if user_answer.lower() == cor_answer.lower():
            return True
    return False


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
            "results_visible",
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


class WritingTaskSerializer(serializers.ModelSerializer):
    """Serializer for WritingTask"""

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
        ]
        read_only_fields = fields


class TeacherWritingAttemptSerializer(serializers.ModelSerializer):
    """Serializer for TeacherWritingAttempt"""

    task = WritingTaskSerializer(read_only=True)

    class Meta:
        model = TeacherWritingAttempt
        fields = [
            "id",
            "uuid",
            "task",
            "answer_text",
            "word_count",
            "score",
            "feedback",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "uuid", "created_at", "updated_at"]


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for Question"""

    correct_answer = serializers.SerializerMethodField()
    question_type = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "order",
            "question_text",
            "correct_answer",
            "question_type",
        ]
        read_only_fields = fields

    def get_correct_answer(self, obj):
        return obj.get_correct_answer()

    def get_question_type(self, obj):
        if obj.test_head:
            return obj.test_head.get_question_type_display()
        return None


class TeacherUserAnswerSerializer(serializers.ModelSerializer):
    """Serializer for TeacherUserAnswer"""

    question = QuestionSerializer(read_only=True)

    class Meta:
        model = TeacherUserAnswer
        fields = [
            "id",
            "question",
            "answer_text",
            "is_correct",
            "created_at",
        ]
        read_only_fields = fields


class TeacherExamAttemptDetailSerializer(TeacherExamAttemptSerializer):
    """Detailed serializer with feedback, writing attempts, and user answers"""

    teacher_feedbacks = TeacherFeedbackSerializer(many=True, read_only=True)
    writing_attempts = TeacherWritingAttemptSerializer(many=True, read_only=True)
    user_answers = TeacherUserAnswerSerializer(many=True, read_only=True)
    all_questions = serializers.SerializerMethodField()

    class Meta(TeacherExamAttemptSerializer.Meta):
        fields = TeacherExamAttemptSerializer.Meta.fields + [
            "teacher_feedbacks",
            "writing_attempts",
            "user_answers",
            "all_questions",
        ]

    def get_all_questions(self, obj):
        """Get all questions from the exam with user answers merged"""
        if not obj.exam.mock_exam:
            return {"listening": [], "reading": []}

        from ielts.models import Question

        # Get all listening questions
        listening_questions = (
            Question.objects.filter(
                test_head__listening__in=obj.exam.mock_exam.listening_parts.all()
            )
            .select_related("test_head")
            .order_by("order")
        )

        # Get all reading questions
        reading_questions = (
            Question.objects.filter(
                test_head__reading__in=obj.exam.mock_exam.reading_passages.all()
            )
            .select_related("test_head")
            .order_by("order")
        )

        # Create a map of user answers
        user_answers_map = {ua.question_id: ua for ua in obj.user_answers.all()}

        # Merge questions with user answers
        def merge_question_with_answer(question):
            from ielts.models import TestHead

            user_answer = user_answers_map.get(question.id)
            correct_answer = question.get_correct_answer()
            user_answer_text = user_answer.answer_text if user_answer else None

            # Calculate MCMA partial score if applicable
            is_mcma = (
                question.test_head
                and question.test_head.question_type
                == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
            )

            mcma_score = None
            mcma_max_score = None
            question_order_display = question.order
            is_correct = False
            if is_mcma and correct_answer:
                # Calculate max score for MCMA (number of correct answers)
                correct_set = set(correct_answer.upper())
                mcma_max_score = len(correct_set)

                # Display question number as range (e.g., "21-22" for 2 answers)
                if mcma_max_score > 1:
                    question_order_display = (
                        f"{question.order}-{question.order + mcma_max_score - 1}"
                    )

                # Calculate user's score if they answered
                if user_answer_text:
                    user_set = set(user_answer_text.upper())
                    correct_selections = len(user_set & correct_set)
                    mcma_score = correct_selections
                else:
                    mcma_score = 0  # No answer = 0 score
                is_correct = mcma_score == mcma_max_score
            else:
                is_correct = _build_regular_answer_response(
                    user_answer_text, correct_answer
                )

            return {
                "id": question.id,
                "order": question_order_display,  # Can be single number or range
                "question_text": question.question_text,
                "correct_answer": correct_answer
                or "Not available",  # Always show correct answer
                "question_type": (
                    question.test_head.get_question_type_display()
                    if question.test_head
                    else None
                ),
                "user_answer": user_answer_text
                or None,  # Explicitly None if not answered
                "is_correct": is_correct,
                "is_answered": user_answer is not None,
                "is_mcma": is_mcma,
                "mcma_score": mcma_score,
                "mcma_max_score": mcma_max_score,
            }

        return {
            "listening": [merge_question_with_answer(q) for q in listening_questions],
            "reading": [merge_question_with_answer(q) for q in reading_questions],
        }


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
