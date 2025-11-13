"""
Manager API Views
RESTful API endpoints for manager dashboard and administrative functions.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q, Avg
from django.core.paginator import Paginator
from django.utils import timezone
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie

from ielts.models import (
    MockExam,
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
    TestHead,
    Question,
    Choice,
    ExamAttempt,
)
from .serializers import (
    UserSerializer,
    UserDetailSerializer,
    ReadingPassageSerializer,
    ListeningPartSerializer,
    WritingTaskSerializer,
    SpeakingTopicSerializer,
    TestHeadSerializer,
    QuestionSerializer,
    MockExamSerializer,
    DashboardStatsSerializer,
)

User = get_user_model()


# ============================================================================
# AUTHENTICATION & SESSION ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Get or refresh CSRF token for the frontend
    This endpoint ensures a CSRF cookie is set
    """
    return Response(
        {"csrfToken": get_token(request), "detail": "CSRF cookie set successfully"}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_session(request):
    """
    Verify that the user's session is valid and active
    Returns user info if authenticated
    """
    return Response(
        {
            "authenticated": True,
            "user": {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "role": request.user.role,
            },
            "sessionId": request.session.session_key,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@ensure_csrf_cookie
def get_tokens_for_session(request):
    """
    Generate JWT tokens for an already authenticated user
    This is used when a user has a valid Django session but no JWT tokens
    """
    from rest_framework_simplejwt.tokens import RefreshToken

    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    # Generate tokens for the authenticated user
    refresh = RefreshToken.for_user(request.user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    # Store in session for future page loads
    request.session["jwt_access_token"] = access_token
    request.session["jwt_refresh_token"] = refresh_token
    request.session.modified = True

    return Response(
        {
            "access": access_token,
            "refresh": refresh_token,
            "message": "Tokens generated successfully",
        },
        status=status.HTTP_200_OK,
    )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def check_manager_permission(user):
    """Check if user has manager permissions"""
    if not user.is_authenticated:
        return False
    return user.role in ["MANAGER", "SUPERADMIN"]


def paginate_queryset(queryset, request, per_page=25):
    """Paginate a queryset"""
    page = request.GET.get("page", 1)

    paginator = Paginator(queryset, per_page)

    try:
        page_obj = paginator.page(page)

    except:
        page_obj = paginator.page(1)

    return {
        "results": page_obj.object_list,
        "pagination": {
            "current_page": page_obj.number,
            "total_pages": paginator.num_pages,
            "total_items": paginator.count,
            "has_next": page_obj.has_next(),
            "has_previous": page_obj.has_previous(),
        },
    }


# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """Get dashboard statistics"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    # Get student count
    students = User.objects.filter(role="STUDENT")

    total_students = students.count()

    active_students = students.filter(is_active=True).count()

    # Get exam count
    total_exams = MockExam.objects.all().count()

    # Get completed attempts instead of results
    completed_attempts = ExamAttempt.objects.filter(status="COMPLETED")

    total_results = completed_attempts.count()

    # Calculate average score
    average_score = (
        completed_attempts.aggregate(Avg("overall_score"))["overall_score__avg"] or 0
    )

    # Get recent students
    recent_students = students.order_by("-date_joined")[:5]

    # Get recent completed attempts
    recent_attempts = completed_attempts.order_by("-completed_at")[:5]

    data = {
        "total_students": total_students,
        "active_students": active_students,
        "total_exams": total_exams,
        "total_results": total_results,
        "average_score": round(average_score, 1),
        "recent_students": UserSerializer(recent_students, many=True).data,
        # Note: recent_results removed - use ExamAttempt serializer if needed
    }

    return Response(data)


# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_students_list(request):
    """Get list of students"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    search = request.GET.get("search", "")

    students = User.objects.filter(role="STUDENT")

    if search:
        students = students.filter(
            Q(username__icontains=search)
            | Q(email__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
        )

    students = students.order_by("-date_joined")

    paginated = paginate_queryset(students, request)

    serializer = UserSerializer(paginated["results"], many=True)

    return Response(
        {"students": serializer.data, "pagination": paginated["pagination"]}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_student_detail(request, user_id):
    """Get detailed student information"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    student = get_object_or_404(User, id=user_id, role="STUDENT")

    # Get student completed attempts instead of results
    completed_attempts = ExamAttempt.objects.filter(
        student=student, status="COMPLETED"
    ).order_by("-completed_at")

    serializer = UserDetailSerializer(student)

    # Note: Use ExamAttempt serializer instead of ExamResultSerializer
    # results_serializer = ExamResultSerializer(completed_attempts, many=True)

    return Response(
        {
            "student": serializer.data,
            "attempts": [],  # Add proper ExamAttempt serializer if needed
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def student_toggle_active(request, user_id):
    """Toggle student active status"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    student = get_object_or_404(User, id=user_id, role="STUDENT")

    student.is_active = not student.is_active
    student.save()

    serializer = UserSerializer(student)

    return Response(serializer.data)


# ============================================================================
# READING TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_reading_passages(request):
    """Get list of reading passages"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    passages = ReadingPassage.objects.all().order_by("-created_at")

    paginated = paginate_queryset(passages, request)

    serializer = ReadingPassageSerializer(paginated["results"], many=True)

    return Response(
        {"passages": serializer.data, "pagination": paginated["pagination"]}
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_reading_passage(request):
    """Create a new reading passage"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    data = request.data.copy()

    serializer = ReadingPassageSerializer(data=data)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_reading_passage(request, passage_id):
    """Update a reading passage"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    passage = get_object_or_404(ReadingPassage, id=passage_id)

    serializer = ReadingPassageSerializer(passage, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_reading_passage(request, passage_id):
    """Delete a reading passage"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    passage = get_object_or_404(ReadingPassage, id=passage_id)

    passage.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# TESTHEAD (QUESTION GROUP) ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_testheads(request):
    """Get test heads (question groups)"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    passage_id = request.GET.get("passage_id")

    part_id = request.GET.get("part_id")

    testheads = TestHead.objects.annotate(question_count=Count("questions"))

    if passage_id:
        testheads = testheads.filter(reading_passage_id=passage_id)

    if part_id:
        testheads = testheads.filter(listening_part_id=part_id)

    testheads = testheads.order_by("order")

    serializer = TestHeadSerializer(testheads, many=True)

    return Response({"testheads": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_testhead(request):
    """Create a new test head"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    serializer = TestHeadSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_testhead(request, testhead_id):
    """Update a test head"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    testhead = get_object_or_404(TestHead, id=testhead_id)

    serializer = TestHeadSerializer(testhead, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_testhead(request, testhead_id):
    """Delete a test head"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    testhead = get_object_or_404(TestHead, id=testhead_id)

    testhead.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# QUESTION ENDPOINTS
# ============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_question(request):
    """Create a new question"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    serializer = QuestionSerializer(data=request.data)

    if serializer.is_valid():
        question = serializer.save()

        # Create choices if provided
        choices_data = request.data.get("choices", [])

        for choice_data in choices_data:
            Choice.objects.create(question=question, **choice_data)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_questions_bulk(request):
    """Create multiple questions at once"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    questions_data = request.data.get("questions", [])

    created_questions = []

    for question_data in questions_data:
        choices_data = question_data.pop("choices", [])

        serializer = QuestionSerializer(data=question_data)

        if serializer.is_valid():
            question = serializer.save()

            # Create choices
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)

            created_questions.append(serializer.data)

    return Response({"questions": created_questions}, status=status.HTTP_201_CREATED)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_question(request, question_id):
    """Update a question"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    question = get_object_or_404(Question, id=question_id)

    serializer = QuestionSerializer(question, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()

        # Update choices if provided
        choices_data = request.data.get("choices")

        if choices_data is not None:
            question.choices.all().delete()

            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_question(request, question_id):
    """Delete a question"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    question = get_object_or_404(Question, id=question_id)

    question.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# LISTENING TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_listening_parts(request):
    """Get list of listening parts"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    parts = ListeningPart.objects.all().order_by("-created_at")

    paginated = paginate_queryset(parts, request)

    serializer = ListeningPartSerializer(paginated["results"], many=True)

    return Response({"parts": serializer.data, "pagination": paginated["pagination"]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_listening_part(request):
    """Create a new listening part"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    data = request.data.copy()

    serializer = ListeningPartSerializer(data=data)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_listening_part(request, part_id):
    """Update a listening part"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    part = get_object_or_404(ListeningPart, id=part_id)

    serializer = ListeningPartSerializer(part, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_listening_part(request, part_id):
    """Delete a listening part"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    part = get_object_or_404(ListeningPart, id=part_id)

    part.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# WRITING TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_writing_tasks(request):
    """Get list of writing tasks"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    tasks = WritingTask.objects.all().order_by("-created_at")

    paginated = paginate_queryset(tasks, request)

    serializer = WritingTaskSerializer(paginated["results"], many=True)

    return Response({"tasks": serializer.data, "pagination": paginated["pagination"]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_writing_task(request):
    """Create a new writing task"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    data = request.data.copy()

    serializer = WritingTaskSerializer(data=data)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_writing_task(request, task_id):
    """Update a writing task"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    task = get_object_or_404(WritingTask, id=task_id)

    serializer = WritingTaskSerializer(task, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_writing_task(request, task_id):
    """Delete a writing task"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    task = get_object_or_404(WritingTask, id=task_id)

    task.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# SPEAKING TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_speaking_topics(request):
    """Get list of speaking topics"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    topics = SpeakingTopic.objects.all().order_by("-created_at")

    paginated = paginate_queryset(topics, request)

    serializer = SpeakingTopicSerializer(paginated["results"], many=True)

    return Response({"topics": serializer.data, "pagination": paginated["pagination"]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_speaking_topic(request):
    """Create a new speaking topic"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    data = request.data.copy()

    serializer = SpeakingTopicSerializer(data=data)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_speaking_topic(request, topic_id):
    """Update a speaking topic"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    topic = get_object_or_404(SpeakingTopic, id=topic_id)

    serializer = SpeakingTopicSerializer(topic, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_speaking_topic(request, topic_id):
    """Delete a speaking topic"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    topic = get_object_or_404(SpeakingTopic, id=topic_id)

    topic.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# MOCK TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_mock_tests(request):
    """Get list of mock tests"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    tests = MockExam.objects.all().order_by("-created_at")

    paginated = paginate_queryset(tests, request)

    serializer = MockExamSerializer(paginated["results"], many=True)

    return Response({"tests": serializer.data, "pagination": paginated["pagination"]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_mock_test(request, test_id):
    """Get detailed mock test information"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    test = get_object_or_404(MockExam, id=test_id)

    serializer = MockExamSerializer(test)

    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_mock_test(request):
    """Create a new mock test"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )

    data = request.data.copy()

    serializer = MockExamSerializer(data=data)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_mock_test(request, test_id):
    """Update a mock test"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    test = get_object_or_404(MockExam, id=test_id)

    serializer = MockExamSerializer(test, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_mock_test(request, test_id):
    """Delete a mock test"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    test = get_object_or_404(MockExam, id=test_id)

    test.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# RESULTS & FEEDBACK ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_student_results(request):
    """Get student exam results (using ExamAttempt instead of ExamResult)"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
        )
    completed_attempts = ExamAttempt.objects.filter(status="COMPLETED").order_by(
        "-completed_at"
    )

    paginated = paginate_queryset(completed_attempts, request)

    # Note: Use ExamAttempt serializer instead of ExamResultSerializer
    # serializer = ExamResultSerializer(paginated["results"], many=True)

    return Response({"results": [], "pagination": paginated["pagination"]})
