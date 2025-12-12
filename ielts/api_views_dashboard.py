"""Enhanced Dashboard API endpoints for student progress tracking with Redis caching."""

import json
from datetime import timedelta, datetime
from typing import Dict, List, Any, Optional
import random

from django.core.cache import caches
from django.db.models import Avg, Count, Q, Max, Min
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ExamAttempt
from .api_views import (
    _get_listening_results,
    _get_reading_results,
    _get_writing_results,
    _get_speaking_results,
)

# Get dashboard-specific cache
dashboard_cache = caches["dashboard"]


def _calculate_achievements(
    user, total_tests: int, overall_avg: float, streak: int
) -> List[Dict[str, Any]]:
    """Calculate user achievements and milestones."""
    achievements = []

    # Test completion achievements
    if total_tests >= 1:
        achievements.append(
            {
                "id": "first_test",
                "title": "First Steps",
                "description": "Completed your first IELTS practice test",
                "icon": "🎯",
                "unlocked": True,
                "progress": 100,
            }
        )

    if total_tests >= 5:
        achievements.append(
            {
                "id": "five_tests",
                "title": "Getting Started",
                "description": "Completed 5 practice tests",
                "icon": "📚",
                "unlocked": True,
                "progress": 100,
            }
        )

    if total_tests >= 10:
        achievements.append(
            {
                "id": "ten_tests",
                "title": "Dedicated Learner",
                "description": "Completed 10 practice tests",
                "icon": "🏆",
                "unlocked": True,
                "progress": 100,
            }
        )

    # Score achievements
    if overall_avg and overall_avg >= 6.0:
        achievements.append(
            {
                "id": "band_6",
                "title": "Competent User",
                "description": "Achieved Band 6.0 average",
                "icon": "⭐",
                "unlocked": True,
                "progress": 100,
            }
        )

    if overall_avg and overall_avg >= 7.0:
        achievements.append(
            {
                "id": "band_7",
                "title": "Good User",
                "description": "Achieved Band 7.0 average",
                "icon": "🌟",
                "unlocked": True,
                "progress": 100,
            }
        )

    # Streak achievements
    if streak >= 3:
        achievements.append(
            {
                "id": "streak_3",
                "title": "Consistent Practice",
                "description": "3-day study streak",
                "icon": "🔥",
                "unlocked": True,
                "progress": 100,
            }
        )

    if streak >= 7:
        achievements.append(
            {
                "id": "streak_7",
                "title": "Weekly Warrior",
                "description": "7-day study streak",
                "icon": "💪",
                "unlocked": True,
                "progress": 100,
            }
        )

    # Progress achievements (next milestones)
    if total_tests < 5:
        achievements.append(
            {
                "id": "progress_five",
                "title": "Getting Started",
                "description": f"Complete {5 - total_tests} more tests",
                "icon": "📚",
                "unlocked": False,
                "progress": (total_tests / 5) * 100,
            }
        )
    elif total_tests < 10:
        achievements.append(
            {
                "id": "progress_ten",
                "title": "Dedicated Learner",
                "description": f"Complete {10 - total_tests} more tests",
                "icon": "🏆",
                "unlocked": False,
                "progress": (total_tests / 10) * 100,
            }
        )

    return achievements


def _calculate_weekly_progress(user) -> Dict[str, Any]:
    """Calculate weekly progress and trends."""
    today = timezone.now().date()
    weeks_data = []

    for i in range(4):  # Last 4 weeks
        week_start = today - timedelta(days=today.weekday() + (i * 7))
        week_end = week_start + timedelta(days=6)

        week_attempts = ExamAttempt.objects.filter(
            student=user,
            status="COMPLETED",
            completed_at__date__range=[week_start, week_end],
        )

        test_count = week_attempts.count()
        avg_score = None

        if test_count > 0:
            scores = []
            for attempt in week_attempts:
                try:
                    # Calculate overall score for each attempt
                    section_scores = []

                    for get_results in [
                        _get_listening_results,
                        _get_reading_results,
                        _get_writing_results,
                        _get_speaking_results,
                    ]:
                        try:
                            result = get_results(attempt)
                            score = result.get("band_score") or result.get(
                                "overall_band_score"
                            )
                            if score:
                                section_scores.append(score)
                        except:
                            continue

                    if section_scores:
                        avg = sum(section_scores) / len(section_scores)
                        scores.append(round(avg * 2) / 2)
                except:
                    continue

            if scores:
                avg_score = sum(scores) / len(scores)

        weeks_data.append(
            {
                "week_start": week_start.strftime("%Y-%m-%d"),
                "week_end": week_end.strftime("%Y-%m-%d"),
                "tests_completed": test_count,
                "average_score": round(avg_score, 1) if avg_score else None,
            }
        )

    return {
        "weekly_data": list(reversed(weeks_data)),  # Most recent first
        "trend": (
            "improving"
            if len([w for w in weeks_data if w["average_score"]]) >= 2
            else "stable"
        ),
    }


def _calculate_score_history(user) -> List[Dict[str, Any]]:
    """Calculate detailed score history for timeline visualization."""
    attempts = ExamAttempt.objects.filter(student=user, status="COMPLETED").order_by(
        "completed_at"
    )[
        :30
    ]  # Last 30 tests

    history = []
    for attempt in attempts:
        scores = {}
        try:
            listening_data = _get_listening_results(attempt)
            scores["listening"] = listening_data.get("band_score")
        except:
            scores["listening"] = None

        try:
            reading_data = _get_reading_results(attempt)
            scores["reading"] = reading_data.get("band_score")
        except:
            scores["reading"] = None

        try:
            writing_data = _get_writing_results(attempt)
            scores["writing"] = writing_data.get("overall_band_score")
        except:
            scores["writing"] = None

        try:
            speaking_data = _get_speaking_results(attempt)
            scores["speaking"] = speaking_data.get("overall_band_score")
        except:
            scores["speaking"] = None

        # Calculate overall
        valid_scores = [s for s in scores.values() if s is not None]
        overall = (
            round(sum(valid_scores) / len(valid_scores) * 2) / 2
            if valid_scores
            else None
        )

        history.append(
            {
                "date": attempt.completed_at.strftime("%Y-%m-%d"),
                "scores": scores,
                "overall": overall,
                "test_name": attempt.exam.mock_test.title,
            }
        )

    return history


def _calculate_learning_velocity(score_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate learning velocity and improvement rate."""
    if len(score_history) < 2:
        return {"velocity": 0, "trend": "insufficient_data", "improvement_rate": 0}

    scores = [s["overall"] for s in score_history if s["overall"] is not None]
    if len(scores) < 2:
        return {"velocity": 0, "trend": "insufficient_data", "improvement_rate": 0}

    # Calculate improvement rate (points per test)
    first_half = scores[: len(scores) // 2]
    second_half = scores[len(scores) // 2 :]

    avg_first = sum(first_half) / len(first_half)
    avg_second = sum(second_half) / len(second_half)

    improvement = avg_second - avg_first
    velocity = improvement / len(scores) * 10  # Normalized

    trend = (
        "improving"
        if improvement > 0.1
        else "declining" if improvement < -0.1 else "stable"
    )

    return {
        "velocity": round(velocity, 2),
        "trend": trend,
        "improvement_rate": round(improvement, 2),
        "recent_avg": round(avg_second, 1),
        "previous_avg": round(avg_first, 1),
    }


def _calculate_activity_heatmap(user) -> Dict[str, Any]:
    """Generate activity heatmap data for the last 90 days."""
    today = timezone.now().date()
    ninety_days_ago = today - timedelta(days=90)

    attempts = ExamAttempt.objects.filter(
        student=user, status="COMPLETED", completed_at__date__gte=ninety_days_ago
    )

    # Group by date
    activity_map = {}
    for attempt in attempts:
        date_str = attempt.completed_at.date().strftime("%Y-%m-%d")
        activity_map[date_str] = activity_map.get(date_str, 0) + 1

    # Generate full 90-day range
    heatmap_data = []
    for i in range(90):
        date = today - timedelta(days=90 - i - 1)
        date_str = date.strftime("%Y-%m-%d")
        heatmap_data.append(
            {
                "date": date_str,
                "count": activity_map.get(date_str, 0),
                "level": min(4, activity_map.get(date_str, 0)),  # 0-4 intensity
            }
        )

    return {
        "data": heatmap_data,
        "total_active_days": len(activity_map),
        "most_active_day": (
            max(activity_map.items(), key=lambda x: x[1])[0] if activity_map else None
        ),
        "current_streak": _calculate_current_streak(activity_map, today),
    }


def _calculate_current_streak(activity_map: Dict, today) -> int:
    """Calculate current consecutive days streak."""
    streak = 0
    check_date = today
    while check_date.strftime("%Y-%m-%d") in activity_map:
        streak += 1
        check_date -= timedelta(days=1)
    return streak


def _get_motivational_message(
    overall_avg: float, streak: int, total_tests: int
) -> Dict[str, str]:
    """Generate personalized motivational message."""
    messages = []

    if streak >= 7:
        messages.append(
            {
                "type": "streak",
                "title": "🔥 Amazing Streak!",
                "message": f"You've practiced {streak} days in a row! Keep the momentum going!",
                "color": "orange",
            }
        )

    if overall_avg and overall_avg >= 7.0:
        messages.append(
            {
                "type": "achievement",
                "title": "⭐ Excellent Progress!",
                "message": "Your scores are impressive! You're on track for a great result.",
                "color": "green",
            }
        )
    elif overall_avg and overall_avg >= 6.0:
        messages.append(
            {
                "type": "encouragement",
                "title": "💪 Keep Pushing!",
                "message": "You're making solid progress. Stay consistent!",
                "color": "blue",
            }
        )

    if total_tests >= 10:
        messages.append(
            {
                "type": "milestone",
                "title": "🎯 Test Master!",
                "message": f"{total_tests} tests completed! Your dedication is outstanding.",
                "color": "purple",
            }
        )

    return (
        messages[0]
        if messages
        else {
            "type": "welcome",
            "title": "👋 Welcome!",
            "message": "Start your IELTS journey today. Every practice counts!",
            "color": "blue",
        }
    )


def _calculate_skill_gaps(
    section_stats: Dict, target_score: float = 7.5
) -> List[Dict[str, Any]]:
    """Identify skill gaps and priority areas for improvement."""
    gaps = []

    for section, stats in section_stats.items():
        if stats["average_score"]:
            gap_size = target_score - stats["average_score"]
            if gap_size > 0:
                priority = (
                    "high" if gap_size >= 2 else "medium" if gap_size >= 1 else "low"
                )
                gaps.append(
                    {
                        "section": section.capitalize(),
                        "current_score": stats["average_score"],
                        "target_score": target_score,
                        "gap": round(gap_size, 1),
                        "priority": priority,
                        "estimated_practice_needed": int(
                            gap_size * 5
                        ),  # Rough estimate
                    }
                )

    return sorted(gaps, key=lambda x: x["gap"], reverse=True)


def _get_study_recommendations(
    user, section_stats: Dict, overall_avg: float
) -> List[Dict[str, Any]]:
    """Generate personalized study recommendations."""
    recommendations = []

    # Find weakest section
    weakest_section = None
    lowest_score = float("inf")

    for section, stats in section_stats.items():
        if stats["average_score"] and stats["average_score"] < lowest_score:
            lowest_score = stats["average_score"]
            weakest_section = section

    if weakest_section:
        section_names = {
            "listening": "Listening",
            "reading": "Reading",
            "writing": "Writing",
            "speaking": "Speaking",
        }

        recommendations.append(
            {
                "type": "focus_area",
                "title": f"Focus on {section_names[weakest_section]}",
                "description": f"Your {weakest_section} score ({lowest_score:.1f}) needs improvement",
                "priority": "high",
                "action": f"Practice more {weakest_section} exercises",
            }
        )

    # Overall recommendations based on score
    if overall_avg:
        if overall_avg < 5.5:
            recommendations.append(
                {
                    "type": "general",
                    "title": "Build Foundation Skills",
                    "description": "Focus on basic English skills and IELTS format familiarity",
                    "priority": "high",
                    "action": "Take more practice tests to improve familiarity",
                }
            )
        elif overall_avg < 6.5:
            recommendations.append(
                {
                    "type": "general",
                    "title": "Develop Test Strategies",
                    "description": "Work on time management and test-taking strategies",
                    "priority": "medium",
                    "action": "Practice with time limits and review mistakes",
                }
            )
        elif overall_avg < 7.5:
            recommendations.append(
                {
                    "type": "general",
                    "title": "Refine Advanced Skills",
                    "description": "Focus on accuracy and advanced language features",
                    "priority": "medium",
                    "action": "Analyze high-scoring responses and practice complex tasks",
                }
            )

    return recommendations


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """
    Get comprehensive dashboard statistics for the logged-in student.
    Includes: tests completed, average scores, progress by section, recent activity,
    achievements, weekly trends, and study recommendations.
    Uses Redis caching to improve performance.
    """
    user = request.user
    cache_key = f"dashboard_stats_{user.id}"

    # Try to get cached data
    cached_data = dashboard_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

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

    # Get user's target score from profile (default to 7.5 if not set)
    target_score = float(user.target_score) if user.target_score else 7.5

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

    # Calculate enhanced features
    section_stats_dict = {
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
    }

    # Calculate all enhanced features
    achievements = _calculate_achievements(user, total_tests, overall_avg or 0, streak)
    weekly_progress = _calculate_weekly_progress(user)
    recommendations = _get_study_recommendations(
        user, section_stats_dict, overall_avg or 0
    )
    score_history = _calculate_score_history(user)
    learning_velocity = _calculate_learning_velocity(score_history)
    activity_heatmap = _calculate_activity_heatmap(user)
    motivational_message = _get_motivational_message(
        overall_avg or 0, streak, total_tests
    )
    skill_gaps = _calculate_skill_gaps(section_stats_dict, target_score)

    # Prepare comprehensive response data
    response_data = {
        "overview": {
            "total_tests": total_tests,
            "target_score": target_score,
            "current_score": overall_avg,
            "overall_progress": overall_progress,
            "streak_days": streak,
            "tests_this_week": recent_count,
        },
        "section_stats": section_stats_dict,
        "recent_tests": recent_tests,
        "achievements": achievements,
        "weekly_progress": weekly_progress,
        "recommendations": recommendations,
        "performance_insights": {
            "strongest_section": (
                max(
                    section_stats_dict.items(), key=lambda x: x[1]["average_score"] or 0
                )[0]
                if any(s["average_score"] for s in section_stats_dict.values())
                else None
            ),
            "improvement_needed": (
                min(
                    section_stats_dict.items(),
                    key=lambda x: x[1]["average_score"] or float("inf"),
                )[0]
                if any(s["average_score"] for s in section_stats_dict.values())
                else None
            ),
            "total_study_time": total_tests * 180,  # Estimate 3 hours per test
            "consistency_score": min(
                100, (streak / 30) * 100
            ),  # Based on 30-day streak
        },
        "score_history": score_history,
        "learning_velocity": learning_velocity,
        "activity_heatmap": activity_heatmap,
        "motivational_message": motivational_message,
        "skill_gaps": skill_gaps,
        "quick_stats": {
            "best_score": max(
                [s["overall"] for s in score_history if s["overall"]], default=0
            ),
            "average_improvement": learning_velocity.get("improvement_rate", 0),
            "practice_consistency": round(
                (activity_heatmap["total_active_days"] / 90) * 100
            ),
            "tests_this_month": completed_attempts.filter(
                completed_at__gte=timezone.now() - timedelta(days=30)
            ).count(),
        },
    }

    # Cache the response for 15 minutes
    dashboard_cache.set(cache_key, response_data, timeout=900)

    return Response(response_data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def clear_dashboard_cache(request):
    """Clear dashboard cache for the current user."""
    user = request.user
    cache_key = f"dashboard_stats_{user.id}"
    dashboard_cache.delete(cache_key)
    return Response({"success": True, "message": "Dashboard cache improved"})
