from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch, Q

from .models import Book, BookSection, UserBookProgress, UserSectionResult
from .serializers import (
    BookSerializer,
    BookWithProgressSerializer,
    BookSectionSerializer,
    BookSectionDetailSerializer,
    UserBookProgressSerializer,
    UserSectionResultSerializer,
    SectionResultCreateSerializer,
)
from ielts.models import Question, TestHead
from ielts.analysis import calculate_band_score


# ============================================================================
# HELPER FUNCTIONS FOR ANSWER SCORING
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


def _calculate_section_score(section, user_answers_dict):
    """
    Calculate score for a book section using the same logic as exam scoring.

    Args:
        section: BookSection instance
        user_answers_dict: Dict mapping question_id (as string) to user_answer

    Returns:
        Dict with correct_answers, total_questions, and band_score
    """
    # Get all questions for this section
    if section.section_type == "READING" and section.reading_passage:
        questions = Question.objects.filter(
            test_head__reading=section.reading_passage
        ).select_related("test_head")
    elif section.section_type == "LISTENING" and section.listening_part:
        questions = Question.objects.filter(
            test_head__listening=section.listening_part
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
    band_type = "academic_reading" if section.section_type == "READING" else "listening"
    band_score = calculate_band_score(total_score, max_possible_score, band_type)

    return {
        "correct_answers": int(total_score),
        "total_questions": max_possible_score,
        "band_score": band_score,
    }


def _build_answer_groups(section, user_answers_dict):
    """
    Build answer groups for detailed review (similar to exam results).
    Returns list of answer groups with individual question details.
    """
    # Get questions based on section type
    if section.section_type == "READING" and section.reading_passage:
        test_heads = (
            TestHead.objects.filter(reading=section.reading_passage)
            .prefetch_related("questions")
            .order_by("id")
        )
        grouping_key = "passage"
        grouping_value = f"Reading Passage {section.reading_passage.passage_number}"
    elif section.section_type == "LISTENING" and section.listening_part:
        test_heads = (
            TestHead.objects.filter(listening=section.listening_part)
            .prefetch_related("questions")
            .order_by("id")
        )
        grouping_key = "part"
        grouping_value = f"Listening Part {section.listening_part.part_number}"
    else:
        return []

    answer_groups = []

    for test_head in test_heads:
        questions = test_head.questions.all().order_by("order")
        if not questions:
            continue

        answers = []
        for question in questions:
            user_answer = user_answers_dict.get(str(question.id), "").strip()
            correct_answer = question.get_correct_answer() or ""

            # Check correctness
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


def _build_detailed_section_result(section, result):
    """
    Build detailed section result with answer groups for review.
    """
    # Parse user answers from JSON
    user_answers = result.answers if isinstance(result.answers, dict) else {}

    # Build answer groups
    answer_groups = _build_answer_groups(section, user_answers)

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

    # Build final result structure
    return {
        "id": result.id,
        "section": {
            "id": section.id,
            "title": section.get_title(),
            "order": section.order,
        },
        "book": {
            "id": section.book.id,
            "title": section.book.title,
        },
        "score": result.score,
        "correct_answers": result.correct_answers,
        "total_questions": result.total_questions,
        "accuracy_percentage": result.accuracy_percentage,
        "time_spent": result.time_spent,
        "attempt_count": UserSectionResult.objects.filter(
            user=result.user, section=section
        ).count(),
        "band_score": result.score,  # For consistency with exam results
        "answer_groups": answer_groups,
        "accuracy_by_type": accuracy_by_type,
        "completed_at": result.completed_at,
    }


# ============================================================================
# API ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_books(request):
    """
    Get all active books with user progress (without full sections data)
    """
    level = request.GET.get("level")
    search = request.GET.get("search")
    print("Fetching books with level:", level, "and search:", search)
    books = Book.objects.filter(is_active=True)

    # Filter by level
    if level:
        books = books.filter(level=level)

    # Search by title, author, or publisher
    if search:
        books = books.filter(
            Q(title__icontains=search)
            | Q(author__icontains=search)
            | Q(publisher__icontains=search)
        )

    # Don't include full sections data for list view
    serializer = BookWithProgressSerializer(
        books, many=True, context={"request": request, "include_sections": False}
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_book_detail(request, book_id):
    """
    Get detailed information about a book with all sections and user progress
    """
    book = get_object_or_404(Book.objects.prefetch_related("sections"), id=book_id)
    print("Fetching book detail for book_id:", book_id)
    if not book.is_active:
        return Response(
            {"error": "This book is not available"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Include full sections data for detail view
    serializer = BookWithProgressSerializer(
        book, context={"request": request, "include_sections": True}
    )
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_book_sections(request, book_id):
    """
    Get all sections for a specific book with user status
    """
    book = get_object_or_404(Book, id=book_id)
    print("Fetching sections for book_id:", book_id)
    if not book.is_active:
        return Response(
            {"error": "This book is not available"},
            status=status.HTTP_404_NOT_FOUND,
        )

    sections = BookSection.objects.filter(book=book).order_by("order")
    serializer = BookSectionSerializer(
        sections, many=True, context={"request": request}
    )

    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_detail(request, section_id):
    """
    Get detailed information about a specific section including content
    """
    print("Fetching section detail for section_id:", section_id)
    section = get_object_or_404(
        BookSection.objects.select_related(
            "book", "reading_passage", "listening_part"
        ).prefetch_related(
            "reading_passage__test_heads__questions__choices",
            "listening_part__test_heads__questions__choices",
        ),
        id=section_id,
    )
    # Check if book is active
    if not section.book.is_active:
        return Response(
            {"error": "This book is not available"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check if section is locked
    if section.is_locked:
        previous_section = (
            BookSection.objects.filter(book=section.book, order__lt=section.order)
            .order_by("-order")
            .first()
        )
        if previous_section:
            previous_result = UserSectionResult.objects.filter(
                user=request.user, section=previous_section, is_completed=True
            ).exists()
            if not previous_result:
                return Response(
                    {
                        "error": "This section is locked. Complete the previous section first."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

    serializer = BookSectionDetailSerializer(section, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_progress(request):
    """
    Get all book progress for the authenticated user
    """
    progress = UserBookProgress.objects.filter(user=request.user).select_related("book")

    # Filter by status
    is_completed = request.GET.get("is_completed")
    if is_completed is not None:
        progress = progress.filter(is_completed=is_completed.lower() == "true")

    is_started = request.GET.get("is_started")
    if is_started is not None:
        progress = progress.filter(is_started=is_started.lower() == "true")

    serializer = UserBookProgressSerializer(progress, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_book_progress(request, book_id):
    """
    Get user's progress for a specific book
    """
    book = get_object_or_404(Book, id=book_id)

    # Get or create progress
    progress, created = UserBookProgress.objects.get_or_create(
        user=request.user, book=book
    )

    # Update progress if not just created
    if not created:
        progress.update_progress()

    serializer = UserBookProgressSerializer(progress)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_section_result(request, section_id):

    """
    Submit user's answers for a section and get results
    """
    section = get_object_or_404(BookSection, id=section_id)

    # Validate request data
    data = request.data.copy()
    data["section"] = section.id

    serializer = SectionResultCreateSerializer(data=data, context={"request": request})

    if serializer.is_valid():
        result = serializer.save()
        response_serializer = UserSectionResultSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_result(request, section_id):
    """
    Get user's result for a specific section with detailed answer breakdown
    """
    section = get_object_or_404(BookSection, id=section_id)

    result = UserSectionResult.objects.filter(
        user=request.user, section=section
    ).first()

    if not result:
        return Response(
            {"error": "No result found for this section"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Build detailed result with answer groups
    detailed_result = _build_detailed_section_result(section, result)

    return Response(detailed_result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_section_results(request, book_id):
    """
    Get all user's results for sections in a specific book
    """
    book = get_object_or_404(Book, id=book_id)

    results = UserSectionResult.objects.filter(
        user=request.user, section__book=book
    ).select_related("section")

    serializer = UserSectionResultSerializer(results, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_leaderboard(request):
    """
    Get leaderboard of users based on completed sections and scores
    Optional: filter by book_id
    """
    book_id = request.GET.get("book_id")

    if book_id:
        # Leaderboard for a specific book
        progress = (
            UserBookProgress.objects.filter(book_id=book_id, is_started=True)
            .select_related("user", "book")
            .order_by("-completed_sections", "-average_score")[:20]
        )
    else:
        # Global leaderboard (all books)
        from django.db.models import Sum, Avg

        progress = (
            UserBookProgress.objects.filter(is_started=True)
            .values("user__id", "user__username", "user__first_name", "user__last_name")
            .annotate(
                total_completed=Sum("completed_sections"),
                avg_score=Avg("average_score"),
            )
            .order_by("-total_completed", "-avg_score")[:20]
        )

        # Format global leaderboard
        leaderboard = []
        for i, item in enumerate(progress, 1):
            leaderboard.append(
                {
                    "rank": i,
                    "user": {
                        "id": item["user__id"],
                        "username": item["user__username"],
                        "full_name": f"{item['user__first_name'] or ''} {item['user__last_name'] or ''}".strip()
                        or item["user__username"],
                    },
                    "total_completed_sections": item["total_completed"],
                    "average_score": (
                        round(item["avg_score"], 1) if item["avg_score"] else None
                    ),
                }
            )
        return Response(leaderboard)

    # Format book-specific leaderboard
    leaderboard = []
    for i, prog in enumerate(progress, 1):
        leaderboard.append(
            {
                "rank": i,
                "user": {
                    "id": prog.user.id,
                    "username": prog.user.username,
                    "full_name": prog.user.get_full_name() or prog.user.username,
                },
                "book": {
                    "id": prog.book.id,
                    "title": prog.book.title,
                },
                "completed_sections": prog.completed_sections,
                "percentage": float(prog.percentage),
                "average_score": (
                    float(prog.average_score) if prog.average_score else None
                ),
            }
        )

    return Response(leaderboard)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_motivation_stats(request):
    """
    Get motivational statistics for the user
    """
    user = request.user

    # Get total progress
    total_books = UserBookProgress.objects.filter(user=user).count()
    completed_books = UserBookProgress.objects.filter(
        user=user, is_completed=True
    ).count()
    in_progress_books = UserBookProgress.objects.filter(
        user=user, is_started=True, is_completed=False
    ).count()

    # Get total sections completed
    total_sections_completed = UserSectionResult.objects.filter(
        user=user, is_completed=True
    ).count()

    # Get average score
    from django.db.models import Avg

    avg_score = UserSectionResult.objects.filter(
        user=user, is_completed=True
    ).aggregate(Avg("score"))["score__avg"]

    # Get current book progress
    current_book = (
        UserBookProgress.objects.filter(user=user, is_started=True, is_completed=False)
        .order_by("-last_accessed")
        .first()
    )

    motivation_message = None
    if current_book:
        remaining = current_book.book.total_sections - current_book.completed_sections
        if remaining == 1:
            motivation_message = (
                f"You're just 1 section away from completing {current_book.book.title}!"
            )
        elif remaining <= 3:
            motivation_message = f"You're {remaining} sections away from completing {current_book.book.title}! Keep going!"
        else:
            percentage = current_book.percentage
            if percentage >= 75:
                motivation_message = f"Great job! You're {percentage:.0f}% through {current_book.book.title}!"
            elif percentage >= 50:
                motivation_message = (
                    f"You're halfway through {current_book.book.title}! Don't stop now!"
                )

    return Response(
        {
            "total_books": total_books,
            "completed_books": completed_books,
            "in_progress_books": in_progress_books,
            "total_sections_completed": total_sections_completed,
            "average_score": round(avg_score, 1) if avg_score else None,
            "current_book": (
                {
                    "id": current_book.book.id,
                    "title": current_book.book.title,
                    "completed_sections": current_book.completed_sections,
                    "total_sections": current_book.book.total_sections,
                    "percentage": float(current_book.percentage),
                }
                if current_book
                else None
            ),
            "motivation_message": motivation_message,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_section_practice(request, section_id):
    """
    Start practicing a book section by creating an exam attempt
    Returns attempt_id to redirect to exam interface
    """
    from ielts.models import ExamAttempt, Exam, MockTest
    from django.utils import timezone

    section = get_object_or_404(
        BookSection.objects.select_related("book", "reading_passage", "listening_part"),
        id=section_id,
    )

    # Check if book is active
    if not section.book.is_active:
        return Response(
            {"error": "This book is not available"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check if section is locked
    if section.is_locked:
        previous_section = (
            BookSection.objects.filter(book=section.book, order__lt=section.order)
            .order_by("-order")
            .first()
        )
        if previous_section:
            previous_result = UserSectionResult.objects.filter(
                user=request.user, section=previous_section, is_completed=True
            ).exists()
            if not previous_result:
                return Response(
                    {
                        "error": "This section is locked. Complete the previous section first."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

    # Get content
    content = section.get_content()
    if not content:
        return Response(
            {"error": "This section has no associated content"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create or get a MockTest for this book section
    # We'll create a temporary MockTest or use existing one
    mock_test_name = f"{section.book.title} - Section {section.order}"
    mock_test, _ = MockTest.objects.get_or_create(
        name=mock_test_name,
        defaults={
            "exam_type": section.section_type,
            "description": f"Practice section from {section.book.title}",
            "duration_minutes": section.duration_minutes
            or (60 if section.section_type == "READING" else 30),
            "is_active": True,
        },
    )

    # Create Exam instance for this attempt
    exam = Exam.objects.create(
        name=section.get_title(),
        mock_test=mock_test,
        start_date=timezone.now(),
        end_date=timezone.now() + timezone.timedelta(days=365),  # Valid for 1 year
        is_active=True,
    )

    # Create ExamAttempt
    attempt = ExamAttempt.objects.create(
        student=request.user,
        exam=exam,
        status="NOT_STARTED",
    )

    # Mark book as started
    progress, _ = UserBookProgress.objects.get_or_create(
        user=request.user, book=section.book
    )
    if not progress.is_started:
        progress.is_started = True
        progress.started_at = timezone.now()
        progress.save()

    return Response(
        {
            "attempt_id": attempt.id,
            "section_title": section.get_title(),
            "section_type": section.section_type,
            "book_id": section.book.id,
            "book_title": section.book.title,
        },
        status=status.HTTP_201_CREATED,
    )
