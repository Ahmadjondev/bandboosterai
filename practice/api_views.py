from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Max, Sum, Count, Q
from django.utils import timezone

from .models import SectionPractice, SectionPracticeAttempt
from .serializers import (
    SectionPracticeListSerializer,
    SectionPracticeDetailSerializer,
    SectionPracticeAttemptSerializer,
    SubmitAnswersSerializer,
    SubmitWritingSerializer,
    SectionStatsSerializer,
)
from ielts.models import Question, TestHead
from ielts.analysis import calculate_band_score


# ============================================================================
# HELPER FUNCTIONS FOR ANSWER SCORING (Aligned with Books System)
# ============================================================================


def _build_regular_answer_response(user_answer, correct_answer):
    """Check if user answer matches any of the correct answer options (separated by |)."""
    if not correct_answer:
        return False
    corrects = correct_answer.lower().split("|")
    for cor_answer in corrects:
        if user_answer.strip().lower() == cor_answer.strip().lower():
            return True
    return False


def _calculate_mcma_score(user_answer, correct_answer):
    """
    Calculate partial credit for MCMA questions.
    Each correct answer counts as 1 question toward the total.

    Returns: (score, max_score) tuple
    - score: number of correct answers the user got
    - max_score: total number of correct answers for this question
    """
    if not correct_answer:
        return (0, 1)

    user_set = set(user_answer.upper())
    correct_set = set(correct_answer.upper())

    # Count correct selections - each correct selection is worth 1 point
    # No penalty for incorrect selections
    correct_selections = len(user_set & correct_set)
    score = correct_selections

    max_score = len(correct_set)
    return (score, max_score)


def _check_answer_correctness(user_answer_text, question):
    """
    Check if a user's answer is correct for a given question.
    For MCMA, returns a tuple of (partial_score, max_possible_score).
    For other types, returns True/False.
    """
    if not question:
        return False

    user_answer = user_answer_text.strip()
    correct_answer = question.get_correct_answer() or ""

    if not correct_answer:
        return False

    # Check if answer is correct based on question type
    if question.test_head.question_type in [
        TestHead.QuestionType.MULTIPLE_CHOICE,
        TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS,
    ]:
        # For MCQ/MCMA, compare sorted keys
        user_sorted = "".join(sorted(user_answer.upper()))
        correct_sorted = "".join(sorted(correct_answer.upper()))

        # For MCMA, we need partial credit scoring
        if (
            question.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            return _calculate_mcma_score(user_sorted, correct_sorted)

        # For regular MCQ, all or nothing
        return user_sorted == correct_sorted
    else:
        # Case-insensitive comparison for text answers
        return _build_regular_answer_response(user_answer, correct_answer)


def _calculate_total_questions(questions_qs):
    """Calculate total question count (handling MCMA as multiple questions)."""
    total_count = 0
    for q in questions_qs:
        if (
            q.test_head.question_type
            == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
        ):
            correct_answer = q.get_correct_answer() or ""
            total_count += len(set(correct_answer)) if correct_answer else 1
        else:
            total_count += 1
    return total_count


def _calculate_practice_score(practice, user_answers_dict):
    """
    Calculate score for a section practice using the same logic as books/exam scoring.

    Args:
        practice: SectionPractice instance
        user_answers_dict: Dict mapping question_id (as string) to user_answer

    Returns:
        Dict with correct_answers, total_questions, and band_score
    """
    # Get all questions for this practice
    if practice.section_type == "READING" and practice.reading_passage:
        questions = Question.objects.filter(
            test_head__reading=practice.reading_passage
        ).select_related("test_head")
    elif practice.section_type == "LISTENING" and practice.listening_part:
        questions = Question.objects.filter(
            test_head__listening=practice.listening_part
        ).select_related("test_head")
    else:
        return {"correct_answers": 0, "total_questions": 0, "band_score": 0.0}

    # Calculate weighted score
    total_score = 0
    max_possible_score = 0

    for question in questions:
        # Get user's answer (question_id might be stored as string or int)
        user_answer = user_answers_dict.get(str(question.id), "").strip()

        if not user_answer:
            user_answer = user_answers_dict.get(question.id, "").strip()

        result = _check_answer_correctness(user_answer, question)

        if isinstance(result, tuple):
            # MCMA question - partial scoring
            score, max_score = result
            total_score += score
            max_possible_score += max_score
        else:
            # Regular question - binary scoring
            total_score += 1 if result else 0
            max_possible_score += 1

    # Calculate band score using the standard IELTS conversion
    band_type = "academic_reading" if practice.section_type == "READING" else "listening"
    band_score = calculate_band_score(total_score, max_possible_score, band_type, is_book=True)

    return {
        "correct_answers": int(total_score),
        "total_questions": max_possible_score,
        "band_score": band_score,
    }


def _build_answer_groups(practice, user_answers_dict):
    """
    Build answer groups for detailed review (similar to exam/book results).
    Returns list of answer groups with individual question details.
    """
    # Get questions based on section type
    if practice.section_type == "READING" and practice.reading_passage:
        test_heads = (
            TestHead.objects.filter(reading=practice.reading_passage)
            .prefetch_related("questions")
            .order_by("id")
        )
        grouping_key = "passage"
        grouping_value = f"Reading Passage {practice.reading_passage.passage_number}"
    elif practice.section_type == "LISTENING" and practice.listening_part:
        test_heads = (
            TestHead.objects.filter(listening=practice.listening_part)
            .prefetch_related("questions")
            .order_by("id")
        )
        grouping_key = "part"
        grouping_value = f"Listening Part {practice.listening_part.part_number}"
    else:
        return []

    answer_groups = []

    for test_head in test_heads:
        questions = test_head.questions.all().order_by("order")
        if not questions:
            continue

        answers = []
        for question in questions:
            # Handle both formats: raw string or dict with user_answer key
            answer_data = user_answers_dict.get(str(question.id), "")
            if isinstance(answer_data, dict):
                user_answer = answer_data.get("user_answer", "").strip() if answer_data.get("user_answer") else ""
                # Use stored correctness if available
                stored_is_correct = answer_data.get("is_correct")
            else:
                user_answer = str(answer_data).strip() if answer_data else ""
                stored_is_correct = None
            
            correct_answer = question.get_correct_answer() or ""

            # Check correctness (use stored value if available, otherwise recalculate)
            if stored_is_correct is not None:
                correctness_result = stored_is_correct
            else:
                correctness_result = _check_answer_correctness(user_answer, question)

            # Build answer detail
            answer_detail = {
                "question_number": question.order,
                "question_text": question.question_text or f"Question {question.order}",
                "user_answer": user_answer if user_answer else "No answer",
                "correct_answer": correct_answer,
                "is_correct": (
                    correctness_result
                    if isinstance(correctness_result, bool)
                    else correctness_result[0] == correctness_result[1]
                ),
                grouping_key: grouping_value,
                "question_type": test_head.get_question_type_display(),
            }

            # Add MCMA details if applicable
            if isinstance(correctness_result, tuple):
                score, max_score = correctness_result
                answer_detail["is_mcma"] = True
                answer_detail["mcma_score"] = f"{score}/{max_score}"
                answer_detail["is_correct"] = score == max_score

                # Build MCMA breakdown
                if correct_answer:
                    user_set = set(user_answer.upper())
                    correct_set = set(correct_answer.upper())
                    correct_selections = user_set & correct_set
                    incorrect_selections = user_set - correct_set
                    missed_selections = correct_set - user_set

                    breakdown = []
                    if correct_selections:
                        breakdown.append(
                            f"✓ Correct: {', '.join(sorted(correct_selections))}"
                        )
                    if incorrect_selections:
                        breakdown.append(
                            f"✗ Incorrect: {', '.join(sorted(incorrect_selections))}"
                        )
                    if missed_selections:
                        breakdown.append(
                            f"○ Missed: {', '.join(sorted(missed_selections))}"
                        )

                    answer_detail["mcma_breakdown"] = breakdown
            else:
                answer_detail["is_mcma"] = False

            answers.append(answer_detail)

        if answers:
            answer_groups.append(
                {
                    "id": test_head.id,
                    "title": test_head.title
                    or f"Questions {questions.first().order}-{questions.last().order}",
                    "test_head": test_head.get_question_type_display(),
                    "question_type": test_head.get_question_type_display(),
                    "answers": answers,
                }
            )

    return answer_groups


def _build_detailed_practice_result(practice, attempt):
    """
    Build detailed practice result with answer groups for review.
    Same format as books' _build_detailed_section_result.
    """
    # Parse user answers from JSON
    user_answers = attempt.answers if isinstance(attempt.answers, dict) else {}

    # Build answer groups
    answer_groups = _build_answer_groups(practice, user_answers)

    # Calculate accuracy by question type if we have answer groups
    accuracy_by_type = {}
    if answer_groups:
        from collections import defaultdict

        type_stats = defaultdict(lambda: {"correct": 0, "total": 0})

        for group in answer_groups:
            q_type = group["question_type"]
            for answer in group["answers"]:
                if answer.get("is_mcma"):
                    # MCMA partial scoring
                    if "/" in str(answer.get("mcma_score", "0/1")):
                        score_parts = answer["mcma_score"].split("/")
                        correct = int(score_parts[0])
                        total = int(score_parts[1])
                        type_stats[q_type]["correct"] += correct
                        type_stats[q_type]["total"] += total
                else:
                    # Regular question
                    type_stats[q_type]["total"] += 1
                    if answer["is_correct"]:
                        type_stats[q_type]["correct"] += 1

        # Calculate percentages
        for q_type, stats in type_stats.items():
            if stats["total"] > 0:
                accuracy_by_type[q_type] = stats["correct"] / stats["total"]

    # Build final result structure (matching books format)
    return {
        "id": attempt.id,
        "uuid": str(attempt.uuid),
        "section": {
            "id": practice.id,
            "title": practice.title,
            "order": practice.order,
        },
        "book": {
            "id": 0,  # No book for section practice
            "title": f"{practice.get_section_type_display()} Practice",
        },
        "score": float(attempt.score) if attempt.score else 0.0,
        "correct_answers": attempt.correct_answers,
        "total_questions": attempt.total_questions,
        "accuracy_percentage": attempt.accuracy_percentage,
        "time_spent": attempt.time_spent_seconds,
        "attempt_count": practice.attempts.filter(
            student=attempt.student, status="COMPLETED"
        ).count(),
        "band_score": float(attempt.score) if attempt.score else 0.0,
        "answer_groups": answer_groups,
        "accuracy_by_type": accuracy_by_type,
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
    }


# ============================================================================
# SECTION PRACTICE LIST & DETAIL
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_practices(request):
    """
    Get all active section practices with optional filtering.

    Query params:
        - section_type: LISTENING, READING, WRITING, SPEAKING
        - difficulty: EASY, MEDIUM, HARD, EXPERT
        - is_free: true/false
    """
    practices = SectionPractice.objects.filter(is_active=True)

    # Apply filters
    section_type = request.GET.get("section_type")
    if section_type:
        practices = practices.filter(section_type=section_type.upper())

    difficulty = request.GET.get("difficulty")
    if difficulty:
        practices = practices.filter(difficulty=difficulty.upper())

    is_free = request.GET.get("is_free")
    if is_free is not None:
        practices = practices.filter(is_free=is_free.lower() == "true")

    # Order by section type and display order
    practices = practices.order_by("section_type", "order", "-created_at")

    serializer = SectionPracticeListSerializer(
        practices, many=True, context={"request": request}
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_practices_by_type(request, section_type):
    """
    Get section practices filtered by type.

    Args:
        section_type: LISTENING, READING, WRITING, SPEAKING
    """
    section_type = section_type.upper()
    valid_types = ["LISTENING", "READING", "WRITING", "SPEAKING"]

    if section_type not in valid_types:
        return Response(
            {
                "error": f"Invalid section type. Must be one of: {', '.join(valid_types)}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    practices = SectionPractice.objects.filter(
        is_active=True, section_type=section_type
    ).order_by("order", "-created_at")

    # Add difficulty filter
    difficulty = request.GET.get("difficulty")
    if difficulty:
        practices = practices.filter(difficulty=difficulty.upper())

    serializer = SectionPracticeListSerializer(
        practices, many=True, context={"request": request}
    )

    # Include section stats
    user = request.user
    stats = SectionPracticeAttempt.objects.filter(
        student=user,
        practice__section_type=section_type,
        status="COMPLETED",
    ).aggregate(
        total_attempts=Count("id"),
        average_score=Avg("score"),
        best_score=Max("score"),
        total_time=Sum("time_spent_seconds"),
    )

    return Response(
        {
            "section_type": section_type,
            "practices": serializer.data,
            "stats": {
                "total_attempts": stats["total_attempts"] or 0,
                "average_score": (
                    round(stats["average_score"], 1) if stats["average_score"] else None
                ),
                "best_score": (
                    float(stats["best_score"]) if stats["best_score"] else None
                ),
                "total_time_minutes": (stats["total_time"] or 0) // 60,
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_practice_detail(request, practice_id=None, practice_uuid=None):
    """
    Get detailed information about a section practice including content.

    Args:
        practice_id: ID of the section practice (optional)
        practice_uuid: UUID of the section practice (optional)
    """
    try:
        if practice_uuid:
            practice = SectionPractice.objects.get(uuid=practice_uuid, is_active=True)
        elif practice_id:
            practice = SectionPractice.objects.get(id=practice_id, is_active=True)
        else:
            return Response(
                {"error": "Practice ID or UUID required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except SectionPractice.DoesNotExist:
        return Response(
            {"error": "Section practice not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = SectionPracticeDetailSerializer(practice, context={"request": request})
    return Response(serializer.data)


# ============================================================================
# ATTEMPT MANAGEMENT
# ============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_practice(request, practice_id=None, practice_uuid=None):
    """
    Start a new section practice attempt.

    Args:
        practice_id: ID of the section practice (optional)
        practice_uuid: UUID of the section practice (optional)
    """
    try:
        if practice_uuid:
            practice = SectionPractice.objects.get(uuid=practice_uuid, is_active=True)
        elif practice_id:
            practice = SectionPractice.objects.get(id=practice_id, is_active=True)
        else:
            return Response(
                {"error": "Practice ID or UUID required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except SectionPractice.DoesNotExist:
        return Response(
            {"error": "Section practice not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check for existing in-progress attempt
    existing = SectionPracticeAttempt.objects.filter(
        practice=practice,
        student=request.user,
        status="IN_PROGRESS",
    ).first()

    if existing:
        # Return existing attempt
        serializer = SectionPracticeAttemptSerializer(existing)
        return Response(
            {
                "message": "Resuming existing attempt",
                "attempt": serializer.data,
                "practice": SectionPracticeDetailSerializer(
                    practice, context={"request": request}
                ).data,
            }
        )

    # Create new attempt
    attempt = SectionPracticeAttempt.objects.create(
        practice=practice,
        student=request.user,
        total_questions=practice.total_questions,
    )

    serializer = SectionPracticeAttemptSerializer(attempt)
    return Response(
        {
            "message": "Practice started",
            "attempt": serializer.data,
            "practice": SectionPracticeDetailSerializer(
                practice, context={"request": request}
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_attempt(request, attempt_id):
    """
    Get details of a specific attempt.
    """
    try:
        attempt = SectionPracticeAttempt.objects.select_related("practice").get(
            id=attempt_id, student=request.user
        )
    except SectionPracticeAttempt.DoesNotExist:
        return Response(
            {"error": "Attempt not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "attempt": SectionPracticeAttemptSerializer(attempt).data,
            "practice": SectionPracticeDetailSerializer(
                attempt.practice, context={"request": request}
            ).data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_answers(request, attempt_id):
    """
    Submit answers for a Reading or Listening practice.
    Uses the same scoring algorithm as books.
    """
    try:
        attempt = SectionPracticeAttempt.objects.select_related("practice").get(
            id=attempt_id, student=request.user, status="IN_PROGRESS"
        )
    except SectionPracticeAttempt.DoesNotExist:
        return Response(
            {"error": "Active attempt not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = SubmitAnswersSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    answers = serializer.validated_data["answers"]
    time_spent = serializer.validated_data["time_spent"]
    practice = attempt.practice

    # Calculate score using the same algorithm as books
    score_data = _calculate_practice_score(practice, answers)
    
    # Build detailed results with answer groups
    detailed_results = {}
    
    # Get all questions for this practice
    if practice.section_type == "READING" and practice.reading_passage:
        questions = Question.objects.filter(
            test_head__reading=practice.reading_passage
        ).select_related("test_head")
    elif practice.section_type == "LISTENING" and practice.listening_part:
        questions = Question.objects.filter(
            test_head__listening=practice.listening_part
        ).select_related("test_head")
    else:
        questions = Question.objects.none()

    for question in questions:
        q_id = str(question.id)
        user_answer = answers.get(q_id, "").strip()
        correct_answer = question.get_correct_answer() or ""
        
        result = _check_answer_correctness(user_answer, question)
        
        if isinstance(result, tuple):
            # MCMA question
            score, max_score = result
            is_correct = score == max_score
        else:
            is_correct = result
        
        detailed_results[q_id] = {
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
        }

    # Update attempt
    attempt.answers = detailed_results
    attempt.time_spent_seconds = time_spent
    attempt.complete(
        score=score_data["band_score"],
        correct_answers=score_data["correct_answers"],
        total_questions=score_data["total_questions"],
    )

    # Build response with same format as books
    return Response(
        {
            "message": "Answers submitted successfully",
            "result": {
                "score": score_data["band_score"],
                "correct_answers": score_data["correct_answers"],
                "total_questions": score_data["total_questions"],
                "accuracy": (
                    round((score_data["correct_answers"] / score_data["total_questions"]) * 100, 1)
                    if score_data["total_questions"] > 0
                    else 0
                ),
                "time_spent_seconds": time_spent,
                "attempt_id": attempt.id,
            },
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_writing(request, attempt_id):
    """
    Submit writing response for AI evaluation.
    """
    try:
        attempt = SectionPracticeAttempt.objects.select_related("practice").get(
            id=attempt_id, student=request.user, status="IN_PROGRESS"
        )
    except SectionPracticeAttempt.DoesNotExist:
        return Response(
            {"error": "Active attempt not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if attempt.practice.section_type != "WRITING":
        return Response(
            {"error": "This endpoint is only for writing practices"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = SubmitWritingSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    response_text = serializer.validated_data["response"]
    time_spent = serializer.validated_data["time_spent"]

    # Store the response
    attempt.answers = {"response": response_text}
    attempt.time_spent_seconds = time_spent

    # AI evaluation would go here
    # For now, mark as completed without AI score
    attempt.status = "COMPLETED"
    attempt.completed_at = timezone.now()
    attempt.ai_feedback = "Your writing has been submitted for evaluation."
    attempt.save()

    return Response(
        {
            "message": "Writing submitted successfully",
            "attempt_id": attempt.id,
            "status": "submitted_for_review",
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def abandon_attempt(request, attempt_id):
    """
    Abandon an in-progress attempt.
    """
    try:
        attempt = SectionPracticeAttempt.objects.get(
            id=attempt_id, student=request.user, status="IN_PROGRESS"
        )
    except SectionPracticeAttempt.DoesNotExist:
        return Response(
            {"error": "Active attempt not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    attempt.status = "ABANDONED"
    attempt.completed_at = timezone.now()
    if attempt.started_at:
        delta = attempt.completed_at - attempt.started_at
        attempt.time_spent_seconds = int(delta.total_seconds())
    attempt.save()

    return Response({"message": "Attempt abandoned"})


# ============================================================================
# USER PROGRESS & STATS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_attempts(request):
    """
    Get all attempts by the current user.

    Query params:
        - section_type: Filter by section type
        - status: Filter by status (IN_PROGRESS, COMPLETED, ABANDONED)
        - limit: Number of results (default: 20)
    """
    attempts = SectionPracticeAttempt.objects.filter(
        student=request.user
    ).select_related("practice")

    section_type = request.GET.get("section_type")
    if section_type:
        attempts = attempts.filter(practice__section_type=section_type.upper())

    status_filter = request.GET.get("status")
    if status_filter:
        attempts = attempts.filter(status=status_filter.upper())

    limit = int(request.GET.get("limit", 20))
    attempts = attempts.order_by("-started_at")[:limit]

    serializer = SectionPracticeAttemptSerializer(attempts, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_stats(request):
    """
    Get overall statistics for the current user across all section types.
    """
    user = request.user
    stats_by_section = []

    for section_type in ["LISTENING", "READING", "WRITING", "SPEAKING"]:
        attempts = SectionPracticeAttempt.objects.filter(
            student=user,
            practice__section_type=section_type,
        )

        completed = attempts.filter(status="COMPLETED")
        aggregates = completed.aggregate(
            average_score=Avg("score"),
            best_score=Max("score"),
            total_time=Sum("time_spent_seconds"),
        )

        stats_by_section.append(
            {
                "section_type": section_type,
                "total_practices": SectionPractice.objects.filter(
                    section_type=section_type, is_active=True
                ).count(),
                "total_attempts": attempts.count(),
                "completed_attempts": completed.count(),
                "average_score": (
                    round(aggregates["average_score"], 1)
                    if aggregates["average_score"]
                    else None
                ),
                "best_score": (
                    float(aggregates["best_score"])
                    if aggregates["best_score"]
                    else None
                ),
                "total_time_spent": aggregates["total_time"] or 0,
            }
        )

    # Overall stats
    all_completed = SectionPracticeAttempt.objects.filter(
        student=user, status="COMPLETED"
    )
    overall = all_completed.aggregate(
        average_score=Avg("score"),
        total_time=Sum("time_spent_seconds"),
    )

    return Response(
        {
            "sections": stats_by_section,
            "overall": {
                "total_completed": all_completed.count(),
                "average_score": (
                    round(overall["average_score"], 1)
                    if overall["average_score"]
                    else None
                ),
                "total_time_minutes": (overall["total_time"] or 0) // 60,
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_active_attempt(request):
    """
    Check if user has any active (in-progress) attempts.
    """
    attempt = (
        SectionPracticeAttempt.objects.filter(
            student=request.user, status="IN_PROGRESS"
        )
        .select_related("practice")
        .first()
    )

    if attempt:
        return Response(
            {
                "has_active": True,
                "attempt": SectionPracticeAttemptSerializer(attempt).data,
                "practice": SectionPracticeListSerializer(
                    attempt.practice, context={"request": request}
                ).data,
            }
        )

    return Response({"has_active": False})


# ============================================================================
# SECTION TYPE OVERVIEW
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_types_overview(request):
    """
    Get an overview of all section types with counts and user progress.
    """
    user = request.user
    overview = []

    section_icons = {
        "LISTENING": "🎧",
        "READING": "📖",
        "WRITING": "✍️",
        "SPEAKING": "🎤",
    }

    section_colors = {
        "LISTENING": "blue",
        "READING": "green",
        "WRITING": "purple",
        "SPEAKING": "orange",
    }

    for section_type in ["LISTENING", "READING", "WRITING", "SPEAKING"]:
        practices = SectionPractice.objects.filter(
            section_type=section_type, is_active=True
        )
        total_practices = practices.count()
        free_practices = practices.filter(is_free=True).count()

        completed_attempts = SectionPracticeAttempt.objects.filter(
            student=user,
            practice__section_type=section_type,
            status="COMPLETED",
        )

        # Unique completed practices
        completed_practice_ids = completed_attempts.values_list(
            "practice_id", flat=True
        ).distinct()

        best_score = completed_attempts.aggregate(best=Max("score"))["best"]

        overview.append(
            {
                "section_type": section_type,
                "display_name": section_type.capitalize(),
                "icon": section_icons[section_type],
                "color": section_colors[section_type],
                "total_practices": total_practices,
                "free_practices": free_practices,
                "completed_practices": len(completed_practice_ids),
                "total_attempts": completed_attempts.count(),
                "best_score": float(best_score) if best_score else None,
                "progress_percentage": (
                    round((len(completed_practice_ids) / total_practices) * 100, 1)
                    if total_practices > 0
                    else 0
                ),
            }
        )

    return Response(overview)


# ============================================================================
# UNIFIED SECTION DATA (Compatible with Books API format)
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_practice_as_section(request, practice_uuid):
    """
    Get section practice data in the same format as BookSection.
    This allows the unified practice-session pages to work with both
    book sections and section practices.
    
    Returns data compatible with SectionDetailResponse format.
    """
    try:
        practice = SectionPractice.objects.get(uuid=practice_uuid, is_active=True)
    except SectionPractice.DoesNotExist:
        return Response(
            {"error": "Section practice not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Build response in the same format as BookSectionDetailSerializer
    response_data = {
        "id": practice.id,
        "uuid": str(practice.uuid),
        "source": "practice",  # Identify this is from section practice
        "book": {
            "id": 0,  # No book associated
            "title": f"{practice.get_section_type_display()} Practice",
        },
        "section_type": practice.section_type,
        "title": practice.title,
        "description": practice.description,
        "order": practice.order,
        "is_locked": False,  # Section practices are never locked
        "total_questions": practice.total_questions,
        "duration_minutes": practice.actual_duration,
        "difficulty": practice.difficulty,
        "difficulty_display": practice.get_difficulty_display(),
        "user_status": _get_practice_user_status(practice, request.user),
    }

    # Add content based on section type
    if practice.section_type == "READING" and practice.reading_passage:
        passage = practice.reading_passage
        response_data["reading_passage"] = {
            "id": passage.id,
            "title": passage.title,
            "passage_number": passage.passage_number,
            "content": passage.passage_text,
            "passage": passage.passage_text,  # For compatibility
            "test_heads": _serialize_test_heads(passage.test_heads.all()),
        }
    elif practice.section_type == "LISTENING" and practice.listening_part:
        part = practice.listening_part
        audio_url = None
        if part.audio_file:
            audio_url = request.build_absolute_uri(part.audio_file.url)
        response_data["listening_part"] = {
            "id": part.id,
            "title": part.title,
            "part_number": part.part_number,
            "audio_url": audio_url,
            "test_heads": _serialize_test_heads(part.test_heads.all()),
        }

    return Response(response_data)


def _get_practice_user_status(practice, user):
    """Get user's status for a section practice."""
    completed_attempts = practice.attempts.filter(
        student=user, status="COMPLETED"
    )
    attempt_count = completed_attempts.count()
    best_attempt = completed_attempts.order_by("-score").first()

    return {
        "completed": attempt_count > 0,
        "score": float(best_attempt.score) if best_attempt and best_attempt.score else None,
        "attempt_count": attempt_count,
        "is_accessible": True,  # Always accessible
    }


def _serialize_test_heads(test_heads):
    """Serialize test heads with questions, choices, and question_data."""
    import json
    
    result = []
    for head in test_heads.prefetch_related("questions__choices"):
        questions = []
        for q in head.questions.all().order_by("order"):
            options = []
            if head.question_type in ["MCQ", "MCMA"]:
                for i, choice in enumerate(q.choices.all().order_by("id")):
                    options.append({
                        "id": choice.id,
                        "key": chr(65 + i),
                        "choice_text": choice.choice_text,
                    })
            questions.append({
                "id": q.id,
                "order": q.order,
                "question_text": q.question_text,
                "options": options,
            })
        
        # Parse question_data if available
        question_data = {}
        if head.question_data:
            if isinstance(head.question_data, str):
                try:
                    question_data = json.loads(head.question_data)
                except json.JSONDecodeError:
                    question_data = {}
            else:
                question_data = head.question_data
        
        # Parse example if available
        example = None
        if head.example:
            if isinstance(head.example, str):
                try:
                    example = json.loads(head.example)
                except json.JSONDecodeError:
                    example = None
            else:
                example = head.example
        
        # Get matching options if applicable
        matching_options = []
        if head.question_type in ["MH", "MI", "MF"]:
            if question_data and isinstance(question_data, dict) and "options" in question_data:
                matching_options = question_data["options"]
        
        result.append({
            "id": head.id,
            "title": head.title,
            "description": head.description,
            "instruction": head.description,
            "question_type": head.question_type,
            "question_data": question_data,
            "example": example,
            "matching_options": matching_options,
            "allow_duplicates": question_data.get("allow_duplicates", False) if question_data else False,
            "select_count": question_data.get("select_count") if question_data else None,
            "questions": questions,
        })
    return result


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_practice_as_section(request, practice_uuid):
    """
    Submit answers for a section practice using the same format as book sections.
    This allows the unified practice-session pages to work with both
    book sections and section practices.
    """
    try:
        practice = SectionPractice.objects.get(uuid=practice_uuid, is_active=True)
    except SectionPractice.DoesNotExist:
        return Response(
            {"error": "Section practice not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Validate request data
    answers = request.data.get("answers", {})
    time_spent = request.data.get("time_spent", 0)

    if not isinstance(answers, dict):
        return Response(
            {"error": "Invalid answers format"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create or get in-progress attempt
    attempt, created = SectionPracticeAttempt.objects.get_or_create(
        practice=practice,
        student=request.user,
        status="IN_PROGRESS",
        defaults={"total_questions": practice.total_questions},
    )

    # Calculate score using the same algorithm as books
    score_data = _calculate_practice_score(practice, answers)
    
    # Build detailed results
    detailed_results = {}
    
    if practice.section_type == "READING" and practice.reading_passage:
        questions = Question.objects.filter(
            test_head__reading=practice.reading_passage
        ).select_related("test_head")
    elif practice.section_type == "LISTENING" and practice.listening_part:
        questions = Question.objects.filter(
            test_head__listening=practice.listening_part
        ).select_related("test_head")
    else:
        questions = Question.objects.none()

    for question in questions:
        q_id = str(question.id)
        user_answer = str(answers.get(q_id, answers.get(int(q_id) if q_id.isdigit() else q_id, ""))).strip()
        correct_answer = question.get_correct_answer() or ""
        
        result = _check_answer_correctness(user_answer, question)
        
        if isinstance(result, tuple):
            score, max_score = result
            is_correct = score == max_score
        else:
            is_correct = result
        
        detailed_results[q_id] = {
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
        }

    # Update attempt
    attempt.answers = detailed_results
    attempt.time_spent_seconds = time_spent
    attempt.complete(
        score=score_data["band_score"],
        correct_answers=score_data["correct_answers"],
        total_questions=score_data["total_questions"],
    )

    # Return response in the same format as book section submit
    return Response({
        "id": attempt.id,
        "uuid": str(attempt.uuid),
        "section": {
            "id": practice.id,
            "title": practice.title,
            "order": practice.order,
        },
        "book": {
            "id": 0,
            "title": f"{practice.get_section_type_display()} Practice",
        },
        "score": score_data["band_score"],
        "correct_answers": score_data["correct_answers"],
        "total_questions": score_data["total_questions"],
        "accuracy_percentage": round(
            (score_data["correct_answers"] / score_data["total_questions"]) * 100, 2
        ) if score_data["total_questions"] > 0 else 0,
        "time_spent": time_spent,
        "is_completed": True,
        "attempt_count": practice.attempts.filter(student=request.user, status="COMPLETED").count(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_practice_result(request, practice_uuid):
    """
    Get the result for a section practice in the same format as book section results.
    Uses the detailed result builder for full answer review.
    """
    try:
        practice = SectionPractice.objects.get(uuid=practice_uuid, is_active=True)
    except SectionPractice.DoesNotExist:
        return Response(
            {"error": "Section practice not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Get the latest completed attempt
    attempt = practice.attempts.filter(
        student=request.user, status="COMPLETED"
    ).order_by("-completed_at").first()

    if not attempt:
        return Response(
            {"error": "No completed attempt found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Build detailed result (same format as books)
    result = _build_detailed_practice_result(practice, attempt)
    
    return Response(result)
