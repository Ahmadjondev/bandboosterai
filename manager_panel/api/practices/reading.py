"""
Reading Section Practices API
CRUD operations for reading practices with bulk add support.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from practice.models import SectionPractice
from ielts.models import ReadingPassage
from manager_panel.api.utils import paginate_queryset

from .common import (
    check_permission,
    serialize_practice,
    get_base_queryset,
    apply_common_filters,
    update_practice_fields,
)


def get_reading_content_info(practice, detailed=False):
    """Get reading-specific content info."""
    if not practice.reading_passage:
        return {}

    rp = practice.reading_passage
    content_info = {
        "id": rp.id,
        "type": "reading",
        "title": rp.title or f"Passage {rp.passage_number}",
        "passage_number": rp.passage_number,
        "difficulty": rp.difficulty,
        "word_count": rp.word_count,
        "questions_count": sum(th.questions.count() for th in rp.test_heads.all()),
    }

    if detailed:
        content_info["content_preview"] = (
            rp.content[:500] + "..." if len(rp.content) > 500 else rp.content
        )
        content_info["test_heads"] = [
            {
                "id": th.id,
                "title": th.title,
                "question_type": th.question_type,
                "instructions": th.instructions,
                "questions_count": th.questions.count(),
            }
            for th in rp.test_heads.all()
        ]

    return content_info


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_reading_practices(request):
    """
    Get list of all reading practices with filtering and pagination.

    Query Parameters:
        - difficulty: EASY | MEDIUM | HARD | EXPERT
        - is_active: true/false
        - is_free: true/false
        - search: Search in title and description
        - page: Page number
        - page_size: Items per page (default 20)
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practices = get_base_queryset("READING")
    practices = apply_common_filters(practices, request)

    # Paginate
    paginated = paginate_queryset(practices, request)

    # Serialize
    results = []
    for practice in paginated["results"]:
        data = serialize_practice(practice)
        data["content"] = get_reading_content_info(practice)
        results.append(data)

    return Response(
        {
            "practices": results,
            "pagination": paginated["pagination"],
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_reading_practice(request, practice_id):
    """Get a single reading practice by ID with full details."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice.objects.select_related("reading_passage", "created_by"),
        id=practice_id,
        section_type="READING",
    )

    data = serialize_practice(practice, detailed=True)
    data["content"] = get_reading_content_info(practice, detailed=True)

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
def create_reading_practice(request):
    """
    Create a new reading practice.

    Body (JSON):
        - content_id: ID of the ReadingPassage to link (required)
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
        reading_passage = ReadingPassage.objects.get(id=content_id)
    except ReadingPassage.DoesNotExist:
        return Response(
            {"error": f"ReadingPassage with ID {content_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check if already linked
    existing = SectionPractice.objects.filter(
        section_type="READING", reading_passage=reading_passage
    ).first()
    if existing:
        return Response(
            {
                "error": f"This reading passage is already linked to practice '{existing.title}'"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Calculate total questions
    total_questions = sum(
        th.questions.count() for th in reading_passage.test_heads.all()
    )

    # Create practice
    title = (
        request.data.get("title")
        or reading_passage.title
        or f"Reading Passage {reading_passage.passage_number}"
    )

    practice = SectionPractice.objects.create(
        section_type="READING",
        reading_passage=reading_passage,
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
            "message": "Reading practice created successfully",
            "practice": serialize_practice(practice),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_reading_practice(request, practice_id):
    """Update a reading practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="READING"
    )

    practice = update_practice_fields(practice, request.data)
    practice.save()

    return Response(
        {
            "success": True,
            "message": "Reading practice updated successfully",
            "practice": serialize_practice(practice),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_reading_practice_status(request, practice_id):
    """Toggle the active status of a reading practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="READING"
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
def delete_reading_practice(request, practice_id):
    """Delete a reading practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="READING"
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
            "message": f"Reading practice '{title}' deleted successfully",
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_create_reading_practices(request):
    """
    Create multiple reading practices at once.

    Body (JSON):
        - content_ids: List of ReadingPassage IDs to create practices for (required)
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
            section_type="READING", reading_passage__isnull=False
        ).values_list("reading_passage_id", flat=True)
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

            reading_passage = ReadingPassage.objects.get(id=content_id)
            total_questions = sum(
                th.questions.count() for th in reading_passage.test_heads.all()
            )
            title = (
                reading_passage.title
                or f"Reading Passage {reading_passage.passage_number}"
            )

            practice = SectionPractice.objects.create(
                section_type="READING",
                reading_passage=reading_passage,
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
                }
            )
            linked_ids.add(content_id)

        except ReadingPassage.DoesNotExist:
            errors.append({"id": content_id, "error": "ReadingPassage not found"})
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
def get_available_reading_content(request):
    """
    Get reading passages that are not yet linked to any practice.
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    # Get already linked IDs
    linked_ids = SectionPractice.objects.filter(
        section_type="READING", reading_passage__isnull=False
    ).values_list("reading_passage_id", flat=True)

    content = ReadingPassage.objects.exclude(id__in=linked_ids).order_by("-created_at")

    content_list = []
    for item in content:
        content_list.append(
            {
                "id": item.id,
                "title": item.title or f"Passage {item.passage_number}",
                "passage_number": item.passage_number,
                "difficulty": item.difficulty,
                "word_count": item.word_count,
                "questions_count": sum(
                    th.questions.count() for th in item.test_heads.all()
                ),
                "created_at": item.created_at.isoformat(),
            }
        )

    return Response(
        {
            "content": content_list,
            "total": len(content_list),
        }
    )
