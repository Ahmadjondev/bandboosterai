"""
Manager API for Section Practices CRUD operations.
Allows managers to view, create, update, and delete section practices.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

from practice.models import SectionPractice, SectionPracticeAttempt
from ielts.models import ReadingPassage, ListeningPart, WritingTask, SpeakingTopic
from .utils import check_manager_permission, paginate_queryset


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_practices(request):
    """
    Get list of all section practices with filtering and pagination.

    Query Parameters:
        - section_type: LISTENING | READING | WRITING | SPEAKING
        - difficulty: EASY | MEDIUM | HARD | EXPERT
        - is_active: true/false
        - is_free: true/false
        - search: Search in title and description
        - chart_type: (WRITING only) LINE_GRAPH, BAR_CHART, etc.
        - task_type: (WRITING only) TASK_1, TASK_2
        - page: Page number
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    practices = (
        SectionPractice.objects.all()
        .select_related(
            "reading_passage",
            "listening_part",
            "writing_task",
            "speaking_topic",
            "created_by",
        )
        .order_by("-created_at")
    )

    # Section type filter
    section_type = request.GET.get("section_type")
    if section_type:
        practices = practices.filter(section_type=section_type.upper())

    # Difficulty filter
    difficulty = request.GET.get("difficulty")
    if difficulty:
        practices = practices.filter(difficulty=difficulty.upper())

    # Active filter
    is_active = request.GET.get("is_active")
    if is_active is not None:
        practices = practices.filter(is_active=is_active.lower() == "true")

    # Free filter
    is_free = request.GET.get("is_free")
    if is_free is not None:
        practices = practices.filter(is_free=is_free.lower() == "true")

    # Search
    search = request.GET.get("search")
    if search:
        practices = practices.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    # Writing-specific filters
    if section_type and section_type.upper() == "WRITING":
        chart_type = request.GET.get("chart_type")
        if chart_type:
            practices = practices.filter(writing_task__chart_type=chart_type.upper())

        task_type = request.GET.get("task_type")
        if task_type:
            practices = practices.filter(writing_task__task_type=task_type.upper())

    # Annotate with attempt counts
    practices = practices.annotate(attempts_count=Count("attempts", distinct=True))

    # Paginate
    paginated = paginate_queryset(practices, request)

    # Serialize
    results = []
    for practice in paginated["results"]:
        content_info = get_content_info(practice)
        results.append(
            {
                "id": practice.id,
                "uuid": str(practice.uuid),
                "title": practice.title,
                "description": practice.description,
                "section_type": practice.section_type,
                "section_type_display": practice.get_section_type_display(),
                "difficulty": practice.difficulty,
                "difficulty_display": practice.get_difficulty_display(),
                "duration_minutes": practice.duration_minutes
                or practice.actual_duration,
                "total_questions": practice.total_questions,
                "is_active": practice.is_active,
                "is_free": practice.is_free,
                "order": practice.order,
                "attempts_count": practice.attempts_count,
                "created_at": practice.created_at.isoformat(),
                "updated_at": practice.updated_at.isoformat(),
                "content": content_info,
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
        )

    # Include available filters
    response_data = {
        "practices": results,
        "pagination": paginated["pagination"],
    }

    # Add available filters based on section type
    if section_type and section_type.upper() == "WRITING":
        response_data["available_filters"] = {
            "chart_types": [
                {"value": choice[0], "label": choice[1]}
                for choice in WritingTask.ChartType.choices
            ],
            "task_types": [
                {"value": choice[0], "label": choice[1]}
                for choice in WritingTask.TaskType.choices
            ],
        }

    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_practice(request, practice_id):
    """
    Get a single section practice by ID.
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    practice = get_object_or_404(SectionPractice, id=practice_id)
    content_info = get_content_info(practice, detailed=True)

    # Get recent attempts
    recent_attempts = (
        SectionPracticeAttempt.objects.filter(practice=practice)
        .select_related("student")
        .order_by("-created_at")[:10]
    )

    attempts_data = [
        {
            "id": attempt.id,
            "uuid": str(attempt.uuid),
            "student": {
                "id": attempt.student.id,
                "name": f"{attempt.student.first_name} {attempt.student.last_name}".strip(),
                "email": attempt.student.email,
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

    # Get statistics
    stats = SectionPracticeAttempt.objects.filter(
        practice=practice, status="COMPLETED"
    ).aggregate(
        total_attempts=Count("id"),
        avg_score=Count("score"),  # We'll calculate average manually
    )

    return Response(
        {
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
            "created_at": practice.created_at.isoformat(),
            "updated_at": practice.updated_at.isoformat(),
            "content": content_info,
            "recent_attempts": attempts_data,
            "stats": {
                "total_attempts": stats["total_attempts"] or 0,
            },
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
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_section_practice(request):
    """
    Create a new section practice.

    Body (JSON):
        - section_type: LISTENING | READING | WRITING | SPEAKING (required)
        - content_id: ID of the content to link (required)
        - title: Practice title (optional, auto-generated if not provided)
        - description: Practice description
        - difficulty: EASY | MEDIUM | HARD | EXPERT
        - duration_minutes: Time limit in minutes
        - is_free: Whether practice is free (default: True)
        - is_active: Whether practice is active (default: True)
        - order: Display order
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    section_type = request.data.get("section_type", "").upper()
    content_id = request.data.get("content_id")

    if not section_type or not content_id:
        return Response(
            {"error": "section_type and content_id are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_types = ["LISTENING", "READING", "WRITING", "SPEAKING"]
    if section_type not in valid_types:
        return Response(
            {
                "error": f"Invalid section_type. Must be one of: {', '.join(valid_types)}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get the content and generate title
    content = None
    content_name = ""

    try:
        if section_type == "LISTENING":
            content = ListeningPart.objects.get(id=content_id)
            content_name = content.title or f"Listening Part {content.part_number}"
        elif section_type == "READING":
            content = ReadingPassage.objects.get(id=content_id)
            content_name = content.title or f"Reading Passage {content.passage_number}"
        elif section_type == "WRITING":
            content = WritingTask.objects.get(id=content_id)
            task_number = (
                content.task_type.split("_")[-1] if "_" in content.task_type else "1"
            )
            content_name = f"Writing Task {task_number}"
        elif section_type == "SPEAKING":
            content = SpeakingTopic.objects.get(id=content_id)
            part_number = (
                content.speaking_type.split("_")[-1]
                if "_" in content.speaking_type
                else "1"
            )
            content_name = f"Speaking Part {part_number}: {content.topic or 'Untitled'}"
    except Exception:
        return Response(
            {"error": f"Content with ID {content_id} not found for {section_type}"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Calculate total questions
    total_questions = 0
    if section_type == "LISTENING" and content:
        total_questions = sum(th.questions.count() for th in content.test_heads.all())
    elif section_type == "READING" and content:
        total_questions = sum(th.questions.count() for th in content.test_heads.all())
    elif section_type == "SPEAKING" and content:
        total_questions = content.questions.count()
    elif section_type == "WRITING":
        total_questions = 1

    # Create practice
    practice_data = {
        "section_type": section_type,
        "title": request.data.get("title") or content_name,
        "description": request.data.get("description", ""),
        "difficulty": request.data.get("difficulty", "MEDIUM").upper(),
        "duration_minutes": request.data.get("duration_minutes"),
        "is_free": request.data.get("is_free", True),
        "is_active": request.data.get("is_active", True),
        "order": request.data.get("order", 0),
        "total_questions": total_questions,
        "created_by": request.user,
    }

    # Link to appropriate content
    if section_type == "LISTENING":
        practice_data["listening_part"] = content
    elif section_type == "READING":
        practice_data["reading_passage"] = content
    elif section_type == "WRITING":
        practice_data["writing_task"] = content
    elif section_type == "SPEAKING":
        practice_data["speaking_topic"] = content

    try:
        practice = SectionPractice.objects.create(**practice_data)

        return Response(
            {
                "success": True,
                "message": "Practice created successfully",
                "practice": {
                    "id": practice.id,
                    "uuid": str(practice.uuid),
                    "title": practice.title,
                    "section_type": practice.section_type,
                    "difficulty": practice.difficulty,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {"error": f"Error creating practice: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_section_practice(request, practice_id):
    """
    Update a section practice.

    Body (JSON):
        - title: Practice title
        - description: Practice description
        - difficulty: EASY | MEDIUM | HARD | EXPERT
        - duration_minutes: Time limit in minutes
        - is_free: Whether practice is free
        - is_active: Whether practice is active
        - order: Display order
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    practice = get_object_or_404(SectionPractice, id=practice_id)

    # Update allowed fields
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
        if field in request.data:
            value = request.data[field]
            if field == "difficulty" and value:
                value = value.upper()
            setattr(practice, field, value)

    try:
        practice.save()
        return Response(
            {
                "success": True,
                "message": "Practice updated successfully",
                "practice": {
                    "id": practice.id,
                    "uuid": str(practice.uuid),
                    "title": practice.title,
                    "section_type": practice.section_type,
                    "difficulty": practice.difficulty,
                    "is_active": practice.is_active,
                },
            }
        )
    except Exception as e:
        return Response(
            {"error": f"Error updating practice: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_section_practice_status(request, practice_id):
    """
    Toggle the active status of a section practice.
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    practice = get_object_or_404(SectionPractice, id=practice_id)
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
def delete_section_practice(request, practice_id):
    """
    Delete a section practice.
    Note: This will also delete all associated attempts.
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    practice = get_object_or_404(SectionPractice, id=practice_id)

    # Check if there are any completed attempts
    completed_attempts = practice.attempts.filter(status="COMPLETED").count()
    if completed_attempts > 0:
        force = request.query_params.get("force", "false").lower() == "true"
        if not force:
            return Response(
                {
                    "error": f"This practice has {completed_attempts} completed attempts. "
                    "Use ?force=true to delete anyway.",
                    "completed_attempts": completed_attempts,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    title = practice.title
    practice.delete()

    return Response(
        {
            "success": True,
            "message": f"Practice '{title}' deleted successfully",
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_content(request, section_type=None):
    """
    Get available content for creating practices.
    Returns content that is not already linked to a practice.

    Args:
        section_type: LISTENING | READING | WRITING | SPEAKING (from URL path or query param)
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Get section_type from query params if not in URL
    if not section_type:
        section_type = request.query_params.get("section_type", "")

    section_type = section_type.upper()
    valid_types = ["LISTENING", "READING", "WRITING", "SPEAKING"]

    if section_type not in valid_types:
        return Response(
            {
                "error": f"Invalid section_type. Must be one of: {', '.join(valid_types)}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get content not already linked to a practice
    content_list = []

    if section_type == "LISTENING":
        # Get IDs of content already linked
        linked_ids = SectionPractice.objects.filter(
            section_type="LISTENING", listening_part__isnull=False
        ).values_list("listening_part_id", flat=True)

        content = ListeningPart.objects.exclude(id__in=linked_ids).order_by(
            "-created_at"
        )
        for item in content:
            content_list.append(
                {
                    "id": item.id,
                    "title": item.title or f"Part {item.part_number}",
                    "part_number": item.part_number,
                    "difficulty": item.difficulty,
                    "has_audio": bool(item.audio_file),
                    "questions_count": sum(
                        th.questions.count() for th in item.test_heads.all()
                    ),
                }
            )

    elif section_type == "READING":
        linked_ids = SectionPractice.objects.filter(
            section_type="READING", reading_passage__isnull=False
        ).values_list("reading_passage_id", flat=True)

        content = ReadingPassage.objects.exclude(id__in=linked_ids).order_by(
            "-created_at"
        )
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
                }
            )

    elif section_type == "WRITING":
        linked_ids = SectionPractice.objects.filter(
            section_type="WRITING", writing_task__isnull=False
        ).values_list("writing_task_id", flat=True)

        content = WritingTask.objects.exclude(id__in=linked_ids).order_by("-created_at")
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
                }
            )

    elif section_type == "SPEAKING":
        linked_ids = SectionPractice.objects.filter(
            section_type="SPEAKING", speaking_topic__isnull=False
        ).values_list("speaking_topic_id", flat=True)

        content = SpeakingTopic.objects.exclude(id__in=linked_ids).order_by(
            "-created_at"
        )
        for item in content:
            content_list.append(
                {
                    "id": item.id,
                    "title": item.topic or f"Part {item.speaking_type.split('_')[-1]}",
                    "speaking_type": item.speaking_type,
                    "speaking_type_display": item.get_speaking_type_display(),
                    "questions_count": item.questions.count(),
                }
            )

    return Response(
        {
            "section_type": section_type,
            "content": content_list,
            "total": len(content_list),
        }
    )


def get_content_info(practice, detailed=False):
    """Helper to get content info for a practice."""
    content_info = {}

    if practice.section_type == "LISTENING" and practice.listening_part:
        lp = practice.listening_part
        content_info = {
            "id": lp.id,
            "type": "listening",
            "title": lp.title or f"Part {lp.part_number}",
            "part_number": lp.part_number,
            "has_audio": bool(lp.audio_file),
        }
        if detailed:
            content_info["description"] = lp.description
            content_info["audio_url"] = lp.audio_file.url if lp.audio_file else None

    elif practice.section_type == "READING" and practice.reading_passage:
        rp = practice.reading_passage
        content_info = {
            "id": rp.id,
            "type": "reading",
            "title": rp.title or f"Passage {rp.passage_number}",
            "passage_number": rp.passage_number,
            "word_count": rp.word_count,
        }
        if detailed:
            content_info["content"] = (
                rp.content[:500] + "..." if len(rp.content) > 500 else rp.content
            )

    elif practice.section_type == "WRITING" and practice.writing_task:
        wt = practice.writing_task
        content_info = {
            "id": wt.id,
            "type": "writing",
            "title": f"Task {wt.task_type.split('_')[-1]}",
            "task_type": wt.task_type,
            "task_type_display": wt.get_task_type_display(),
            "chart_type": wt.chart_type,
            "chart_type_display": (
                wt.get_chart_type_display() if wt.chart_type else None
            ),
            "min_words": wt.min_words,
            "has_image": bool(wt.picture),
        }
        if detailed:
            content_info["prompt"] = wt.prompt
            content_info["picture_url"] = wt.picture.url if wt.picture else None

    elif practice.section_type == "SPEAKING" and practice.speaking_topic:
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
                }
                for q in st.questions.all().order_by("order")
            ]

    return content_info


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_practice_stats(request):
    """Get statistics for section practices"""
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    from django.db.models import Avg

    practices = SectionPractice.objects.all()

    # Count by section type
    section_counts = dict(
        practices.values("section_type")
        .annotate(count=Count("id"))
        .values_list("section_type", "count")
    )

    # Count by status
    total = practices.count()
    active = practices.filter(is_active=True).count()
    free = practices.filter(is_free=True).count()

    # Count by difficulty
    difficulty_counts = dict(
        practices.values("difficulty")
        .annotate(count=Count("id"))
        .values_list("difficulty", "count")
    )

    # Total attempts
    total_attempts = SectionPracticeAttempt.objects.count()
    avg_score = SectionPracticeAttempt.objects.filter(score__isnull=False).aggregate(
        avg=Avg("score")
    )["avg"]

    stats = {
        "total": total,
        "active": active,
        "inactive": total - active,
        "free": free,
        "premium": total - free,
        "by_section": {
            "LISTENING": section_counts.get("LISTENING", 0),
            "READING": section_counts.get("READING", 0),
            "WRITING": section_counts.get("WRITING", 0),
            "SPEAKING": section_counts.get("SPEAKING", 0),
        },
        "by_difficulty": {
            "EASY": difficulty_counts.get("EASY", 0),
            "MEDIUM": difficulty_counts.get("MEDIUM", 0),
            "HARD": difficulty_counts.get("HARD", 0),
            "EXPERT": difficulty_counts.get("EXPERT", 0),
        },
        "attempts": {
            "total": total_attempts,
            "avg_score": round(avg_score, 1) if avg_score else 0,
        },
    }

    return Response(stats)
