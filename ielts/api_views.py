"""
API Views for IELTS Mock Test System.
RESTful API endpoints for Vue.js SPA.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Prefetch, Q, Count
from collections import defaultdict

from .models import (
    ExamAttempt,
    MockExam,
    Question,
    TestHead,
    UserAnswer,
    WritingAttempt,
    WritingTask,
    SpeakingAttempt,
    SpeakingTopic,
    ListeningPart,
    ReadingPassage,
)
from .serializers import (
    ExamAttemptSerializer,
    MockExamSerializer,
    ListeningPartSerializer,
    ReadingPassageSerializer,
    WritingTaskSerializer,
    SpeakingTopicSerializer,
    AnswerSubmissionSerializer,
    WritingSubmissionSerializer,
    SpeakingSubmissionSerializer,
)
from .analysis import (
    analyze_reading_performance,
    analyze_listening_performance,
    identify_strengths_and_weaknesses,
    calculate_band_score,
)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def get_user_attempt(attempt_id, user):
    """Get exam attempt and verify ownership."""
    attempt = get_object_or_404(
        ExamAttempt.objects.select_related("student", "exam"), id=attempt_id
    )
    if attempt.student != user:
        return None, Response(
            {"error": "You do not have permission to access this attempt."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return attempt, None


def _check_answer_correctness(user_answer_text, question):
    """
    Check if a user's answer is correct for a given question.
    For MCMA, returns a tuple of (partial_score, max_possible_score).
    For other types, returns True/False (which is equivalent to (1, 1) or (0, 1)).
    """
    if not question:
        return False

    user_answer = user_answer_text.strip()
    correct_answer = question.get_correct_answer() or ""

    if not correct_answer:
        return False

    # Check if answer is correct based on question type
    if question.test_head.question_type in [
        TestHead.QuestionType.MULTIPLE_CHOICE,
        TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS,
    ]:
        # For MCQ/MCMA, compare sorted keys
        user_sorted = "".join(sorted(user_answer.upper()))
        correct_sorted = "".join(sorted(correct_answer.upper()))

        # For MCMA, we need partial credit scoring
        if (
            question.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            return _calculate_mcma_score(user_sorted, correct_sorted)

        # For regular MCQ, all or nothing
        return user_sorted == correct_sorted
    else:
        # Case-insensitive comparison for text answers
        return _build_regular_answer_response(user_answer, correct_answer)


def _calculate_mcma_score(user_answer, correct_answer):
    """
    Calculate partial credit for MCMA questions.
    Each correct answer counts as 1 question toward the 40-question total.

    Returns: (score, max_score) tuple
    - score: number of correct answers the user got
    - max_score: total number of correct answers for this question
    """
    if not correct_answer:
        return (0, 1)

    user_set = set(user_answer)
    correct_set = set(correct_answer)

    # Count correct selections - each correct selection is worth 1 point
    # No penalty for incorrect selections
    correct_selections = len(user_set & correct_set)
    score = correct_selections

    max_score = len(correct_set)
    return (score, max_score)


def calculate_time_remaining(attempt, section_duration_minutes):
    """Calculate remaining time for current section."""
    if not attempt.started_at:
        return section_duration_minutes * 60

    time_elapsed = (timezone.now() - attempt.started_at).total_seconds()
    time_remaining = max(0, (section_duration_minutes * 60) - int(time_elapsed))

    return int(time_remaining)


def _calculate_weighted_score(user_answers_queryset):
    """
    Calculate weighted score considering MCMA questions.
    For MCMA questions, each correct answer counts as 1 toward the total.

    Returns: (total_score, max_possible_score)
    """
    total_score = 0
    max_possible_score = 0

    for ua in user_answers_queryset:
        result = _check_answer_correctness(ua.answer_text, ua.question)

        if isinstance(result, tuple):
            # MCMA question - partial scoring
            score, max_score = result
            total_score += score
            max_possible_score += max_score
        else:
            # Regular question - binary scoring
            total_score += 1 if result else 0
            max_possible_score += 1

    return (total_score, max_possible_score)


# ============================================================================
# TEST ATTEMPT ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_tests(request):
    """
    Get list of available mock tests.

    Query parameters:
    - random: if 'true', returns a single randomly selected test
    - exam_type: filter by specific exam type (e.g., 'FULL_TEST')
    """
    tests = MockExam.objects.filter(is_active=True)

    # Filter by exam_type if provided
    exam_type = request.query_params.get("exam_type")
    if exam_type:
        tests = tests.filter(exam_type=exam_type)

    # Return random test if requested
    if request.query_params.get("random") == "true":
        random_test = tests.order_by("?").first()
        if random_test:
            serializer = MockExamSerializer(random_test, context={"request": request})
            return Response([serializer.data])  # Return as array for consistency
        else:
            return Response([])

    # Return all tests ordered by creation date
    tests = tests.order_by("-created_at")
    serializer = MockExamSerializer(tests, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_active_attempt(request):
    """Check if user has an active exam attempt in progress."""
    active_attempt = (
        ExamAttempt.objects.filter(
            student=request.user, status__in=["NOT_STARTED", "IN_PROGRESS"]
        )
        .select_related("exam", "exam__mock_test")
        .first()
    )

    if active_attempt:
        return Response(
            {
                "has_active_attempt": True,
                "active_attempt": {
                    "attempt_id": active_attempt.id,
                    "exam_title": active_attempt.exam.name,
                    "exam_type": active_attempt.exam.mock_test.exam_type,
                    "status": active_attempt.status,
                    "current_section": active_attempt.current_section,
                    "started_at": active_attempt.started_at,
                },
            }
        )

    return Response({"has_active_attempt": False})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_my_attempts(request):
    """Get all test attempts for the current user."""
    attempts = (
        ExamAttempt.objects.filter(student=request.user)
        .select_related("exam", "exam__mock_test")
        .order_by("-created_at")
    )

    attempts_data = []
    for attempt in attempts:
        # Calculate scores if completed
        listening_score = None
        reading_score = None
        writing_score = None
        speaking_score = None
        overall_score = None

        if attempt.status == "COMPLETED":
            # Get section results
            try:
                listening_data = _get_listening_results(attempt)
                listening_score = listening_data.get("band_score")
                if listening_score is not None:
                    listening_score = round(float(listening_score), 1)
            except:
                pass

            try:
                reading_data = _get_reading_results(attempt)
                reading_score = reading_data.get("band_score")
                if reading_score is not None:
                    reading_score = round(float(reading_score), 1)
            except:
                pass

            try:
                writing_data = _get_writing_results(attempt)
                writing_score = writing_data.get("overall_band_score")
                if writing_score is not None:
                    writing_score = round(float(writing_score), 1)
            except:
                pass

            try:
                speaking_data = _get_speaking_results(attempt)
                speaking_score = speaking_data.get("overall_band_score")
                if speaking_score is not None:
                    speaking_score = round(float(speaking_score), 1)
            except:
                pass

            # Calculate overall score (IELTS rounds to nearest 0.5)
            scores = [
                s
                for s in [listening_score, reading_score, writing_score, speaking_score]
                if s is not None
            ]
            if scores:
                average = sum(scores) / len(scores)
                # Round to nearest 0.5 (IELTS standard)
                overall_score = round(average * 2) / 2

        attempts_data.append(
            {
                "id": attempt.id,
                "exam_id": attempt.exam.id,
                "exam_title": attempt.exam.mock_test.title,
                "exam_type": attempt.exam.mock_test.exam_type,
                "status": attempt.status,
                "current_section": attempt.current_section,
                "started_at": attempt.started_at,
                "completed_at": attempt.completed_at,
                "created_at": attempt.created_at,
                "duration_minutes": (
                    attempt.get_duration_minutes()
                    if attempt.status == "COMPLETED"
                    else None
                ),
                "listening_score": listening_score,
                "reading_score": reading_score,
                "writing_score": writing_score,
                "speaking_score": speaking_score,
                "overall_score": overall_score,
            }
        )

    return Response({"attempts": attempts_data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_exam_attempt(request, exam_id):
    """Create a new exam attempt for the given exam."""
    from ielts.models import Exam

    # Check for existing active attempts (NOT_STARTED or IN_PROGRESS)
    active_attempt = (
        ExamAttempt.objects.filter(
            student=request.user, status__in=["NOT_STARTED", "IN_PROGRESS"]
        )
        .select_related("exam", "exam__mock_test")
        .first()
    )

    if active_attempt:
        return Response(
            {
                "error": "You have an active exam in progress. Please complete it before starting a new one.",
                "active_attempt": {
                    "attempt_id": active_attempt.id,
                    "exam_title": active_attempt.exam.name,
                    "status": active_attempt.status,
                    "current_section": active_attempt.current_section,
                },
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get the exam (MockExam)
    try:
        mock_exam = MockExam.objects.get(id=exam_id, is_active=True)
    except MockExam.DoesNotExist:
        return Response(
            {"error": "Exam not found or not available."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # For CD-Exam, we need to create an Exam instance first if it doesn't exist
    # Check if there's an active Exam for this MockExam
    exam = Exam.objects.filter(
        mock_test=mock_exam, status__in=["SCHEDULED", "ACTIVE"]
    ).first()

    if not exam:
        # Create a default exam instance for CD tests
        from django.utils import timezone
        from datetime import timedelta
        import random
        import string

        # Generate a unique PIN code
        while True:
            pin_code = "".join(
                random.choices(string.ascii_uppercase + string.digits, k=8)
            )
            if not Exam.objects.filter(pin_code=pin_code).exists():
                break

        exam = Exam.objects.create(
            mock_test=mock_exam,
            name=f"{mock_exam.title} - CD Test",
            status="ACTIVE",
            start_date=timezone.now(),
            expire_date=timezone.now() + timedelta(days=30),
            max_students=1000,  # High limit for CD tests
            pin_code=pin_code,
        )

    # Auto-enroll student if not already enrolled
    if not exam.enrolled_students.filter(id=request.user.id).exists():
        exam.enrolled_students.add(request.user)

    # Create exam attempt
    attempt, created = ExamAttempt.objects.get_or_create(
        student=request.user,
        exam=exam,
        status="NOT_STARTED",
        defaults={
            "current_section": "listening",  # NOT_STARTED
        },
    )

    # If attempt already exists and is completed, create a new one
    if not created and attempt.status == "COMPLETED":
        attempt = ExamAttempt.objects.create(
            student=request.user,
            exam=exam,
            status="NOT_STARTED",
            current_section="NOT_STARTED",
        )

    return Response(
        {
            "success": True,
            "attempt_id": attempt.id,
            "exam_title": exam.name,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_attempt_info(request, attempt_id):
    """Get basic information about a test attempt."""
    attempt, error_response = get_user_attempt(attempt_id, request.user)
    if error_response:
        return error_response

    serializer = ExamAttemptSerializer(attempt, context={"request": request})
    return Response(serializer.data)


# ============================================================================
# SECTION DATA ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_data(request, attempt_id, section):
    """Get data for a specific section of the exam."""
    attempt, error_response = get_user_attempt(attempt_id, request.user)
    if error_response:
        return error_response

    # Route to appropriate section builder
    if section == "listening":
        return build_listening_data(attempt, request)
    elif section == "reading":
        return build_reading_data(attempt, request)
    elif section == "writing":
        return build_writing_data(attempt, request)
    elif section == "speaking":
        # Speaking section is disabled - will be conducted offline
        return Response(
            {
                "error": "Speaking section is not available online. It will be conducted offline."
            },
            status=status.HTTP_403_FORBIDDEN,
        )
    else:
        return Response(
            {"error": f"Unknown section: {section}"}, status=status.HTTP_400_BAD_REQUEST
        )


def build_listening_data(attempt, request):
    """Build listening section data with parts and questions."""
    exam = attempt.exam

    # Get listening parts for this exam
    parts = (
        exam.mock_test.listening_parts.all()
        .prefetch_related(
            Prefetch(
                "test_heads",
                queryset=TestHead.objects.prefetch_related(
                    Prefetch(
                        "questions",
                        queryset=Question.objects.prefetch_related("choices").order_by(
                            "order"
                        ),
                    )
                ).order_by("id"),
            )
        )
        .order_by("part_number")
    )

    # Calculate time remaining
    time_remaining = calculate_time_remaining(attempt, 30)  # 30 minutes for listening

    serializer = ListeningPartSerializer(
        parts, many=True, context={"request": request, "attempt": attempt}
    )

    # Determine next section based on exam type
    exam_type = exam.mock_test.exam_type
    section_flows = {
        "LISTENING": None,
        "READING": None,
        "WRITING": None,
        "SPEAKING": None,
        "LISTENING_READING": "reading",
        "LISTENING_READING_WRITING": "reading",
        "FULL_TEST": "reading",
    }
    next_section = section_flows.get(exam_type)

    response_data = {
        "parts": serializer.data,
        # "time_remaining": time_remaining,
    }

    if next_section:
        response_data["next_section_name"] = next_section

    return Response(response_data)


def build_reading_data(attempt, request):
    """Build reading section data with passages and questions."""
    exam = attempt.exam

    # Get reading passages for this exam
    passages = (
        exam.mock_test.reading_passages.all()
        .prefetch_related(
            Prefetch(
                "test_heads",
                queryset=TestHead.objects.prefetch_related(
                    Prefetch(
                        "questions",
                        queryset=Question.objects.prefetch_related("choices").order_by(
                            "order"
                        ),
                    )
                ).order_by("id"),
            )
        )
        .order_by("passage_number")
    )

    # Calculate time remaining
    time_remaining = calculate_time_remaining(attempt, 60)  # 60 minutes for reading

    serializer = ReadingPassageSerializer(
        passages, many=True, context={"request": request, "attempt": attempt}
    )

    # Determine next section based on exam type
    exam_type = exam.mock_test.exam_type
    section_flows = {
        "LISTENING": None,
        "READING": None,
        "WRITING": None,
        "SPEAKING": None,
        "LISTENING_READING": None,
        "LISTENING_READING_WRITING": "writing",
        "FULL_TEST": "writing",
    }
    next_section = section_flows.get(exam_type)

    response_data = {
        "passages": serializer.data,
        # "time_remaining": time_remaining,
    }

    if next_section:
        response_data["next_section_name"] = next_section

    return Response(response_data)


def build_writing_data(attempt, request):
    """Build writing section data with tasks."""
    exam = attempt.exam

    # Get writing tasks for this exam
    tasks = exam.mock_test.writing_tasks.all().order_by("task_type")

    # Calculate time remaining
    time_remaining = calculate_time_remaining(attempt, 60)  # 60 minutes for writing

    serializer = WritingTaskSerializer(
        tasks, many=True, context={"request": request, "attempt": attempt}
    )

    # Determine next section based on exam type
    # Speaking is disabled (offline only), so writing is the final section
    exam_type = exam.mock_test.exam_type
    section_flows = {
        "LISTENING": None,
        "READING": None,
        "WRITING": None,
        "SPEAKING": None,
        "LISTENING_READING": None,
        "LISTENING_READING_WRITING": None,
        "FULL_TEST": None,  # Speaking disabled - writing is now final section
    }
    next_section = section_flows.get(exam_type)

    response_data = {
        "tasks": serializer.data,
        # "time_remaining": time_remaining,
    }

    if next_section:
        response_data["next_section_name"] = next_section

    return Response(response_data)


def build_speaking_data(attempt, request):
    """Build speaking section data with topics."""
    exam = attempt.exam

    # Get speaking topics for this exam
    topics = exam.mock_test.speaking_topics.all().order_by("speaking_type")

    # Calculate time remaining (11-14 minutes for speaking)
    time_remaining = calculate_time_remaining(attempt, 15)

    serializer = SpeakingTopicSerializer(
        topics, many=True, context={"request": request, "attempt": attempt}
    )

    # Determine current part based on existing attempts
    # Since SpeakingAttempt is OneToOne, we check which parts have audio
    current_part = "PART_1"
    try:
        speaking_attempt = SpeakingAttempt.objects.get(exam_attempt=attempt)
        if speaking_attempt and speaking_attempt.audio_files:
            # Find the last completed part
            if speaking_attempt.audio_files.get("PART_3"):
                current_part = "PART_3"
            elif speaking_attempt.audio_files.get("PART_2"):
                current_part = "PART_3"
            elif speaking_attempt.audio_files.get("PART_1"):
                current_part = "PART_2"
    except SpeakingAttempt.DoesNotExist:
        pass

    # Speaking is always the last section, so no next_section_name
    return Response(
        {
            "topics": serializer.data,
            "current_part": current_part,
            # "time_remaining": time_remaining,
        }
    )


# ============================================================================
# ANSWER SUBMISSION ENDPOINTS
# ============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_answer(request, attempt_id):
    """Submit an answer for a reading or listening question."""
    attempt, error_response = get_user_attempt(attempt_id, request.user)
    if error_response:
        return error_response

    serializer = AnswerSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    question_id = serializer.validated_data["question_id"]
    answer = serializer.validated_data["answer"]

    question = get_object_or_404(Question, id=question_id)

    # Check if answer is correct
    correctness_result = _check_answer_correctness(answer, question)

    # Handle MCMA partial scoring
    if isinstance(correctness_result, tuple):
        score, max_score = correctness_result
        is_correct = score == max_score  # Only mark as correct if all answers are right
    else:
        is_correct = correctness_result
        score = 1 if is_correct else 0
        max_score = 1

    # Save or update user answer
    user_answer, created = UserAnswer.objects.update_or_create(
        exam_attempt=attempt,
        question=question,
        defaults={
            "answer_text": answer,
            "is_correct": is_correct,
        },
    )

    return Response(
        {
            "success": True,
            "question_id": question_id,
            "is_correct": is_correct,
            "saved_answer": answer,
            "score": score,
            "max_score": max_score,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_writing(request, attempt_id):
    """Submit a writing task response."""
    attempt, error_response = get_user_attempt(attempt_id, request.user)
    if error_response:
        return error_response

    serializer = WritingSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    task_id = serializer.validated_data["task_id"]
    answer_text = serializer.validated_data["answer_text"]

    task = get_object_or_404(WritingTask, id=task_id)

    # Calculate word count
    word_count = len(answer_text.split())

    # Save or update writing attempt
    writing_attempt, created = WritingAttempt.objects.update_or_create(
        exam_attempt=attempt,
        task=task,
        defaults={
            "answer_text": answer_text,
            "word_count": word_count,
            "evaluation_status": WritingAttempt.EvaluationStatus.PENDING,
        },
    )

    return Response(
        {
            "success": True,
            "task_id": task_id,
            "word_count": word_count,
            "writing_attempt_id": writing_attempt.id,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_speaking(request, attempt_id):
    """Submit a speaking response (audio file)."""
    attempt, error_response = get_user_attempt(attempt_id, request.user)
    if error_response:
        return error_response

    serializer = SpeakingSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    topic_id = serializer.validated_data["topic_id"]
    audio_file = serializer.validated_data["audio_file"]

    topic = get_object_or_404(SpeakingTopic, id=topic_id)

    # Get or create speaking attempt (OneToOne with ExamAttempt)
    speaking_attempt, created = SpeakingAttempt.objects.get_or_create(
        exam_attempt=attempt,
        defaults={
            "audio_files": {},
            "evaluation_status": SpeakingAttempt.EvaluationStatus.PENDING,
        },
    )

    # Save the audio file for this specific speaking type
    # Store the file path in the JSON field
    if not speaking_attempt.audio_files:
        speaking_attempt.audio_files = {}

    # Save the audio file and get its path
    from django.core.files.storage import default_storage

    file_name = f"speaking/{attempt_id}/{topic.speaking_type}_{audio_file.name}"
    file_path = default_storage.save(file_name, audio_file)

    # Update the audio_files JSON
    speaking_attempt.audio_files[topic.speaking_type] = file_path
    speaking_attempt.save()

    return Response(
        {
            "success": True,
            "topic_id": topic_id,
            "speaking_attempt_id": speaking_attempt.id,
            "audio_url": request.build_absolute_uri(default_storage.url(file_path)),
        }
    )


# ============================================================================
# TEST FLOW ENDPOINTS
# ============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def next_section(request, attempt_id):
    """Move to the next section of the exam."""
    from django.db import transaction

    attempt, error_response = get_user_attempt(attempt_id, request.user)
    if error_response:
        return error_response

    # Refresh from database to ensure we have the latest state
    attempt.refresh_from_db()

    current = attempt.current_section
    exam_type = attempt.exam.mock_test.exam_type

    print(
        f"[NEXT SECTION] Attempt {attempt_id}: current={current}, exam_type={exam_type}"
    )

    # Define section flow based on exam type
    section_flows = {
        "LISTENING": ["NOT_STARTED", "listening", "COMPLETED"],
        "READING": ["NOT_STARTED", "reading", "COMPLETED"],
        "WRITING": ["NOT_STARTED", "writing", "COMPLETED"],
        "SPEAKING": ["NOT_STARTED", "speaking", "COMPLETED"],
        "LISTENING_READING": ["NOT_STARTED", "listening", "reading", "COMPLETED"],
        "LISTENING_READING_WRITING": [
            "NOT_STARTED",
            "listening",
            "reading",
            "writing",
            "COMPLETED",
        ],
        "FULL_TEST": [
            "NOT_STARTED",
            "listening",
            "reading",
            "writing",
            "speaking",
            "COMPLETED",
        ],
    }

    flow = section_flows.get(exam_type, ["NOT_STARTED", "COMPLETED"])

    try:
        current_index = flow.index(current)
        next_section = (
            flow[current_index + 1] if current_index + 1 < len(flow) else "COMPLETED"
        )
    except ValueError:
        next_section = flow[1] if len(flow) > 1 else "COMPLETED"

    print(
        f"[NEXT SECTION] Calculated: current_index={current_index if 'current_index' in locals() else 'N/A'}, next_section={next_section}"
    )

    # Use atomic transaction to prevent race conditions
    with transaction.atomic():
        # Lock the row to prevent concurrent updates
        attempt = ExamAttempt.objects.select_for_update().get(id=attempt_id)

        # Update attempt
        attempt.current_section = next_section
        if next_section == "COMPLETED":
            attempt.status = "COMPLETED"
            attempt.completed_at = timezone.now()
        elif current == "NOT_STARTED":
            attempt.status = "IN_PROGRESS"
            attempt.started_at = timezone.now()

        attempt.save()

        print(
            f"[NEXT SECTION] Saved: current_section={attempt.current_section}, status={attempt.status}"
        )

    return Response(
        {
            "success": True,
            "current_section": attempt.current_section,
            "status": attempt.status,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_test(request, attempt_id):
    """Submit the entire test and mark as completed."""
    attempt, error_response = get_user_attempt(attempt_id, request.user)
    if error_response:
        return error_response

    # Mark as completed
    attempt.status = "COMPLETED"
    attempt.current_section = "COMPLETED"
    attempt.completed_at = timezone.now()
    attempt.save()

    # Calculate scores for reading and listening if applicable
    exam_type = attempt.exam.mock_test.exam_type

    if exam_type in [
        "LISTENING",
        "READING",
        "LISTENING_READING",
        "LISTENING_READING_WRITING",
        "FULL_TEST",
    ]:
        # We'll calculate scores here or you can trigger async tasks
        pass

    return Response(
        {
            "success": True,
            "message": "Test submitted successfully!",
            "attempt_id": attempt.id,
        }
    )


# ============================================================================
# RESULTS ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_test_results(request, attempt_id):
    """Get comprehensive test results with analysis."""
    attempt, error_response = get_user_attempt(attempt_id, request.user)
    if error_response:
        return error_response

    if attempt.status != "COMPLETED":
        return Response(
            {"error": "Test has not been completed yet."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    exam = attempt.exam
    exam_type = exam.mock_test.exam_type

    results = {
        "attempt_id": attempt.id,
        "exam_title": exam.mock_test.title,
        "exam_type": exam_type,
        "completed_at": attempt.completed_at,
        "duration_minutes": attempt.get_duration_minutes(),
        "sections": {},
    }

    analysis_results = []

    # Listening Section
    if exam_type in [
        "LISTENING",
        "LISTENING_READING",
        "LISTENING_READING_WRITING",
        "FULL_TEST",
    ]:
        listening_data = _get_listening_results(attempt)
        results["sections"]["listening"] = listening_data
        analysis_results.append(
            {
                "section_name": "Listening",
                "accuracy_by_type": listening_data.get("accuracy_by_type", {}),
                "accuracy_by_part": listening_data.get("accuracy_by_part", {}),
            }
        )

    # Reading Section
    if exam_type in [
        "READING",
        "LISTENING_READING",
        "LISTENING_READING_WRITING",
        "FULL_TEST",
    ]:
        reading_data = _get_reading_results(attempt)
        results["sections"]["reading"] = reading_data
        analysis_results.append(
            {
                "section_name": "Reading",
                "accuracy_by_type": reading_data.get("accuracy_by_type", {}),
            }
        )

    # Writing Section
    if exam_type in ["WRITING", "LISTENING_READING_WRITING", "FULL_TEST"]:
        writing_data = _get_writing_results(attempt)
        results["sections"]["writing"] = writing_data

    # Speaking Section
    if exam_type in ["SPEAKING", "FULL_TEST"]:
        speaking_data = _get_speaking_results(attempt)
        results["sections"]["speaking"] = speaking_data

    # Overall Analysis
    if analysis_results:
        insights = identify_strengths_and_weaknesses(analysis_results)
        results["insights"] = insights
    return Response(results)


def _build_mcma_answer_detail(question, user_answer, correct_answer):
    """Build detailed MCMA answer breakdown with scoring."""
    user_set = set(user_answer.upper())
    correct_set = set(correct_answer.upper())

    # Calculate partial score - only count correct selections
    # Each correct answer is worth 1 point
    correct_selections = len(user_set & correct_set)
    score = correct_selections
    max_score = len(correct_set)

    # Build detailed breakdown
    breakdown = []
    for option in sorted(correct_set):
        if option in user_set:
            breakdown.append(f"✓ {option} (Correct - selected)")
        else:
            breakdown.append(f"✗ {option} (Correct - not selected)")

    for option in sorted(user_set - correct_set):
        breakdown.append(f"✗ {option} (Incorrect - should not select)")

    is_correct = score == max_score

    return {
        "question_number": question.order,
        "question_text": question.question_text,
        "user_answer": f"Selected: {', '.join(sorted(user_set)) if user_set else 'None'}",
        "correct_answer": f"Correct answers: {', '.join(sorted(correct_set))}",
        "is_correct": is_correct,
        "is_mcma": True,
        "mcma_score": f"{score}/{max_score}",
        "mcma_breakdown": breakdown,
    }


def _build_regular_answer_detail(question, user_answer, correct_answer):
    """Build regular answer detail (non-MCMA)."""
    is_correct = False
    if correct_answer:
        if question.test_head.question_type == TestHead.QuestionType.MULTIPLE_CHOICE:
            user_sorted = "".join(sorted(user_answer.upper()))
            correct_sorted = "".join(sorted(correct_answer.upper()))
            is_correct = user_sorted == correct_sorted
        else:
            is_correct = _build_regular_answer_response(user_answer, correct_answer)

    return {
        "question_number": question.order,
        "question_text": question.question_text,
        "user_answer": user_answer or "Not answered",
        "correct_answer": correct_answer,
        "is_correct": is_correct,
        "is_mcma": False,
    }


def _build_regular_answer_response(user_answer, correct_answer):
    """Build regular answer response (non-MCMA)."""
    corrects = correct_answer.lower().split("|")
    for cor_answer in corrects:
        if user_answer.lower() == cor_answer.lower():
            return True
    return False


def _build_answer_groups(section_items, user_answers_map, section_type="listening"):
    """
    Build detailed answer groups for section review.

    Args:
        section_items: QuerySet of ListeningPart or ReadingPassage objects
        user_answers_map: Dict mapping question_id to user_answer
        section_type: 'listening' or 'reading'
    """
    answer_groups = []

    for idx, item in enumerate(section_items, start=1):
        item_number = (
            item.part_number if section_type == "listening" else item.passage_number
        )
        label = "Part" if section_type == "listening" else "Passage"

        for test_head in item.test_heads.all().order_by("id"):
            questions = test_head.questions.all().order_by("order")

            if not questions:
                continue

            answers_list = []
            for question in questions:
                user_answer = user_answers_map.get(question.id, "")
                correct_answer = question.get_correct_answer() or ""

                # Handle MCMA questions
                if (
                    question.test_head.question_type
                    == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
                ):
                    if correct_answer:
                        answer_detail = _build_mcma_answer_detail(
                            question, user_answer, correct_answer
                        )
                    else:
                        # No correct answer defined
                        answer_detail = {
                            "question_number": question.order,
                            "question_text": question.question_text,
                            "user_answer": user_answer or "Not answered",
                            "correct_answer": "Not available",
                            "is_correct": False,
                            "is_mcma": True,
                        }
                else:
                    # Regular question types (MCQ, Fill-in, etc.)
                    answer_detail = _build_regular_answer_detail(
                        question, user_answer, correct_answer
                    )

                answers_list.append(answer_detail)

            answer_groups.append(
                {
                    "id": test_head.id,
                    "title": f"{label} {item_number} - {test_head.get_question_type_display()}",
                    "test_head": test_head.get_question_type_display(),
                    "answers": answers_list,
                }
            )

    return answer_groups


def _build_listening_answer_groups(exam, user_answers_map):
    """Build detailed answer groups for listening section review."""
    parts = exam.mock_test.listening_parts.all().order_by("part_number")
    return _build_answer_groups(parts, user_answers_map, section_type="listening")


def _build_reading_answer_groups(exam, user_answers_map):
    """Build detailed answer groups for reading section review."""
    passages = exam.mock_test.reading_passages.all().order_by("passage_number")
    return _build_answer_groups(passages, user_answers_map, section_type="reading")


def _get_listening_results(attempt):
    """Get detailed listening section results."""
    return _get_section_results(attempt, section_type="listening")


def _calculate_question_score(question, user_answer, correct_answer):
    """
    Calculate score for a single question (handles MCMA partial scoring).
    Returns: (score, max_score) tuple
    """
    if (
        question.test_head.question_type
        == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
    ):
        # MCMA with partial scoring
        user_sorted = "".join(sorted(user_answer.upper()))
        correct_sorted = "".join(sorted(correct_answer.upper()))

        if correct_answer:
            user_set = set(user_sorted)
            correct_set = set(correct_sorted)

            # Each correct selection is worth 1 point
            # No penalty for incorrect selections
            correct_selections = len(user_set & correct_set)
            score = correct_selections

            max_score = len(correct_set)
            return (score, max_score)
        else:
            return (0, 1)
    else:
        # Regular question types - binary scoring
        is_correct = _build_regular_answer_response(user_answer, correct_answer)
        return (1 if is_correct else 0, 1)


def _analyze_performance(questions_qs, user_answers_map, grouping_map=None):
    """
    Generic performance analysis for both listening and reading sections.

    Args:
        questions_qs: QuerySet of questions
        user_answers_map: Dict mapping question_id to user_answer
        grouping_map: Optional dict mapping question_id to group label (e.g., "Part 1")

    Returns:
        Dict with stats and accuracies
    """
    from collections import defaultdict

    type_stats = defaultdict(lambda: {"correct": 0, "total": 0})
    group_stats = (
        defaultdict(lambda: {"correct": 0, "total": 0}) if grouping_map else None
    )

    for q in questions_qs:
        question_type = q.test_head.get_question_type_display()
        user_answer = user_answers_map.get(q.id, "").strip()
        correct_answer = q.get_correct_answer() or ""

        # Calculate score using unified function
        score, max_score = _calculate_question_score(q, user_answer, correct_answer)

        # Update type stats
        type_stats[question_type]["total"] += max_score
        type_stats[question_type]["correct"] += score

        # Update group stats if grouping provided
        if grouping_map and q.id in grouping_map:
            group_label = grouping_map[q.id]
            group_stats[group_label]["total"] += max_score
            group_stats[group_label]["correct"] += score

    # Calculate accuracies
    accuracy_by_type = {
        q_type: (stats["correct"] / stats["total"]) if stats["total"] > 0 else 0
        for q_type, stats in type_stats.items()
    }

    result = {
        "type_stats": type_stats,
        "accuracy_by_type": accuracy_by_type,
    }

    # Add group stats if available
    if group_stats:
        accuracy_by_group = {
            group: (stats["correct"] / stats["total"]) if stats["total"] > 0 else 0
            for group, stats in group_stats.items()
        }
        result.update(
            {
                "group_stats": dict(sorted(group_stats.items())),
                "accuracy_by_group": dict(sorted(accuracy_by_group.items())),
            }
        )

    return result


def _analyze_listening_with_parts(
    listening_questions_qs, user_answers_map, question_to_part_map
):
    """Analyze listening performance with exam-specific part mapping."""
    # Convert part numbers to part labels
    part_grouping = {qid: f"Part {pnum}" for qid, pnum in question_to_part_map.items()}

    result = _analyze_performance(
        listening_questions_qs, user_answers_map, part_grouping
    )

    # Rename group keys for backward compatibility
    return {
        "part_stats": result.get("group_stats", {}),
        "type_stats": result["type_stats"],
        "accuracy_by_part": result.get("accuracy_by_group", {}),
        "accuracy_by_type": result["accuracy_by_type"],
    }


def _analyze_reading_with_types(reading_questions_qs, user_answers_map):
    """Analyze reading performance by question type."""
    # Reading doesn't need grouping by passage
    return _analyze_performance(reading_questions_qs, user_answers_map)


def _calculate_total_questions(questions_qs):
    """Calculate total question count (handling MCMA as multiple questions)."""
    total_count = 0
    for q in questions_qs:
        if (
            q.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            correct_answer = q.get_correct_answer() or ""
            total_count += len(set(correct_answer)) if correct_answer else 1
        else:
            total_count += 1
    return total_count


def _get_section_results(attempt, section_type="listening"):
    """
    Generic function to get section results for listening or reading.

    Args:
        attempt: ExamAttempt object
        section_type: 'listening' or 'reading'
    """
    exam = attempt.exam

    # Get questions based on section type
    if section_type == "listening":
        questions = Question.objects.filter(
            test_head__listening__in=exam.mock_test.listening_parts.all()
        ).select_related("test_head", "test_head__listening")
        band_type = "listening"

        # Build question to part map
        grouping_map = {}
        for part in exam.mock_test.listening_parts.all():
            for head in part.test_heads.all():
                for question in head.questions.all():
                    grouping_map[question.id] = part.part_number
    else:  # reading
        questions = Question.objects.filter(
            test_head__reading__in=exam.mock_test.reading_passages.all()
        ).select_related("test_head")
        band_type = "academic_reading"
        grouping_map = None

    # Get user answers
    user_answers = UserAnswer.objects.filter(
        exam_attempt=attempt, question__in=questions
    ).select_related("question", "question__test_head")

    # Build user answers map
    user_answers_map = {ua.question_id: ua.answer_text for ua in user_answers}

    # Analyze performance
    if section_type == "listening":
        analysis = _analyze_listening_with_parts(
            questions, user_answers_map, grouping_map
        )
    else:
        analysis = _analyze_reading_with_types(questions, user_answers_map)

    # Calculate scores
    correct_count, _ = _calculate_weighted_score(user_answers)
    total_count = _calculate_total_questions(questions)
    band_score = calculate_band_score(correct_count, total_count, band_type)

    # Build answer groups
    if section_type == "listening":
        answer_groups = _build_listening_answer_groups(exam, user_answers_map)
    else:
        answer_groups = _build_reading_answer_groups(exam, user_answers_map)

    result = {
        "total_questions": total_count,
        "correct_answers": correct_count,
        "band_score": band_score,
        "accuracy_by_type": analysis["accuracy_by_type"],
        "type_stats": analysis["type_stats"],
        "answer_groups": answer_groups,
    }

    # Add part-specific data for listening
    if section_type == "listening":
        result.update(
            {
                "accuracy_by_part": analysis["accuracy_by_part"],
                "part_stats": analysis["part_stats"],
            }
        )

    return result


def _get_reading_results(attempt):
    """Get detailed reading section results."""
    return _get_section_results(attempt, section_type="reading")


def _get_writing_results(attempt):
    """Get writing section results."""
    writing_attempts = WritingAttempt.objects.filter(
        exam_attempt=attempt
    ).select_related("task")

    tasks_data = []
    total_band = 0
    completed_count = 0

    for wa in writing_attempts:
        # Only include tasks that have an answer submitted
        if not wa.answer_text:
            continue

        task_data = {
            "id": wa.id,  # Include WritingAttempt ID for evaluation endpoint
            "task_type": wa.task.get_task_type_display(),
            "word_count": wa.word_count,
            "evaluation_status": wa.evaluation_status,
            "user_answer": wa.answer_text,  # Include user's written answer
        }

        if (
            wa.evaluation_status == WritingAttempt.EvaluationStatus.COMPLETED
            and wa.band_score
        ):
            task_data["band_score"] = float(wa.band_score)
            task_data["band"] = float(wa.band_score)  # Frontend expects 'band' field
            task_data["feedback"] = wa.feedback or {}

            # Build criteria scores object from database fields
            task_data["criteria"] = {
                "task_response_or_achievement": (
                    float(wa.task_response_or_achievement)
                    if wa.task_response_or_achievement
                    else None
                ),
                "coherence_and_cohesion": (
                    float(wa.coherence_and_cohesion)
                    if wa.coherence_and_cohesion
                    else None
                ),
                "lexical_resource": (
                    float(wa.lexical_resource) if wa.lexical_resource else None
                ),
                "grammatical_range_and_accuracy": (
                    float(wa.grammatical_range_and_accuracy)
                    if wa.grammatical_range_and_accuracy
                    else None
                ),
            }
            total_band += float(wa.band_score)
            completed_count += 1
        else:
            # For pending evaluations, still provide data but mark as pending
            task_data["band_score"] = None
            task_data["band"] = None
            task_data["feedback"] = {}
            task_data["criteria"] = {}

        tasks_data.append(task_data)

    # Calculate overall band score (IELTS rounds to nearest 0.5)
    if completed_count > 0:
        average = total_band / completed_count
        overall_band = round(average * 2) / 2
    else:
        overall_band = None

    return {
        "tasks": tasks_data,
        "overall_band_score": overall_band,
    }


def _get_speaking_results(attempt):
    """Get speaking section results."""
    try:
        speaking_attempt = SpeakingAttempt.objects.get(exam_attempt=attempt)
    except SpeakingAttempt.DoesNotExist:
        return {
            "parts": [],
            "overall_band_score": None,
        }

    # Get all speaking topics for the exam
    topics = attempt.exam.mock_test.speaking_topics.all().order_by("speaking_type")

    parts_data = []
    for topic in topics:
        part_data = {
            "speaking_type": topic.speaking_type,
            "part_display": topic.get_speaking_type_display(),
            "topic": topic.topic,
            "evaluation_status": speaking_attempt.evaluation_status,
        }

        # Check if audio exists for this part
        if (
            speaking_attempt.audio_files
            and topic.speaking_type in speaking_attempt.audio_files
        ):
            part_data["has_audio"] = True

        parts_data.append(part_data)

    # Overall band score (if evaluation is completed)
    overall_band = None
    criteria = {}
    if (
        speaking_attempt.evaluation_status == SpeakingAttempt.EvaluationStatus.COMPLETED
        and speaking_attempt.band_score
    ):
        overall_band = float(speaking_attempt.band_score)

        # Build criteria scores object from database fields
        criteria = {
            "fluency_and_coherence": (
                float(speaking_attempt.fluency_and_coherence)
                if speaking_attempt.fluency_and_coherence
                else None
            ),
            "lexical_resource": (
                float(speaking_attempt.lexical_resource)
                if speaking_attempt.lexical_resource
                else None
            ),
            "grammatical_range_and_accuracy": (
                float(speaking_attempt.grammatical_range_and_accuracy)
                if speaking_attempt.grammatical_range_and_accuracy
                else None
            ),
            "pronunciation": (
                float(speaking_attempt.pronunciation)
                if speaking_attempt.pronunciation
                else None
            ),
        }

    return {
        "parts": parts_data,
        "overall_band_score": overall_band,
        "criteria": criteria,
        "feedback": speaking_attempt.feedback or {},
    }


# ============================================================================
# CONNECTION CHECK ENDPOINT
# ============================================================================


@api_view(["HEAD", "GET"])
@permission_classes([AllowAny])
def ping(request):
    """
    Simple ping endpoint for connection testing.
    Used by permissions page to check internet connectivity.
    """
    return Response({"status": "ok", "timestamp": timezone.now().isoformat()})
