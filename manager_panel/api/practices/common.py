"""
Common utilities for section practices API.
"""

from rest_framework import status
from rest_framework.response import Response
from django.db.models import Count

from practice.models import SectionPractice, SectionPracticeAttempt
from manager_panel.api.utils import check_manager_permission, paginate_queryset


def check_permission(request):
    """Check if user has manager permission."""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def serialize_practice(practice, detailed=False):
    """Serialize a section practice to dict."""
    data = {
        "id": practice.id,
        "uuid": str(practice.uuid),
        "title": practice.title,
        "description": practice.description,
        "section_type": practice.section_type,
        "section_type_display": practice.get_section_type_display(),
        "difficulty": practice.difficulty,
        "difficulty_display": practice.get_difficulty_display(),
        "duration_minutes": practice.duration_minutes or practice.actual_duration,
        "total_questions": practice.total_questions,
        "is_active": practice.is_active,
        "is_free": practice.is_free,
        "order": practice.order,
        "attempts_count": getattr(practice, "attempts_count", 0),
        "created_at": practice.created_at.isoformat(),
        "updated_at": practice.updated_at.isoformat(),
        "created_by": (
            {
                "id": practice.created_by.id if practice.created_by else None,
                "name": (
                    f"{practice.created_by.first_name} {practice.created_by.last_name}".strip()
                    if practice.created_by
                    else None
                ),
            }
            if practice.created_by
            else None
        ),
    }
    return data


def get_base_queryset(section_type):
    """Get base queryset for practices filtered by section type."""
    return (
        SectionPractice.objects.filter(section_type=section_type)
        .select_related(
            "reading_passage",
            "listening_part",
            "writing_task",
            "speaking_topic",
            "created_by",
        )
        .annotate(attempts_count=Count("attempts", distinct=True))
        .order_by("-created_at")
    )


def apply_common_filters(queryset, request):
    """Apply common filters to queryset."""
    # Difficulty filter
    difficulty = request.GET.get("difficulty")
    if difficulty:
        queryset = queryset.filter(difficulty=difficulty.upper())

    # Active filter
    is_active = request.GET.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active.lower() == "true")

    # Free filter
    is_free = request.GET.get("is_free")
    if is_free is not None:
        queryset = queryset.filter(is_free=is_free.lower() == "true")

    # Search
    search = request.GET.get("search")
    if search:
        from django.db.models import Q

        queryset = queryset.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    return queryset


def update_practice_fields(practice, request_data):
    """Update allowed fields on a practice."""
    allowed_fields = [
        "title",
        "description",
        "difficulty",
        "duration_minutes",
        "is_free",
        "is_active",
        "order",
    ]

    for field in allowed_fields:
        if field in request_data:
            value = request_data[field]
            if field == "difficulty" and value:
                value = value.upper()
            setattr(practice, field, value)

    return practice
