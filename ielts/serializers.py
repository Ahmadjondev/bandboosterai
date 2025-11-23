"""
Serializers for IELTS Mock Test API.
Provides clean, structured JSON responses for Vue.js SPA.
"""

from rest_framework import serializers
from .models import (
    MockExam,
    ExamAttempt,
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
    SpeakingQuestion,
    TestHead,
    Question,
    Choice,
    UserAnswer,
    WritingAttempt,
    SpeakingAttempt,
    SpeakingAnswer,
)


# ============================================================================
# WRITING CHECKER SERIALIZERS
# ============================================================================


class WritingCheckRequestSerializer(serializers.Serializer):
    """Serializer for writing check API request."""

    essay = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        help_text="The essay text to check",
    )
    task_type = serializers.ChoiceField(
        choices=["Task 1", "Task 2"],
        default="Task 2",
        help_text="IELTS Writing task type",
    )


class SentenceCorrectionSerializer(serializers.Serializer):
    """Serializer for individual sentence corrections."""

    original = serializers.CharField()
    corrected = serializers.CharField()
    explanation = serializers.CharField()


class WritingCheckResponseSerializer(serializers.Serializer):
    """Serializer for writing check API response."""

    status = serializers.ChoiceField(choices=["processing", "completed", "failed"])
    # May contain UUID string or integer ID depending on deployment state
    writing_attempt_id = serializers.CharField(required=False)
    inline = serializers.CharField(required=False)
    sentences = SentenceCorrectionSerializer(many=True, required=False)
    summary = serializers.CharField(required=False)
    band_score = serializers.CharField(required=False)
    corrected_essay = serializers.CharField(required=False)
    message = serializers.CharField(required=False)


# ============================================================================
# CHOICE & QUESTION SERIALIZERS
# ============================================================================


class ChoiceSerializer(serializers.ModelSerializer):
    """Serializer for multiple choice options."""

    key = serializers.SerializerMethodField()

    class Meta:
        model = Choice
        fields = ["id", "choice_text", "key"]

    def get_key(self, obj):
        """Generate letter key (A, B, C, D) for choice."""
        choices = list(obj.question.choices.all().order_by("id"))
        try:
            index = choices.index(obj)
            return chr(65 + index)  # A=65 in ASCII
        except ValueError:
            return ""


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for individual questions."""

    question_type = serializers.SerializerMethodField()
    options = serializers.SerializerMethodField()
    user_answer = serializers.SerializerMethodField()
    max_selections = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "question_text",
            "order",
            "question_type",
            "options",
            "user_answer",
            "correct_answer_text",
            "answer_two_text",
            "answer_three_text",
            "max_selections",
        ]

    def get_question_type(self, obj):
        """Get the display name of the question type."""
        return obj.test_head.get_question_type_display() if obj.test_head else ""

    def get_options(self, obj):
        """Get choices for multiple choice questions."""
        if obj.test_head and obj.test_head.question_type in [
            TestHead.QuestionType.MULTIPLE_CHOICE,
            TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS,
        ]:
            return ChoiceSerializer(obj.choices.all().order_by("id"), many=True).data
        return []

    def get_user_answer(self, obj):
        """Get user's answer for this question if available."""
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            attempt = self.context.get("attempt")
            if attempt:
                # Check if this is a regular ExamAttempt or TeacherExamAttempt
                from teacher.models import TeacherExamAttempt, TeacherUserAnswer

                if isinstance(attempt, TeacherExamAttempt):
                    # Fetch from TeacherUserAnswer for teacher exam attempts
                    user_answer = TeacherUserAnswer.objects.filter(
                        exam_attempt=attempt, question=obj
                    ).first()
                    return user_answer.answer_text if user_answer else ""

                # Regular ExamAttempt - fetch user answer
                user_answer = UserAnswer.objects.filter(
                    exam_attempt=attempt, question=obj
                ).first()
                return user_answer.answer_text if user_answer else ""
        return ""

    def get_max_selections(self, obj):
        """Get maximum number of selections allowed for MCMA questions."""
        if (
            obj.test_head
            and obj.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            # Count the number of correct answers
            correct_answer = obj.get_correct_answer()
            if correct_answer:
                return len(correct_answer)
        return None


# ============================================================================
# TEST HEAD SERIALIZERS
# ============================================================================


class TestHeadSerializer(serializers.ModelSerializer):
    """Serializer for question groups (TestHead)."""

    questions = QuestionSerializer(many=True, read_only=True)
    question_range = serializers.SerializerMethodField()
    instruction = serializers.SerializerMethodField()
    matching_options = serializers.SerializerMethodField()
    allow_duplicates = serializers.SerializerMethodField()
    select_count = serializers.SerializerMethodField()
    picture_url = serializers.SerializerMethodField()
    view_type = serializers.SerializerMethodField()
    answer_format = serializers.SerializerMethodField()
    question_data = serializers.SerializerMethodField()

    class Meta:
        model = TestHead
        fields = [
            "id",
            "title",
            "description",
            "question_type",
            "question_range",
            "instruction",
            "matching_options",
            "allow_duplicates",
            "select_count",
            "picture",
            "picture_url",
            "view_type",
            "answer_format",
            "question_data",
            "questions",
        ]

    def get_question_data(self, obj):
        """Parse JSON string to object if available."""
        import json

        if obj.question_data:
            if isinstance(obj.question_data, str):
                try:
                    return json.loads(obj.question_data)
                except json.JSONDecodeError:
                    return {}
            return obj.question_data
        return {}

    def get_question_range(self, obj):
        """Get the question number range (e.g., '1-5')."""
        questions = obj.questions.all().order_by("order")
        if questions:
            first = questions.first().order
            last = questions.last().order
            return f"{first}-{last}"
        return ""

    def get_instruction(self, obj):
        """Get instruction text based on question type."""
        if obj.description:
            return obj.description
        return ""

    def get_matching_options(self, obj):
        """Get matching options for matching question types."""
        if obj.question_type in [
            TestHead.QuestionType.MATCHING_HEADINGS,
            TestHead.QuestionType.MATCHING_INFORMATION,
            TestHead.QuestionType.MATCHING_FEATURES,
        ]:
            if obj.question_data:
                import json

                data = obj.question_data
                if isinstance(data, str):
                    try:
                        data = json.loads(data)
                    except json.JSONDecodeError:
                        return []

                if isinstance(data, dict) and "options" in data:
                    return data["options"]
        return []

    def get_allow_duplicates(self, obj):
        """Check if matching allows duplicate selections."""
        if obj.question_type in [
            TestHead.QuestionType.MATCHING_HEADINGS,
            TestHead.QuestionType.MATCHING_INFORMATION,
            TestHead.QuestionType.MATCHING_FEATURES,
        ]:
            if obj.question_data:
                import json

                data = obj.question_data
                if isinstance(data, str):
                    try:
                        data = json.loads(data)
                    except json.JSONDecodeError:
                        return False

                if isinstance(data, dict):
                    return data.get("allow_duplicates", False)
        return False

    def get_select_count(self, obj):
        """Get number of selections required for MCMA."""
        if obj.question_type == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS:
            if obj.question_data:
                import json

                data = obj.question_data
                if isinstance(data, str):
                    try:
                        data = json.loads(data)
                    except json.JSONDecodeError:
                        return None

                if isinstance(data, dict):
                    return data.get("answer_format")
        return None

    def get_picture_url(self, obj):
        """
        Get full URL for picture if available from S3 or local storage.
        S3 URLs are already absolute, local URLs need request context.
        """
        if obj.picture:
            file_url = obj.picture.url

            # If it's already an absolute URL (S3), return it directly
            if file_url.startswith("http://") or file_url.startswith("https://"):
                return file_url

            # Otherwise, build absolute URL for local files
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(file_url)
            return file_url
        return None

    def get_view_type(self, obj):
        """Determine view type for rendering."""
        if obj.question_type in [
            TestHead.QuestionType.TABLE_COMPLETION,
            TestHead.QuestionType.NOTE_COMPLETION,
            TestHead.QuestionType.FLOW_CHART_COMPLETION,
        ]:
            return obj.question_type
        return "standard"

    def get_answer_format(self, obj):
        """Get answer format instructions."""
        if obj.question_data:
            import json

            data = obj.question_data
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    return None

            if isinstance(data, dict):
                return data.get("answer_format")
        return None


# ============================================================================
# LISTENING SERIALIZERS
# ============================================================================


class ListeningPartSerializer(serializers.ModelSerializer):
    """Serializer for listening parts with questions."""

    test_heads = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()

    class Meta:
        model = ListeningPart
        fields = [
            "id",
            "part_number",
            "title",
            "description",
            "audio_url",
            "test_heads",
            "total_questions",
        ]

    def get_test_heads(self, obj):
        """Get test heads with questions."""
        test_heads = (
            obj.test_heads.all().prefetch_related("questions__choices").order_by("id")
        )
        return TestHeadSerializer(test_heads, many=True, context=self.context).data

    def get_audio_url(self, obj):
        """
        Get full URL for audio file from S3 or local storage.
        S3 URLs are already absolute, local URLs need request context.
        """
        if obj.audio_file:
            # Get the URL from the storage backend
            file_url = obj.audio_file.url

            # If it's already an absolute URL (S3), return it directly
            if file_url.startswith("http://") or file_url.startswith("https://"):
                return file_url

            # Otherwise, build absolute URL for local files
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(file_url)
            return file_url
        return None

    def get_total_questions(self, obj):
        """Count total questions in this part."""
        return (
            obj.test_heads.aggregate(total=serializers.models.Count("questions"))[
                "total"
            ]
            or 0
        )


# ============================================================================
# READING SERIALIZERS
# ============================================================================


class ReadingPassageSerializer(serializers.ModelSerializer):
    """Serializer for reading passages with questions."""

    test_heads = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()

    class Meta:
        model = ReadingPassage
        fields = [
            "id",
            "passage_number",
            "title",
            "summary",
            "content",
            "word_count",
            "test_heads",
            "total_questions",
        ]

    def get_test_heads(self, obj):
        """Get test heads with questions."""
        test_heads = (
            obj.test_heads.all().prefetch_related("questions__choices").order_by("id")
        )
        return TestHeadSerializer(test_heads, many=True, context=self.context).data

    def get_total_questions(self, obj):
        """Count total questions in this passage."""
        return (
            obj.test_heads.aggregate(total=serializers.models.Count("questions"))[
                "total"
            ]
            or 0
        )


# ============================================================================
# WRITING SERIALIZERS
# ============================================================================


class WritingTaskSerializer(serializers.ModelSerializer):
    """Serializer for writing tasks."""

    task_type_display = serializers.CharField(
        source="get_task_type_display", read_only=True
    )
    user_attempt = serializers.SerializerMethodField()
    picture_url = serializers.SerializerMethodField()

    class Meta:
        model = WritingTask
        fields = [
            "id",
            "task_type",
            "task_type_display",
            "prompt",
            "picture",
            "picture_url",
            "data",
            "min_words",
            "user_attempt",
        ]

    def get_picture_url(self, obj):
        """
        Get full URL for picture if available from S3 or local storage.
        S3 URLs are already absolute, local URLs need request context.
        """
        if obj.picture:
            file_url = obj.picture.url

            # If it's already an absolute URL (S3), return it directly
            if file_url.startswith("http://") or file_url.startswith("https://"):
                return file_url

            # Otherwise, build absolute URL for local files
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(file_url)
            return file_url
        return None

    def get_user_attempt(self, obj):
        """Get user's writing attempt for this task."""
        from teacher.models import TeacherExamAttempt

        attempt = self.context.get("attempt")
        if attempt:
            # WritingAttempt only works with ExamAttempt, not TeacherExamAttempt
            if isinstance(attempt, TeacherExamAttempt):
                return None

            writing_attempt = WritingAttempt.objects.filter(
                exam_attempt=attempt, task=obj
            ).first()
            if writing_attempt:
                return {
                    "id": writing_attempt.id,
                    "answer_text": writing_attempt.answer_text,
                    "word_count": writing_attempt.word_count,
                }
        return None


# ============================================================================
# SPEAKING SERIALIZERS
# ============================================================================


class SpeakingAnswerSerializer(serializers.ModelSerializer):
    """Serializer for individual speaking answers."""

    audio_url = serializers.SerializerMethodField()
    question_text = serializers.CharField(
        source="question.question_text", read_only=True
    )

    class Meta:
        model = SpeakingAnswer
        fields = [
            "id",
            "question",
            "question_text",
            "audio_file",
            "audio_url",
            "transcript",
            "duration_seconds",
            "submitted_at",
        ]
        read_only_fields = ["submitted_at"]

    def get_audio_url(self, obj):
        """Get full URL for audio file."""
        if obj.audio_file:
            file_url = obj.audio_file.url
            if file_url.startswith("http://") or file_url.startswith("https://"):
                return file_url
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(file_url)
            return file_url
        return None


class SpeakingQuestionSerializer(serializers.ModelSerializer):
    """Serializer for speaking questions."""

    question_key = serializers.SerializerMethodField()
    preparation_time = serializers.SerializerMethodField()
    response_time = serializers.SerializerMethodField()
    user_answer = serializers.SerializerMethodField()

    class Meta:
        model = SpeakingQuestion
        fields = [
            "id",
            "question_text",
            "audio_url",
            "order",
            "question_key",
            "preparation_time",
            "response_time",
            "user_answer",
        ]

    def get_question_key(self, obj):
        """Generate question key for frontend."""
        return f"speaking_{obj.topic.speaking_type}_q{obj.order}"

    def get_preparation_time(self, obj):
        """Get preparation time based on part type."""
        # Part 2 has 1 minute preparation time
        if obj.topic.speaking_type == "PART_2":
            return 60
        return 0

    def get_response_time(self, obj):
        """Get response time based on part type."""
        # Part 1: 30 seconds per question
        # Part 2: 2 minutes (120 seconds)
        # Part 3: 45 seconds per question
        if obj.topic.speaking_type == "PART_1":
            return 30
        elif obj.topic.speaking_type == "PART_2":
            return 120
        elif obj.topic.speaking_type == "PART_3":
            return 45
        return 60  # default

    def get_user_answer(self, obj):
        """Get user's answer for this question if available."""
        from teacher.models import TeacherExamAttempt

        attempt = self.context.get("attempt")
        if attempt:
            # SpeakingAttempt only works with ExamAttempt, not TeacherExamAttempt
            if isinstance(attempt, TeacherExamAttempt):
                return None

            try:
                speaking_attempt = SpeakingAttempt.objects.get(exam_attempt=attempt)
                speaking_answer = SpeakingAnswer.objects.filter(
                    speaking_attempt=speaking_attempt, question=obj
                ).first()
                if speaking_answer:
                    return SpeakingAnswerSerializer(
                        speaking_answer, context=self.context
                    ).data
            except SpeakingAttempt.DoesNotExist:
                pass
        return None


class SpeakingTopicSerializer(serializers.ModelSerializer):
    """Serializer for speaking topics."""

    part_display = serializers.CharField(
        source="get_speaking_type_display", read_only=True
    )
    questions = SpeakingQuestionSerializer(many=True, read_only=True)
    user_attempt = serializers.SerializerMethodField()

    class Meta:
        model = SpeakingTopic
        fields = [
            "id",
            "speaking_type",
            "part_display",
            "topic",
            "question",
            "questions",
            "cue_card",
            "user_attempt",
        ]

    def get_user_attempt(self, obj):
        """Get user's speaking attempt for this speaking topic."""
        from teacher.models import TeacherExamAttempt

        attempt = self.context.get("attempt")
        if attempt:
            # SpeakingAttempt only works with ExamAttempt, not TeacherExamAttempt
            if isinstance(attempt, TeacherExamAttempt):
                return None

            # SpeakingAttempt is OneToOne with ExamAttempt
            # Audio files are stored as JSON with speaking_type as key
            try:
                speaking_attempt = SpeakingAttempt.objects.get(exam_attempt=attempt)
                if speaking_attempt and speaking_attempt.audio_files:
                    # Get audio for this specific speaking_type
                    audio_path = speaking_attempt.audio_files.get(obj.speaking_type)
                    if audio_path:
                        return {
                            "id": speaking_attempt.id,
                            "audio_url": self.context["request"].build_absolute_uri(
                                audio_path
                            ),
                        }
            except SpeakingAttempt.DoesNotExist:
                pass
        return None


# ============================================================================
# TEST ATTEMPT SERIALIZERS
# ============================================================================


class ExamAttemptSerializer(serializers.ModelSerializer):
    """Serializer for exam attempts. Works with both ExamAttempt and TeacherExamAttempt."""

    uuid = serializers.UUIDField(read_only=True)
    exam_title = serializers.SerializerMethodField()
    exam_type = serializers.SerializerMethodField()
    # time_remaining = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    completed_at = serializers.SerializerMethodField()

    class Meta:
        model = ExamAttempt
        fields = [
            "id",
            "uuid",
            "exam",
            "exam_title",
            "exam_type",
            "status",
            "current_section",
            "started_at",
            "completed_at",
            "time_remaining",
            "progress",
        ]

    def get_exam_title(self, obj):
        """Get exam title - handle both mock_test and mock_exam."""
        mock_exam = getattr(obj.exam, "mock_test", None) or getattr(
            obj.exam, "mock_exam", None
        )
        return mock_exam.title if mock_exam else None

    def get_exam_type(self, obj):
        """Get exam type - handle both mock_test and mock_exam."""
        mock_exam = getattr(obj.exam, "mock_test", None) or getattr(
            obj.exam, "mock_exam", None
        )
        return mock_exam.exam_type if mock_exam else None

    def get_completed_at(self, obj):
        """Get completion time - handle both completed_at and submitted_at."""
        return getattr(obj, "completed_at", None) or getattr(obj, "submitted_at", None)

    # def get_time_remaining(self, obj):
    #     """Calculate remaining time in seconds."""
    #     if obj.status == "IN_PROGRESS" and obj.started_at:
    #         from django.utils import timezone

    #         elapsed = (timezone.now() - obj.started_at).total_seconds()
    #         # Get duration from mock test, use default if not set
    #         mock_exam = getattr(obj.exam, "mock_test", None) or getattr(
    #             obj.exam, "mock_exam", None
    #         )
    #         if not mock_exam:
    #             return 0
    #         duration_minutes = mock_exam.get_default_duration()
    #         total_seconds = duration_minutes * 60
    #         remaining = max(0, total_seconds - elapsed)
    #         return int(remaining)
    #     return 0

    def get_progress(self, obj):
        """Get progress percentage."""
        return obj.get_progress_percentage()


class MockExamSerializer(serializers.ModelSerializer):
    """Serializer for mock exams."""

    uuid = serializers.UUIDField(read_only=True)
    exam_type_display = serializers.CharField(
        source="get_exam_type_display", read_only=True
    )
    difficulty_display = serializers.CharField(
        source="get_difficulty_level_display", read_only=True
    )
    total_questions = serializers.SerializerMethodField()
    default_duration = serializers.SerializerMethodField()
    section_durations = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    created_by_email = serializers.SerializerMethodField()

    # Many-to-many fields for content
    reading_passages = serializers.PrimaryKeyRelatedField(
        many=True, queryset=ReadingPassage.objects.all(), required=False
    )
    listening_parts = serializers.PrimaryKeyRelatedField(
        many=True, queryset=ListeningPart.objects.all(), required=False
    )
    writing_tasks = serializers.PrimaryKeyRelatedField(
        many=True, queryset=WritingTask.objects.all(), required=False
    )
    speaking_topics = serializers.PrimaryKeyRelatedField(
        many=True, queryset=SpeakingTopic.objects.all(), required=False
    )

    class Meta:
        model = MockExam
        fields = [
            "id",
            "uuid",
            "title",
            "exam_type",
            "exam_type_display",
            "description",
            "duration_minutes",
            "default_duration",
            "section_durations",
            "difficulty_level",
            "difficulty_display",
            "total_questions",
            "is_active",
            "reading_passages",
            "listening_parts",
            "writing_tasks",
            "speaking_topics",
            "created_by",
            "created_by_name",
            "created_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_by",
            "created_by_name",
            "created_by_email",
            "created_at",
            "updated_at",
        ]

    def get_total_questions(self, obj):
        """Get total number of questions."""
        return obj.get_total_questions()

    def get_default_duration(self, obj):
        """Get the default IELTS duration for this exam type in minutes."""
        return obj.get_default_duration()

    def get_section_durations(self, obj):
        """Get durations for each section type."""
        return MockExam.SECTION_DURATIONS

    def get_created_by_name(self, obj):
        """Get the name of the creator."""
        if obj.created_by:
            return (
                f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
                or obj.created_by.username
            )
        return None

    def get_created_by_email(self, obj):
        """Get the email of the creator."""
        if obj.created_by:
            return obj.created_by.email
        return None


# ============================================================================
# SECTION DATA SERIALIZERS (for SPA)
# ============================================================================


class ListeningSectionSerializer(serializers.Serializer):
    """Serializer for listening section data."""

    parts = ListeningPartSerializer(many=True, read_only=True)
    # time_remaining = serializers.IntegerField()
    default_duration = serializers.IntegerField(
        default=30
    )  # 30 minutes for IELTS Listening


class ReadingSectionSerializer(serializers.Serializer):
    """Serializer for reading section data."""

    passages = ReadingPassageSerializer(many=True, read_only=True)
    # time_remaining = serializers.IntegerField()
    default_duration = serializers.IntegerField(
        default=60
    )  # 60 minutes for IELTS Reading


class WritingSectionSerializer(serializers.Serializer):
    """Serializer for writing section data."""

    tasks = WritingTaskSerializer(many=True, read_only=True)
    # time_remaining = serializers.IntegerField()
    default_duration = serializers.IntegerField(
        default=60
    )  # 60 minutes for IELTS Writing


class SpeakingSectionSerializer(serializers.Serializer):
    """Serializer for speaking section data."""

    topics = SpeakingTopicSerializer(many=True, read_only=True)
    current_part = serializers.IntegerField()
    # time_remaining = serializers.IntegerField()
    default_duration = serializers.IntegerField(
        default=14
    )  # 11-14 minutes for IELTS Speaking


# ============================================================================
# ANSWER SUBMISSION SERIALIZERS
# ============================================================================


class AnswerSubmissionSerializer(serializers.Serializer):
    """Serializer for answer submissions."""

    question_id = serializers.IntegerField()
    answer = serializers.CharField(allow_blank=True)

    def validate_question_id(self, value):
        """Validate that question exists."""
        if not Question.objects.filter(id=value).exists():
            raise serializers.ValidationError("Question does not exist.")
        return value


class WritingSubmissionSerializer(serializers.Serializer):
    """Serializer for writing submissions."""

    task_id = serializers.IntegerField()
    answer_text = serializers.CharField()

    def validate_task_id(self, value):
        """Validate that task exists."""
        if not WritingTask.objects.filter(id=value).exists():
            raise serializers.ValidationError("Writing task does not exist.")
        return value


class SpeakingSubmissionSerializer(serializers.Serializer):
    """Serializer for speaking submissions."""

    question_key = serializers.CharField()
    audio_file = serializers.FileField()

    def validate_question_key(self, value):
        """Validate question_key format and extract speaking type."""
        # Expected format: speaking_PART_1_q1, speaking_PART_2_q1, etc.
        if not value.startswith("speaking_"):
            raise serializers.ValidationError("Invalid question_key format.")
        return value


# ============================================================================
# Lightweight Serializers for Content Selection
# ============================================================================


class ReadingPassageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for reading passage selection."""

    difficulty = serializers.SerializerMethodField()

    class Meta:
        model = ReadingPassage
        fields = ["id", "passage_number", "title", "difficulty"]

    def get_difficulty(self, obj):
        """Return a difficulty level based on word count."""
        if obj.word_count < 400:
            return "EASY"
        elif obj.word_count < 600:
            return "MEDIUM"
        else:
            return "HARD"


class ListeningPartListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listening part selection."""

    difficulty = serializers.SerializerMethodField()

    class Meta:
        model = ListeningPart
        fields = ["id", "part_number", "title", "difficulty"]

    def get_difficulty(self, obj):
        """Return a default difficulty level."""
        return "MEDIUM"


class WritingTaskListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for writing task selection."""

    class Meta:
        model = WritingTask
        fields = ["id", "task_type", "prompt"]


class SpeakingTopicListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for speaking topic selection."""

    class Meta:
        model = SpeakingTopic
        fields = ["id", "speaking_type", "topic"]
