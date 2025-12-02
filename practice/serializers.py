from rest_framework import serializers
from django.db.models import Avg, Count, Max
from .models import SectionPractice, SectionPracticeAttempt
from ielts.serializers import TestHeadSerializer
from ielts.models import (
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
    SpeakingQuestion,
    TestHead,
    Question,
    Choice,
)


class SectionPracticeListSerializer(serializers.ModelSerializer):
    """Serializer for listing section practices"""

    section_type_display = serializers.CharField(
        source="get_section_type_display", read_only=True
    )
    difficulty_display = serializers.CharField(
        source="get_difficulty_display", read_only=True
    )
    duration = serializers.IntegerField(source="actual_duration", read_only=True)
    attempts_count = serializers.SerializerMethodField()
    best_score = serializers.SerializerMethodField()
    last_attempt_date = serializers.SerializerMethodField()
    # Speaking-specific fields
    speaking_part = serializers.SerializerMethodField()
    speaking_topic_name = serializers.SerializerMethodField()

    class Meta:
        model = SectionPractice
        fields = [
            # "id",
            "uuid",
            "title",
            "description",
            "section_type",
            "section_type_display",
            "difficulty",
            "difficulty_display",
            "duration",
            "total_questions",
            "is_free",
            "attempts_count",
            "best_score",
            "last_attempt_date",
            "created_at",
            # Speaking-specific
            "speaking_part",
            "speaking_topic_name",
        ]

    def get_attempts_count(self, obj):
        user = self.context.get("request")
        if user and hasattr(user, "user"):
            user = user.user
            return obj.attempts.filter(student=user, status="COMPLETED").count()
        return 0

    def get_best_score(self, obj):
        user = self.context.get("request")
        if user and hasattr(user, "user"):
            user = user.user
            best = obj.attempts.filter(
                student=user, status="COMPLETED", score__isnull=False
            ).aggregate(best=Max("score"))
            return float(best["best"]) if best["best"] else None
        return None

    def get_last_attempt_date(self, obj):
        user = self.context.get("request")
        if user and hasattr(user, "user"):
            user = user.user
            last = obj.attempts.filter(student=user).order_by("-started_at").first()
            if last:
                return last.started_at.isoformat()
        return None

    def get_speaking_part(self, obj):
        """Get the speaking part number (1, 2, or 3) for speaking practices."""
        if obj.section_type == "SPEAKING" and obj.speaking_topic:
            # Extract part number from PART_1, PART_2, PART_3
            speaking_type = obj.speaking_topic.speaking_type
            if "_" in speaking_type:
                return int(speaking_type.split("_")[-1])
            return 1
        return None

    def get_speaking_topic_name(self, obj):
        """Get the speaking topic name for speaking practices."""
        if obj.section_type == "SPEAKING" and obj.speaking_topic:
            return obj.speaking_topic.topic
        return None


class ReadingQuestionSerializer(serializers.Serializer):
    """Serializer for reading questions"""

    id = serializers.IntegerField()
    order = serializers.IntegerField()
    question_text = serializers.CharField(allow_null=True, required=False)
    options = serializers.SerializerMethodField()

    def get_options(self, obj):
        """Get choices for multiple choice questions."""
        if obj.test_head and obj.test_head.question_type in [
            TestHead.QuestionType.MULTIPLE_CHOICE,
            TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS,
        ]:
            choices = obj.choices.all().order_by("id")
            result = []
            for i, choice in enumerate(choices):
                result.append(
                    {
                        "id": choice.id,
                        "key": chr(65 + i),  # A, B, C, D...
                        "choice_text": choice.choice_text,
                    }
                )
            return result
        return []


class ReadingTestHeadSerializer(serializers.Serializer):
    """Serializer for reading test heads"""

    id = serializers.IntegerField()
    title = serializers.CharField(allow_null=True, required=False)
    description = serializers.CharField(allow_null=True, required=False)
    question_type = serializers.CharField()
    questions = ReadingQuestionSerializer(many=True)


class ReadingPassageDetailSerializer(serializers.ModelSerializer):
    """Serializer for reading passage with full content"""

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


class ListeningPartDetailSerializer(serializers.ModelSerializer):
    """Serializer for listening part with full content"""

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


class WritingTaskDetailSerializer(serializers.ModelSerializer):
    """Serializer for writing task with full content"""

    image_url = serializers.SerializerMethodField()
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
            "image_url",
            "min_words",
        ]

    def get_image_url(self, obj):
        if obj.picture:
            request = self.context.get("request")
            if request:
                file_url = obj.picture.url
                if file_url.startswith("http://") or file_url.startswith("https://"):
                    return file_url
                return request.build_absolute_uri(file_url)
            return obj.picture.url
        return None


class SpeakingQuestionDetailSerializer(serializers.ModelSerializer):
    """Serializer for speaking questions in practice"""

    question_key = serializers.SerializerMethodField()
    preparation_time = serializers.SerializerMethodField()
    response_time = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "question_text",
            "audio_url",
            "cue_card_points",
            "order",
            "question_key",
            "preparation_time",
            "response_time",
        ]

    def get_question_key(self, obj):
        """Generate question key for frontend."""
        return f"speaking_{obj.topic.speaking_type}_q{obj.order}"

    def get_preparation_time(self, obj):
        """Get preparation time based on part type."""
        if obj.topic.speaking_type == "PART_2":
            return 60
        return 0

    def get_response_time(self, obj):
        """Get response time based on part type."""
        if obj.topic.speaking_type == "PART_1":
            return 30
        elif obj.topic.speaking_type == "PART_2":
            return 120
        elif obj.topic.speaking_type == "PART_3":
            return 45
        return 60


class SpeakingTopicDetailSerializer(serializers.ModelSerializer):
    """Serializer for speaking topic with full content"""

    speaking_type_display = serializers.CharField(
        source="get_speaking_type_display", read_only=True
    )
    questions = serializers.SerializerMethodField()

    class Meta:
        model = SpeakingTopic
        fields = [
            "id",
            "topic",
            "speaking_type",
            "speaking_type_display",
            "questions",
        ]

    def get_questions(self, obj):
        """Get all questions for this topic."""
        from ielts.models import SpeakingQuestion

        questions = obj.questions.all().order_by("order")
        return [
            {
                "id": q.id,
                "question_text": q.question_text,
                "audio_url": q.audio_url,
                "cue_card_points": q.cue_card_points,
                "order": q.order,
                "question_key": f"speaking_{obj.speaking_type}_q{q.order}",
                "preparation_time": 60 if obj.speaking_type == "PART_2" else 0,
                "response_time": (
                    30
                    if obj.speaking_type == "PART_1"
                    else (120 if obj.speaking_type == "PART_2" else 45)
                ),
            }
            for q in questions
        ]


class SectionPracticeDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for section practice with content"""

    section_type_display = serializers.CharField(
        source="get_section_type_display", read_only=True
    )
    difficulty_display = serializers.CharField(
        source="get_difficulty_display", read_only=True
    )
    duration = serializers.IntegerField(source="actual_duration", read_only=True)
    content = serializers.SerializerMethodField()
    user_attempts = serializers.SerializerMethodField()

    class Meta:
        model = SectionPractice
        fields = [
            "uuid",
            "title",
            "description",
            "section_type",
            "section_type_display",
            "difficulty",
            "difficulty_display",
            "duration",
            "total_questions",
            "is_free",
            "content",
            "user_attempts",
            "created_at",
        ]

    def get_content(self, obj):
        """Get the content based on section type"""
        request = self.context.get("request")

        if obj.section_type == "READING" and obj.reading_passage:
            return ReadingPassageDetailSerializer(
                obj.reading_passage, context={"request": request}
            ).data
        elif obj.section_type == "LISTENING" and obj.listening_part:
            return ListeningPartDetailSerializer(
                obj.listening_part, context={"request": request}
            ).data
        elif obj.section_type == "WRITING" and obj.writing_task:
            return WritingTaskDetailSerializer(
                obj.writing_task, context={"request": request}
            ).data
        elif obj.section_type == "SPEAKING" and obj.speaking_topic:
            return SpeakingTopicDetailSerializer(
                obj.speaking_topic, context={"request": request}
            ).data
        return None

    def get_user_attempts(self, obj):
        """Get user's previous attempts"""
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            attempts = obj.attempts.filter(student=request.user).order_by(
                "-started_at"
            )[:5]
            return SectionPracticeAttemptSerializer(attempts, many=True).data
        return []


class SectionPracticeAttemptSerializer(serializers.ModelSerializer):
    """Serializer for section practice attempts"""

    practice_title = serializers.CharField(source="practice.title", read_only=True)
    section_type = serializers.CharField(source="practice.section_type", read_only=True)
    accuracy = serializers.FloatField(source="accuracy_percentage", read_only=True)
    # Explicitly convert DecimalField to float for frontend compatibility
    score = serializers.SerializerMethodField()

    class Meta:
        model = SectionPracticeAttempt
        fields = [
            "uuid",
            "practice_title",
            "section_type",
            "status",
            "started_at",
            "completed_at",
            "time_spent_seconds",
            "score",
            "correct_answers",
            "total_questions",
            "accuracy",
            "ai_feedback",
        ]
        read_only_fields = fields

    def get_score(self, obj):
        """Convert DecimalField score to float for JavaScript compatibility."""
        if obj.score is not None:
            return float(obj.score)
        return None


class SubmitAnswersSerializer(serializers.Serializer):
    """Serializer for submitting answers"""

    answers = serializers.DictField(
        child=serializers.CharField(allow_blank=True),
        help_text="Dictionary of question_id: answer",
    )
    time_spent = serializers.IntegerField(
        min_value=0, help_text="Time spent in seconds"
    )


class SubmitWritingSerializer(serializers.Serializer):
    """Serializer for submitting writing response"""

    response = serializers.CharField(min_length=50, help_text="Writing response text")
    time_spent = serializers.IntegerField(
        min_value=0, help_text="Time spent in seconds"
    )


class SubmitSpeakingSerializer(serializers.Serializer):
    """Serializer for submitting speaking response"""

    audio_file = serializers.FileField(required=False, help_text="Audio recording file")
    transcript = serializers.CharField(
        required=False, allow_blank=True, help_text="Speech transcript"
    )
    time_spent = serializers.IntegerField(
        min_value=0, help_text="Time spent in seconds"
    )


class SectionStatsSerializer(serializers.Serializer):
    """Serializer for section practice statistics"""

    section_type = serializers.CharField()
    total_practices = serializers.IntegerField()
    total_attempts = serializers.IntegerField()
    completed_attempts = serializers.IntegerField()
    average_score = serializers.FloatField(allow_null=True)
    best_score = serializers.FloatField(allow_null=True)
    total_time_spent = serializers.IntegerField()
