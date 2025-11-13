"""
Dashboard API endpoints for student progress tracking.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import ExamAttempt
from .api_views import (
    _get_listening_results,
    _get_reading_results,
    _get_writing_results,
    _get_speaking_results,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """
    Get comprehensive dashboard statistics for the logged-in student.
    Includes: tests completed, average scores, progress by section, recent activity.
    """
    user = request.user

    # Get all completed attempts
    completed_attempts = (
        ExamAttempt.objects.filter(student=user, status="COMPLETED")
        .select_related("exam", "exam__mock_test")
        .order_by("-completed_at")
    )

    total_tests = completed_attempts.count()

    # Calculate section-wise statistics
    listening_scores = []
    reading_scores = []
    writing_scores = []
    speaking_scores = []
    overall_scores = []

    recent_tests = []

    for attempt in completed_attempts[:10]:  # Get last 10 tests for recent activity
        # Get section scores
        l_score = None
        r_score = None
        w_score = None
        s_score = None

        try:
            listening_data = _get_listening_results(attempt)
            l_score = listening_data.get("band_score")
            if l_score is not None:
                listening_scores.append(l_score)
        except:
            pass

        try:
            reading_data = _get_reading_results(attempt)
            r_score = reading_data.get("band_score")
            if r_score is not None:
                reading_scores.append(r_score)
        except:
            pass

        try:
            writing_data = _get_writing_results(attempt)
            w_score = writing_data.get("overall_band_score")
            if w_score is not None:
                writing_scores.append(w_score)
        except:
            pass

        try:
            speaking_data = _get_speaking_results(attempt)
            s_score = speaking_data.get("overall_band_score")
            if s_score is not None:
                speaking_scores.append(s_score)
        except:
            pass

        # Calculate overall score for this attempt
        attempt_scores = [
            s for s in [l_score, r_score, w_score, s_score] if s is not None
        ]
        if attempt_scores:
            avg = sum(attempt_scores) / len(attempt_scores)
            overall = round(avg * 2) / 2  # IELTS standard rounding
            overall_scores.append(overall)
        else:
            overall = None

        # Add to recent tests
        recent_tests.append(
            {
                "id": attempt.id,
                "exam_name": attempt.exam.mock_test.title,
                "exam_type": attempt.exam.mock_test.exam_type,
                "date": attempt.completed_at,
                "listening_score": round(l_score, 1) if l_score is not None else None,
                "reading_score": round(r_score, 1) if r_score is not None else None,
                "writing_score": round(w_score, 1) if w_score is not None else None,
                "speaking_score": round(s_score, 1) if s_score is not None else None,
                "overall_score": round(overall, 1) if overall is not None else None,
            }
        )

    # Calculate averages and progress
    def calc_avg(scores):
        if not scores:
            return None
        avg = sum(scores) / len(scores)
        return round(avg * 2) / 2  # IELTS standard rounding

    listening_avg = calc_avg(listening_scores)
    reading_avg = calc_avg(reading_scores)
    writing_avg = calc_avg(writing_scores)
    speaking_avg = calc_avg(speaking_scores)
    overall_avg = calc_avg(overall_scores)

    # Default target score (can be customized per user in future)
    target_score = 7.5

    # Calculate progress percentage (0-100)
    def calc_progress(current, target):
        if current is None:
            return 0
        # Progress from 0 to target
        # Map 0-9 band score to 0-100%, but relative to target
        percentage = (current / target) * 100
        return min(100, round(percentage))

    listening_progress = calc_progress(listening_avg, target_score)
    reading_progress = calc_progress(reading_avg, target_score)
    writing_progress = calc_progress(writing_avg, target_score)
    speaking_progress = calc_progress(speaking_avg, target_score)
    overall_progress = calc_progress(overall_avg, target_score)

    # Calculate test counts by section
    listening_count = len(listening_scores)
    reading_count = len(reading_scores)
    writing_count = len(writing_scores)
    speaking_count = len(speaking_scores)

    # Calculate streak (consecutive days with activity)
    today = timezone.now().date()
    streak = 0
    check_date = today

    # Get all completion dates
    completion_dates = set(
        completed_attempts.values_list("completed_at__date", flat=True)
    )

    while check_date in completion_dates:
        streak += 1
        check_date -= timedelta(days=1)

    # Recent activity summary (last 7 days)
    seven_days_ago = timezone.now() - timedelta(days=7)
    recent_count = completed_attempts.filter(completed_at__gte=seven_days_ago).count()

    return Response(
        {
            "overview": {
                "total_tests": total_tests,
                "target_score": target_score,
                "current_score": overall_avg,
                "overall_progress": overall_progress,
                "streak_days": streak,
                "tests_this_week": recent_count,
            },
            "section_stats": {
                "listening": {
                    "average_score": listening_avg,
                    "tests_count": listening_count,
                    "progress": listening_progress,
                },
                "reading": {
                    "average_score": reading_avg,
                    "tests_count": reading_count,
                    "progress": reading_progress,
                },
                "writing": {
                    "average_score": writing_avg,
                    "tests_count": writing_count,
                    "progress": writing_progress,
                },
                "speaking": {
                    "average_score": speaking_avg,
                    "tests_count": speaking_count,
                    "progress": speaking_progress,
                },
            },
            "recent_tests": recent_tests,
        }
    )
