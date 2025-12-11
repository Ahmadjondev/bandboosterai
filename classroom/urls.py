"""
BandBooster Classroom Command: URL Configuration

Routes for the Classroom module API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClassroomViewSet,
    EnrollmentViewSet,
    AssignmentBundleViewSet,
    GradingViewSet,
    StudentAssignmentViewSet,
    ContentSearchViewSet,
    JoinClassroomView,
)

app_name = "classroom"

router = DefaultRouter()
router.register(r"classrooms", ClassroomViewSet, basename="classroom")
router.register(r"enrollments", EnrollmentViewSet, basename="enrollment")
router.register(r"bundles", AssignmentBundleViewSet, basename="bundle")
router.register(r"grading", GradingViewSet, basename="grading")
router.register(r"assignments", StudentAssignmentViewSet, basename="student-assignment")
router.register(r"content", ContentSearchViewSet, basename="content-search")

urlpatterns = [
    # Router URLs
    path("", include(router.urls)),
    # Public magic link endpoint
    path("join/<str:invite_code>/", JoinClassroomView.as_view(), name="join-classroom"),
]
