"""
Manager API - Test Management Endpoints
Reading, Listening, Writing, Speaking Tests
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from ielts.models import (
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
)
from ..serializers import (
    ReadingPassageSerializer,
    ListeningPartSerializer,
    WritingTaskSerializer,
    SpeakingTopicSerializer,
)
from .utils import (
    check_manager_permission,
    permission_denied_response,
    paginate_queryset,
)


# ============================================================================
# READING TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_reading_passages(request):
    """
    Get list of reading passages

    Query params:
        - passage_number: Filter by passage number (1, 2, or 3)
        - search: Search in title or content
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()
    print("User is authenticated:", request.user.is_authenticated)
    passages = ReadingPassage.objects.all()

    # Filter by passage number
    passage_number = request.GET.get("passage_number")
    if passage_number:
        passages = passages.filter(passage_number=int(passage_number))

    # Search filter
    search = request.GET.get("search", "").strip()
    if search:
        passages = passages.filter(
            Q(title__icontains=search) | Q(content__icontains=search)
        )

    passages = passages.order_by("-created_at")

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
        return permission_denied_response()

    data = request.data.copy()
    serializer = ReadingPassageSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_reading_passage(request, passage_id):
    """Get a single reading passage"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    passage = get_object_or_404(ReadingPassage, id=passage_id)
    serializer = ReadingPassageSerializer(passage)

    return Response(serializer.data)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_reading_passage(request, passage_id):
    """Update a reading passage"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

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
        return permission_denied_response()

    passage = get_object_or_404(ReadingPassage, id=passage_id)
    passage.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# LISTENING TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_listening_parts(request):
    """
    Get list of listening parts

    Query Parameters:
    - part_number: Filter by specific part number (1, 2, 3, or 4)
    - search: Search in title and description
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    parts = ListeningPart.objects.all().order_by("-created_at")

    # Filter by part_number if provided
    part_number = request.GET.get("part_number")
    if part_number:
        parts = parts.filter(part_number=int(part_number))

    # Search functionality
    search = request.GET.get("search")
    if search:
        parts = parts.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    # Annotate with counts
    from django.db.models import Count

    parts = parts.annotate(
        num_heads=Count("test_heads", distinct=True),
        num_questions=Count("test_heads__questions", distinct=True),
    )

    paginated = paginate_queryset(parts, request)
    serializer = ListeningPartSerializer(paginated["results"], many=True)

    return Response({"parts": serializer.data, "pagination": paginated["pagination"]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_listening_part(request, part_id):
    """Get a single listening part"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    part = get_object_or_404(ListeningPart, id=part_id)

    # Annotate with counts
    from django.db.models import Count

    part_qs = ListeningPart.objects.filter(id=part_id).annotate(
        num_heads=Count("test_heads", distinct=True),
        num_questions=Count("test_heads__questions", distinct=True),
    )
    part_with_counts = part_qs.first()

    serializer = ListeningPartSerializer(part_with_counts)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_listening_part(request):
    """Create a new listening part"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    # Don't use .copy() with file uploads - it causes pickling issues
    # Instead, create a new dict and selectively add fields
    data = {
        "part_number": request.data.get("part_number"),
        "title": request.data.get("title"),
        "description": request.data.get("description"),
        "duration_seconds": request.data.get("duration_seconds"),
        "transcript": request.data.get("transcript"),
    }

    # Handle file upload separately
    if "audio_file" in request.FILES:
        data["audio_file"] = request.FILES["audio_file"]

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
        return permission_denied_response()

    part = get_object_or_404(ListeningPart, id=part_id)

    # Don't use .copy() with file uploads - create a new dict
    data = {
        "part_number": request.data.get("part_number", part.part_number),
        "title": request.data.get("title", part.title),
        "description": request.data.get("description", part.description),
        "duration_seconds": request.data.get("duration_seconds", part.duration_seconds),
        "transcript": request.data.get("transcript", part.transcript),
    }

    # Handle file upload separately
    if "audio_file" in request.FILES:
        data["audio_file"] = request.FILES["audio_file"]
    elif request.data.get("remove_audio") == "true":
        data["audio_file"] = None

    serializer = ListeningPartSerializer(part, data=data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_listening_part(request, part_id):
    """Delete a listening part"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    part = get_object_or_404(ListeningPart, id=part_id)
    part.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# WRITING TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_writing_tasks(request):
    """
    Get list of writing tasks

    Query Parameters:
    - task_type: Filter by task type (TASK_1 or TASK_2)
    - search: Search in prompt
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    tasks = WritingTask.objects.all().order_by("-created_at")

    # Filter by task_type if provided
    task_type = request.GET.get("task_type")
    if task_type:
        tasks = tasks.filter(task_type=task_type)

    # Search functionality
    search = request.GET.get("search")
    if search:
        tasks = tasks.filter(Q(prompt__icontains=search))

    paginated = paginate_queryset(tasks, request)
    serializer = WritingTaskSerializer(paginated["results"], many=True)

    return Response({"tasks": serializer.data, "pagination": paginated["pagination"]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_writing_task(request):
    """Create a new writing task"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

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
        return permission_denied_response()

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
        return permission_denied_response()

    task = get_object_or_404(WritingTask, id=task_id)
    task.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# SPEAKING TEST ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_speaking_topics(request):
    """
    Get list of speaking topics

    Query Parameters:
    - speaking_type: Filter by speaking part (PART_1, PART_2, or PART_3)
    - search: Search in topic and question
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    topics = SpeakingTopic.objects.all().order_by("-created_at")

    # Filter by speaking_type if provided
    speaking_type = request.GET.get("speaking_type")
    if speaking_type:
        topics = topics.filter(speaking_type=speaking_type)

    # Search functionality
    search = request.GET.get("search")
    if search:
        topics = topics.filter(
            Q(topic__icontains=search) | Q(question__icontains=search)
        )

    paginated = paginate_queryset(topics, request)
    serializer = SpeakingTopicSerializer(paginated["results"], many=True)

    return Response({"topics": serializer.data, "pagination": paginated["pagination"]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_speaking_topic(request):
    """Create a new speaking topic"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

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
        return permission_denied_response()

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
        return permission_denied_response()

    topic = get_object_or_404(SpeakingTopic, id=topic_id)
    topic.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)
