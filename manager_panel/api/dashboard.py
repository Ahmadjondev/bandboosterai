"""
Manager API - Dashboard Endpoints
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Max, Min
from django.utils import timezone
from datetime import timedelta

from ielts.models import (
    MockExam,
    ExamAttempt,
    Exam,
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
)
from ..serializers import (
    UserSerializer,
)
from .utils import check_manager_permission, permission_denied_response

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """Get comprehensive dashboard statistics with analytics"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    now = timezone.now()

    # Time periods for trends
    last_30_days = now - timedelta(days=30)
    last_7_days = now - timedelta(days=7)

    # ========== STUDENT METRICS ==========
    students = User.objects.filter(role="STUDENT")
    total_students = students.count()
    active_students = students.filter(is_active=True).count()
    inactive_students = total_students - active_students
    new_students_this_month = students.filter(date_joined__gte=last_30_days).count()
    new_students_this_week = students.filter(date_joined__gte=last_7_days).count()

    # ========== EXAM CONTENT METRICS ==========
    total_mock_exams = MockExam.objects.count()
    active_mock_exams = MockExam.objects.filter(is_active=True).count()
    total_reading_passages = ReadingPassage.objects.count()
    total_listening_parts = ListeningPart.objects.count()
    total_writing_tasks = WritingTask.objects.count()
    total_speaking_topics = SpeakingTopic.objects.count()

    # ========== SCHEDULED EXAMS METRICS ==========
    scheduled_exams = Exam.objects.all()
    total_scheduled_exams = scheduled_exams.count()
    upcoming_exams = scheduled_exams.filter(
        start_date__gte=now, status="SCHEDULED"
    ).count()
    ongoing_exams = scheduled_exams.filter(status="ACTIVE").count()
    completed_scheduled_exams = scheduled_exams.filter(status="COMPLETED").count()

    # ========== EXAM ATTEMPTS & RESULTS METRICS ==========
    attempts = ExamAttempt.objects.all()
    total_attempts = attempts.count()
    completed_attempts = attempts.filter(status="COMPLETED").count()
    in_progress_attempts = attempts.filter(status="IN_PROGRESS").count()

    # Use ExamAttempt instead of ExamResult
    completed_results = attempts.filter(status="COMPLETED")
    total_results = completed_results.count()
    results_this_month = completed_results.filter(
        completed_at__gte=last_30_days
    ).count()
    results_this_week = completed_results.filter(completed_at__gte=last_7_days).count()

    # ========== SCORE ANALYTICS ==========
    overall_avg = (
        completed_results.aggregate(Avg("overall_score"))["overall_score__avg"] or 0
    )
    listening_avg = (
        completed_results.aggregate(Avg("listening_score"))["listening_score__avg"] or 0
    )
    reading_avg = (
        completed_results.aggregate(Avg("reading_score"))["reading_score__avg"] or 0
    )
    writing_avg = (
        completed_results.aggregate(Avg("writing_score"))["writing_score__avg"] or 0
    )
    speaking_avg = (
        completed_results.aggregate(Avg("speaking_score"))["speaking_score__avg"] or 0
    )

    # Score ranges distribution (band scores)
    score_distribution = {
        "9.0": completed_results.filter(overall_score__gte=8.5).count(),
        "8.0-8.5": completed_results.filter(
            overall_score__gte=7.5, overall_score__lt=8.5
        ).count(),
        "7.0-7.5": completed_results.filter(
            overall_score__gte=6.5, overall_score__lt=7.5
        ).count(),
        "6.0-6.5": completed_results.filter(
            overall_score__gte=5.5, overall_score__lt=6.5
        ).count(),
        "5.0-5.5": completed_results.filter(
            overall_score__gte=4.5, overall_score__lt=5.5
        ).count(),
        "Below 5.0": completed_results.filter(overall_score__lt=4.5).count(),
    }

    # Performance trends (last 30 days, grouped by week)
    performance_trend = []
    for i in range(4, -1, -1):  # Last 5 weeks
        week_start = now - timedelta(weeks=i + 1)
        week_end = now - timedelta(weeks=i)
        week_results = completed_results.filter(
            completed_at__gte=week_start, completed_at__lt=week_end
        )
        week_avg = (
            week_results.aggregate(Avg("overall_score"))["overall_score__avg"] or 0
        )
        performance_trend.append(
            {
                "week": f"Week {5-i}",
                "date": week_start.strftime("%b %d"),
                "average_score": round(week_avg, 1),
                "count": week_results.count(),
            }
        )

    # ========== SECTION-WISE PERFORMANCE ==========
    section_performance = [
        {
            "section": "Listening",
            "average": round(listening_avg, 1),
            "total_tests": completed_results.exclude(
                listening_score__isnull=True
            ).count(),
            "color": "blue",
        },
        {
            "section": "Reading",
            "average": round(reading_avg, 1),
            "total_tests": completed_results.exclude(
                reading_score__isnull=True
            ).count(),
            "color": "green",
        },
        {
            "section": "Writing",
            "average": round(writing_avg, 1),
            "total_tests": completed_results.exclude(
                writing_score__isnull=True
            ).count(),
            "color": "purple",
        },
        {
            "section": "Speaking",
            "average": round(speaking_avg, 1),
            "total_tests": completed_results.exclude(
                speaking_score__isnull=True
            ).count(),
            "color": "orange",
        },
    ]

    # ========== TOP PERFORMERS (Last 30 days) ==========
    top_performers = (
        completed_results.filter(completed_at__gte=last_30_days)
        .select_related("student")
        .order_by("-overall_score")[:5]
    )

    top_performers_data = []
    for result in top_performers:
        top_performers_data.append(
            {
                "id": result.student.id,
                "name": f"{result.student.first_name} {result.student.last_name}",
                "email": result.student.email,
                "score": result.overall_score,
                "date": result.completed_at,
            }
        )

    # ========== RECENT ACTIVITY ==========
    recent_students = students.order_by("-date_joined")[:5]
    recent_attempts = completed_results.select_related(
        "student", "exam__mock_test"
    ).order_by("-completed_at")[:8]

    # ========== ENGAGEMENT METRICS ==========
    students_with_attempts = students.filter(
        id__in=attempts.values_list("student_id", flat=True).distinct()
    ).count()
    engagement_rate = (
        (students_with_attempts / total_students * 100) if total_students > 0 else 0
    )

    completion_rate = (
        (completed_attempts / total_attempts * 100) if total_attempts > 0 else 0
    )

    data = {
        # Core metrics
        "total_students": total_students,
        "active_students": active_students,
        "inactive_students": inactive_students,
        "new_students_this_month": new_students_this_month,
        "new_students_this_week": new_students_this_week,
        # Content metrics
        "total_mock_exams": total_mock_exams,
        "active_mock_exams": active_mock_exams,
        "total_reading_passages": total_reading_passages,
        "total_listening_parts": total_listening_parts,
        "total_writing_tasks": total_writing_tasks,
        "total_speaking_topics": total_speaking_topics,
        # Scheduled exams
        "total_scheduled_exams": total_scheduled_exams,
        "upcoming_exams": upcoming_exams,
        "ongoing_exams": ongoing_exams,
        "completed_scheduled_exams": completed_scheduled_exams,
        # Attempts & Results
        "total_attempts": total_attempts,
        "completed_attempts": completed_attempts,
        "in_progress_attempts": in_progress_attempts,
        "total_results": total_results,
        "results_this_month": results_this_month,
        "results_this_week": results_this_week,
        # Score analytics
        "average_score": round(overall_avg, 1),
        "listening_avg": round(listening_avg, 1),
        "reading_avg": round(reading_avg, 1),
        "writing_avg": round(writing_avg, 1),
        "speaking_avg": round(speaking_avg, 1),
        "score_distribution": score_distribution,
        "performance_trend": performance_trend,
        "section_performance": section_performance,
        # Engagement
        "engagement_rate": round(engagement_rate, 1),
        "completion_rate": round(completion_rate, 1),
        # Recent activity
        "recent_students": UserSerializer(recent_students, many=True).data,
        # Note: recent_results removed - ExamResultSerializer no longer exists
        # Use ExamAttemptSerializer if needed in the future
        "top_performers": top_performers_data,
    }

    return Response(data)
