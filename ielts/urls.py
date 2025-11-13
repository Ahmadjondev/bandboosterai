from django.urls import path
from . import views, api_views
from .api_views_dashboard import get_dashboard_stats

app_name = "ielts"

urlpatterns = [
    # Connection check endpoint (no authentication required)
    path("api/ping/", api_views.ping, name="api_ping"),
    # Dashboard stats
    path("api/dashboard/stats/", get_dashboard_stats, name="api_dashboard_stats"),
    # Web views for exam interface (use 'attempt' prefix to avoid conflicts)
    path("attempt/<int:attempt_id>/", views.exam_view, name="exam"),
    path("attempt/<int:attempt_id>/results/", views.results_view, name="results"),
    # API endpoints
    path("api/tests/", api_views.get_available_tests, name="api_tests"),
    path(
        "api/active-attempt/",
        api_views.check_active_attempt,
        name="api_check_active_attempt",
    ),
    path(
        "api/my-attempts/",
        api_views.get_my_attempts,
        name="api_my_attempts",
    ),
    path(
        "api/tests/<int:exam_id>/start/",
        api_views.create_exam_attempt,
        name="api_create_attempt",
    ),
    path(
        "api/attempt/<int:attempt_id>/",
        api_views.get_attempt_info,
        name="api_attempt_info",
    ),
    path(
        "api/attempt/<int:attempt_id>/section/<str:section>/",
        api_views.get_section_data,
        name="api_section_data",
    ),
    path(
        "api/attempt/<int:attempt_id>/submit-answer/",
        api_views.submit_answer,
        name="api_submit_answer",
    ),
    path(
        "api/attempt/<int:attempt_id>/submit-writing/",
        api_views.submit_writing,
        name="api_submit_writing",
    ),
    path(
        "api/attempt/<int:attempt_id>/submit-speaking/",
        api_views.submit_speaking,
        name="api_submit_speaking",
    ),
    path(
        "api/attempt/<int:attempt_id>/next-section/",
        api_views.next_section,
        name="api_next_section",
    ),
    path(
        "api/attempt/<int:attempt_id>/submit/",
        api_views.submit_test,
        name="api_submit_test",
    ),
    path(
        "api/attempt/<int:attempt_id>/results/",
        api_views.get_test_results,
        name="api_test_results",
    ),
    # AI Writing Checker endpoints
    path(
        "api/writing/check/",
        api_views.check_writing,
        name="api_check_writing",
    ),
    path(
        "api/writing/check/<int:writing_attempt_id>/",
        api_views.get_writing_check_result,
        name="api_get_writing_check_result",
    ),
]
