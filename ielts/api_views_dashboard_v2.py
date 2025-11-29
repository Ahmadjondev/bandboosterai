"""
Optimized Dashboard API v2 with parallel endpoints, database-level aggregation,
and books integration for improved response times.
"""

from datetime import timedelta, datetime
from typing import Dict, List, Any

from django.core.cache import caches
from django.db.models import Avg, Count, Q, Max, Min, Sum, F
from django.db.models.functions import TruncDate, TruncWeek
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ExamAttempt
from books.models import Book, BookSection, UserBookProgress, UserSectionResult

# Get dashboard-specific cache
dashboard_cache = caches["dashboard"]

# Cache timeouts (in seconds)
CACHE_SHORT = 300  # 5 minutes for frequently changing data
CACHE_MEDIUM = 900  # 15 minutes for stats
CACHE_LONG = 3600  # 1 hour for historical data


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_dashboard_overview(request):
    """
    Fast endpoint for dashboard overview stats.
    Uses database-level aggregation for speed.
    """
    user = request.user
    cache_key = f"dashboard_overview_v2_{user.id}"

    cached_data = dashboard_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Single optimized query for exam stats
    exam_stats = ExamAttempt.objects.filter(
        student=user, status="COMPLETED"
    ).aggregate(
        total_tests=Count("id"),
        tests_this_week=Count("id", filter=Q(completed_at__date__gte=week_ago)),
        tests_this_month=Count("id", filter=Q(completed_at__date__gte=month_ago)),
        latest_test=Max("completed_at"),
    )

    # Get book progress summary in one query
    book_stats = UserBookProgress.objects.filter(user=user).aggregate(
        books_started=Count("id", filter=Q(is_started=True)),
        books_completed=Count("id", filter=Q(is_completed=True)),
        total_sections_completed=Sum("completed_sections"),
        avg_book_score=Avg("average_score", filter=Q(average_score__isnull=False)),
    )

    # Calculate streak using efficient date query
    completion_dates = list(
        ExamAttempt.objects.filter(student=user, status="COMPLETED")
        .annotate(date=TruncDate("completed_at"))
        .values_list("date", flat=True)
        .distinct()
        .order_by("-date")[:30]  # Last 30 days max
    )

    streak = 0
    check_date = today
    completion_set = set(completion_dates)
    while check_date in completion_set:
        streak += 1
        check_date -= timedelta(days=1)

    # Target score (could be user-specific in future)
    target_score = 7.5

    response_data = {
        "total_tests": exam_stats["total_tests"] or 0,
        "tests_this_week": exam_stats["tests_this_week"] or 0,
        "tests_this_month": exam_stats["tests_this_month"] or 0,
        "streak_days": streak,
        "target_score": target_score,
        "books": {
            "started": book_stats["books_started"] or 0,
            "completed": book_stats["books_completed"] or 0,
            "sections_completed": book_stats["total_sections_completed"] or 0,
            "average_score": round(float(book_stats["avg_book_score"] or 0), 1),
        },
        "last_activity": exam_stats["latest_test"],
    }

    dashboard_cache.set(cache_key, response_data, timeout=CACHE_SHORT)
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_scores(request):
    """
    Get section-wise scores using database aggregation.
    Uses ExamAttempt fields directly for listening_score, reading_score, etc.
    """
    user = request.user
    cache_key = f"dashboard_sections_v2_{user.id}"

    cached_data = dashboard_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    # Aggregate scores directly from ExamAttempt model fields
    listening_stats = ExamAttempt.objects.filter(
        student=user,
        status="COMPLETED",
        listening_score__isnull=False
    ).aggregate(
        avg_score=Avg("listening_score"),
        tests_count=Count("id"),
        best_score=Max("listening_score"),
    )

    reading_stats = ExamAttempt.objects.filter(
        student=user,
        status="COMPLETED",
        reading_score__isnull=False
    ).aggregate(
        avg_score=Avg("reading_score"),
        tests_count=Count("id"),
        best_score=Max("reading_score"),
    )

    writing_stats = ExamAttempt.objects.filter(
        student=user,
        status="COMPLETED",
        writing_score__isnull=False
    ).aggregate(
        avg_score=Avg("writing_score"),
        tests_count=Count("id"),
        best_score=Max("writing_score"),
    )

    speaking_stats = ExamAttempt.objects.filter(
        student=user,
        status="COMPLETED",
        speaking_score__isnull=False
    ).aggregate(
        avg_score=Avg("speaking_score"),
        tests_count=Count("id"),
        best_score=Max("speaking_score"),
    )

    target_score = 7.5

    def format_section(stats):
        avg = stats.get("avg_score")
        best = stats.get("best_score")
        return {
            "average_score": round(float(avg), 1) if avg else None,
            "tests_count": stats.get("tests_count") or 0,
            "best_score": round(float(best), 1) if best else None,
            "progress": round((float(avg) / target_score) * 100) if avg else 0,
        }

    response_data = {
        "listening": format_section(listening_stats),
        "reading": format_section(reading_stats),
        "writing": format_section(writing_stats),
        "speaking": format_section(speaking_stats),
        "target_score": target_score,
    }

    # Calculate overall average from all sections
    all_scores = [
        response_data["listening"]["average_score"],
        response_data["reading"]["average_score"],
        response_data["writing"]["average_score"],
        response_data["speaking"]["average_score"],
    ]
    valid_scores = [s for s in all_scores if s is not None]
    response_data["overall_average"] = (
        round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else None
    )

    dashboard_cache.set(cache_key, response_data, timeout=CACHE_MEDIUM)
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_books_progress(request):
    """
    Get user's books progress for dashboard.
    """
    user = request.user
    cache_key = f"dashboard_books_v2_{user.id}"

    cached_data = dashboard_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    # Get user's book progress with related book data
    progress_list = UserBookProgress.objects.filter(
        user=user, is_started=True
    ).select_related("book").order_by("-last_accessed")[:5]

    # Get available books not started
    started_book_ids = progress_list.values_list("book_id", flat=True)
    available_books = Book.objects.filter(
        is_active=True
    ).exclude(id__in=started_book_ids).order_by("-created_at")[:3]

    # Format progress data
    in_progress = []
    for p in progress_list:
        in_progress.append({
            "id": p.book.id,
            "title": p.book.title,
            "cover_image": p.book.cover_image.url if p.book.cover_image else None,
            "level": p.book.level,
            "total_sections": p.book.total_sections,
            "completed_sections": p.completed_sections,
            "percentage": round(float(p.percentage), 0),
            "average_score": round(float(p.average_score), 1) if p.average_score else None,
            "is_completed": p.is_completed,
            "last_accessed": p.last_accessed,
        })

    # Format available books
    suggested = []
    for book in available_books:
        suggested.append({
            "id": book.id,
            "title": book.title,
            "cover_image": book.cover_image.url if book.cover_image else None,
            "level": book.level,
            "total_sections": book.total_sections,
        })

    # Get recent section results
    recent_sections = UserSectionResult.objects.filter(
        user=user, is_completed=True
    ).select_related("section", "section__book").order_by("-completed_at")[:5]

    recent_activity = []
    for result in recent_sections:
        recent_activity.append({
            "section_title": result.section.get_title(),
            "book_title": result.section.book.title,
            "score": round(float(result.score), 1) if result.score else None,
            "completed_at": result.completed_at,
            "section_type": result.section.section_type,
        })

    response_data = {
        "in_progress": in_progress,
        "suggested": suggested,
        "recent_activity": recent_activity,
        "stats": {
            "total_started": len(in_progress),
            "total_completed": UserBookProgress.objects.filter(user=user, is_completed=True).count(),
        },
    }

    dashboard_cache.set(cache_key, response_data, timeout=CACHE_SHORT)
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_recent_activity(request):
    """
    Get recent test activity efficiently.
    Uses ExamAttempt fields directly for scores.
    """
    user = request.user
    cache_key = f"dashboard_activity_v2_{user.id}"

    cached_data = dashboard_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    # Get recent completed attempts with scores included
    recent_attempts = ExamAttempt.objects.filter(
        student=user, status="COMPLETED"
    ).select_related(
        "exam__mock_test"
    ).order_by("-completed_at")[:10]

    recent_tests = []
    for attempt in recent_attempts:
        l_score = attempt.listening_score
        r_score = attempt.reading_score
        w_score = attempt.writing_score
        s_score = attempt.speaking_score
        
        # Calculate overall if not stored
        scores = [s for s in [l_score, r_score, w_score, s_score] if s is not None]
        overall = attempt.overall_score
        if not overall and scores:
            overall = round(sum(float(s) for s in scores) / len(scores) * 2) / 2
        
        recent_tests.append({
            "id": attempt.id,
            "exam_name": attempt.exam.mock_test.title if attempt.exam.mock_test else "Unknown Test",
            "exam_type": attempt.exam.mock_test.exam_type if attempt.exam.mock_test else "UNKNOWN",
            "date": attempt.completed_at,
            "listening_score": round(float(l_score), 1) if l_score else None,
            "reading_score": round(float(r_score), 1) if r_score else None,
            "writing_score": round(float(w_score), 1) if w_score else None,
            "speaking_score": round(float(s_score), 1) if s_score else None,
            "overall_score": round(float(overall), 1) if overall else None,
        })

    response_data = {"recent_tests": recent_tests}
    dashboard_cache.set(cache_key, response_data, timeout=CACHE_SHORT)
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_weekly_progress(request):
    """
    Get weekly progress data for charts.
    """
    user = request.user
    cache_key = f"dashboard_weekly_v2_{user.id}"

    cached_data = dashboard_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    # Get tests by week for the last 8 weeks
    eight_weeks_ago = timezone.now() - timedelta(weeks=8)
    
    weekly_data = (
        ExamAttempt.objects.filter(
            student=user,
            status="COMPLETED",
            completed_at__gte=eight_weeks_ago
        )
        .annotate(week=TruncWeek("completed_at"))
        .values("week")
        .annotate(tests_count=Count("id"))
        .order_by("week")
    )

    # Format for chart
    weeks = []
    for item in weekly_data:
        weeks.append({
            "week": item["week"].strftime("%b %d"),
            "tests": item["tests_count"],
        })

    response_data = {"weekly_progress": weeks}
    dashboard_cache.set(cache_key, response_data, timeout=CACHE_MEDIUM)
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_achievements(request):
    """
    Get user achievements.
    """
    user = request.user
    cache_key = f"dashboard_achievements_v2_{user.id}"

    cached_data = dashboard_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    # Get stats needed for achievements
    stats = ExamAttempt.objects.filter(
        student=user, status="COMPLETED"
    ).aggregate(
        total_tests=Count("id"),
    )

    book_stats = UserBookProgress.objects.filter(user=user).aggregate(
        books_completed=Count("id", filter=Q(is_completed=True)),
    )

    total_tests = stats["total_tests"] or 0
    books_completed = book_stats["books_completed"] or 0

    achievements = []

    # Test achievements
    if total_tests >= 1:
        achievements.append({
            "id": "first_test",
            "title": "First Steps",
            "description": "Completed your first practice test",
            "icon": "🎯",
            "unlocked": True,
        })

    if total_tests >= 5:
        achievements.append({
            "id": "five_tests",
            "title": "Getting Started",
            "description": "Completed 5 practice tests",
            "icon": "📚",
            "unlocked": True,
        })

    if total_tests >= 10:
        achievements.append({
            "id": "ten_tests",
            "title": "Dedicated Learner",
            "description": "Completed 10 practice tests",
            "icon": "🏆",
            "unlocked": True,
        })

    # Book achievements
    if books_completed >= 1:
        achievements.append({
            "id": "first_book",
            "title": "Book Worm",
            "description": "Completed your first practice book",
            "icon": "📖",
            "unlocked": True,
        })

    # Progress milestones
    if total_tests < 5:
        achievements.append({
            "id": "progress_five",
            "title": "Getting Started",
            "description": f"Complete {5 - total_tests} more tests",
            "icon": "📚",
            "unlocked": False,
            "progress": (total_tests / 5) * 100,
        })

    response_data = {"achievements": achievements}
    dashboard_cache.set(cache_key, response_data, timeout=CACHE_LONG)
    return Response(response_data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def clear_all_dashboard_cache(request):
    """Clear all dashboard caches for the current user."""
    user = request.user
    cache_keys = [
        f"dashboard_overview_v2_{user.id}",
        f"dashboard_sections_v2_{user.id}",
        f"dashboard_books_v2_{user.id}",
        f"dashboard_activity_v2_{user.id}",
        f"dashboard_weekly_v2_{user.id}",
        f"dashboard_achievements_v2_{user.id}",
        f"dashboard_stats_{user.id}",  # Old cache key
    ]
    for key in cache_keys:
        dashboard_cache.delete(key)
    return Response({"success": True, "message": "All dashboard caches cleared"})
