"""
Writing Section Practices API
CRUD operations for writing practices with bulk add support.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from practice.models import SectionPractice
from ielts.models import WritingTask
from manager_panel.api.utils import paginate_queryset

from .common import (
    check_permission,
    serialize_practice,
    get_base_queryset,
    apply_common_filters,
    update_practice_fields,
)


def get_writing_content_info(practice, detailed=False):
    """Get writing-specific content info."""
    if not practice.writing_task:
        return {}

    wt = practice.writing_task
    content_info = {
        "id": wt.id,
        "type": "writing",
        "title": f"Task {wt.task_type.split('_')[-1]}",
        "task_type": wt.task_type,
        "task_type_display": wt.get_task_type_display(),
        "chart_type": wt.chart_type,
        "chart_type_display": wt.get_chart_type_display() if wt.chart_type else None,
        "min_words": wt.min_words,
        "has_image": bool(wt.picture),
    }

    if detailed:
        content_info["prompt"] = wt.prompt
        content_info["picture_url"] = wt.picture.url if wt.picture else None
        content_info["sample_answer"] = wt.sample_answer

    return content_info


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_writing_practices(request):
    """
    Get list of all writing practices with filtering and pagination.

    Query Parameters:
        - difficulty: EASY | MEDIUM | HARD | EXPERT
        - is_active: true/false
        - is_free: true/false
        - task_type: TASK_1 | TASK_2
        - chart_type: LINE_GRAPH | BAR_CHART | PIE_CHART | TABLE | MAP | PROCESS | FLOW_CHART | MIXED | OTHER
        - search: Search in title and description
        - page: Page number
        - page_size: Items per page (default 20)
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practices = get_base_queryset("WRITING")
    practices = apply_common_filters(practices, request)

    # Writing-specific filters
    task_type = request.GET.get("task_type")
    if task_type:
        practices = practices.filter(writing_task__task_type=task_type.upper())

    chart_type = request.GET.get("chart_type")
    if chart_type:
        practices = practices.filter(writing_task__chart_type=chart_type.upper())

    # Paginate
    paginated = paginate_queryset(practices, request)

    # Serialize
    results = []
    for practice in paginated["results"]:
        data = serialize_practice(practice)
        data["content"] = get_writing_content_info(practice)
        results.append(data)

    return Response(
        {
            "practices": results,
            "pagination": paginated["pagination"],
            "available_filters": {
                "chart_types": [
                    {"value": choice[0], "label": choice[1]}
                    for choice in WritingTask.ChartType.choices
                ],
                "task_types": [
                    {"value": choice[0], "label": choice[1]}
                    for choice in WritingTask.TaskType.choices
                ],
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_writing_practice(request, practice_id):
    """Get a single writing practice by ID with full details."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice.objects.select_related("writing_task", "created_by"),
        id=practice_id,
        section_type="WRITING",
    )

    data = serialize_practice(practice, detailed=True)
    data["content"] = get_writing_content_info(practice, detailed=True)

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
def create_writing_practice(request):
    """
    Create a new writing practice.

    Body (JSON):
        - content_id: ID of the WritingTask to link (required)
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
        writing_task = WritingTask.objects.get(id=content_id)
    except WritingTask.DoesNotExist:
        return Response(
            {"error": f"WritingTask with ID {content_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check if already linked
    existing = SectionPractice.objects.filter(
        section_type="WRITING", writing_task=writing_task
    ).first()
    if existing:
        return Response(
            {
                "error": f"This writing task is already linked to practice '{existing.title}'"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create practice
    task_number = (
        writing_task.task_type.split("_")[-1] if "_" in writing_task.task_type else "1"
    )
    title = request.data.get("title") or f"Writing Task {task_number}"

    practice = SectionPractice.objects.create(
        section_type="WRITING",
        writing_task=writing_task,
        title=title,
        description=request.data.get("description", ""),
        difficulty=request.data.get("difficulty", "MEDIUM").upper(),
        duration_minutes=request.data.get("duration_minutes"),
        is_free=request.data.get("is_free", True),
        is_active=request.data.get("is_active", True),
        order=request.data.get("order", 0),
        total_questions=1,  # Writing always has 1 task
        created_by=request.user,
    )

    return Response(
        {
            "success": True,
            "message": "Writing practice created successfully",
            "practice": serialize_practice(practice),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_writing_practice(request, practice_id):
    """Update a writing practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="WRITING"
    )

    practice = update_practice_fields(practice, request.data)
    practice.save()

    return Response(
        {
            "success": True,
            "message": "Writing practice updated successfully",
            "practice": serialize_practice(practice),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_writing_practice_status(request, practice_id):
    """Toggle the active status of a writing practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="WRITING"
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
def delete_writing_practice(request, practice_id):
    """Delete a writing practice."""
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    practice = get_object_or_404(
        SectionPractice, id=practice_id, section_type="WRITING"
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
            "message": f"Writing practice '{title}' deleted successfully",
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_create_writing_practices(request):
    """
    Create multiple writing practices at once.

    Body (JSON):
        - content_ids: List of WritingTask IDs to create practices for (required)
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
            section_type="WRITING", writing_task__isnull=False
        ).values_list("writing_task_id", flat=True)
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

            writing_task = WritingTask.objects.get(id=content_id)
            task_number = (
                writing_task.task_type.split("_")[-1]
                if "_" in writing_task.task_type
                else "1"
            )
            title = f"Writing Task {task_number}"

            practice = SectionPractice.objects.create(
                section_type="WRITING",
                writing_task=writing_task,
                title=title,
                difficulty=default_difficulty,
                is_free=default_is_free,
                is_active=default_is_active,
                total_questions=1,
                created_by=request.user,
            )

            created.append(
                {
                    "id": practice.id,
                    "title": practice.title,
                    "content_id": content_id,
                    "task_type": writing_task.task_type,
                    "chart_type": writing_task.chart_type,
                }
            )
            linked_ids.add(content_id)

        except WritingTask.DoesNotExist:
            errors.append({"id": content_id, "error": "WritingTask not found"})
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
def get_available_writing_content(request):
    """
    Get writing tasks that are not yet linked to any practice.

    Query Parameters:
        - task_type: TASK_1 | TASK_2 (optional filter)
        - chart_type: Filter by chart type (optional)
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    # Get already linked IDs
    linked_ids = SectionPractice.objects.filter(
        section_type="WRITING", writing_task__isnull=False
    ).values_list("writing_task_id", flat=True)

    content = WritingTask.objects.exclude(id__in=linked_ids).order_by("-created_at")

    # Optional filters
    task_type = request.GET.get("task_type")
    if task_type:
        content = content.filter(task_type=task_type.upper())

    chart_type = request.GET.get("chart_type")
    if chart_type:
        content = content.filter(chart_type=chart_type.upper())

    content_list = []
    for item in content:
        content_list.append(
            {
                "id": item.id,
                "title": f"Task {item.task_type.split('_')[-1]}: {item.prompt[:50]}...",
                "task_type": item.task_type,
                "task_type_display": item.get_task_type_display(),
                "chart_type": item.chart_type,
                "chart_type_display": (
                    item.get_chart_type_display() if item.chart_type else None
                ),
                "min_words": item.min_words,
                "has_image": bool(item.picture),
                "created_at": item.created_at.isoformat(),
            }
        )

    return Response(
        {
            "content": content_list,
            "total": len(content_list),
            "available_filters": {
                "chart_types": [
                    {"value": choice[0], "label": choice[1]}
                    for choice in WritingTask.ChartType.choices
                ],
                "task_types": [
                    {"value": choice[0], "label": choice[1]}
                    for choice in WritingTask.TaskType.choices
                ],
            },
        }
    )
