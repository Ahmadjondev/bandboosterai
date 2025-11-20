"""
Manager API - Mock Test Management Endpoints
Enhanced endpoints for full mock test management
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Q

from ielts.models import (
    MockExam,
    Exam,
    # ExamResult,  # Temporarily disabled - model needs to be recreated
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
)
from ..serializers import (
    MockExamSerializer,
    MockExamDetailSerializer,
    # ExamResultSerializer,  # Temporarily disabled
)
from .utils import (
    check_manager_permission,
    permission_denied_response,
    paginate_queryset,
)

from ..serializers import (
    ReadingPassageSerializer,
    ReadingPassageListSerializer,
    ListeningPartSerializer,
    WritingTaskSerializer,
    SpeakingTopicSerializer,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_mock_tests(request):
    """
    Get list of mock tests with enhanced filtering and statistics

    Query params:
        - status: 'active' or 'inactive'
        - exam_type: Filter by exam type
        - search: Search in title or description
        - page: Page number
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    # Build query
    tests_qs = MockExam.objects.all()
    print(tests_qs)
    # Apply filters
    status_filter = request.GET.get("status", "")
    if status_filter == "active":
        tests_qs = tests_qs.filter(is_active=True)
    elif status_filter == "inactive":
        tests_qs = tests_qs.filter(is_active=False)

    exam_type = request.GET.get("exam_type", "")
    if exam_type:
        tests_qs = tests_qs.filter(exam_type=exam_type)

    search = request.GET.get("search", "").strip()
    if search:
        tests_qs = tests_qs.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    # Annotate with statistics
    # Note: ExamResult now links to Exam (scheduled), not MockExam
    # So we count through: MockExam -> scheduled_exams -> results
    # Count attempts through scheduled exams -> exam attempts
    tests_qs = tests_qs.annotate(
        attempt_count=Count("scheduled_exams__attempts", distinct=True)
    ).order_by("-created_at")

    paginated = paginate_queryset(tests_qs, request)
    serializer = MockExamSerializer(paginated["results"], many=True)

    return Response(
        {
            "success": True,
            "tests": serializer.data,
            "pagination": paginated["pagination"],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_mock_test(request, test_id):
    """
    Get detailed mock test information with statistics

    Returns:
        - Mock test details
        - Content sections (reading, listening, writing, speaking)
        - Statistics (attempts, avg scores)
        - Recent attempts
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    test = get_object_or_404(
        MockExam.objects.prefetch_related(
            "reading_passages", "listening_parts", "writing_tasks", "speaking_topics"
        ),
        id=test_id,
    )

    # Get attempts statistics through scheduled exams
    # Since ExamResult now links to scheduled Exam, we need to get results through mock_test relationship
    scheduled_exams = Exam.objects.filter(mock_test=test)
    # results = ExamResult.objects.filter(exam__in=scheduled_exams)  # Temporarily disabled
    # total_attempts = results.count()
    # completed_attempts = results.filter(completed_at__isnull=False).count()
    total_attempts = 0  # Placeholder
    completed_attempts = 0  # Placeholder

    # Calculate average scores for completed attempts
    # completed_with_scores = results.filter(
    #     completed_at__isnull=False, overall_score__isnull=False
    # )

    stats = {
        "total_attempts": total_attempts,
        "completed_attempts": completed_attempts,
        "in_progress": total_attempts - completed_attempts,
    }

    # Temporarily disabled - ExamResult model needs to be recreated
    # if completed_with_scores.exists():
    #     aggregates = completed_with_scores.aggregate(
    #         avg_overall=Avg("overall_score"),
    #         avg_reading=Avg("reading_score"),
    #         avg_listening=Avg("listening_score"),
    #         avg_writing=Avg("writing_score"),
    #         avg_speaking=Avg("speaking_score"),
    #     )
    #     stats.update(
    #         {
    #             "avg_overall_band": (
    #                 round(aggregates["avg_overall"], 1)
    #                 if aggregates["avg_overall"]
    #                 else None
    #             ),
    #             "avg_reading_band": (
    #                 round(aggregates["avg_reading"], 1)
    #                 if aggregates["avg_reading"]
    #                 else None
    #             ),
    #             "avg_listening_band": (
    #                 round(aggregates["avg_listening"], 1)
    #                 if aggregates["avg_listening"]
    #                 else None
    #             ),
    #             "avg_writing_band": (
    #                 round(aggregates["avg_writing"], 1)
    #                 if aggregates["avg_writing"]
    #                 else None
    #             ),
    #             "avg_speaking_band": (
    #                 round(aggregates["avg_speaking"], 1)
    #                 if aggregates["avg_speaking"]
    #                 else None
    #             ),
    #         }
    #     )

    # Get recent attempts
    # recent_attempts = results.select_related("student").order_by("-created_at")[:10]
    recent_attempts = []  # Placeholder

    serializer = MockExamDetailSerializer(test)

    return Response(
        {
            "success": True,
            "test": serializer.data,
            "statistics": stats,
            # "recent_attempts": ExamResultSerializer(recent_attempts, many=True).data,
            "recent_attempts": [],  # Placeholder
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_mock_test(request):
    """
    Create a new mock test

    Body:
        - title: Test title (required)
        - exam_type: Type of exam (required)
        - description: Description
        - duration_minutes: Duration in minutes
        - difficulty_level: Difficulty level
        - reading_passages: Array of passage IDs
        - listening_parts: Array of part IDs
        - writing_tasks: Array of task IDs
        - speaking_topics: Array of topic IDs
        - is_active: Active status
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    data = request.data.copy()
    # Extract many-to-many fields
    reading_passages = data.pop("reading_passages", [])
    listening_parts = data.pop("listening_parts", [])
    writing_tasks = data.pop("writing_tasks", [])
    speaking_topics = data.pop("speaking_topics", [])

    serializer = MockExamSerializer(data=data)
    if serializer.is_valid():
        test = serializer.save()

        # Set many-to-many relationships
        if reading_passages:
            test.reading_passages.set(reading_passages)
        if listening_parts:
            test.listening_parts.set(listening_parts)
        if writing_tasks:
            test.writing_tasks.set(writing_tasks)
        if speaking_topics:
            test.speaking_topics.set(speaking_topics)

        return Response(
            {
                "success": True,
                "message": "Mock test created successfully",
                "test": MockExamSerializer(test).data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {"success": False, "error": "Validation failed", "details": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_mock_test(request, test_id):
    """
    Update a mock test

    Supports partial updates (PATCH) and full updates (PUT)
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    test = get_object_or_404(MockExam, id=test_id)

    data = request.data.copy()

    # Extract many-to-many fields
    reading_passages = data.pop("reading_passages", None)
    listening_parts = data.pop("listening_parts", None)
    writing_tasks = data.pop("writing_tasks", None)
    speaking_topics = data.pop("speaking_topics", None)

    serializer = MockExamSerializer(test, data=data, partial=True)
    if serializer.is_valid():
        test = serializer.save()

        # Update many-to-many relationships only if provided
        if reading_passages is not None:
            test.reading_passages.set(reading_passages)
        if listening_parts is not None:
            test.listening_parts.set(listening_parts)
        if writing_tasks is not None:
            test.writing_tasks.set(writing_tasks)
        if speaking_topics is not None:
            test.speaking_topics.set(speaking_topics)

        return Response(
            {
                "success": True,
                "message": "Mock test updated successfully",
                "test": MockExamSerializer(test).data,
            }
        )

    return Response(
        {"success": False, "error": "Validation failed", "details": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_mock_test_status(request, test_id):
    """
    Toggle mock test active status

    POST /api/manager/mock-tests/<test_id>/toggle/
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    test = get_object_or_404(MockExam, id=test_id)

    test.is_active = not test.is_active
    test.save(update_fields=["is_active"])

    status_text = "activated" if test.is_active else "deactivated"

    return Response(
        {
            "success": True,
            "message": f"Mock test {status_text} successfully",
            "test": MockExamSerializer(test).data,
        }
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_mock_test(request, test_id):
    """Delete a mock test"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    test = get_object_or_404(MockExam, id=test_id)
    test_title = test.title
    test.delete()

    return Response(
        {"success": True, "message": f"Mock test '{test_title}' deleted successfully"},
        status=status.HTTP_204_NO_CONTENT,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_student_results(request):
    """
    Get student exam results with pagination and filters

    Query params:
        - student_id: Filter by student
        - exam_id: Filter by exam
        - status: 'completed' or 'in_progress'
        - page: Page number
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    # Query completed exam attempts instead of ExamResult
    from ielts.models import ExamAttempt

    attempts_qs = ExamAttempt.objects.filter(exam__status="COMPLETED").select_related(
        "student", "exam", "exam__mock_test"
    )

    # Apply filters
    student_id = request.GET.get("student_id")
    if student_id:
        attempts_qs = attempts_qs.filter(student_id=student_id)

    exam_id = request.GET.get("exam_id")
    if exam_id:
        attempts_qs = attempts_qs.filter(exam_id=exam_id)

    status_filter = request.GET.get("status")
    if status_filter == "completed":
        attempts_qs = attempts_qs.filter(completed_at__isnull=False)
    elif status_filter == "in_progress":
        # For in_progress, we'd need to query attempts with status != COMPLETED
        # But since we already filter by COMPLETED above, this will return empty
        attempts_qs = ExamAttempt.objects.none()

    attempts_qs = attempts_qs.order_by("-completed_at")

    paginated = paginate_queryset(attempts_qs, request)

    # Build results with calculated scores
    from .exams import _calculate_attempt_scores

    results_data = []
    for attempt in paginated["results"]:
        scores = _calculate_attempt_scores(attempt)

        results_data.append(
            {
                "id": attempt.id,
                "student_id": attempt.student.id,
                "student_name": f"{attempt.student.first_name} {attempt.student.last_name}",
                "student_email": attempt.student.email,
                "exam_id": attempt.exam.id,
                "exam_title": attempt.exam.name,
                "exam_type": attempt.exam.mock_test.get_exam_type_display(),
                "overall_score": scores["overall_score"],
                "listening_score": scores["listening_score"],
                "reading_score": scores["reading_score"],
                "writing_score": scores["writing_score"],
                "speaking_score": scores["speaking_score"],
                "completed_at": attempt.completed_at,
                "created_at": attempt.created_at,
            }
        )

    return Response(
        {
            "success": True,
            "results": results_data,
            "pagination": paginated["pagination"],
        }
    )


# ==========================================================================
# Available content endpoints for Mock Tests (with is_authentic filter + pagination)
# ==========================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_reading(request):
    """
    Get available reading passages for mock test selection.

    Query params:
      - is_authentic: true/false
      - passage_number: 1/2/3
      - search: text
      - page, per_page
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    passages = ReadingPassage.objects.all()

    is_authentic = request.GET.get("is_authentic")
    if is_authentic is not None:
        passages = passages.filter(is_authentic=is_authentic.lower() == "true")

    passage_number = request.GET.get("passage_number")
    if passage_number:
        try:
            passages = passages.filter(passage_number=int(passage_number))
        except ValueError:
            pass

    search = request.GET.get("search", "").strip()
    if search:
        passages = passages.filter(
            Q(title__icontains=search) | Q(content__icontains=search)
        )

    passages = passages.order_by("-created_at")

    paginated = paginate_queryset(
        passages, request, per_page=int(request.GET.get("per_page", 25))
    )
    serializer = ReadingPassageListSerializer(
        paginated["results"],
        many=True,
    )

    return Response(
        {"passages": serializer.data, "pagination": paginated["pagination"]}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_listening(request):
    """
    Get available listening parts for mock test selection.

    Query params:
      - is_authentic: true/false
      - part_number: 1..4
      - search: text
      - page, per_page
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    parts = ListeningPart.objects.all()

    is_authentic = request.GET.get("is_authentic")
    if is_authentic is not None:
        parts = parts.filter(is_authentic=is_authentic.lower() == "true")

    part_number = request.GET.get("part_number")
    if part_number:
        try:
            parts = parts.filter(part_number=int(part_number))
        except ValueError:
            pass

    search = request.GET.get("search", "").strip()
    if search:
        parts = parts.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    # Annotate with counts similar to listing endpoint
    from django.db.models import Count

    parts = parts.annotate(
        num_heads=Count("test_heads", distinct=True),
        num_questions=Count("test_heads__questions", distinct=True),
    )

    parts = parts.order_by("-created_at")

    paginated = paginate_queryset(
        parts, request, per_page=int(request.GET.get("per_page", 25))
    )
    serializer = ListeningPartSerializer(paginated["results"], many=True)

    return Response({"parts": serializer.data, "pagination": paginated["pagination"]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_writing(request):
    """
    Get available writing tasks for mock test selection.

    Query params:
      - is_authentic: true/false
      - task_type: TASK_1 | TASK_2
      - search: text
      - page, per_page
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    tasks = WritingTask.objects.all()

    is_authentic = request.GET.get("is_authentic")
    if is_authentic is not None:
        tasks = tasks.filter(is_authentic=is_authentic.lower() == "true")

    task_type = request.GET.get("task_type")
    if task_type:
        tasks = tasks.filter(task_type=task_type)

    search = request.GET.get("search", "").strip()
    if search:
        tasks = tasks.filter(Q(prompt__icontains=search))

    tasks = tasks.order_by("-created_at")

    paginated = paginate_queryset(
        tasks, request, per_page=int(request.GET.get("per_page", 25))
    )
    serializer = WritingTaskSerializer(paginated["results"], many=True)

    return Response({"tasks": serializer.data, "pagination": paginated["pagination"]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_speaking(request):
    """
    Get available speaking topics for mock test selection.

    Query params:
      - is_authentic: true/false
      - speaking_type: PART_1 | PART_2 | PART_3
      - search: text
      - page, per_page
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    topics = SpeakingTopic.objects.all()

    is_authentic = request.GET.get("is_authentic")
    if is_authentic is not None:
        topics = topics.filter(is_authentic=is_authentic.lower() == "true")

    speaking_type = request.GET.get("speaking_type")
    if speaking_type:
        topics = topics.filter(speaking_type=speaking_type)

    search = request.GET.get("search", "").strip()
    if search:
        topics = topics.filter(
            Q(topic__icontains=search) | Q(question__icontains=search)
        )

    topics = topics.order_by("-created_at")

    paginated = paginate_queryset(
        topics, request, per_page=int(request.GET.get("per_page", 25))
    )
    serializer = SpeakingTopicSerializer(paginated["results"], many=True)

    return Response({"topics": serializer.data, "pagination": paginated["pagination"]})
