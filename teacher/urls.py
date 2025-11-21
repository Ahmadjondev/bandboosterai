from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeacherDashboardViewSet,
    TeacherExamViewSet,
    TeacherExamAttemptViewSet,
    TeacherFeedbackViewSet,
    TeacherMockExamViewSet,
)

app_name = "teacher"

router = DefaultRouter()
router.register(r"dashboard", TeacherDashboardViewSet, basename="dashboard")
router.register(r"exams", TeacherExamViewSet, basename="exam")
router.register(r"attempts", TeacherExamAttemptViewSet, basename="attempt")
router.register(r"feedback", TeacherFeedbackViewSet, basename="feedback")
router.register(r"mock-exams", TeacherMockExamViewSet, basename="mock-exam")

urlpatterns = [
    path("", include(router.urls)),
]
