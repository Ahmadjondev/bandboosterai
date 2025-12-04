"""
Comprehensive Analytics API for IELTS preparation tracking.
Provides detailed insights into user performance across all content types.

Features:
- Skill breakdown by question type
- Strengths and weaknesses identification
- Progress trends over time
- Band score prediction (Ultra tier)
- Personalized study recommendations

Subscription Tiers:
- Plus: Basic stats (30 days history)
- Pro: Full analytics (90 days history) + weakness analysis
- Ultra: Band prediction + AI study plan (all-time history)
"""

from datetime import timedelta, datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict
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
    IntegerField,
)
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
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
    analyze_reading_performance,
    analyze_listening_performance,
    identify_strengths_and_weaknesses,
    IMPROVEMENT_TIPS,
    STRENGTH_THRESHOLD,
    WEAKNESS_THRESHOLD,
)
from books.models import UserBookProgress, UserSectionResult, BookSection
from practice.models import SectionPracticeAttempt
from payments.models import UserSubscription

# Get cache - try dashboard cache first, fallback to default
try:
    analytics_cache = caches["dashboard"]
except KeyError:
    analytics_cache = caches["default"]

# Cache timeouts (in seconds)
CACHE_ANALYTICS = 3600  # 1 hour for analytics data

# Subscription tier constants
TIER_PLUS = "PLUS"
TIER_PRO = "PRO"
TIER_ULTRA = "ULTRA"

# Historical data limits by tier (in days)
HISTORY_LIMITS = {
    TIER_PLUS: 30,
    TIER_PRO: 90,
    TIER_ULTRA: None,  # Unlimited
}


def get_user_subscription_tier(user) -> Optional[str]:
    """Get user's current subscription tier."""
    try:
        subscription = UserSubscription.objects.get(user=user)
        if subscription.is_valid() and subscription.plan:
            return subscription.plan.plan_type
    except UserSubscription.DoesNotExist:
        pass
    return None


def get_history_cutoff(tier: Optional[str]) -> Optional[datetime]:
    """Get the cutoff date for historical data based on subscription tier."""
    if tier is None:
        # Free users get 7 days
        return timezone.now() - timedelta(days=7)

    days_limit = HISTORY_LIMITS.get(tier)
    if days_limit is None:
        return None  # No limit (Ultra tier)
    return timezone.now() - timedelta(days=days_limit)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_analytics_overview(request):
    """
    Get comprehensive analytics overview.
    Available to all users with tier-based data limits.
    """
    user = request.user
    tier = get_user_subscription_tier(user)
    cache_key = f"analytics_overview_{user.id}_{tier}"

    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        cached_data["cached"] = True
        return Response(cached_data)

    cutoff_date = get_history_cutoff(tier)

    # Build base query filter
    base_filter = Q(student=user, status="COMPLETED")
    if cutoff_date:
        base_filter &= Q(completed_at__gte=cutoff_date)

    # Exam statistics
    exam_stats = ExamAttempt.objects.filter(base_filter).aggregate(
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
    )

    # Practice statistics
    practice_filter = Q(student=user, status="COMPLETED")
    if cutoff_date:
        practice_filter &= Q(completed_at__gte=cutoff_date)

    practice_stats = SectionPracticeAttempt.objects.filter(practice_filter).aggregate(
        total_practices=Count("id"),
        avg_score=Avg("score"),
        total_time=Sum("time_spent_seconds"),
    )

    # Practice by section type
    practice_by_type = (
        SectionPracticeAttempt.objects.filter(practice_filter)
        .values("practice__section_type")
        .annotate(
            count=Count("id"),
            avg_score=Avg("score"),
            best_score=Max("score"),
        )
    )

    practice_sections = {
        item["practice__section_type"]: {
            "count": item["count"],
            "avg_score": round(float(item["avg_score"] or 0), 1),
            "best_score": round(float(item["best_score"] or 0), 1),
        }
        for item in practice_by_type
    }

    # Book progress
    book_filter = Q(user=user)
    book_stats = UserBookProgress.objects.filter(book_filter).aggregate(
        books_started=Count("id", filter=Q(is_started=True)),
        books_completed=Count("id", filter=Q(is_completed=True)),
        total_sections=Sum("book__total_sections"),
        completed_sections=Sum("completed_sections"),
        avg_score=Avg("average_score"),
    )

    # Calculate overall progress percentage
    total_sections = book_stats["total_sections"] or 0
    completed_sections = book_stats["completed_sections"] or 0
    book_progress_pct = (
        (completed_sections / total_sections * 100) if total_sections > 0 else 0
    )

    # Calculate days active and streak
    active_dates = set()

    # From exam attempts
    exam_dates = (
        ExamAttempt.objects.filter(base_filter)
        .values_list("completed_at__date", flat=True)
        .distinct()
    )
    active_dates.update(d for d in exam_dates if d)

    # From practice attempts
    practice_dates = (
        SectionPracticeAttempt.objects.filter(practice_filter)
        .values_list("completed_at__date", flat=True)
        .distinct()
    )
    active_dates.update(d for d in practice_dates if d)

    days_active = len(active_dates)

    # Calculate streak (consecutive days ending today)
    streak_days = 0
    if active_dates:
        today = timezone.now().date()
        current_date = today
        sorted_dates = sorted(active_dates, reverse=True)
        for date in sorted_dates:
            if date == current_date:
                streak_days += 1
                current_date -= timedelta(days=1)
            elif date < current_date:
                break

    # Determine user level based on overall average
    overall_avg = float(exam_stats["avg_overall"] or 0)
    if overall_avg >= 8.0:
        current_level = "Expert"
    elif overall_avg >= 7.0:
        current_level = "Advanced"
    elif overall_avg >= 6.0:
        current_level = "Intermediate"
    elif overall_avg >= 5.0:
        current_level = "Pre-Intermediate"
    elif overall_avg > 0:
        current_level = "Beginner"
    else:
        current_level = "Not Started"

    # Get user's target band (default 7.0)
    target_band = getattr(user, "target_band", 7.0) or 7.0

    # Determine tier limits based on subscription
    has_weakness_analysis = tier in [TIER_PRO, TIER_ULTRA]
    has_band_prediction = tier == TIER_ULTRA
    has_ai_study_plan = tier == TIER_ULTRA
    history_days = HISTORY_LIMITS.get(tier, 7) if tier else 7

    # Format for frontend (matching AnalyticsOverview interface)
    response_data = {
        "total_attempts": exam_stats["total_exams"] or 0,
        "total_practice_sessions": practice_stats["total_practices"] or 0,
        "total_books_completed": book_stats["books_completed"] or 0,
        "overall_average": round(overall_avg, 1) if overall_avg > 0 else None,
        "current_level": current_level,
        "target_band": target_band,
        "days_active": days_active,
        "streak_days": streak_days,
        "section_averages": {
            "reading": (
                round(float(exam_stats["avg_reading"] or 0), 1)
                if exam_stats["avg_reading"]
                else None
            ),
            "listening": (
                round(float(exam_stats["avg_listening"] or 0), 1)
                if exam_stats["avg_listening"]
                else None
            ),
            "writing": (
                round(float(exam_stats["avg_writing"] or 0), 1)
                if exam_stats["avg_writing"]
                else None
            ),
            "speaking": (
                round(float(exam_stats["avg_speaking"] or 0), 1)
                if exam_stats["avg_speaking"]
                else None
            ),
        },
        "subscription_tier": tier,
        "tier_limits": {
            "has_weakness_analysis": has_weakness_analysis,
            "has_band_prediction": has_band_prediction,
            "has_ai_study_plan": has_ai_study_plan,
            "history_days": history_days if history_days else "unlimited",
        },
        # Keep additional data for reference
        "best_scores": {
            "overall": (
                round(float(exam_stats["best_overall"] or 0), 1)
                if exam_stats["best_overall"]
                else None
            ),
            "reading": (
                round(float(exam_stats["best_reading"] or 0), 1)
                if exam_stats["best_reading"]
                else None
            ),
            "listening": (
                round(float(exam_stats["best_listening"] or 0), 1)
                if exam_stats["best_listening"]
                else None
            ),
            "writing": (
                round(float(exam_stats["best_writing"] or 0), 1)
                if exam_stats["best_writing"]
                else None
            ),
            "speaking": (
                round(float(exam_stats["best_speaking"] or 0), 1)
                if exam_stats["best_speaking"]
                else None
            ),
        },
        "books": {
            "started": book_stats["books_started"] or 0,
            "completed": book_stats["books_completed"] or 0,
            "progress_percentage": round(book_progress_pct, 1),
        },
        "cached": False,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_ANALYTICS)
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_skill_breakdown(request):
    """
    Get detailed skill breakdown by question type.
    Pro and Ultra tiers only.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    # Check subscription tier
    if tier not in [TIER_PRO, TIER_ULTRA]:
        return Response(
            {
                "error": "This feature requires Pro or Ultra subscription",
                "required_tier": "PRO",
                "current_tier": tier or "FREE",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    cache_key = f"analytics_skills_{user.id}_{tier}"
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    cutoff_date = get_history_cutoff(tier)

    # Get all user answers from completed exams
    answer_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        answer_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    # Aggregate by question type
    question_type_stats = defaultdict(lambda: {"correct": 0, "total": 0, "section": ""})

    user_answers = UserAnswer.objects.filter(answer_filter).select_related(
        "question__test_head"
    )

    for answer in user_answers:
        question = answer.question
        if not question or not question.test_head:
            continue

        q_type = question.test_head.get_question_type_display()
        correct_answer = question.get_correct_answer() or ""
        user_answer = answer.answer_text or ""

        # Determine section
        if question.test_head.reading:
            section = "Reading"
        elif question.test_head.listening:
            section = "Listening"
        else:
            section = "Unknown"

        key = f"{section}_{q_type}"
        question_type_stats[key]["section"] = section
        question_type_stats[key]["type"] = q_type

        # Check correctness
        if (
            question.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            # MCMA scoring
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

    # Calculate accuracy and categorize
    skills = []
    for key, stats in question_type_stats.items():
        if stats["total"] == 0:
            continue

        accuracy = stats["correct"] / stats["total"]
        skills.append(
            {
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
                "tip": (
                    IMPROVEMENT_TIPS.get(stats["type"], IMPROVEMENT_TIPS["default"])
                    if accuracy <= WEAKNESS_THRESHOLD
                    else None
                ),
            }
        )

    # Sort by accuracy (weakest first)
    skills.sort(key=lambda x: x["accuracy"])

    # Get practice section stats too
    practice_filter = Q(student=user, status="COMPLETED")
    if cutoff_date:
        practice_filter &= Q(completed_at__gte=cutoff_date)

    practice_by_type = (
        SectionPracticeAttempt.objects.filter(practice_filter)
        .values("practice__section_type")
        .annotate(
            total=Count("id"),
            avg_score=Avg("score"),
            best_score=Max("score"),
        )
    )

    practice_skills = []
    for item in practice_by_type:
        section_type = item["practice__section_type"]
        avg = item["avg_score"] or 0
        practice_skills.append(
            {
                "section": section_type,
                "question_type": f"{section_type} Practice",
                "total": item["total"],
                "avg_score": round(float(avg), 1),
                "accuracy": (
                    round(float(avg) / 9 * 100, 1) if avg else 0
                ),  # Convert band to percentage
            }
        )

    # Get Writing scores from WritingAttempt
    writing_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        writing_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    writing_attempts = WritingAttempt.objects.filter(writing_filter)
    writing_data = None
    if writing_attempts.exists():
        writing_stats = writing_attempts.aggregate(
            avg_overall=Avg("band_score"),
            avg_task1=Avg("band_score", filter=Q(task__task_type="TASK_1")),
            avg_task2=Avg("band_score", filter=Q(task__task_type="TASK_2")),
            avg_ta=Avg("task_response_or_achievement"),
            avg_cc=Avg("coherence_and_cohesion"),
            avg_lr=Avg("lexical_resource"),
            avg_gra=Avg("grammatical_range_and_accuracy"),
        )

        writing_data = {
            "overall_score": (
                round(float(writing_stats["avg_overall"] or 0), 1)
                if writing_stats["avg_overall"]
                else None
            ),
            "task_scores": {
                "task1": (
                    round(float(writing_stats["avg_task1"] or 0), 1)
                    if writing_stats["avg_task1"]
                    else None
                ),
                "task2": (
                    round(float(writing_stats["avg_task2"] or 0), 1)
                    if writing_stats["avg_task2"]
                    else None
                ),
            },
            "criteria_breakdown": {
                "task_achievement": (
                    round(float(writing_stats["avg_ta"] or 0), 1)
                    if writing_stats["avg_ta"]
                    else 0
                ),
                "coherence_cohesion": (
                    round(float(writing_stats["avg_cc"] or 0), 1)
                    if writing_stats["avg_cc"]
                    else 0
                ),
                "lexical_resource": (
                    round(float(writing_stats["avg_lr"] or 0), 1)
                    if writing_stats["avg_lr"]
                    else 0
                ),
                "grammatical_accuracy": (
                    round(float(writing_stats["avg_gra"] or 0), 1)
                    if writing_stats["avg_gra"]
                    else 0
                ),
            },
            "improvement_areas": [],
        }

        # Identify writing improvement areas
        criteria = writing_data["criteria_breakdown"]
        if criteria["task_achievement"] < 6.0:
            writing_data["improvement_areas"].append("Task Achievement")
        if criteria["coherence_cohesion"] < 6.0:
            writing_data["improvement_areas"].append("Coherence & Cohesion")
        if criteria["lexical_resource"] < 6.0:
            writing_data["improvement_areas"].append("Lexical Resource")
        if criteria["grammatical_accuracy"] < 6.0:
            writing_data["improvement_areas"].append("Grammar Accuracy")

    # Get Speaking scores from SpeakingAttempt
    speaking_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        speaking_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    speaking_attempts = SpeakingAttempt.objects.filter(speaking_filter)
    speaking_data = None
    if speaking_attempts.exists():
        speaking_stats = speaking_attempts.aggregate(
            avg_overall=Avg("band_score"),
            avg_fc=Avg("fluency_and_coherence"),
            avg_lr=Avg("lexical_resource"),
            avg_gra=Avg("grammatical_range_and_accuracy"),
            avg_pr=Avg("pronunciation"),
        )

        speaking_data = {
            "overall_score": (
                round(float(speaking_stats["avg_overall"] or 0), 1)
                if speaking_stats["avg_overall"]
                else None
            ),
            "part_scores": {
                "part1": None,  # Speaking parts are stored in JSON, not separate records
                "part2": None,
                "part3": None,
            },
            "criteria_breakdown": {
                "fluency_coherence": (
                    round(float(speaking_stats["avg_fc"] or 0), 1)
                    if speaking_stats["avg_fc"]
                    else 0
                ),
                "lexical_resource": (
                    round(float(speaking_stats["avg_lr"] or 0), 1)
                    if speaking_stats["avg_lr"]
                    else 0
                ),
                "grammatical_accuracy": (
                    round(float(speaking_stats["avg_gra"] or 0), 1)
                    if speaking_stats["avg_gra"]
                    else 0
                ),
                "pronunciation": (
                    round(float(speaking_stats["avg_pr"] or 0), 1)
                    if speaking_stats["avg_pr"]
                    else 0
                ),
            },
            "improvement_areas": [],
        }

        # Identify speaking improvement areas
        criteria = speaking_data["criteria_breakdown"]
        if criteria["fluency_coherence"] < 6.0:
            speaking_data["improvement_areas"].append("Fluency & Coherence")
        if criteria["lexical_resource"] < 6.0:
            speaking_data["improvement_areas"].append("Lexical Resource")
        if criteria["grammatical_accuracy"] < 6.0:
            speaking_data["improvement_areas"].append("Grammar Accuracy")
        if criteria["pronunciation"] < 6.0:
            speaking_data["improvement_areas"].append("Pronunciation")

    # Organize reading and listening skills by question type
    reading_skills = [s for s in skills if s["section"] == "Reading"]
    listening_skills = [s for s in skills if s["section"] == "Listening"]

    def build_section_data(section_skills, section_name):
        if not section_skills:
            return None

        total_correct = sum(s["correct"] for s in section_skills)
        total_questions = sum(s["total"] for s in section_skills)
        overall_accuracy = total_correct / total_questions if total_questions > 0 else 0

        question_types = {}
        for s in section_skills:
            q_type = s["question_type"]
            question_types[q_type] = {
                "accuracy": s["accuracy"] / 100,  # Convert percentage to decimal
                "attempts": s["total"],
                "trend": "stable",  # TODO: calculate actual trend
            }

        strengths = [
            s["question_type"] for s in section_skills if s["category"] == "strength"
        ]
        weaknesses = [
            s["question_type"] for s in section_skills if s["category"] == "weakness"
        ]

        return {
            "overall_accuracy": round(overall_accuracy, 2),
            "question_types": question_types,
            "strengths": strengths[:3],  # Top 3
            "weaknesses": weaknesses[:3],  # Top 3
        }

    reading_data = build_section_data(reading_skills, "Reading")
    listening_data = build_section_data(listening_skills, "Listening")

    # Format for frontend (matching AnalyticsSkillBreakdown interface)
    response_data = {
        "subscription_tier": tier,
        "reading": reading_data,
        "listening": listening_data,
        "writing": writing_data,
        "speaking": speaking_data,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_ANALYTICS)
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_weakness_analysis(request):
    """
    Get detailed weakness analysis with improvement recommendations.
    Pro and Ultra tiers only.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    if tier not in [TIER_PRO, TIER_ULTRA]:
        return Response(
            {
                "error": "This feature requires Pro or Ultra subscription",
                "required_tier": "PRO",
                "current_tier": tier or "FREE",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    cache_key = f"analytics_weakness_{user.id}_{tier}"
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    cutoff_date = get_history_cutoff(tier)

    # Analyze exam performance
    answer_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        answer_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    # Build analysis data
    reading_questions = []
    listening_questions = []
    user_answers_map = {}

    user_answers = UserAnswer.objects.filter(answer_filter).select_related(
        "question__test_head",
        "question__test_head__reading",
        "question__test_head__listening",
    )

    for answer in user_answers:
        question = answer.question
        if not question or not question.test_head:
            continue

        user_answers_map[question.id] = answer.answer_text or ""

        if question.test_head.reading:
            reading_questions.append(question)
        elif question.test_head.listening:
            listening_questions.append(question)

    # Perform analysis
    analysis_results = []

    if reading_questions:
        reading_analysis = analyze_reading_performance(
            reading_questions, user_answers_map
        )
        reading_analysis["section_name"] = "Reading"
        analysis_results.append(reading_analysis)

    if listening_questions:
        listening_analysis = analyze_listening_performance(
            listening_questions, user_answers_map
        )
        listening_analysis["section_name"] = "Listening"
        analysis_results.append(listening_analysis)

    # Identify strengths and weaknesses
    sw_analysis = identify_strengths_and_weaknesses(analysis_results)

    # Analyze writing performance
    writing_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        writing_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    writing_stats = WritingAttempt.objects.filter(writing_filter).aggregate(
        avg_task_achievement=Avg("task_response_or_achievement"),
        avg_coherence=Avg("coherence_and_cohesion"),
        avg_lexical=Avg("lexical_resource"),
        avg_grammar=Avg("grammatical_range_and_accuracy"),
        total=Count("id"),
    )

    writing_weaknesses = []
    if writing_stats["total"]:
        criteria = [
            ("Task Achievement", writing_stats["avg_task_achievement"]),
            ("Coherence & Cohesion", writing_stats["avg_coherence"]),
            ("Lexical Resource", writing_stats["avg_lexical"]),
            ("Grammatical Range & Accuracy", writing_stats["avg_grammar"]),
        ]
        for name, score in criteria:
            if score and score < 6.0:
                writing_weaknesses.append(
                    {
                        "area": f"Writing - {name}",
                        "score": round(float(score), 1),
                        "tip": get_writing_tip(name),
                    }
                )

    # Analyze speaking performance
    speaking_filter = Q(exam_attempt__student=user, exam_attempt__status="COMPLETED")
    if cutoff_date:
        speaking_filter &= Q(exam_attempt__completed_at__gte=cutoff_date)

    speaking_stats = SpeakingAttempt.objects.filter(speaking_filter).aggregate(
        avg_fluency=Avg("fluency_and_coherence"),
        avg_lexical=Avg("lexical_resource"),
        avg_grammar=Avg("grammatical_range_and_accuracy"),
        avg_pronunciation=Avg("pronunciation"),
        total=Count("id"),
    )

    speaking_weaknesses = []
    if speaking_stats["total"]:
        criteria = [
            ("Fluency & Coherence", speaking_stats["avg_fluency"]),
            ("Lexical Resource", speaking_stats["avg_lexical"]),
            ("Grammatical Range & Accuracy", speaking_stats["avg_grammar"]),
            ("Pronunciation", speaking_stats["avg_pronunciation"]),
        ]
        for name, score in criteria:
            if score and score < 6.0:
                speaking_weaknesses.append(
                    {
                        "area": f"Speaking - {name}",
                        "score": round(float(score), 1),
                        "tip": get_speaking_tip(name),
                    }
                )

    # Calculate overall section scores to determine weakest section
    section_scores = []

    # Get reading/listening from sw_analysis
    for result in analysis_results:
        section_name = result.get("section_name", "Unknown")
        total_correct = sum(
            stats.get("correct", 0)
            for stats in result.get("question_type_stats", {}).values()
        )
        total_questions = sum(
            stats.get("total", 0)
            for stats in result.get("question_type_stats", {}).values()
        )
        accuracy = total_correct / total_questions if total_questions > 0 else None
        section_scores.append((section_name.lower(), accuracy))

    # Get writing average score
    if writing_stats["total"]:
        writing_avg = (
            sum(
                float(v or 0)
                for k, v in writing_stats.items()
                if k.startswith("avg_") and v is not None
            )
            / 4
        )  # 4 criteria
        section_scores.append(
            ("writing", writing_avg / 9 if writing_avg else None)
        )  # Normalize to 0-1

    # Get speaking average score
    if speaking_stats["total"]:
        speaking_avg = (
            sum(
                float(v or 0)
                for k, v in speaking_stats.items()
                if k.startswith("avg_") and v is not None
            )
            / 4
        )  # 4 criteria
        section_scores.append(
            ("speaking", speaking_avg / 9 if speaking_avg else None)
        )  # Normalize to 0-1

    # Sort sections by score (lowest first) to find weakest
    sections = sorted(
        [(name, score) for name, score in section_scores if score is not None],
        key=lambda x: x[1],
    )

    response_data = {
        "subscription_tier": tier,
        "overall_weakest_section": (
            sections[0][0].capitalize() if sections and sections[0][1] else None
        ),
        "weaknesses": [],
        "priority_focus": [],
        "message": None,
    }

    # Build weaknesses list in correct format
    all_weaknesses = []

    # Add reading/listening weaknesses from sw_analysis
    for weakness in sw_analysis.get("weaknesses", []):
        accuracy_str = weakness.get("accuracy", "0%")
        # Parse accuracy percentage
        try:
            accuracy_val = float(accuracy_str.replace("%", "")) / 100
        except:
            accuracy_val = 0.5

        all_weaknesses.append(
            {
                "section": (
                    weakness.get("area", "").split(" - ")[0].lower()
                    if " - " in weakness.get("area", "")
                    else "reading"
                ),
                "weakness_type": (
                    weakness.get("area", "Unknown").split(" - ")[-1]
                    if " - " in weakness.get("area", "")
                    else weakness.get("area", "Unknown")
                ),
                "current_score": round(
                    accuracy_val * 9, 1
                ),  # Convert to band-like score
                "target_score": 7.0,
                "priority": (
                    "high"
                    if accuracy_val < 0.3
                    else "medium" if accuracy_val < 0.5 else "low"
                ),
                "improvement_tips": (
                    [weakness.get("tip", "Practice more")]
                    if weakness.get("tip")
                    else ["Practice more exercises of this type"]
                ),
            }
        )

    # Add writing weaknesses
    for weakness in writing_weaknesses:
        all_weaknesses.append(
            {
                "section": "writing",
                "weakness_type": weakness["area"].replace("Writing - ", ""),
                "current_score": weakness["score"],
                "target_score": 7.0,
                "priority": "high" if weakness["score"] < 5.0 else "medium",
                "improvement_tips": [weakness["tip"]],
            }
        )

    # Add speaking weaknesses
    for weakness in speaking_weaknesses:
        all_weaknesses.append(
            {
                "section": "speaking",
                "weakness_type": weakness["area"].replace("Speaking - ", ""),
                "current_score": weakness["score"],
                "target_score": 7.0,
                "priority": "high" if weakness["score"] < 5.0 else "medium",
                "improvement_tips": [weakness["tip"]],
            }
        )

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    all_weaknesses.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))

    response_data["weaknesses"] = all_weaknesses[:10]  # Top 10 weaknesses
    response_data["priority_focus"] = [
        w["weakness_type"] for w in all_weaknesses[:3]
    ]  # Top 3 focus areas

    analytics_cache.set(cache_key, response_data, timeout=CACHE_ANALYTICS)
    return Response(response_data)


def get_writing_tip(criteria: str) -> str:
    """Get improvement tip for writing criteria."""
    tips = {
        "Task Achievement": "Focus on fully addressing all parts of the task. Make sure your position is clear and well-supported with relevant examples.",
        "Coherence & Cohesion": "Work on logical paragraph structure. Use cohesive devices (however, furthermore, etc.) appropriately. Ensure ideas flow naturally.",
        "Lexical Resource": "Expand your vocabulary by learning topic-specific words. Practice using synonyms and avoid repetition. Use collocations correctly.",
        "Grammatical Range & Accuracy": "Practice complex sentence structures. Review common grammar errors. Focus on subject-verb agreement and tense consistency.",
    }
    return tips.get(criteria, "Practice more writing tasks and review model answers.")


def get_speaking_tip(criteria: str) -> str:
    """Get improvement tip for speaking criteria."""
    tips = {
        "Fluency & Coherence": "Practice speaking without long pauses. Organize your ideas before speaking. Use discourse markers to connect ideas.",
        "Lexical Resource": "Learn topic-specific vocabulary. Practice paraphrasing. Use idiomatic expressions naturally.",
        "Grammatical Range & Accuracy": "Practice using a variety of sentence structures. Focus on accuracy in common tenses. Self-correct when you notice errors.",
        "Pronunciation": "Practice word stress and sentence intonation. Focus on difficult sounds. Listen to native speakers and mimic their pronunciation.",
    }
    return tips.get(
        criteria,
        "Practice speaking regularly and record yourself to identify areas for improvement.",
    )


def get_priority_improvements(
    sw_analysis: Dict, writing_weaknesses: List, speaking_weaknesses: List
) -> List[Dict]:
    """Get prioritized list of improvements."""
    priorities = []

    # Add reading/listening weaknesses
    for weakness in sw_analysis.get("weaknesses", []):
        priorities.append(
            {
                "area": weakness["area"],
                "accuracy": weakness.get("accuracy"),
                "tip": weakness.get("tip"),
                "priority": (
                    "high"
                    if "0%" in weakness.get("accuracy", "")
                    or "10%" in weakness.get("accuracy", "")
                    else "medium"
                ),
            }
        )

    # Add writing weaknesses
    for weakness in writing_weaknesses:
        priorities.append(
            {
                "area": weakness["area"],
                "score": weakness["score"],
                "tip": weakness["tip"],
                "priority": "high" if weakness["score"] < 5.0 else "medium",
            }
        )

    # Add speaking weaknesses
    for weakness in speaking_weaknesses:
        priorities.append(
            {
                "area": weakness["area"],
                "score": weakness["score"],
                "tip": weakness["tip"],
                "priority": "high" if weakness["score"] < 5.0 else "medium",
            }
        )

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    priorities.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))

    return priorities[:10]  # Return top 10 priorities


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_progress_trends(request):
    """
    Get progress trends over time.
    Available to all tiers with different history lengths.
    """
    user = request.user
    tier = get_user_subscription_tier(user)
    cache_key = f"analytics_trends_{user.id}_{tier}"

    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    cutoff_date = get_history_cutoff(tier)

    # Weekly progress for exams
    exam_filter = Q(student=user, status="COMPLETED")
    if cutoff_date:
        exam_filter &= Q(completed_at__gte=cutoff_date)

    weekly_exams = (
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

    # Weekly progress for practice
    practice_filter = Q(student=user, status="COMPLETED")
    if cutoff_date:
        practice_filter &= Q(completed_at__gte=cutoff_date)

    weekly_practice = (
        SectionPracticeAttempt.objects.filter(practice_filter)
        .annotate(week=TruncWeek("completed_at"))
        .values("week")
        .annotate(
            count=Count("id"),
            avg_score=Avg("score"),
        )
        .order_by("week")
    )

    # Format trends for frontend (matching AnalyticsProgressTrend interface)
    trends = []
    for item in weekly_exams:
        trends.append(
            {
                "date": item["week"].isoformat() if item["week"] else None,
                "reading": (
                    round(float(item["avg_reading"] or 0), 1)
                    if item["avg_reading"]
                    else None
                ),
                "listening": (
                    round(float(item["avg_listening"] or 0), 1)
                    if item["avg_listening"]
                    else None
                ),
                "writing": (
                    round(float(item["avg_writing"] or 0), 1)
                    if item["avg_writing"]
                    else None
                ),
                "speaking": (
                    round(float(item["avg_speaking"] or 0), 1)
                    if item["avg_speaking"]
                    else None
                ),
                "overall": (
                    round(float(item["avg_overall"] or 0), 1)
                    if item["avg_overall"]
                    else None
                ),
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

    # Determine time period string
    history_days = HISTORY_LIMITS.get(tier, 7) if tier else 7
    if history_days is None:
        time_period = "All time"
    elif history_days >= 90:
        time_period = "Last 90 days"
    elif history_days >= 30:
        time_period = "Last 30 days"
    else:
        time_period = f"Last {history_days} days"

    response_data = {
        "subscription_tier": tier,
        "time_period": time_period,
        "trends": trends,
        "improvement_rate": improvement_rate,
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_ANALYTICS)
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_band_prediction(request):
    """
    Get predicted band score based on recent performance.
    Ultra tier only.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    if tier != TIER_ULTRA:
        return Response(
            {
                "error": "Band prediction is an Ultra tier feature",
                "required_tier": "ULTRA",
                "current_tier": tier or "FREE",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    cache_key = f"analytics_prediction_{user.id}"
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    # Get recent exam scores (last 5 exams for trend)
    recent_exams = list(
        ExamAttempt.objects.filter(student=user, status="COMPLETED").order_by(
            "-completed_at"
        )[:5]
    )

    if len(recent_exams) < 2:
        return Response(
            {
                "error": "Need at least 2 completed exams for prediction",
                "exams_completed": len(recent_exams),
                "exams_needed": 2,
            }
        )

    # Calculate weighted average (more recent = more weight)
    weights = [0.35, 0.25, 0.20, 0.12, 0.08]  # Most recent gets highest weight

    section_predictions = {
        "listening": [],
        "reading": [],
        "writing": [],
        "speaking": [],
    }

    for i, exam in enumerate(recent_exams):
        weight = weights[i] if i < len(weights) else 0.05
        if exam.listening_score:
            section_predictions["listening"].append((exam.listening_score, weight))
        if exam.reading_score:
            section_predictions["reading"].append((exam.reading_score, weight))
        if exam.writing_score:
            section_predictions["writing"].append((exam.writing_score, weight))
        if exam.speaking_score:
            section_predictions["speaking"].append((exam.speaking_score, weight))

    # Calculate weighted predictions
    predictions = {}
    for section, scores_weights in section_predictions.items():
        if scores_weights:
            total_weight = sum(w for _, w in scores_weights)
            if total_weight > 0:
                weighted_sum = sum(s * w for s, w in scores_weights)
                predictions[section] = (
                    round(weighted_sum / total_weight * 2) / 2
                )  # Round to nearest 0.5

    # Calculate overall prediction
    valid_predictions = [v for v in predictions.values() if v]
    if valid_predictions:
        overall_prediction = sum(valid_predictions) / len(valid_predictions)
        overall_prediction = round(overall_prediction * 2) / 2
    else:
        overall_prediction = None

    # Calculate trend (improving/declining/stable)
    if len(recent_exams) >= 2:
        recent_avg = recent_exams[0].overall_score or 0
        older_avg = recent_exams[-1].overall_score or 0
        if recent_avg > older_avg + 0.25:
            trend = "improving"
        elif recent_avg < older_avg - 0.25:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    # Confidence level based on data quantity
    data_points = len(recent_exams)
    if data_points >= 5:
        confidence = "high"
    elif data_points >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    # Get current average scores
    all_exams = ExamAttempt.objects.filter(student=user, status="COMPLETED")
    current_stats = all_exams.aggregate(
        avg_overall=Avg("overall_score"),
        avg_reading=Avg("reading_score"),
        avg_listening=Avg("listening_score"),
        avg_writing=Avg("writing_score"),
        avg_speaking=Avg("speaking_score"),
    )

    current_overall = (
        round(float(current_stats["avg_overall"] or 0), 1)
        if current_stats["avg_overall"]
        else None
    )

    # Estimate time to goal (very rough estimate)
    target_band = getattr(user, "target_band", 7.0) or 7.0
    if current_overall and overall_prediction:
        if overall_prediction >= target_band:
            time_to_goal = "You're on track to meet your target!"
        elif overall_prediction >= target_band - 0.5:
            time_to_goal = "2-4 weeks with consistent practice"
        else:
            time_to_goal = "1-3 months with focused study"
    else:
        time_to_goal = "Complete more tests for accurate estimate"

    # Format for frontend (matching AnalyticsBandPrediction interface)
    response_data = {
        "subscription_tier": tier,
        "current_estimated_band": current_overall,
        "predicted_band": overall_prediction,
        "confidence_level": confidence,
        "section_predictions": {
            "reading": {
                "current": (
                    round(float(current_stats["avg_reading"] or 0), 1)
                    if current_stats["avg_reading"]
                    else None
                ),
                "predicted": predictions.get("reading"),
            },
            "listening": {
                "current": (
                    round(float(current_stats["avg_listening"] or 0), 1)
                    if current_stats["avg_listening"]
                    else None
                ),
                "predicted": predictions.get("listening"),
            },
            "writing": {
                "current": (
                    round(float(current_stats["avg_writing"] or 0), 1)
                    if current_stats["avg_writing"]
                    else None
                ),
                "predicted": predictions.get("writing"),
            },
            "speaking": {
                "current": (
                    round(float(current_stats["avg_speaking"] or 0), 1)
                    if current_stats["avg_speaking"]
                    else None
                ),
                "predicted": predictions.get("speaking"),
            },
        },
        "time_to_goal": time_to_goal,
        "recommendation": get_band_recommendation(overall_prediction, predictions),
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_ANALYTICS)
    return Response(response_data)


def get_band_recommendation(
    overall: Optional[float], sections: Dict[str, float]
) -> str:
    """Generate personalized recommendation based on predictions."""
    if not overall:
        return "Complete more practice tests to receive personalized recommendations."

    weakest_section = (
        min(sections.items(), key=lambda x: x[1] if x[1] else 10) if sections else None
    )

    if overall >= 7.5:
        return f"Excellent progress! Focus on maintaining consistency. Your {'strongest area is ' + max(sections.items(), key=lambda x: x[1])[0] if sections else 'skills are well-balanced'}."
    elif overall >= 6.5:
        return f"Good progress! To reach Band 7+, focus on improving your {weakest_section[0] if weakest_section else 'weakest areas'} which is currently at {weakest_section[1] if weakest_section else 'N/A'}."
    elif overall >= 5.5:
        return f"You're making progress! Prioritize {weakest_section[0] if weakest_section else 'your weakest sections'} and aim for consistent daily practice."
    else:
        return "Focus on building foundational skills. Start with vocabulary, grammar basics, and timed practice tests."


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_study_plan(request):
    """
    Get AI-generated personalized study plan.
    Ultra tier only.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    if tier != TIER_ULTRA:
        return Response(
            {
                "error": "Personalized study plans are an Ultra tier feature",
                "required_tier": "ULTRA",
                "current_tier": tier or "FREE",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    cache_key = f"analytics_studyplan_{user.id}"
    cached_data = analytics_cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    # Get user's weakness analysis
    cutoff_date = get_history_cutoff(tier)

    # Get exam scores
    exam_filter = Q(student=user, status="COMPLETED")
    if cutoff_date:
        exam_filter &= Q(completed_at__gte=cutoff_date)

    exam_stats = ExamAttempt.objects.filter(exam_filter).aggregate(
        avg_listening=Avg("listening_score"),
        avg_reading=Avg("reading_score"),
        avg_writing=Avg("writing_score"),
        avg_speaking=Avg("speaking_score"),
        count=Count("id"),
    )

    # Build study plan based on weaknesses
    sections = [
        ("listening", exam_stats["avg_listening"]),
        ("reading", exam_stats["avg_reading"]),
        ("writing", exam_stats["avg_writing"]),
        ("speaking", exam_stats["avg_speaking"]),
    ]

    # Sort by score (weakest first)
    sections.sort(key=lambda x: x[1] if x[1] else 0)

    daily_plan = []
    weekly_goals = []

    for i, (section, score) in enumerate(sections):
        if score is None:
            time_allocation = 25  # Default 25% for untested sections
            priority = "medium"
        elif score < 5.5:
            time_allocation = 35 if i == 0 else 25
            priority = "high"
        elif score < 6.5:
            time_allocation = 25 if i < 2 else 20
            priority = "medium"
        else:
            time_allocation = 15
            priority = "low"

        daily_plan.append(
            {
                "section": section.capitalize(),
                "time_allocation_percent": time_allocation,
                "current_score": round(float(score), 1) if score else None,
                "priority": priority,
                "activities": get_section_activities(section, score),
            }
        )

        weekly_goals.append(
            {
                "section": section.capitalize(),
                "goal": get_weekly_goal(section, score),
            }
        )

    # Normalize time allocations to 100%
    total_allocation = sum(p["time_allocation_percent"] for p in daily_plan)
    if total_allocation > 0:
        for plan in daily_plan:
            plan["time_allocation_percent"] = round(
                plan["time_allocation_percent"] / total_allocation * 100
            )

    # Build weekly plan (7 days) matching StudyPlanDay interface
    days_of_week = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    weekly_plan = []

    for i, day in enumerate(days_of_week):
        # Rotate focus section through the days
        focus_idx = i % len(daily_plan)
        focus_section_data = daily_plan[focus_idx]

        weekly_plan.append(
            {
                "day": day,
                "focus_section": focus_section_data["section"].lower(),
                "activities": focus_section_data["activities"][:3],
                "duration_minutes": int(
                    focus_section_data["time_allocation_percent"] * 1.2
                ),  # ~120 min total
                "goal": f"Improve {focus_section_data['section']} skills",
            }
        )

    # Calculate total weekly hours
    total_weekly_minutes = sum(d["duration_minutes"] for d in weekly_plan)
    total_weekly_hours = round(total_weekly_minutes / 60, 1)

    # Priority sections (weakest 2)
    priority_sections = (
        [sections[0][0], sections[1][0]]
        if len(sections) >= 2
        else [s[0] for s in sections]
    )

    # Format for frontend (matching AnalyticsStudyPlan interface)
    response_data = {
        "subscription_tier": tier,
        "plan_type": "personalized",
        "weekly_plan": weekly_plan,
        "priority_sections": priority_sections,
        "total_weekly_hours": total_weekly_hours,
        "next_milestone": get_next_milestone(sections),
    }

    analytics_cache.set(cache_key, response_data, timeout=CACHE_ANALYTICS)
    return Response(response_data)


def get_section_activities(section: str, score: Optional[float]) -> List[str]:
    """Get recommended activities for a section based on score."""
    activities = {
        "listening": {
            "low": [
                "Daily dictation practice",
                "Listen to IELTS podcasts",
                "Practice note-taking",
                "Focus on Part 1 & 2 first",
            ],
            "medium": [
                "Timed practice tests",
                "Work on Part 3 & 4",
                "Practice with different accents",
                "Improve spelling accuracy",
            ],
            "high": [
                "Maintain with weekly tests",
                "Challenge with academic lectures",
                "Fine-tune concentration techniques",
            ],
        },
        "reading": {
            "low": [
                "Build vocabulary daily",
                "Practice skimming & scanning",
                "Start with easier passages",
                "Learn question type strategies",
            ],
            "medium": [
                "Timed passage practice",
                "Focus on T/F/NG questions",
                "Improve reading speed",
                "Practice matching questions",
            ],
            "high": [
                "Maintain with timed tests",
                "Practice complex academic texts",
                "Work on speed and accuracy",
            ],
        },
        "writing": {
            "low": [
                "Study model essays",
                "Learn essay structures",
                "Build topic vocabulary",
                "Practice Task 1 descriptions",
            ],
            "medium": [
                "Timed essay practice",
                "Focus on coherence",
                "Expand vocabulary",
                "Get feedback on essays",
            ],
            "high": [
                "Polish grammar accuracy",
                "Work on sophisticated vocabulary",
                "Practice under exam conditions",
            ],
        },
        "speaking": {
            "low": [
                "Daily speaking practice",
                "Record and review yourself",
                "Build fluency with simple topics",
                "Learn useful phrases",
            ],
            "medium": [
                "Practice Part 2 monologues",
                "Work on pronunciation",
                "Expand topic vocabulary",
                "Practice with timer",
            ],
            "high": [
                "Refine pronunciation",
                "Practice complex topics",
                "Work on natural delivery",
            ],
        },
    }

    level = "low" if not score or score < 5.5 else "medium" if score < 7.0 else "high"
    return activities.get(section, {}).get(level, ["Practice regularly"])


def get_weekly_goal(section: str, score: Optional[float]) -> str:
    """Get weekly goal for a section."""
    if not score:
        return f"Complete 3 {section} practice tests to establish baseline"
    elif score < 5.5:
        return f"Improve {section} by 0.5 band through focused daily practice"
    elif score < 6.5:
        return f"Consolidate {section} skills and target consistent 6.5+"
    else:
        return f"Maintain {section} excellence with weekly practice"


def get_next_milestone(sections: List[tuple]) -> str:
    """Get the next achievable milestone."""
    weakest_score = sections[0][1] if sections and sections[0][1] else None

    if not weakest_score:
        return "Complete your first full practice test"
    elif weakest_score < 5.0:
        return f"Reach Band 5.0 in {sections[0][0].capitalize()}"
    elif weakest_score < 5.5:
        return f"Reach Band 5.5 in {sections[0][0].capitalize()}"
    elif weakest_score < 6.0:
        return f"Reach Band 6.0 in {sections[0][0].capitalize()}"
    elif weakest_score < 6.5:
        return f"Reach Band 6.5 in all sections"
    elif weakest_score < 7.0:
        return f"Reach Band 7.0 in all sections"
    else:
        return "Maintain Band 7+ across all sections"


# ============================================================================
# CACHE MANAGEMENT ENDPOINTS
# ============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def refresh_analytics_cache(request):
    """
    Manually trigger analytics cache refresh.
    Returns immediately, cache refresh happens asynchronously.
    """
    from .tasks import refresh_user_analytics_after_completion

    user = request.user

    try:
        refresh_user_analytics_after_completion.delay(user.id, "manual")
        return Response(
            {
                "status": "scheduled",
                "message": "Analytics refresh has been scheduled. New data will be available shortly.",
            }
        )
    except Exception as e:
        return Response(
            {
                "status": "error",
                "message": f"Failed to schedule analytics refresh: {str(e)}",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_analytics_cache_status(request):
    """
    Get analytics cache status for the current user.
    Shows which data is cached and when it was last updated.
    """
    user = request.user
    tier = get_user_subscription_tier(user)

    cache_keys = {
        "overview": f"analytics_overview_{user.id}_{tier}",
        "skills": f"analytics_skills_{user.id}_{tier}",
        "weakness": f"analytics_weakness_{user.id}_{tier}",
        "trends": f"analytics_trends_{user.id}_{tier}",
        "prediction": f"analytics_prediction_{user.id}",
        "studyplan": f"analytics_studyplan_{user.id}",
    }

    cache_status = {}
    for key_name, cache_key in cache_keys.items():
        cached_data = analytics_cache.get(cache_key)
        if cached_data:
            cache_status[key_name] = {
                "cached": True,
                "precomputed_at": cached_data.get("precomputed_at", "unknown"),
            }
        else:
            cache_status[key_name] = {
                "cached": False,
            }

    return Response(
        {
            "user_id": user.id,
            "subscription_tier": tier,
            "cache_status": cache_status,
            "cache_ttl_seconds": CACHE_ANALYTICS,
        }
    )
