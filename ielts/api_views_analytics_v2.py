"""
Analytics API v2 - Optimized with better caching and free tier support.

Improvements:
- Unified data fetching to reduce DB queries
- Tiered caching with intelligent invalidation
- Basic analytics available for free users
- Batch operations for faster response times

Subscription Tiers:
- Free: 7-day history, basic stats, simple skill breakdown (limited)
- Plus: 30-day history, full progress trends
- Pro: 90-day history, detailed skill breakdown, weakness analysis
- Ultra: Unlimited history, band prediction, AI study plan
"""

from datetime import timedelta, datetime
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
from functools import wraps
import hashlib
import json

from django.core.cache import caches
from django.db.models import (
    Avg,
    Count,
    Q,
    Max,
    Min,
    Sum,
    F,
    Case,
    When,
    Value,
    FloatField,
    IntegerField,
    Prefetch,
)
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth, Coalesce
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import (
    ExamAttempt,
    UserAnswer,
    Question,
    TestHead,
    WritingAttempt,
    SpeakingAttempt,
)
from .analysis import (
    IMPROVEMENT_TIPS,
    STRENGTH_THRESHOLD,
    WEAKNESS_THRESHOLD,
)
from books.models import UserBookProgress, UserSectionResult
from practice.models import SectionPracticeAttempt
from payments.models import UserSubscription

# ============================================================================
# CACHE CONFIGURATION
# ============================================================================

try:
    analytics_cache = caches["dashboard"]
except KeyError:
    analytics_cache = caches["default"]

# Cache timeouts by data type (in seconds)
CACHE_TIMEOUTS = {
    "overview": 1800,  # 30 minutes - changes frequently
    "skills": 3600,  # 1 hour - moderately stable
    "weaknesses": 3600,  # 1 hour - moderately stable
    "trends": 7200,  # 2 hours - historical data is stable
    "prediction": 14400,  # 4 hours - complex calculation
    "study_plan": 14400,  # 4 hours - complex calculation
    "unified": 1800,  # 30 minutes - unified data
}

# Subscription tier constants
TIER_FREE = None
TIER_PLUS = "PLUS"
TIER_PRO = "PRO"
TIER_ULTRA = "ULTRA"

# Historical data limits by tier (in days)
HISTORY_LIMITS = {
    TIER_FREE: 7,
    TIER_PLUS: 30,
    TIER_PRO: 90,
    TIER_ULTRA: None,  # Unlimited
}

# Feature access by tier
TIER_FEATURES = {
    TIER_FREE: {
        "overview": True,
        "basic_skills": True,  # Limited skill breakdown
        "progress_trends": True,  # Limited to 7 days
        "achievements": True,  # Basic achievements
        "weaknesses": False,
        "band_prediction": False,
        "study_plan": False,
    },
    TIER_PLUS: {
        "overview": True,
        "basic_skills": True,
        "progress_trends": True,
        "achievements": True,
        "weaknesses": False,
        "band_prediction": False,
        "study_plan": False,
    },
    TIER_PRO: {
        "overview": True,
        "basic_skills": True,
        "progress_trends": True,
        "achievements": True,
        "weaknesses": True,
        "band_prediction": False,
        "study_plan": False,
    },
    TIER_ULTRA: {
        "overview": True,
        "basic_skills": True,
        "progress_trends": True,
        "achievements": True,
        "weaknesses": True,
        "band_prediction": True,
        "study_plan": True,
    },
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def get_user_subscription_tier(user) -> Optional[str]:
    """Get user's current subscription tier with caching."""
    cache_key = f"user_tier_{user.id}"
    cached_tier = analytics_cache.get(cache_key)

    if cached_tier is not None:
        return cached_tier if cached_tier != "__FREE__" else None

    try:
        subscription = UserSubscription.objects.select_related("plan").get(user=user)
        if subscription.is_valid() and subscription.plan:
            tier = subscription.plan.plan_type
            analytics_cache.set(cache_key, tier, timeout=300)  # 5 min cache
            return tier
    except UserSubscription.DoesNotExist:
        pass

    analytics_cache.set(cache_key, "__FREE__", timeout=300)
    return None


def get_history_cutoff(tier: Optional[str]) -> Optional[datetime]:
    """Get the cutoff date for historical data based on subscription tier."""
    days_limit = HISTORY_LIMITS.get(tier, 7)
    if days_limit is None:
        return None
    return timezone.now() - timedelta(days=days_limit)


def has_feature_access(tier: Optional[str], feature: str) -> bool:
    """Check if a tier has access to a feature."""
    tier_features = TIER_FEATURES.get(tier, TIER_FEATURES[TIER_FREE])
    return tier_features.get(feature, False)


def get_cache_key(user_id: int, tier: Optional[str], endpoint: str) -> str:
    """Generate a consistent cache key."""
    tier_str = tier or "FREE"
    return f"analytics_v2_{endpoint}_{user_id}_{tier_str}"


def round_score(value: Any, decimals: int = 1) -> Optional[float]:
    """Safely round a score value."""
    if value is None:
        return None
    try:
        return round(float(value), decimals)
    except (TypeError, ValueError):
        return None


# ============================================================================
# UNIFIED DATA FETCHER - Reduces multiple DB queries to one
# ============================================================================


def fetch_unified_analytics_data(user, tier: Optional[str]) -> Dict[str, Any]:
    """
    Fetch all analytics data in a single optimized query batch.
    This reduces DB round trips and improves response time.
    """
    cache_key = get_cache_key(user.id, tier, "unified_data")
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        return cached_data

    cutoff_date = get_history_cutoff(tier)

    # Build filters
    exam_filter = Q(student=user, status="COMPLETED")
    practice_filter = Q(student=user, status="COMPLETED")

    if cutoff_date:
        exam_filter &= Q(completed_at__gte=cutoff_date)
        practice_filter &= Q(completed_at__gte=cutoff_date)

    # === BATCH QUERY 1: Exam Statistics ===
    exam_stats = ExamAttempt.objects.filter(exam_filter).aggregate(
        total_exams=Count("id"),
        avg_overall=Avg("overall_score"),
        best_overall=Max("overall_score"),
        avg_listening=Avg("listening_score"),
        avg_reading=Avg("reading_score"),
        avg_writing=Avg("writing_score"),
        avg_speaking=Avg("speaking_score"),
        best_listening=Max("listening_score"),
        best_reading=Max("reading_score"),
        best_writing=Max("writing_score"),
        best_speaking=Max("speaking_score"),
        first_exam=Min("completed_at"),
        last_exam=Max("completed_at"),
    )

    # === BATCH QUERY 2: Practice Statistics ===
    practice_stats = SectionPracticeAttempt.objects.filter(practice_filter).aggregate(
        total_practices=Count("id"),
        avg_score=Avg("score"),
        total_time=Coalesce(Sum("time_spent_seconds"), Value(0)),
    )

    # Practice by section type
    practice_by_type = list(
        SectionPracticeAttempt.objects.filter(practice_filter)
        .values("practice__section_type")
        .annotate(
            count=Count("id"),
            avg_score=Avg("score"),
            best_score=Max("score"),
        )
    )

    # === BATCH QUERY 3: Book Progress ===
    book_stats = UserBookProgress.objects.filter(user=user).aggregate(
        books_started=Count("id", filter=Q(is_started=True)),
        books_completed=Count("id", filter=Q(is_completed=True)),
        total_sections=Coalesce(Sum("book__total_sections"), Value(0)),
        completed_sections=Coalesce(Sum("completed_sections"), Value(0)),
        avg_score=Avg("average_score"),
    )

    # === BATCH QUERY 4: Active Days for Streak ===
    # Use TruncDate to extract date from datetime field
    exam_dates = set(
        ExamAttempt.objects.filter(exam_filter)
        .filter(completed_at__isnull=False)
        .annotate(completion_date=TruncDate("completed_at"))
        .values_list("completion_date", flat=True)
        .distinct()
    )

    practice_dates = set(
        SectionPracticeAttempt.objects.filter(practice_filter)
        .filter(completed_at__isnull=False)
        .annotate(completion_date=TruncDate("completed_at"))
        .values_list("completion_date", flat=True)
        .distinct()
    )

    active_dates = exam_dates | practice_dates

    # Calculate streak
    streak_days = 0
    if active_dates:
        today = timezone.now().date()
        current_date = today
        while current_date in active_dates:
            streak_days += 1
            current_date -= timedelta(days=1)

    # === BATCH QUERY 5: Weekly Trends (optimized) ===
    weekly_exams = list(
        ExamAttempt.objects.filter(exam_filter)
        .annotate(week=TruncWeek("completed_at"))
        .values("week")
        .annotate(
            count=Count("id"),
            avg_overall=Avg("overall_score"),
            avg_listening=Avg("listening_score"),
            avg_reading=Avg("reading_score"),
            avg_writing=Avg("writing_score"),
            avg_speaking=Avg("speaking_score"),
        )
        .order_by("week")
    )

    # === BATCH QUERY 6: Question Type Performance (for skills) ===
    # Note: This is a placeholder - actual question analysis happens in skills endpoint
    # We don't need this query here since it's complex and done separately

    # Build unified data structure
    data = {
        "exam_stats": exam_stats,
        "practice_stats": practice_stats,
        "practice_by_type": practice_by_type,
        "book_stats": book_stats,
        "active_dates": len(active_dates),
        "streak_days": streak_days,
        "weekly_exams": weekly_exams,
        "cutoff_date": cutoff_date,
        "tier": tier,
    }

    analytics_cache.set(cache_key, data, timeout=CACHE_TIMEOUTS["unified"])
    return data


# ============================================================================
# API ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_analytics_overview_v2(request):
    """
    Get comprehensive analytics overview - Available to ALL users.
    Optimized with unified data fetching.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    cache_key = get_cache_key(user.id, tier, "overview")
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        cached_data["cached"] = True
        return Response(cached_data)

    # Fetch unified data
    data = fetch_unified_analytics_data(user, tier)
    exam_stats = data["exam_stats"]
    practice_stats = data["practice_stats"]
    book_stats = data["book_stats"]

    # Calculate derived values
    overall_avg = round_score(exam_stats["avg_overall"]) or 0

    # Determine user level
    if overall_avg >= 8.0:
        current_level = "Expert"
    elif overall_avg >= 7.0:
        current_level = "Advanced"
    elif overall_avg >= 6.0:
        current_level = "Upper Intermediate"
    elif overall_avg >= 5.0:
        current_level = "Intermediate"
    elif overall_avg > 0:
        current_level = "Developing"
    else:
        current_level = "Beginner"

    # Calculate book progress
    total_sections = book_stats["total_sections"] or 0
    completed_sections = book_stats["completed_sections"] or 0
    book_progress_pct = (
        (completed_sections / total_sections * 100) if total_sections > 0 else 0
    )

    # Get target band from user profile
    target_band = float(user.target_score) if user.target_score else 7.0

    # Determine feature access
    history_days = HISTORY_LIMITS.get(tier, 7)

    response_data = {
        "total_attempts": exam_stats["total_exams"] or 0,
        "total_practice_sessions": practice_stats["total_practices"] or 0,
        "total_books_completed": book_stats["books_completed"] or 0,
        "overall_average": round_score(overall_avg) if overall_avg > 0 else None,
        "current_level": current_level,
        "target_band": target_band,
        "days_active": data["active_dates"],
        "streak_days": data["streak_days"],
        "section_averages": {
            "reading": round_score(exam_stats["avg_reading"]),
            "listening": round_score(exam_stats["avg_listening"]),
            "writing": round_score(exam_stats["avg_writing"]),
            "speaking": round_score(exam_stats["avg_speaking"]),
        },
        "best_scores": {
            "overall": round_score(exam_stats["best_overall"]),
            "reading": round_score(exam_stats["best_reading"]),
            "listening": round_score(exam_stats["best_listening"]),
            "writing": round_score(exam_stats["best_writing"]),
            "speaking": round_score(exam_stats["best_speaking"]),
        },
        "books": {
            "started": book_stats["books_started"] or 0,
            "completed": book_stats["books_completed"] or 0,
            "progress_percentage": round(book_progress_pct, 1),
        },
        "practice_sections": {
            item["practice__section_type"]: {
                "count": item["count"],
                "avg_score": round_score(item["avg_score"]),
                "best_score": round_score(item["best_score"]),
            }
            for item in data["practice_by_type"]
        },
        "subscription_tier": tier,
        "tier_limits": {
            "has_basic_skills": has_feature_access(tier, "basic_skills"),
            "has_weakness_analysis": has_feature_access(tier, "weaknesses"),
            "has_band_prediction": has_feature_access(tier, "band_prediction"),
            "has_ai_study_plan": has_feature_access(tier, "study_plan"),
            "history_days": history_days if history_days else "unlimited",
        },
        "cached": False,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_TIMEOUTS["overview"])
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_skill_breakdown_v2(request):
    """
    Get skill breakdown by section - Available to ALL users.
    Free/Plus users get basic breakdown, Pro/Ultra get detailed analysis.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    cache_key = get_cache_key(user.id, tier, "skills")
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        cached_data["cached"] = True
        return Response(cached_data)

    cutoff_date = get_history_cutoff(tier)
    is_premium = tier in [TIER_PRO, TIER_ULTRA]

    # Build filters
    answer_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        answer_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    # Get answer data with efficient prefetching
    user_answers = UserAnswer.objects.filter(answer_filter).select_related(
        "question__test_head"
    )

    # Aggregate by question type
    question_type_stats = defaultdict(lambda: {"correct": 0, "total": 0, "section": ""})

    for answer in user_answers:
        question = answer.question
        if not question or not question.test_head:
            continue

        test_head = question.test_head
        q_type = test_head.get_question_type_display()
        correct_answer = question.get_correct_answer() or ""
        user_answer = answer.answer_text or ""

        # Determine section
        if test_head.reading_id:
            section = "Reading"
        elif test_head.listening_id:
            section = "Listening"
        else:
            continue

        key = f"{section}_{q_type}"
        question_type_stats[key]["section"] = section
        question_type_stats[key]["type"] = q_type

        # Check correctness
        if (
            test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            user_sorted = "".join(sorted(user_answer.upper()))
            correct_sorted = "".join(sorted(correct_answer.upper()))
            if correct_answer:
                user_set = set(user_sorted)
                correct_set = set(correct_sorted)
                correct_count = len(user_set & correct_set)
                question_type_stats[key]["correct"] += correct_count
                question_type_stats[key]["total"] += len(correct_set)
        else:
            question_type_stats[key]["total"] += 1
            if user_answer.strip().lower() == correct_answer.strip().lower():
                question_type_stats[key]["correct"] += 1

    # Build skills list
    skills = []
    for key, stats in question_type_stats.items():
        if stats["total"] == 0:
            continue

        accuracy = stats["correct"] / stats["total"]
        skill_data = {
            "section": stats["section"],
            "question_type": stats["type"],
            "correct": stats["correct"],
            "total": stats["total"],
            "accuracy": round(accuracy * 100, 1),
            "category": (
                "strength"
                if accuracy >= STRENGTH_THRESHOLD
                else "weakness" if accuracy <= WEAKNESS_THRESHOLD else "average"
            ),
        }

        # Only include tips for premium users
        if is_premium and accuracy <= WEAKNESS_THRESHOLD:
            skill_data["tip"] = IMPROVEMENT_TIPS.get(
                stats["type"], IMPROVEMENT_TIPS.get("default", "")
            )

        skills.append(skill_data)

    # Sort by accuracy (weakest first)
    skills.sort(key=lambda x: x["accuracy"])

    # Build section summaries
    reading_skills = [s for s in skills if s["section"] == "Reading"]
    listening_skills = [s for s in skills if s["section"] == "Listening"]

    def build_section_summary(
        section_skills: List[Dict], section_name: str
    ) -> Optional[Dict]:
        if not section_skills:
            return None

        total_correct = sum(s["correct"] for s in section_skills)
        total_questions = sum(s["total"] for s in section_skills)
        overall_accuracy = total_correct / total_questions if total_questions > 0 else 0

        summary = {
            "overall_accuracy": round(overall_accuracy, 2),
            "total_questions": total_questions,
            "strengths": [
                s["question_type"]
                for s in section_skills
                if s["category"] == "strength"
            ][:3],
            "weaknesses": [
                s["question_type"]
                for s in section_skills
                if s["category"] == "weakness"
            ][:3],
        }

        # Include detailed breakdown for premium users
        if is_premium:
            summary["question_types"] = {
                s["question_type"]: {
                    "accuracy": round(s["accuracy"] / 100, 2),
                    "attempts": s["total"],
                    "category": s["category"],
                }
                for s in section_skills
            }

        return summary

    # Get Writing and Speaking data
    writing_data = None
    speaking_data = None

    if is_premium:
        # Writing stats
        writing_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
        if cutoff_date:
            writing_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

        writing_stats = WritingAttempt.objects.filter(writing_filter).aggregate(
            avg_overall=Avg("band_score"),
            avg_ta=Avg("task_response_or_achievement"),
            avg_cc=Avg("coherence_and_cohesion"),
            avg_lr=Avg("lexical_resource"),
            avg_gra=Avg("grammatical_range_and_accuracy"),
            count=Count("id"),
        )

        if writing_stats["count"]:
            writing_data = {
                "overall_score": round_score(writing_stats["avg_overall"]),
                "criteria_breakdown": {
                    "task_achievement": round_score(writing_stats["avg_ta"]) or 0,
                    "coherence_cohesion": round_score(writing_stats["avg_cc"]) or 0,
                    "lexical_resource": round_score(writing_stats["avg_lr"]) or 0,
                    "grammatical_accuracy": round_score(writing_stats["avg_gra"]) or 0,
                },
                "attempts": writing_stats["count"],
            }

        # Speaking stats
        speaking_filter = Q(
            exam_attempt__student=user, exam_attempt__status="COMPLETED"
        )
        if cutoff_date:
            speaking_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

        speaking_stats = SpeakingAttempt.objects.filter(speaking_filter).aggregate(
            avg_overall=Avg("band_score"),
            avg_fc=Avg("fluency_and_coherence"),
            avg_lr=Avg("lexical_resource"),
            avg_gra=Avg("grammatical_range_and_accuracy"),
            avg_pr=Avg("pronunciation"),
            count=Count("id"),
        )

        if speaking_stats["count"]:
            speaking_data = {
                "overall_score": round_score(speaking_stats["avg_overall"]),
                "criteria_breakdown": {
                    "fluency_coherence": round_score(speaking_stats["avg_fc"]) or 0,
                    "lexical_resource": round_score(speaking_stats["avg_lr"]) or 0,
                    "grammatical_accuracy": round_score(speaking_stats["avg_gra"]) or 0,
                    "pronunciation": round_score(speaking_stats["avg_pr"]) or 0,
                },
                "attempts": speaking_stats["count"],
            }

    response_data = {
        "subscription_tier": tier,
        "is_detailed": is_premium,
        "reading": build_section_summary(reading_skills, "Reading"),
        "listening": build_section_summary(listening_skills, "Listening"),
        "writing": writing_data,
        "speaking": speaking_data,
        "all_skills": skills if is_premium else skills[:6],  # Limit for free users
        "cached": False,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_TIMEOUTS["skills"])
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_progress_trends_v2(request):
    """
    Get progress trends over time - Available to ALL users.
    Free users get 7 days, Plus 30 days, Pro 90 days, Ultra unlimited.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    cache_key = get_cache_key(user.id, tier, "trends")
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        cached_data["cached"] = True
        return Response(cached_data)

    # Use unified data for efficiency
    data = fetch_unified_analytics_data(user, tier)
    weekly_exams = data["weekly_exams"]

    # Format trends
    trends = []
    for item in weekly_exams:
        if item["week"]:
            trends.append(
                {
                    "date": item["week"].isoformat(),
                    "reading": round_score(item["avg_reading"]),
                    "listening": round_score(item["avg_listening"]),
                    "writing": round_score(item["avg_writing"]),
                    "speaking": round_score(item["avg_speaking"]),
                    "overall": round_score(item["avg_overall"]),
                    "attempts": item["count"],
                }
            )

    # Calculate improvement rates
    improvement_rate = {
        "reading": 0.0,
        "listening": 0.0,
        "writing": 0.0,
        "speaking": 0.0,
        "overall": 0.0,
    }

    if len(trends) >= 2:
        first_trend = trends[0]
        last_trend = trends[-1]

        for section in ["reading", "listening", "writing", "speaking", "overall"]:
            first_val = first_trend.get(section)
            last_val = last_trend.get(section)
            if first_val and last_val and first_val > 0:
                improvement_rate[section] = round((last_val - first_val) / first_val, 3)

    # Time period string
    history_days = HISTORY_LIMITS.get(tier, 7)
    if history_days is None:
        time_period = "All time"
    else:
        time_period = f"Last {history_days} days"

    response_data = {
        "subscription_tier": tier,
        "time_period": time_period,
        "trends": trends,
        "improvement_rate": improvement_rate,
        "total_data_points": len(trends),
        "cached": False,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_TIMEOUTS["trends"])
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_weakness_analysis_v2(request):
    """
    Get detailed weakness analysis - Pro and Ultra only.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    if not has_feature_access(tier, "weaknesses"):
        return Response(
            {
                "error": "This feature requires Pro or Ultra subscription",
                "required_tier": "PRO",
                "current_tier": tier or "FREE",
                "upgrade_message": "Upgrade to Pro to unlock detailed weakness analysis with personalized improvement tips.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    cache_key = get_cache_key(user.id, tier, "weaknesses")
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        cached_data["cached"] = True
        return Response(cached_data)

    cutoff_date = get_history_cutoff(tier)
    target_score = float(user.target_score) if user.target_score else 7.0

    all_weaknesses = []

    # === Analyze Reading/Listening ===
    answer_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        answer_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    user_answers = UserAnswer.objects.filter(answer_filter).select_related(
        "question__test_head"
    )

    question_stats = defaultdict(lambda: {"correct": 0, "total": 0, "section": ""})

    for answer in user_answers:
        question = answer.question
        if not question or not question.test_head:
            continue

        test_head = question.test_head
        q_type = test_head.get_question_type_display()
        correct_answer = question.get_correct_answer() or ""
        user_answer = answer.answer_text or ""

        section = (
            "reading"
            if test_head.reading_id
            else "listening" if test_head.listening_id else None
        )
        if not section:
            continue

        key = f"{section}_{q_type}"
        question_stats[key]["section"] = section
        question_stats[key]["type"] = q_type
        question_stats[key]["total"] += 1

        if user_answer.strip().lower() == correct_answer.strip().lower():
            question_stats[key]["correct"] += 1

    for key, stats in question_stats.items():
        if stats["total"] < 3:  # Need enough data
            continue

        accuracy = stats["correct"] / stats["total"]
        if accuracy <= WEAKNESS_THRESHOLD:
            all_weaknesses.append(
                {
                    "section": stats["section"],
                    "weakness_type": stats["type"],
                    "current_score": round(accuracy * 9, 1),
                    "target_score": target_score,
                    "priority": "high" if accuracy < 0.3 else "medium",
                    "attempts": stats["total"],
                    "improvement_tips": [
                        IMPROVEMENT_TIPS.get(
                            stats["type"], "Practice more exercises of this type."
                        )
                    ],
                }
            )

    # === Analyze Writing ===
    writing_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        writing_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    writing_stats = WritingAttempt.objects.filter(writing_filter).aggregate(
        avg_ta=Avg("task_response_or_achievement"),
        avg_cc=Avg("coherence_and_cohesion"),
        avg_lr=Avg("lexical_resource"),
        avg_gra=Avg("grammatical_range_and_accuracy"),
        count=Count("id"),
    )

    if writing_stats["count"] and writing_stats["count"] >= 2:
        writing_criteria = [
            (
                "Task Achievement",
                writing_stats["avg_ta"],
                "Focus on fully addressing all parts of the task.",
            ),
            (
                "Coherence & Cohesion",
                writing_stats["avg_cc"],
                "Work on logical paragraph structure and cohesive devices.",
            ),
            (
                "Lexical Resource",
                writing_stats["avg_lr"],
                "Expand vocabulary and use synonyms appropriately.",
            ),
            (
                "Grammatical Accuracy",
                writing_stats["avg_gra"],
                "Practice complex sentence structures.",
            ),
        ]

        for name, score, tip in writing_criteria:
            if score and score < 6.0:
                all_weaknesses.append(
                    {
                        "section": "writing",
                        "weakness_type": name,
                        "current_score": round(float(score), 1),
                        "target_score": target_score,
                        "priority": "high" if score < 5.0 else "medium",
                        "attempts": writing_stats["count"],
                        "improvement_tips": [tip],
                    }
                )

    # === Analyze Speaking ===
    speaking_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        speaking_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    speaking_stats = SpeakingAttempt.objects.filter(speaking_filter).aggregate(
        avg_fc=Avg("fluency_and_coherence"),
        avg_lr=Avg("lexical_resource"),
        avg_gra=Avg("grammatical_range_and_accuracy"),
        avg_pr=Avg("pronunciation"),
        count=Count("id"),
    )

    if speaking_stats["count"] and speaking_stats["count"] >= 2:
        speaking_criteria = [
            (
                "Fluency & Coherence",
                speaking_stats["avg_fc"],
                "Practice speaking without long pauses.",
            ),
            (
                "Lexical Resource",
                speaking_stats["avg_lr"],
                "Learn topic-specific vocabulary.",
            ),
            (
                "Grammatical Accuracy",
                speaking_stats["avg_gra"],
                "Practice using varied sentence structures.",
            ),
            (
                "Pronunciation",
                speaking_stats["avg_pr"],
                "Focus on word stress and intonation.",
            ),
        ]

        for name, score, tip in speaking_criteria:
            if score and score < 6.0:
                all_weaknesses.append(
                    {
                        "section": "speaking",
                        "weakness_type": name,
                        "current_score": round(float(score), 1),
                        "target_score": target_score,
                        "priority": "high" if score < 5.0 else "medium",
                        "attempts": speaking_stats["count"],
                        "improvement_tips": [tip],
                    }
                )

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    all_weaknesses.sort(
        key=lambda x: (priority_order.get(x["priority"], 2), x["current_score"])
    )

    # Find weakest section
    section_scores = defaultdict(list)
    for w in all_weaknesses:
        section_scores[w["section"]].append(w["current_score"])

    weakest_section = None
    if section_scores:
        avg_by_section = {
            s: sum(scores) / len(scores) for s, scores in section_scores.items()
        }
        weakest_section = min(avg_by_section, key=avg_by_section.get)

    response_data = {
        "subscription_tier": tier,
        "overall_weakest_section": weakest_section,
        "weaknesses": all_weaknesses[:10],
        "priority_focus": [w["weakness_type"] for w in all_weaknesses[:3]],
        "total_areas_analyzed": len(question_stats)
        + 8,  # question types + 4 writing + 4 speaking
        "cached": False,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_TIMEOUTS["weaknesses"])
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_band_prediction_v2(request):
    """
    Get predicted band score - Ultra tier only.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    if not has_feature_access(tier, "band_prediction"):
        return Response(
            {
                "error": "Band prediction is an Ultra tier feature",
                "required_tier": "ULTRA",
                "current_tier": tier or "FREE",
                "upgrade_message": "Upgrade to Ultra to unlock AI-powered band score predictions.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    cache_key = get_cache_key(user.id, tier, "prediction")
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        cached_data["cached"] = True
        return Response(cached_data)

    # Get recent exams for trend analysis
    recent_exams = list(
        ExamAttempt.objects.filter(student=user, status="COMPLETED")
        .order_by("-completed_at")[:10]
        .values(
            "overall_score",
            "listening_score",
            "reading_score",
            "writing_score",
            "speaking_score",
            "completed_at",
        )
    )

    if len(recent_exams) < 2:
        return Response(
            {
                "error": "Need at least 2 completed exams for prediction",
                "exams_completed": len(recent_exams),
                "exams_needed": 2,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Calculate trends and predictions
    def calculate_prediction(scores: List[float]) -> Tuple[float, str]:
        if not scores or len(scores) < 2:
            return None, "stable"

        valid_scores = [s for s in scores if s is not None]
        if len(valid_scores) < 2:
            return (
                sum(valid_scores) / len(valid_scores) if valid_scores else None
            ), "stable"

        # Simple linear trend
        recent_avg = sum(valid_scores[:3]) / min(3, len(valid_scores))
        older_avg = sum(valid_scores[-3:]) / min(3, len(valid_scores))

        trend = (
            "improving"
            if recent_avg > older_avg + 0.2
            else "declining" if recent_avg < older_avg - 0.2 else "stable"
        )

        # Prediction: current average + momentum
        momentum = (recent_avg - older_avg) * 0.3
        predicted = min(9.0, max(1.0, recent_avg + momentum))

        return round(predicted, 1), trend

    sections = {
        "listening": [e["listening_score"] for e in recent_exams],
        "reading": [e["reading_score"] for e in recent_exams],
        "writing": [e["writing_score"] for e in recent_exams],
        "speaking": [e["speaking_score"] for e in recent_exams],
    }

    predictions = {}
    trends = {}

    for section, scores in sections.items():
        pred, trend = calculate_prediction(scores)
        predictions[section] = pred
        trends[section] = trend

    # Overall prediction
    valid_predictions = [p for p in predictions.values() if p is not None]
    overall_prediction = (
        round(sum(valid_predictions) / len(valid_predictions), 1)
        if valid_predictions
        else None
    )

    # Confidence based on data amount and consistency
    confidence = (
        "high"
        if len(recent_exams) >= 5
        else "medium" if len(recent_exams) >= 3 else "low"
    )

    # Target comparison
    target_band = float(user.target_score) if user.target_score else 7.0
    gap_to_target = (
        round(target_band - (overall_prediction or 0), 1)
        if overall_prediction
        else None
    )

    response_data = {
        "subscription_tier": tier,
        "predicted_overall": overall_prediction,
        "section_predictions": predictions,
        "section_trends": trends,
        "confidence": confidence,
        "target_band": target_band,
        "gap_to_target": gap_to_target,
        "exams_analyzed": len(recent_exams),
        "recommendation": _get_prediction_recommendation(
            overall_prediction, gap_to_target
        ),
        "cached": False,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_TIMEOUTS["prediction"])
    return Response(response_data)


def _get_prediction_recommendation(
    overall: Optional[float], gap: Optional[float]
) -> str:
    """Generate recommendation based on prediction."""
    if overall is None:
        return "Complete more exams to get accurate predictions."

    if gap is None or gap <= 0:
        return "Great job! You're on track to meet or exceed your target band score."
    elif gap <= 0.5:
        return "You're very close to your target! Focus on consistency and polish your weak areas."
    elif gap <= 1.0:
        return "With dedicated practice, you can reach your target. Focus on your weakest sections."
    else:
        return "Consider more intensive preparation. Regular practice in all sections will help close the gap."


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_study_plan_v2(request):
    """
    Get AI-generated study plan - Ultra tier only.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    if not has_feature_access(tier, "study_plan"):
        return Response(
            {
                "error": "Personalized study plans are an Ultra tier feature",
                "required_tier": "ULTRA",
                "current_tier": tier or "FREE",
                "upgrade_message": "Upgrade to Ultra to unlock AI-powered personalized study plans.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    cache_key = get_cache_key(user.id, tier, "study_plan")
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        cached_data["cached"] = True
        return Response(cached_data)

    # Get exam averages
    exam_stats = ExamAttempt.objects.filter(student=user, status="COMPLETED").aggregate(
        avg_listening=Avg("listening_score"),
        avg_reading=Avg("reading_score"),
        avg_writing=Avg("writing_score"),
        avg_speaking=Avg("speaking_score"),
        count=Count("id"),
    )

    if not exam_stats["count"]:
        return Response(
            {
                "error": "Complete at least one exam to get a study plan",
                "exams_needed": 1,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Sort sections by score (weakest first)
    sections = [
        ("listening", exam_stats["avg_listening"]),
        ("reading", exam_stats["avg_reading"]),
        ("writing", exam_stats["avg_writing"]),
        ("speaking", exam_stats["avg_speaking"]),
    ]
    sections.sort(key=lambda x: x[1] if x[1] else 0)

    target_band = float(user.target_score) if user.target_score else 7.0

    # Build daily plan
    daily_plan = []
    for i, (section, score) in enumerate(sections):
        score_val = float(score) if score else 0
        priority = "Focus" if i == 0 else "Practice" if i < 2 else "Maintain"
        time_minutes = 45 if i == 0 else 30 if i < 2 else 20

        daily_plan.append(
            {
                "section": section,
                "time_minutes": time_minutes,
                "priority": priority,
                "activities": _get_section_activities(section, score_val),
                "current_score": round_score(score_val),
                "target_score": target_band,
            }
        )

    # Weekly goals
    weekly_goals = [
        f"Complete 2 full {sections[0][0]} practice tests",
        f"Review {sections[0][0]} mistakes and learn from them",
        f"Practice {sections[1][0]} for 3 hours total",
        "Take 1 full mock exam",
    ]

    response_data = {
        "subscription_tier": tier,
        "daily_plan": daily_plan,
        "weekly_goals": weekly_goals,
        "total_daily_time": sum(p["time_minutes"] for p in daily_plan),
        "focus_section": sections[0][0],
        "target_band": target_band,
        "next_milestone": _get_next_milestone(sections),
        "study_tips": [
            "Consistency beats intensity - study daily even if briefly",
            "Focus on your weakest section but don't neglect others",
            "Review your mistakes - they're your best learning opportunity",
            "Practice under exam conditions regularly",
        ],
        "cached": False,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_TIMEOUTS["study_plan"])
    return Response(response_data)


def _get_section_activities(section: str, score: float) -> List[str]:
    """Get recommended activities for a section."""
    activities = {
        "listening": {
            "low": [
                "Daily dictation practice",
                "Focus on Part 1 & 2",
                "Practice note-taking",
            ],
            "medium": [
                "Timed practice tests",
                "Different accents practice",
                "Part 3 & 4 focus",
            ],
            "high": ["Weekly full tests", "Academic lectures", "Speed exercises"],
        },
        "reading": {
            "low": [
                "Build vocabulary",
                "Skimming & scanning",
                "Question type strategies",
            ],
            "medium": ["Timed passages", "T/F/NG focus", "Speed improvement"],
            "high": ["Complex texts", "Speed & accuracy", "Full tests"],
        },
        "writing": {
            "low": ["Study model essays", "Learn structures", "Task 1 basics"],
            "medium": ["Timed practice", "Coherence focus", "Get feedback"],
            "high": ["Polish grammar", "Advanced vocabulary", "Exam conditions"],
        },
        "speaking": {
            "low": ["Daily practice", "Record yourself", "Learn phrases"],
            "medium": ["Part 2 monologues", "Pronunciation work", "Topic vocabulary"],
            "high": ["Complex topics", "Natural delivery", "Fluency polish"],
        },
    }

    level = "low" if score < 5.5 else "medium" if score < 7.0 else "high"
    return activities.get(section, {}).get(level, ["Practice regularly"])


def _get_next_milestone(sections: List[Tuple[str, float]]) -> str:
    """Get the next achievable milestone."""
    weakest = sections[0][1] if sections and sections[0][1] else 0

    if weakest < 5.0:
        return "Reach band 5.0 in all sections"
    elif weakest < 5.5:
        return "Achieve band 5.5 consistency"
    elif weakest < 6.0:
        return "Break the band 6.0 barrier"
    elif weakest < 6.5:
        return "Reach band 6.5 across all sections"
    elif weakest < 7.0:
        return "Achieve band 7.0 - University ready!"
    else:
        return "Maintain excellence and aim for 7.5+"


# ============================================================================
# ACHIEVEMENTS ENDPOINT - Available to ALL users
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_achievements_v2(request):
    """
    Get user achievements and milestones - Available to ALL users.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    cache_key = get_cache_key(user.id, tier, "achievements")
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        cached_data["cached"] = True
        return Response(cached_data)

    # Fetch basic stats
    exam_stats = ExamAttempt.objects.filter(student=user, status="COMPLETED").aggregate(
        total=Count("id"),
        best_overall=Max("overall_score"),
        best_reading=Max("reading_score"),
        best_listening=Max("listening_score"),
        best_writing=Max("writing_score"),
        best_speaking=Max("speaking_score"),
    )

    practice_count = SectionPracticeAttempt.objects.filter(
        student=user, status="COMPLETED"
    ).count()

    book_stats = UserBookProgress.objects.filter(user=user).aggregate(
        completed=Count("id", filter=Q(is_completed=True)),
    )

    # Calculate achievements
    achievements = []

    # Exam milestones
    total_exams = exam_stats["total"] or 0
    if total_exams >= 1:
        achievements.append(
            {
                "id": "first_exam",
                "name": "First Steps",
                "description": "Completed your first exam",
                "unlocked": True,
            }
        )
    if total_exams >= 5:
        achievements.append(
            {
                "id": "5_exams",
                "name": "Getting Serious",
                "description": "Completed 5 exams",
                "unlocked": True,
            }
        )
    if total_exams >= 10:
        achievements.append(
            {
                "id": "10_exams",
                "name": "Dedicated Learner",
                "description": "Completed 10 exams",
                "unlocked": True,
            }
        )
    if total_exams >= 25:
        achievements.append(
            {
                "id": "25_exams",
                "name": "IELTS Warrior",
                "description": "Completed 25 exams",
                "unlocked": True,
            }
        )

    # Score milestones
    best_overall = exam_stats["best_overall"] or 0
    if best_overall >= 6.0:
        achievements.append(
            {
                "id": "band_6",
                "name": "Band 6 Achiever",
                "description": "Scored 6.0 or higher",
                "unlocked": True,
            }
        )
    if best_overall >= 7.0:
        achievements.append(
            {
                "id": "band_7",
                "name": "Band 7 Star",
                "description": "Scored 7.0 or higher",
                "unlocked": True,
            }
        )
    if best_overall >= 8.0:
        achievements.append(
            {
                "id": "band_8",
                "name": "Band 8 Elite",
                "description": "Scored 8.0 or higher",
                "unlocked": True,
            }
        )

    # Practice milestones
    if practice_count >= 10:
        achievements.append(
            {
                "id": "practice_10",
                "name": "Practice Pro",
                "description": "Completed 10 practice sessions",
                "unlocked": True,
            }
        )
    if practice_count >= 50:
        achievements.append(
            {
                "id": "practice_50",
                "name": "Practice Master",
                "description": "Completed 50 practice sessions",
                "unlocked": True,
            }
        )

    # Book milestones
    books_completed = book_stats["completed"] or 0
    if books_completed >= 1:
        achievements.append(
            {
                "id": "book_1",
                "name": "Book Worm",
                "description": "Completed your first book",
                "unlocked": True,
            }
        )
    if books_completed >= 5:
        achievements.append(
            {
                "id": "book_5",
                "name": "Library Regular",
                "description": "Completed 5 books",
                "unlocked": True,
            }
        )

    # Calculate progress to next achievements
    next_achievements = []
    if total_exams < 5:
        next_achievements.append(
            {
                "id": "5_exams",
                "name": "Getting Serious",
                "progress": total_exams,
                "target": 5,
            }
        )
    if best_overall < 6.0 and total_exams > 0:
        next_achievements.append(
            {
                "id": "band_6",
                "name": "Band 6 Achiever",
                "progress": round(best_overall, 1),
                "target": 6.0,
            }
        )
    if practice_count < 10:
        next_achievements.append(
            {
                "id": "practice_10",
                "name": "Practice Pro",
                "progress": practice_count,
                "target": 10,
            }
        )

    response_data = {
        "subscription_tier": tier,
        "achievements": achievements,
        "total_unlocked": len(achievements),
        "next_achievements": next_achievements[:3],
        "stats": {
            "total_exams": total_exams,
            "best_overall": round_score(best_overall),
            "practice_sessions": practice_count,
            "books_completed": books_completed,
        },
        "cached": False,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_TIMEOUTS["overview"])
    return Response(response_data)


# ============================================================================
# CACHE MANAGEMENT
# ============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def refresh_analytics_cache_v2(request):
    """Clear analytics cache for the current user."""
    user = request.user
    tier = get_user_subscription_tier(user)

    # Clear all analytics cache keys for this user
    endpoints = [
        "overview",
        "skills",
        "weaknesses",
        "trends",
        "prediction",
        "study_plan",
        "achievements",
        "unified_data",
    ]

    cleared = 0
    for endpoint in endpoints:
        cache_key = get_cache_key(user.id, tier, endpoint)
        if analytics_cache.delete(cache_key):
            cleared += 1

    # Also clear tier cache
    analytics_cache.delete(f"user_tier_{user.id}")

    return Response(
        {
            "success": True,
            "message": f"Cleared {cleared} cache entries",
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_analytics_cache_status_v2(request):
    """Get cache status for analytics endpoints."""
    user = request.user
    tier = get_user_subscription_tier(user)

    endpoints = [
        "overview",
        "skills",
        "weaknesses",
        "trends",
        "prediction",
        "study_plan",
        "achievements",
        "unified_data",
    ]

    cache_status = {}
    for endpoint in endpoints:
        cache_key = get_cache_key(user.id, tier, endpoint)
        cached_data = analytics_cache.get(cache_key)
        cache_status[endpoint] = {
            "cached": cached_data is not None,
            "timeout": CACHE_TIMEOUTS.get(endpoint, CACHE_TIMEOUTS.get("overview")),
        }

    return Response(
        {
            "subscription_tier": tier,
            "cache_status": cache_status,
        }
    )
