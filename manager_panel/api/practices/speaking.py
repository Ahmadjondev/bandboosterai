"""
Speaking Section Practices API
CRUD operations for speaking practices with bulk add support.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from practice.models import SectionPractice
from ielts.models import SpeakingTopic
from manager_panel.api.utils import paginate_queryset

from .common import (
    check_permission,
    serialize_practice,
    get_base_queryset,
    apply_common_filters,
    update_practice_fields,
)


def get_speaking_content_info(practice, detailed=False):
    """Get speaking-specific content info."""
    if not practice.speaking_topic:
        return {}

    st = practice.speaking_topic
    content_info = {
        "id": st.id,
        "type": "speaking",
        "title": st.topic or f"Part {st.speaking_type.split('_')[-1]}",
        "speaking_type": st.speaking_type,
        "speaking_type_display": st.get_speaking_type_display(),
        "questions_count": st.questions.count(),
    }

    if detailed:
        content_info["questions"] = [
            {
                "id": q.id,
                "text": q.question_text,
                "order": q.order,
                "has_audio": bool(q.audio_url),
                "preparation_time": q.preparation_time,
                "response_time": q.response_time,
            }
            for q in st.questions.all().order_by("order")
        ]

    return content_info


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_speaking_practices(request):
    """
    Get list of all speaking practices with filtering and pagination.

    Query Parameters:
        - difficulty: EASY | MEDIUM | HARD | EXPERT
        - is_active: true/false
        - is_free: true/false
        - speaking_type: PART_1 | PART_2 | PART_3
        - search: Search in title and description
        - page: Page number
        - page_size: Items per page (default 20)
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practices = get_base_queryset("SPEAKING")
    practices = apply_common_filters(practices, request)

    # Speaking-specific filters
    speaking_type = request.GET.get("speaking_type")
    if speaking_type:
        practices = practices.filter(
            speaking_topic__speaking_type=speaking_type.upper()
        )

    # Paginate
    paginated = paginate_queryset(practices, request)

    # Serialize
    results = []
    for practice in paginated["results"]:
        data = serialize_practice(practice)
        data["content"] = get_speaking_content_info(practice)
        results.append(data)

    return Response(
        {
            "practices": results,
            "pagination": paginated["pagination"],
            "available_filters": {
                "speaking_types": [
                    {"value": choice[0], "label": choice[1]}
                    for choice in SpeakingTopic.PartType.choices
                ],
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_speaking_practice(request, practice_id):
    """Get a single speaking practice by ID with full details."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice.objects.select_related("speaking_topic", "created_by"),
        id=practice_id,
        section_type="SPEAKING",
    )

    data = serialize_practice(practice, detailed=True)
    data["content"] = get_speaking_content_info(practice, detailed=True)

    # Get recent attempts
    from practice.models import SectionPracticeAttempt

    recent_attempts = (
        SectionPracticeAttempt.objects.filter(practice=practice)
        .select_related("student")
        .order_by("-created_at")[:10]
    )

    data["recent_attempts"] = [
        {
            "id": attempt.id,
            "student": {
                "id": attempt.student.id,
                "name": f"{attempt.student.first_name} {attempt.student.last_name}".strip(),
            },
            "status": attempt.status,
            "score": float(attempt.score) if attempt.score else None,
            "started_at": (
                attempt.started_at.isoformat() if attempt.started_at else None
            ),
            "completed_at": (
                attempt.completed_at.isoformat() if attempt.completed_at else None
            ),
        }
        for attempt in recent_attempts
    ]

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_speaking_practice(request):
    """
    Create a new speaking practice.

    Body (JSON):
        - content_id: ID of the SpeakingTopic to link (required)
        - title: Practice title (optional, auto-generated if not provided)
        - description: Practice description
        - difficulty: EASY | MEDIUM | HARD | EXPERT (default: MEDIUM)
        - duration_minutes: Time limit in minutes
        - is_free: Whether practice is free (default: True)
        - is_active: Whether practice is active (default: True)
        - order: Display order
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    content_id = request.data.get("content_id")
    if not content_id:
        return Response(
            {"error": "content_id is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        speaking_topic = SpeakingTopic.objects.get(id=content_id)
    except SpeakingTopic.DoesNotExist:
        return Response(
            {"error": f"SpeakingTopic with ID {content_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check if already linked
    existing = SectionPractice.objects.filter(
        section_type="SPEAKING", speaking_topic=speaking_topic
    ).first()
    if existing:
        return Response(
            {
                "error": f"This speaking topic is already linked to practice '{existing.title}'"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Calculate total questions
    total_questions = speaking_topic.questions.count()

    # Create practice
    part_number = (
        speaking_topic.speaking_type.split("_")[-1]
        if "_" in speaking_topic.speaking_type
        else "1"
    )
    title = (
        request.data.get("title")
        or f"Speaking Part {part_number}: {speaking_topic.topic or 'Untitled'}"
    )

    practice = SectionPractice.objects.create(
        section_type="SPEAKING",
        speaking_topic=speaking_topic,
        title=title,
        description=request.data.get("description", ""),
        difficulty=request.data.get("difficulty", "MEDIUM").upper(),
        duration_minutes=request.data.get("duration_minutes"),
        is_free=request.data.get("is_free", True),
        is_active=request.data.get("is_active", True),
        order=request.data.get("order", 0),
        total_questions=total_questions,
        created_by=request.user,
    )

    return Response(
        {
            "success": True,
            "message": "Speaking practice created successfully",
            "practice": serialize_practice(practice),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_speaking_practice(request, practice_id):
    """Update a speaking practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="SPEAKING"
    )

    practice = update_practice_fields(practice, request.data)
    practice.save()

    return Response(
        {
            "success": True,
            "message": "Speaking practice updated successfully",
            "practice": serialize_practice(practice),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_speaking_practice_status(request, practice_id):
    """Toggle the active status of a speaking practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="SPEAKING"
    )
    practice.is_active = not practice.is_active
    practice.save()

    return Response(
        {
            "success": True,
            "message": f"Practice {'activated' if practice.is_active else 'deactivated'} successfully",
            "is_active": practice.is_active,
        }
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_speaking_practice(request, practice_id):
    """Delete a speaking practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="SPEAKING"
    )

    # Check for completed attempts
    completed_attempts = practice.attempts.filter(status="COMPLETED").count()
    if completed_attempts > 0:
        force = request.query_params.get("force", "false").lower() == "true"
        if not force:
            return Response(
                {
                    "error": f"This practice has {completed_attempts} completed attempts. Use ?force=true to delete anyway.",
                    "completed_attempts": completed_attempts,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    title = practice.title
    practice.delete()

    return Response(
        {
            "success": True,
            "message": f"Speaking practice '{title}' deleted successfully",
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_create_speaking_practices(request):
    """
    Create multiple speaking practices at once.

    Body (JSON):
        - content_ids: List of SpeakingTopic IDs to create practices for (required)
        - default_difficulty: Default difficulty for all (default: MEDIUM)
        - default_is_free: Default free status (default: True)
        - default_is_active: Default active status (default: True)
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    content_ids = request.data.get("content_ids", [])
    if not content_ids:
        return Response(
            {"error": "content_ids is required and must be a non-empty list"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    default_difficulty = request.data.get("default_difficulty", "MEDIUM").upper()
    default_is_free = request.data.get("default_is_free", True)
    default_is_active = request.data.get("default_is_active", True)

    # Get already linked content IDs
    linked_ids = set(
        SectionPractice.objects.filter(
            section_type="SPEAKING", speaking_topic__isnull=False
        ).values_list("speaking_topic_id", flat=True)
    )

    created = []
    skipped = []
    errors = []

    for content_id in content_ids:
        try:
            if content_id in linked_ids:
                skipped.append(
                    {"id": content_id, "reason": "Already linked to a practice"}
                )
                continue

            speaking_topic = SpeakingTopic.objects.get(id=content_id)
            total_questions = speaking_topic.questions.count()
            part_number = (
                speaking_topic.speaking_type.split("_")[-1]
                if "_" in speaking_topic.speaking_type
                else "1"
            )
            title = f"Speaking Part {part_number}: {speaking_topic.topic or 'Untitled'}"

            practice = SectionPractice.objects.create(
                section_type="SPEAKING",
                speaking_topic=speaking_topic,
                title=title,
                difficulty=default_difficulty,
                is_free=default_is_free,
                is_active=default_is_active,
                total_questions=total_questions,
                created_by=request.user,
            )

            created.append(
                {
                    "id": practice.id,
                    "title": practice.title,
                    "content_id": content_id,
                    "speaking_type": speaking_topic.speaking_type,
                }
            )
            linked_ids.add(content_id)

        except SpeakingTopic.DoesNotExist:
            errors.append({"id": content_id, "error": "SpeakingTopic not found"})
        except Exception as e:
            errors.append({"id": content_id, "error": str(e)})

    return Response(
        {
            "success": True,
            "message": f"Created {len(created)} practices, skipped {len(skipped)}, errors {len(errors)}",
            "created": created,
            "skipped": skipped,
            "errors": errors,
            "summary": {
                "total_requested": len(content_ids),
                "created_count": len(created),
                "skipped_count": len(skipped),
                "error_count": len(errors),
            },
        },
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_speaking_content(request):
    """
    Get speaking topics that are not yet linked to any practice.

    Query Parameters:
        - speaking_type: PART_1 | PART_2 | PART_3 (optional filter)
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    # Get already linked IDs
    linked_ids = SectionPractice.objects.filter(
        section_type="SPEAKING", speaking_topic__isnull=False
    ).values_list("speaking_topic_id", flat=True)

    content = SpeakingTopic.objects.exclude(id__in=linked_ids).order_by("-created_at")

    # Optional filters
    speaking_type = request.GET.get("speaking_type")
    if speaking_type:
        content = content.filter(speaking_type=speaking_type.upper())

    content_list = []
    for item in content:
        content_list.append(
            {
                "id": item.id,
                "title": item.topic or f"Part {item.speaking_type.split('_')[-1]}",
                "speaking_type": item.speaking_type,
                "speaking_type_display": item.get_speaking_type_display(),
                "questions_count": item.questions.count(),
                "created_at": item.created_at.isoformat(),
            }
        )

    return Response(
        {
            "content": content_list,
            "total": len(content_list),
            "available_filters": {
                "speaking_types": [
                    {"value": choice[0], "label": choice[1]}
                    for choice in SpeakingTopic.PartType.choices
                ],
            },
        }
    )
