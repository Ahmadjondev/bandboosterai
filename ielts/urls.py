from django.urls import path
from . import views, api_views
from .api_views_dashboard import get_dashboard_stats, clear_dashboard_cache
from .api_views_dashboard_v2 import (
    get_dashboard_overview,
    get_section_scores,
    get_books_progress,
    get_recent_activity,
    get_weekly_progress,
    get_achievements,
    clear_all_dashboard_cache,
)
from .api_views_analytics import (
    get_analytics_overview,
    get_skill_breakdown,
    get_weakness_analysis,
    get_progress_trends,
    get_band_prediction,
    get_study_plan,
    refresh_analytics_cache,
    get_analytics_cache_status,
)
from .api_views_analytics_v2 import (
    get_analytics_overview_v2,
    get_skill_breakdown_v2,
    get_weakness_analysis_v2,
    get_progress_trends_v2,
    get_band_prediction_v2,
    get_study_plan_v2,
    get_achievements_v2,
    refresh_analytics_cache_v2,
    get_analytics_cache_status_v2,
)

app_name = "ielts"

urlpatterns = [
    # Connection check endpoint (no authentication required)
    path("api/ping/", api_views.ping, name="api_ping"),
    # Dashboard stats (legacy)
    path("api/dashboard/stats/", get_dashboard_stats, name="api_dashboard_stats"),
    path(
        "api/dashboard/clear-cache/",
        clear_dashboard_cache,
        name="api_clear_dashboard_cache",
    ),
    # Dashboard v2 - Optimized parallel endpoints
    path(
        "api/dashboard/v2/overview/",
        get_dashboard_overview,
        name="api_dashboard_overview_v2",
    ),
    path(
        "api/dashboard/v2/sections/",
        get_section_scores,
        name="api_dashboard_sections_v2",
    ),
    path("api/dashboard/v2/books/", get_books_progress, name="api_dashboard_books_v2"),
    path(
        "api/dashboard/v2/activity/",
        get_recent_activity,
        name="api_dashboard_activity_v2",
    ),
    path(
        "api/dashboard/v2/weekly/", get_weekly_progress, name="api_dashboard_weekly_v2"
    ),
    path(
        "api/dashboard/v2/achievements/",
        get_achievements,
        name="api_dashboard_achievements_v2",
    ),
    path(
        "api/dashboard/v2/clear-cache/",
        clear_all_dashboard_cache,
        name="api_clear_dashboard_cache_v2",
    ),
    # Web views for exam interface (use 'attempt' prefix to avoid conflicts)
    # Support both UUID and integer ID for public-facing URLs
    path("attempt/<str:attempt_id>/", views.exam_view, name="exam"),
    path("attempt/<str:attempt_id>/results/", views.results_view, name="results"),
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
        "api/tests/<str:exam_identifier>/start/",
        api_views.create_exam_attempt,
        name="api_create_attempt",
    ),
    # Attempt endpoints - support both UUID and integer ID
    path(
        "api/attempt/<str:attempt_id>/",
        api_views.get_attempt_info,
        name="api_attempt_info",
    ),
    path(
        "api/attempt/<str:attempt_id>/section/<str:section>/",
        api_views.get_section_data,
        name="api_section_data",
    ),
    path(
        "api/attempt/<str:attempt_id>/submit-answer/",
        api_views.submit_answer,
        name="api_submit_answer",
    ),
    path(
        "api/attempt/<str:attempt_id>/submit-writing/",
        api_views.submit_writing,
        name="api_submit_writing",
    ),
    path(
        "api/attempt/<str:attempt_id>/submit-speaking/",
        api_views.submit_speaking,
        name="api_submit_speaking",
    ),
    path(
        "api/attempt/<str:attempt_id>/next-section/",
        api_views.next_section,
        name="api_next_section",
    ),
    path(
        "api/attempt/<str:attempt_id>/submit/",
        api_views.submit_test,
        name="api_submit_test",
    ),
    path(
        "api/attempt/<str:attempt_id>/results/",
        api_views.get_test_results,
        name="api_test_results",
    ),
    # Speaking default audios
    path(
        "api/speaking/default-audios/",
        api_views.get_speaking_default_audios,
        name="api_speaking_default_audios",
    ),
    # AI Writing Checker endpoints
    path(
        "api/writing/check/",
        api_views.check_writing,
        name="api_check_writing",
    ),
    path(
        "api/writing/check/<str:writing_attempt_id>/",
        api_views.get_writing_check_result,
        name="api_get_writing_check_result",
    ),
    # Analytics API endpoints
    path(
        "api/analytics/overview/",
        get_analytics_overview,
        name="api_analytics_overview",
    ),
    path(
        "api/analytics/skills/",
        get_skill_breakdown,
        name="api_analytics_skills",
    ),
    path(
        "api/analytics/weaknesses/",
        get_weakness_analysis,
        name="api_analytics_weaknesses",
    ),
    path(
        "api/analytics/progress/",
        get_progress_trends,
        name="api_analytics_progress",
    ),
    path(
        "api/analytics/band-prediction/",
        get_band_prediction,
        name="api_analytics_band_prediction",
    ),
    path(
        "api/analytics/study-plan/",
        get_study_plan,
        name="api_analytics_study_plan",
    ),
    # Cache management endpoints
    path(
        "api/analytics/refresh/",
        refresh_analytics_cache,
        name="api_analytics_refresh",
    ),
    path(
        "api/analytics/cache-status/",
        get_analytics_cache_status,
        name="api_analytics_cache_status",
    ),
    # Analytics API v2 - Optimized with better caching and free tier support
    path(
        "api/analytics/v2/overview/",
        get_analytics_overview_v2,
        name="api_analytics_overview_v2",
    ),
    path(
        "api/analytics/v2/skills/",
        get_skill_breakdown_v2,
        name="api_analytics_skills_v2",
    ),
    path(
        "api/analytics/v2/weaknesses/",
        get_weakness_analysis_v2,
        name="api_analytics_weaknesses_v2",
    ),
    path(
        "api/analytics/v2/progress/",
        get_progress_trends_v2,
        name="api_analytics_progress_v2",
    ),
    path(
        "api/analytics/v2/band-prediction/",
        get_band_prediction_v2,
        name="api_analytics_band_prediction_v2",
    ),
    path(
        "api/analytics/v2/study-plan/",
        get_study_plan_v2,
        name="api_analytics_study_plan_v2",
    ),
    path(
        "api/analytics/v2/achievements/",
        get_achievements_v2,
        name="api_analytics_achievements_v2",
    ),
    path(
        "api/analytics/v2/refresh/",
        refresh_analytics_cache_v2,
        name="api_analytics_refresh_v2",
    ),
    path(
        "api/analytics/v2/cache-status/",
        get_analytics_cache_status_v2,
        name="api_analytics_cache_status_v2",
    ),
]
