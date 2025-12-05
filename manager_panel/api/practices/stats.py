"""
Section Practices Statistics API
Aggregate statistics across all section types.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Avg

from practice.models import SectionPractice, SectionPracticeAttempt
from .common import check_permission


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_practices_stats(request):
    """
    Get aggregate statistics for all section practices.

    Query Parameters:
        - section_type: Filter by section type (optional)
    """
    perm_error = check_permission(request)
    if perm_error:
        return perm_error

    section_type = request.GET.get("section_type")

    practices = SectionPractice.objects.all()
    attempts = SectionPracticeAttempt.objects.all()

    if section_type:
        practices = practices.filter(section_type=section_type.upper())
        attempts = attempts.filter(practice__section_type=section_type.upper())

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

    # Attempt stats
    total_attempts = attempts.count()
    completed_attempts = attempts.filter(status="COMPLETED").count()
    avg_score = attempts.filter(score__isnull=False).aggregate(avg=Avg("score"))["avg"]

    # Per-section stats
    section_stats = {}
    for st in ["LISTENING", "READING", "WRITING", "SPEAKING"]:
        st_practices = SectionPractice.objects.filter(section_type=st)
        st_attempts = SectionPracticeAttempt.objects.filter(practice__section_type=st)

        section_stats[st.lower()] = {
            "total": st_practices.count(),
            "active": st_practices.filter(is_active=True).count(),
            "free": st_practices.filter(is_free=True).count(),
            "premium": st_practices.filter(is_free=False).count(),
            "attempts": st_attempts.count(),
            "completed_attempts": st_attempts.filter(status="COMPLETED").count(),
            "avg_score": round(
                st_attempts.filter(score__isnull=False).aggregate(avg=Avg("score"))[
                    "avg"
                ]
                or 0,
                1,
            ),
        }

    # Recent practices
    recent_practices = SectionPractice.objects.all().order_by("-created_at")[:5]

    stats = {
        "total": total,
        "active": active,
        "inactive": total - active,
        "free": free,
        "premium": total - free,
        "by_section": {
            "listening": section_counts.get("LISTENING", 0),
            "reading": section_counts.get("READING", 0),
            "writing": section_counts.get("WRITING", 0),
            "speaking": section_counts.get("SPEAKING", 0),
        },
        "by_difficulty": {
            "easy": difficulty_counts.get("EASY", 0),
            "medium": difficulty_counts.get("MEDIUM", 0),
            "hard": difficulty_counts.get("HARD", 0),
            "expert": difficulty_counts.get("EXPERT", 0),
        },
        "attempts": {
            "total": total_attempts,
            "completed": completed_attempts,
            "in_progress": total_attempts - completed_attempts,
            "avg_score": round(avg_score, 1) if avg_score else 0,
        },
        "section_stats": section_stats,
        "recent_practices": [
            {
                "id": p.id,
                "title": p.title,
                "section_type": p.section_type,
                "section_type_display": p.get_section_type_display(),
                "difficulty": p.difficulty,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat(),
            }
            for p in recent_practices
        ],
    }

    return Response(stats)
