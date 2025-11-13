from django.urls import path
from . import api_views

app_name = "books"

urlpatterns = [
    # Books
    path("api/books/", api_views.get_books, name="get_books"),
    path("api/books/<int:book_id>/", api_views.get_book_detail, name="get_book_detail"),
    path(
        "api/books/<int:book_id>/sections/",
        api_views.get_book_sections,
        name="get_book_sections",
    ),
    # Sections
    path(
        "api/sections/<int:section_id>/",
        api_views.get_section_detail,
        name="get_section_detail",
    ),
    path(
        "api/sections/<int:section_id>/start/",
        api_views.start_section_practice,
        name="start_section_practice",
    ),
    path(
        "api/sections/<int:section_id>/result/",
        api_views.get_section_result,
        name="get_section_result",
    ),
    path(
        "api/sections/<int:section_id>/submit/",
        api_views.submit_section_result,
        name="submit_section_result",
    ),
    # User Progress
    path(
        "api/progress/",
        api_views.get_user_progress,
        name="get_user_progress",
    ),
    path(
        "api/progress/<int:book_id>/",
        api_views.get_book_progress,
        name="get_book_progress",
    ),
    path(
        "api/books/<int:book_id>/results/",
        api_views.get_user_section_results,
        name="get_user_section_results",
    ),
    # Leaderboard & Motivation
    path(
        "api/leaderboard/",
        api_views.get_leaderboard,
        name="get_leaderboard",
    ),
    path(
        "api/motivation/",
        api_views.get_motivation_stats,
        name="get_motivation_stats",
    ),
]
