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
    band_type = (
        "academic_reading" if practice.section_type == "READING" else "listening"
    )
    band_score = calculate_band_score(
        total_score, max_possible_score, band_type, is_book=True
    )

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
                user_answer = (
                    answer_data.get("user_answer", "").strip()
                    if answer_data.get("user_answer")
                    else ""
                )
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
        "uuid": str(attempt.uuid),
        "section": {
            "uuid": str(practice.uuid),
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
        "completed_at": (
            attempt.completed_at.isoformat() if attempt.completed_at else None
        ),
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
    Get section practices filtered by type with pagination support.

    Args:
        section_type: LISTENING, READING, WRITING, SPEAKING

    Query params:
        - difficulty: EASY, MEDIUM, HARD, EXPERT
        - status: completed, uncompleted, all (default: all)
        - search: search query for title
        - is_free: true/false - filter by free/premium content
        - page: page number (default: 1)
        - page_size: items per page (default: 12)
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

    user = request.user
    practices = SectionPractice.objects.filter(
        is_active=True, section_type=section_type
    ).order_by("order", "-created_at")

    # Add difficulty filter
    difficulty = request.GET.get("difficulty")
    if difficulty:
        practices = practices.filter(difficulty=difficulty.upper())

    # Add is_free/is_premium filter
    is_free = request.GET.get("is_free")
    if is_free is not None:
        practices = practices.filter(is_free=is_free.lower() == "true")

    # Add search filter
    search = request.GET.get("search")
    if search:
        practices = practices.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    # Add status filter (completed/uncompleted)
    status_filter = request.GET.get("status", "all").lower()
    if status_filter == "completed":
        # Get practice IDs that user has completed
        completed_practice_ids = (
            SectionPracticeAttempt.objects.filter(
                student=user, practice__section_type=section_type, status="COMPLETED"
            )
            .values_list("practice_id", flat=True)
            .distinct()
        )
        practices = practices.filter(id__in=completed_practice_ids)
    elif status_filter == "uncompleted":
        # Get practice IDs that user has completed
        completed_practice_ids = (
            SectionPracticeAttempt.objects.filter(
                student=user, practice__section_type=section_type, status="COMPLETED"
            )
            .values_list("practice_id", flat=True)
            .distinct()
        )
        practices = practices.exclude(id__in=completed_practice_ids)

    # Get total count before pagination
    total_count = practices.count()

    # Pagination
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 12))
    page_size = min(page_size, 50)  # Max 50 items per page

    start = (page - 1) * page_size
    end = start + page_size
    practices = practices[start:end]

    serializer = SectionPracticeListSerializer(
        practices, many=True, context={"request": request}
    )

    # Include section stats
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

    # Calculate pagination info
    total_pages = (total_count + page_size - 1) // page_size if page_size > 0 else 1

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
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_practice_detail(request, practice_uuid):
    """
    Get detailed information about a section practice including content.

    Args:
        practice_uuid: UUID of the section practice
    """
    try:
        practice = SectionPractice.objects.get(uuid=practice_uuid, is_active=True)
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
def start_practice(request, practice_uuid):
    """
    Start a new section practice attempt.

    Args:
        practice_uuid: UUID of the section practice

    Notes:
        - Free practices don't require attempts
        - Premium practices require either:
          - Active subscription with unlimited access, OR
          - Purchased attempts for the section type
        - Resuming an existing in-progress attempt doesn't consume additional attempts
    """
    from .payment_helpers import check_practice_access, use_practice_attempt

    try:
        practice = SectionPractice.objects.get(uuid=practice_uuid, is_active=True)
    except SectionPractice.DoesNotExist:
        return Response(
            {"error": "Section practice not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check for existing in-progress attempt (resuming doesn't cost attempts)
    existing = SectionPracticeAttempt.objects.filter(
        practice=practice,
        student=request.user,
        status="IN_PROGRESS",
    ).first()

    if existing:
        # Return existing attempt - no payment check needed for resume
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

    # Check if user has access to start a new attempt
    access = check_practice_access(request.user, practice)

    if not access["has_access"]:
        return Response(
            {
                "error": "Payment required",
                "message": access["reason"],
                "requires_payment": True,
                "section_type": practice.section_type,
                "is_free": practice.is_free,
            },
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    # Use an attempt (for non-free, non-unlimited access)
    if not practice.is_free and not access.get("is_unlimited", False):
        use_result = use_practice_attempt(request.user, practice)
        if not use_result["success"]:
            return Response(
                {
                    "error": "Failed to use attempt",
                    "message": use_result.get("error", "Unknown error"),
                    "requires_payment": True,
                    "section_type": practice.section_type,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        attempts_remaining = use_result["attempts_remaining"]
    else:
        attempts_remaining = access["attempts_remaining"]

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
            "attempts_remaining": attempts_remaining,
            "is_free": practice.is_free,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_attempt(request, attempt_uuid):
    """
    Get details of a specific attempt.
    """
    try:
        attempt = SectionPracticeAttempt.objects.select_related("practice").get(
            uuid=attempt_uuid, student=request.user
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
def submit_answers(request, attempt_uuid):
    """
    Submit answers for a Reading or Listening practice.
    Uses the same scoring algorithm as books.
    """
    try:
        attempt = SectionPracticeAttempt.objects.select_related("practice").get(
            uuid=attempt_uuid, student=request.user, status="IN_PROGRESS"
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
                    round(
                        (score_data["correct_answers"] / score_data["total_questions"])
                        * 100,
                        1,
                    )
                    if score_data["total_questions"] > 0
                    else 0
                ),
                "time_spent_seconds": time_spent,
                "attempt_uuid": str(attempt.uuid),
            },
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_writing(request, attempt_uuid):
    """
    Submit writing response for AI evaluation.
    Integrates with AI writing checker for comprehensive feedback.
    """
    from ai.writing_checker import check_writing, extract_band_score

    try:
        attempt = SectionPracticeAttempt.objects.select_related(
            "practice", "practice__writing_task"
        ).get(uuid=attempt_uuid, student=request.user, status="IN_PROGRESS")
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

    # Get writing task details for proper evaluation
    writing_task = attempt.practice.writing_task
    task_type = (
        "Task 1" if writing_task and writing_task.task_type == "TASK_1" else "Task 2"
    )
    task_question = writing_task.prompt if writing_task else None

    # Calculate word count
    word_count = len(response_text.split()) if response_text else 0
    min_words = (
        writing_task.min_words
        if writing_task
        else (150 if task_type == "Task 1" else 250)
    )

    ai_result = None
    ai_error = None

    try:
        # Call AI writing checker
        ai_result = check_writing(
            essay_text=response_text,
            task_type=task_type,
            task_question=task_question,
            max_retries=2,
        )

        # Extract band score
        band_score = extract_band_score(ai_result)
        if band_score:
            attempt.score = band_score

        # Store detailed AI feedback
        attempt.ai_feedback = ai_result.get(
            "summary", "Your writing has been evaluated."
        )
        attempt.answers = {
            "response": response_text,
            "word_count": word_count,
            "ai_evaluation": {
                "inline": ai_result.get("inline", response_text),
                "sentences": ai_result.get("sentences", []),
                "corrected_essay": ai_result.get("corrected_essay", response_text),
                "band_score": ai_result.get("band_score"),
                "task_response_or_achievement": ai_result.get(
                    "task_response_or_achievement"
                ),
                "coherence_and_cohesion": ai_result.get("coherence_and_cohesion"),
                "lexical_resource": ai_result.get("lexical_resource"),
                "grammatical_range_and_accuracy": ai_result.get(
                    "grammatical_range_and_accuracy"
                ),
            },
        }

    except Exception as e:
        ai_error = str(e)
        attempt.ai_feedback = f"AI evaluation is temporarily unavailable. Your writing has been saved. Error: {ai_error}"
        attempt.answers = {
            "response": response_text,
            "word_count": word_count,
            "ai_error": ai_error,
        }

    # Mark as completed
    attempt.status = "COMPLETED"
    attempt.completed_at = timezone.now()
    attempt.save()

    response_data = {
        "message": "Writing submitted successfully",
        "attempt_uuid": str(attempt.uuid),
        "status": "evaluated" if ai_result else "submitted_for_review",
        "word_count": word_count,
        "min_words": min_words,
        "meets_word_count": word_count >= min_words,
    }

    if ai_result:
        response_data.update(
            {
                "band_score": attempt.score,
                "feedback": attempt.ai_feedback,
                "evaluation": {
                    "task_response_or_achievement": ai_result.get(
                        "task_response_or_achievement"
                    ),
                    "coherence_and_cohesion": ai_result.get("coherence_and_cohesion"),
                    "lexical_resource": ai_result.get("lexical_resource"),
                    "grammatical_range_and_accuracy": ai_result.get(
                        "grammatical_range_and_accuracy"
                    ),
                },
            }
        )
    elif ai_error:
        response_data["ai_error"] = ai_error

    return Response(response_data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_speaking_answer(request, attempt_uuid):
    """
    Submit a single speaking response (audio file) for a specific question.
    """
    import os
    import subprocess
    import tempfile
    from django.core.files.storage import default_storage
    from django.core.files.base import ContentFile

    try:
        attempt = SectionPracticeAttempt.objects.select_related("practice").get(
            uuid=attempt_uuid, student=request.user, status="IN_PROGRESS"
        )
    except SectionPracticeAttempt.DoesNotExist:
        return Response(
            {"error": "Active attempt not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if attempt.practice.section_type != "SPEAKING":
        return Response(
            {"error": "This endpoint is only for speaking practices"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    question_key = request.data.get("question_key")
    audio_file = request.FILES.get("audio_file")

    if not question_key:
        return Response(
            {"error": "question_key is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not audio_file:
        return Response(
            {"error": "audio_file is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Store the audio file
    file_ext = os.path.splitext(audio_file.name)[1].lower() or ".webm"
    file_path = f"speaking_answers/practice/{attempt.uuid}/{question_key}{file_ext}"

    saved_path = default_storage.save(file_path, ContentFile(audio_file.read()))
    file_url = default_storage.url(saved_path)

    # Convert WebM to WAV if needed for Azure Speech SDK compatibility
    if file_ext in [".webm", ".mp3", ".ogg", ".m4a"]:
        try:
            # Download to temp file
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=file_ext
            ) as temp_input:
                with default_storage.open(saved_path, "rb") as audio_obj:
                    temp_input.write(audio_obj.read())
                temp_input_path = temp_input.name

            # Convert to WAV
            temp_wav_path = temp_input_path.replace(file_ext, ".wav")
            ffmpeg_cmd = [
                "ffmpeg",
                "-i",
                temp_input_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-sample_fmt",
                "s16",
                "-y",
                temp_wav_path,
            ]
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True)

            # Save WAV file
            wav_path = file_path.replace(file_ext, ".wav")
            with open(temp_wav_path, "rb") as wav_file:
                saved_wav_path = default_storage.save(
                    wav_path, ContentFile(wav_file.read())
                )
            file_url = default_storage.url(saved_wav_path)

            # Cleanup temp files
            os.unlink(temp_input_path)
            os.unlink(temp_wav_path)

        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(f"FFmpeg conversion failed: {e}")

    # Store audio URL in attempt answers
    answers = attempt.answers or {}
    if "speaking_recordings" not in answers:
        answers["speaking_recordings"] = {}
    answers["speaking_recordings"][question_key] = {
        "file_path": saved_path,
        "file_url": file_url,
    }
    attempt.answers = answers
    attempt.save()

    return Response(
        {
            "success": True,
            "message": "Speaking answer submitted",
            "question_key": question_key,
            "file_url": file_url,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_speaking_complete(request, attempt_uuid):
    """
    Complete the speaking practice and trigger AI evaluation.
    """
    import logging

    logger = logging.getLogger(__name__)

    try:
        attempt = SectionPracticeAttempt.objects.select_related("practice").get(
            uuid=attempt_uuid, student=request.user, status="IN_PROGRESS"
        )
    except SectionPracticeAttempt.DoesNotExist:
        return Response(
            {"error": "Active attempt not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if attempt.practice.section_type != "SPEAKING":
        return Response(
            {"error": "This endpoint is only for speaking practices"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    time_spent = request.data.get("time_spent", 0)

    # Get speaking recordings
    recordings = attempt.answers.get("speaking_recordings", {})

    if not recordings:
        return Response(
            {
                "error": "No speaking recordings found. Please record your answers first."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Mark as evaluating
    attempt.status = "COMPLETED"
    attempt.completed_at = timezone.now()
    attempt.time_spent_seconds = time_spent
    attempt.ai_feedback = "Evaluating your speaking responses..."
    attempt.save()

    # Trigger async evaluation (or do it synchronously for now)
    try:
        from ai.speaking_evaluator import AzureSpeechRecognizer, GeminiSpeakingEvaluator
        from django.core.files.storage import default_storage
        import tempfile

        speech_recognizer = AzureSpeechRecognizer()
        gemini_evaluator = GeminiSpeakingEvaluator()

        # Get speaking topic info
        topic = attempt.practice.speaking_topic
        speaking_type_display = (
            topic.get_speaking_type_display() if topic else "Speaking Practice"
        )

        # Get questions
        questions = list(topic.questions.all().order_by("order")) if topic else []

        # Process each recording
        transcripts = []
        pronunciation_scores = []
        fluency_scores = []
        accuracy_scores = []
        all_mispronounced_words = []
        question_evaluations = []

        for question_key, recording_info in recordings.items():
            file_path = recording_info.get("file_path")
            if not file_path or not default_storage.exists(file_path):
                continue

            # Download to temp file for processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                with default_storage.open(file_path, "rb") as audio_obj:
                    temp_file.write(audio_obj.read())
                temp_path = temp_file.name

            try:
                # Transcribe
                transcription_result = speech_recognizer.transcribe_audio(temp_path)

                if transcription_result.get("success"):
                    transcript = transcription_result.get("transcript", "")
                    transcripts.append(transcript)
                    pronunciation_scores.append(
                        transcription_result.get("pronunciation_score", 0)
                    )
                    fluency_scores.append(transcription_result.get("fluency_score", 0))
                    accuracy_scores.append(
                        transcription_result.get("accuracy_score", 0)
                    )
                    all_mispronounced_words.extend(
                        transcription_result.get("mispronounced_words", [])
                    )

                    # Find matching question
                    question_text = ""
                    for q in questions:
                        if f"speaking_{topic.speaking_type}_q{q.order}" == question_key:
                            question_text = q.question_text
                            break

                    question_evaluations.append(
                        {
                            "question_key": question_key,
                            "question_text": question_text,
                            "transcript": transcript,
                            "pronunciation_score": transcription_result.get(
                                "pronunciation_score", 0
                            ),
                            "fluency_score": transcription_result.get(
                                "fluency_score", 0
                            ),
                            "accuracy_score": transcription_result.get(
                                "accuracy_score", 0
                            ),
                            "mispronounced_words": transcription_result.get(
                                "mispronounced_words", []
                            ),
                        }
                    )
            finally:
                import os

                os.unlink(temp_path)

        if not transcripts:
            attempt.ai_feedback = (
                "Could not transcribe any of your recordings. Please try again."
            )
            attempt.save()
            return Response(
                {
                    "success": False,
                    "message": "Transcription failed",
                    "attempt_uuid": str(attempt.uuid),
                }
            )

        # Calculate averages
        avg_pronunciation = (
            sum(pronunciation_scores) / len(pronunciation_scores)
            if pronunciation_scores
            else 0
        )
        avg_fluency = sum(fluency_scores) / len(fluency_scores) if fluency_scores else 0
        avg_accuracy = (
            sum(accuracy_scores) / len(accuracy_scores) if accuracy_scores else 0
        )

        # Combined transcript and questions
        combined_transcript = " ".join(transcripts)
        combined_questions = " | ".join([q.question_text for q in questions])

        # Get AI evaluation
        evaluation = gemini_evaluator.evaluate_speaking(
            transcript=combined_transcript,
            question=combined_questions,
            part_type=speaking_type_display,
            pronunciation_score=avg_pronunciation,
            fluency_score=avg_fluency,
            accuracy_score=avg_accuracy,
            mispronounced_words=all_mispronounced_words,
        )

        # Extract overall band score
        overall_band = evaluation.get("overall_band_score", 0)

        # Update attempt with results
        attempt.score = overall_band
        attempt.ai_feedback = evaluation.get("overall_feedback", "Evaluation complete.")
        attempt.ai_evaluation = {
            "evaluation": evaluation,
            "azure_scores": {
                "pronunciation": avg_pronunciation,
                "fluency": avg_fluency,
                "accuracy": avg_accuracy,
            },
            "transcripts": question_evaluations,
            "combined_transcript": combined_transcript,
        }
        attempt.save()

        logger.info(
            f"Speaking evaluation completed for attempt {attempt.uuid}: Band {overall_band}"
        )

        return Response(
            {
                "success": True,
                "message": "Speaking evaluation completed",
                "attempt_uuid": str(attempt.uuid),
                "score": overall_band,
                "evaluation": evaluation,
            }
        )

    except Exception as e:
        logger.error(f"Speaking evaluation failed: {e}", exc_info=True)
        attempt.ai_feedback = f"Evaluation failed: {str(e)}"
        attempt.save()
        return Response(
            {
                "success": False,
                "message": f"Evaluation failed: {str(e)}",
                "attempt_uuid": str(attempt.uuid),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_speaking_result(request, attempt_uuid):
    """
    Get the detailed speaking evaluation result.
    """
    try:
        attempt = SectionPracticeAttempt.objects.select_related("practice").get(
            uuid=attempt_uuid, student=request.user
        )
    except SectionPracticeAttempt.DoesNotExist:
        return Response(
            {"error": "Attempt not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if attempt.practice.section_type != "SPEAKING":
        return Response(
            {"error": "This endpoint is only for speaking practices"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if attempt.status != "COMPLETED":
        return Response(
            {"error": "Attempt is not completed yet"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    evaluation = attempt.ai_evaluation or {}

    return Response(
        {
            "success": True,
            "attempt_uuid": str(attempt.uuid),
            "practice_title": attempt.practice.title,
            "score": float(attempt.score) if attempt.score else None,
            "overall_feedback": attempt.ai_feedback,
            "evaluation": evaluation.get("evaluation", {}),
            "azure_scores": evaluation.get("azure_scores", {}),
            "transcripts": evaluation.get("transcripts", []),
            "time_spent_seconds": attempt.time_spent_seconds,
            "completed_at": (
                attempt.completed_at.isoformat() if attempt.completed_at else None
            ),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def abandon_attempt(request, attempt_uuid):
    """
    Abandon an in-progress attempt.
    """
    try:
        attempt = SectionPracticeAttempt.objects.get(
            uuid=attempt_uuid, student=request.user, status="IN_PROGRESS"
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
            "content": passage.content,
            "passage": passage.content,  # For compatibility
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
    completed_attempts = practice.attempts.filter(student=user, status="COMPLETED")
    attempt_count = completed_attempts.count()
    best_attempt = completed_attempts.order_by("-score").first()

    return {
        "completed": attempt_count > 0,
        "score": (
            float(best_attempt.score) if best_attempt and best_attempt.score else None
        ),
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
                    options.append(
                        {
                            "id": choice.id,
                            "key": chr(65 + i),
                            "choice_text": choice.choice_text,
                        }
                    )
            questions.append(
                {
                    "id": q.id,
                    "order": q.order,
                    "question_text": q.question_text,
                    "options": options,
                }
            )

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
            if (
                question_data
                and isinstance(question_data, dict)
                and "options" in question_data
            ):
                matching_options = question_data["options"]

        result.append(
            {
                "id": head.id,
                "title": head.title,
                "description": head.description,
                "instruction": head.description,
                "question_type": head.question_type,
                "question_data": question_data,
                "example": example,
                "matching_options": matching_options,
                "allow_duplicates": (
                    question_data.get("allow_duplicates", False)
                    if question_data
                    else False
                ),
                "select_count": (
                    question_data.get("select_count") if question_data else None
                ),
                "questions": questions,
            }
        )
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
        user_answer = str(
            answers.get(q_id, answers.get(int(q_id) if q_id.isdigit() else q_id, ""))
        ).strip()
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
    return Response(
        {
            "uuid": str(attempt.uuid),
            "section": {
                "uuid": str(practice.uuid),
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
            "accuracy_percentage": (
                round(
                    (score_data["correct_answers"] / score_data["total_questions"])
                    * 100,
                    2,
                )
                if score_data["total_questions"] > 0
                else 0
            ),
            "time_spent": time_spent,
            "is_completed": True,
            "attempt_count": practice.attempts.filter(
                student=request.user, status="COMPLETED"
            ).count(),
        }
    )


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
    attempt = (
        practice.attempts.filter(student=request.user, status="COMPLETED")
        .order_by("-completed_at")
        .first()
    )

    if not attempt:
        return Response(
            {"error": "No completed attempt found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Build detailed result (same format as books)
    result = _build_detailed_practice_result(practice, attempt)

    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_writing_result(request, attempt_uuid):
    """
    Get detailed writing practice result with AI feedback.
    Returns comprehensive evaluation including:
    - Band scores for each criterion
    - Inline corrections with error markers
    - Corrected essay
    - Sentence-by-sentence feedback
    """
    try:
        attempt = SectionPracticeAttempt.objects.select_related(
            "practice", "practice__writing_task"
        ).get(uuid=attempt_uuid, student=request.user, status="COMPLETED")
    except SectionPracticeAttempt.DoesNotExist:
        return Response(
            {"error": "Completed attempt not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if attempt.practice.section_type != "WRITING":
        return Response(
            {"error": "This endpoint is only for writing practices"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    writing_task = attempt.practice.writing_task
    answers = attempt.answers or {}
    ai_evaluation = answers.get("ai_evaluation", {})

    response_text = answers.get("response", "")
    word_count = answers.get(
        "word_count", len(response_text.split()) if response_text else 0
    )
    min_words = writing_task.min_words if writing_task else 150

    result = {
        "uuid": str(attempt.uuid),
        "practice": {
            "uuid": str(attempt.practice.uuid),
            "title": attempt.practice.title,
            "section_type": attempt.practice.section_type,
            "difficulty": attempt.practice.difficulty,
        },
        "task": {
            "task_type": writing_task.task_type if writing_task else "TASK_2",
            "prompt": writing_task.prompt if writing_task else "",
            "min_words": min_words,
            "picture": (
                writing_task.picture.url
                if writing_task and writing_task.picture
                else None
            ),
        },
        "submission": {
            "response": response_text,
            "word_count": word_count,
            "meets_word_count": word_count >= min_words,
            "time_spent_seconds": attempt.time_spent_seconds,
            "completed_at": (
                attempt.completed_at.isoformat() if attempt.completed_at else None
            ),
        },
        "evaluation": {
            "overall_band_score": float(attempt.score) if attempt.score else None,
            "band_score_text": ai_evaluation.get("band_score"),
            "criteria": {
                "task_response_or_achievement": ai_evaluation.get(
                    "task_response_or_achievement"
                ),
                "coherence_and_cohesion": ai_evaluation.get("coherence_and_cohesion"),
                "lexical_resource": ai_evaluation.get("lexical_resource"),
                "grammatical_range_and_accuracy": ai_evaluation.get(
                    "grammatical_range_and_accuracy"
                ),
            },
            "feedback_summary": attempt.ai_feedback,
            "inline_corrections": ai_evaluation.get("inline", response_text),
            "corrected_essay": ai_evaluation.get("corrected_essay", response_text),
            "sentence_feedback": ai_evaluation.get("sentences", []),
        },
        "has_ai_evaluation": bool(ai_evaluation),
        "ai_error": answers.get("ai_error"),
    }

    return Response(result)


# ============================================================================
# PRACTICE ACCESS & PAYMENT ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_practice_access_endpoint(request, practice_uuid):
    """
    Check if user can access a specific practice section.

    Args:
        practice_uuid: UUID of the section practice

    Returns:
        - has_access: bool
        - requires_payment: bool
        - attempts_remaining: int (-1 for unlimited)
        - is_free: bool
        - reason: str
    """
    from .payment_helpers import check_practice_access

    try:
        practice = SectionPractice.objects.get(uuid=practice_uuid, is_active=True)
    except SectionPractice.DoesNotExist:
        return Response(
            {"error": "Section practice not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    access = check_practice_access(request.user, practice)

    return Response(
        {
            **access,
            "practice_uuid": str(practice.uuid),
            "practice_title": practice.title,
            "section_type": practice.section_type,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_practice_attempts(request):
    """
    Get user's current attempt balances for all section types.

    Returns:
        - reading: {balance, is_unlimited}
        - listening: {balance, is_unlimited}
        - writing: {balance, is_unlimited}
        - speaking: {balance, is_unlimited}
        - has_subscription: bool
    """
    from .payment_helpers import get_user_all_attempts
    from payments.models import UserSubscription

    attempts = get_user_all_attempts(request.user)

    # Check subscription status
    has_subscription = False
    subscription_plan = None
    try:
        subscription = UserSubscription.objects.get(user=request.user)
        if subscription.is_valid() and subscription.plan:
            has_subscription = True
            subscription_plan = subscription.plan.name
    except UserSubscription.DoesNotExist:
        pass

    return Response(
        {
            **attempts,
            "has_subscription": has_subscription,
            "subscription_plan": subscription_plan,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_attempt_balance(request, section_type):
    """
    Get user's attempt balance for a specific section type.

    Args:
        section_type: READING, LISTENING, WRITING, SPEAKING

    Returns:
        - has_access: bool
        - attempts_remaining: int (-1 for unlimited)
        - is_unlimited: bool
        - reason: str
    """
    from .payment_helpers import get_user_attempt_access

    section_type = section_type.upper()
    valid_types = ["LISTENING", "READING", "WRITING", "SPEAKING"]

    if section_type not in valid_types:
        return Response(
            {
                "error": f"Invalid section type. Must be one of: {', '.join(valid_types)}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    access = get_user_attempt_access(request.user, section_type)

    return Response(
        {
            **access,
            "section_type": section_type,
        }
    )
