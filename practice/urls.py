from django.urls import path
from . import api_views

app_name = "practice"

urlpatterns = [
    # Section practice list and overview
    path("", api_views.get_section_practices, name="list_practices"),
    path(
        "overview/",
        api_views.get_section_types_overview,
        name="section_types_overview",
    ),
    # Attempt management - these paths start with 'attempt/' so they're unambiguous
    path(
        "attempt/<int:attempt_id>/",
        api_views.get_attempt,
        name="get_attempt",
    ),
    path(
        "attempt/<int:attempt_id>/submit/",
        api_views.submit_answers,
        name="submit_answers",
    ),
    path(
        "attempt/<int:attempt_id>/submit-writing/",
        api_views.submit_writing,
        name="submit_writing",
    ),
    path(
        "attempt/<int:attempt_id>/abandon/",
        api_views.abandon_attempt,
        name="abandon_attempt",
    ),
    # User progress and stats
    path(
        "user/attempts/",
        api_views.get_user_attempts,
        name="user_attempts",
    ),
    path(
        "user/stats/",
        api_views.get_user_stats,
        name="user_stats",
    ),
    path(
        "user/active-attempt/",
        api_views.get_active_attempt,
        name="active_attempt",
    ),
    # Practice detail and start - support both int ID and UUID
    path(
        "<int:practice_id>/",
        api_views.get_section_practice_detail,
        name="practice_detail",
    ),
    path(
        "<uuid:practice_uuid>/",
        api_views.get_section_practice_detail,
        name="practice_detail_uuid",
    ),
    path(
        "<int:practice_id>/start/",
        api_views.start_practice,
        name="start_practice",
    ),
    path(
        "<uuid:practice_uuid>/start/",
        api_views.start_practice,
        name="start_practice_uuid",
    ),
    # Section type listing - this is last to avoid conflicts with int paths
    path(
        "sections/<str:section_type>/",
        api_views.get_section_practices_by_type,
        name="practices_by_type",
    ),
    # Unified section endpoints (compatible with books API format)
    path(
        "unified/<uuid:practice_uuid>/",
        api_views.get_section_practice_as_section,
        name="unified_section_detail",
    ),
    path(
        "unified/<uuid:practice_uuid>/submit/",
        api_views.submit_practice_as_section,
        name="unified_section_submit",
    ),
    path(
        "unified/<uuid:practice_uuid>/result/",
        api_views.get_practice_result,
        name="unified_section_result",
    ),
]
