"""
Manager API - Books and Sections CRUD endpoints
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Prefetch

from books.models import Book, BookSection
from books.serializers import BookSerializer, BookSectionSerializer
from ielts.models import ReadingPassage, ListeningPart
from .utils import (
    check_manager_permission,
    permission_denied_response,
    paginate_queryset,
)


# ============================================================================
# BOOKS CRUD
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_books_manager(request):
    """
    Get all books with filtering and pagination (Manager view)
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    books = Book.objects.all().annotate(sections_count=Count("sections"))

    # Filters
    level = request.GET.get("level")
    is_active = request.GET.get("is_active")
    search = request.GET.get("search")

    if level:
        books = books.filter(level=level)

    if is_active is not None:
        books = books.filter(is_active=is_active.lower() == "true")

    if search:
        books = books.filter(
            Q(title__icontains=search)
            | Q(author__icontains=search)
            | Q(publisher__icontains=search)
        )

    # Sort
    sort_by = request.GET.get("sort", "-created_at")
    books = books.order_by(sort_by)

    # Paginate
    paginated = paginate_queryset(books, request, per_page=20)
    serializer = BookSerializer(paginated["results"], many=True)

    return Response({"books": serializer.data, "pagination": paginated["pagination"]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_book_manager(request, book_id):
    """
    Get a single book with all details (Manager view)
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    book = get_object_or_404(Book.objects.prefetch_related("sections"), id=book_id)

    serializer = BookSerializer(book)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_book(request):
    """
    Create a new book
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    serializer = BookSerializer(data=request.data)

    if serializer.is_valid():
        book = serializer.save()
        return Response(BookSerializer(book).data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_book(request, book_id):
    """
    Update an existing book
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    book = get_object_or_404(Book, id=book_id)

    partial = request.method == "PATCH"
    serializer = BookSerializer(book, data=request.data, partial=partial)

    if serializer.is_valid():
        book = serializer.save()

        # Update total sections count
        book.update_total_sections()

        return Response(BookSerializer(book).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_book(request, book_id):
    """
    Delete a book
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    book = get_object_or_404(Book, id=book_id)

    # Check if book has user progress
    if book.user_progress.exists():
        return Response(
            {"error": "Cannot delete book with existing user progress"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    book.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_book_status(request, book_id):
    """
    Toggle book active status
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    book = get_object_or_404(Book, id=book_id)
    book.is_active = not book.is_active
    book.save()

    return Response(
        {
            "id": book.id,
            "is_active": book.is_active,
            "message": f"Book {'activated' if book.is_active else 'deactivated'} successfully",
        }
    )


# ============================================================================
# SECTIONS CRUD
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_sections_manager(request):
    """
    Get all sections with filtering and pagination (Manager view)
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    sections = BookSection.objects.select_related(
        "book", "reading_passage", "listening_part"
    )

    # Filters
    book_id = request.GET.get("book_id")
    section_type = request.GET.get("section_type")
    search = request.GET.get("search")

    if book_id:
        sections = sections.filter(book_id=book_id)

    if section_type:
        sections = sections.filter(section_type=section_type)

    if search:
        sections = sections.filter(
            Q(title__icontains=search)
            | Q(description__icontains=search)
            | Q(book__title__icontains=search)
        )

    # Sort
    sort_by = request.GET.get("sort", "book__id,order")
    if "," in sort_by:
        sort_by = sort_by.split(",")
    sections = sections.order_by(*sort_by if isinstance(sort_by, list) else [sort_by])

    # Paginate
    paginated = paginate_queryset(sections, request, per_page=30)
    serializer = BookSectionSerializer(paginated["results"], many=True)

    return Response(
        {"sections": serializer.data, "pagination": paginated["pagination"]}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_section_manager(request, section_id):
    """
    Get a single section with all details (Manager view)
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    section = get_object_or_404(
        BookSection.objects.select_related("book", "reading_passage", "listening_part"),
        id=section_id,
    )

    serializer = BookSectionSerializer(section)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_section(request):
    """
    Create a new book section
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    data = request.data.copy()

    # Validate section type and linked content
    section_type = data.get("section_type")
    reading_passage_id = data.get("reading_passage")
    listening_part_id = data.get("listening_part")

    if section_type == "READING" and not reading_passage_id:
        return Response(
            {"error": "Reading passage is required for READING section"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if section_type == "LISTENING" and not listening_part_id:
        return Response(
            {"error": "Listening part is required for LISTENING section"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Auto-assign order if not provided
    book_id = data.get("book")
    if not data.get("order"):
        book = get_object_or_404(Book, id=book_id)
        last_section = book.sections.order_by("-order").first()
        data["order"] = (last_section.order + 1) if last_section else 1

    serializer = BookSectionSerializer(data=data)

    if serializer.is_valid():
        section = serializer.save()

        # Update total questions
        section.update_total_questions()

        # Update book's total sections
        section.book.update_total_sections()

        return Response(
            BookSectionSerializer(section).data, status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_section(request, section_id):
    """
    Update an existing section
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    section = get_object_or_404(BookSection, id=section_id)

    partial = request.method == "PATCH"
    serializer = BookSectionSerializer(section, data=request.data, partial=partial)

    if serializer.is_valid():
        section = serializer.save()

        # Update total questions
        section.update_total_questions()

        return Response(BookSectionSerializer(section).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_section(request, section_id):
    """
    Delete a section
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    section = get_object_or_404(BookSection, id=section_id)

    # Check if section has user results
    if section.user_results.exists():
        return Response(
            {"error": "Cannot delete section with existing user results"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    book = section.book
    section.delete()

    # Update book's total sections
    book.update_total_sections()

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_sections(request, book_id):
    """
    Reorder sections in a book
    Expected data: { "sections": [{ "id": 1, "order": 1 }, ...] }
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    book = get_object_or_404(Book, id=book_id)
    sections_data = request.data.get("sections", [])

    if not sections_data:
        return Response(
            {"error": "Sections array is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    # Update each section's order
    for section_data in sections_data:
        section_id = section_data.get("id")
        new_order = section_data.get("order")

        if section_id and new_order is not None:
            BookSection.objects.filter(id=section_id, book=book).update(order=new_order)

    # Return updated sections
    sections = BookSection.objects.filter(book=book).order_by("order")
    serializer = BookSectionSerializer(sections, many=True)

    return Response({"sections": serializer.data})


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_content(request):
    """
    Get available reading passages and listening parts for linking to sections
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    content_type = request.GET.get("type")  # "reading" or "listening"
    search = request.GET.get("search")

    if content_type == "reading":
        passages = ReadingPassage.objects.filter(is_authentic=False)

        if search:
            passages = passages.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )

        passages = passages.order_by("-created_at")[:50]

        data = [
            {
                "id": p.id,
                "title": p.title,
                "passage_number": p.passage_number,
                "difficulty": p.difficulty,
                "word_count": len(p.content.split()) if p.content else 0,
            }
            for p in passages
        ]

        return Response({"content": data})

    elif content_type == "listening":
        parts = ListeningPart.objects.filter(is_authentic=False)

        if search:
            parts = parts.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        parts = parts.order_by("-created_at")[:50]

        data = [
            {
                "id": p.id,
                "title": p.title,
                "part_number": p.part_number,
                "difficulty": p.difficulty,
                "duration": (
                    (float(p.duration_seconds) // 60) if p.duration_seconds else 0
                ),
            }
            for p in parts
        ]

        return Response({"content": data})

    return Response(
        {"error": "Invalid content type. Use 'reading' or 'listening'"},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_book_stats(request, book_id):
    """
    Get statistics for a book
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    book = get_object_or_404(Book, id=book_id)

    from django.db.models import Count, Avg
    from books.models import UserBookProgress

    # User engagement stats
    total_users = UserBookProgress.objects.filter(book=book).count()
    started_users = UserBookProgress.objects.filter(book=book, is_started=True).count()
    completed_users = UserBookProgress.objects.filter(
        book=book, is_completed=True
    ).count()

    # Progress stats
    avg_progress = (
        UserBookProgress.objects.filter(book=book, is_started=True).aggregate(
            Avg("percentage")
        )["percentage__avg"]
        or 0
    )

    avg_score = (
        UserBookProgress.objects.filter(book=book, is_started=True).aggregate(
            Avg("average_score")
        )["average_score__avg"]
        or 0
    )

    # Section stats
    sections = book.sections.annotate(attempts_count=Count("user_results")).values(
        "id", "title", "order", "attempts_count"
    )

    return Response(
        {
            "book": {
                "id": book.id,
                "title": book.title,
                "total_sections": book.total_sections,
            },
            "users": {
                "total": total_users,
                "started": started_users,
                "completed": completed_users,
                "completion_rate": (
                    (completed_users / started_users * 100) if started_users > 0 else 0
                ),
            },
            "progress": {
                "average_progress": round(avg_progress, 2),
                "average_score": round(avg_score, 2),
            },
            "sections": list(sections),
        }
    )
