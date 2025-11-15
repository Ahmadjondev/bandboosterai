from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponseForbidden
from django.utils import timezone
from django.db.models import Q, Avg, Count
from django.views.decorators.http import require_http_methods
from django.contrib import messages
import json
import uuid as uuid_module

from .models import (
    MockExam,
    ReadingPassage,
    ListeningPart,
    TestHead,
    Question,
    Choice,
    WritingTask,
    SpeakingTopic,
    ExamAttempt,
    WritingAttempt,
    SpeakingAttempt,
    UserAnswer,
    Exam,
)


def get_attempt_by_uuid_or_id(attempt_id):
    """Get ExamAttempt by UUID or integer ID."""
    try:
        # Try UUID first
        uuid_obj = uuid_module.UUID(str(attempt_id))
        return get_object_or_404(
            ExamAttempt.objects.select_related("exam", "student"), uuid=uuid_obj
        )
    except (ValueError, AttributeError):
        # Fall back to integer ID
        try:
            int_id = int(attempt_id)
            return get_object_or_404(
                ExamAttempt.objects.select_related("exam", "student"), id=int_id
            )
        except (ValueError, TypeError):
            from django.http import Http404

            raise Http404("Exam attempt not found")


@login_required
def exam_view(request, attempt_id):
    """Display the exam interface for a specific attempt."""
    attempt = get_attempt_by_uuid_or_id(attempt_id)

    # Verify ownership
    if attempt.student != request.user:
        return HttpResponseForbidden("You do not have permission to access this exam.")

    # Start the exam if not started
    if attempt.status == "NOT_STARTED":
        attempt.status = "IN_PROGRESS"
        attempt.started_at = timezone.now()
        # Determine initial section based on exam type
        # Note: Speaking section is disabled (offline only)
        exam_type = attempt.exam.mock_test.exam_type
        if exam_type in [
            "LISTENING",
            "LISTENING_READING",
            "LISTENING_READING_WRITING",
            "FULL_TEST",
        ]:
            attempt.current_section = "listening"
        elif exam_type == "READING":
            attempt.current_section = "reading"
        elif exam_type == "WRITING":
            attempt.current_section = "writing"
        elif exam_type == "SPEAKING":
            # Speaking is offline only - redirect to dashboard or show error
            messages.error(
                request,
                "Speaking section is not available online. It will be conducted offline.",
            )
            return redirect("student_panel:dashboard")
        attempt.save()

    # Determine initial section based on current progress
    initial_section = "listening"
    if attempt.current_section and attempt.current_section != "NOT_STARTED":
        # Skip speaking section if somehow set
        if attempt.current_section == "speaking":
            messages.error(request, "Speaking section is not available online.")
            return redirect("student_panel:dashboard")
        initial_section = attempt.current_section
    elif attempt.exam.mock_test.exam_type == "READING":
        initial_section = "reading"
    elif attempt.exam.mock_test.exam_type == "WRITING":
        initial_section = "writing"
    elif attempt.exam.mock_test.exam_type == "SPEAKING":
        # Speaking is offline only
        messages.error(
            request,
            "Speaking section is not available online. It will be conducted offline.",
        )
        return redirect("student_panel:dashboard")

    context = {
        "attempt": attempt,
        "initial_section": initial_section,
    }

    return render(request, "student/exam.html", context)


@login_required
def results_view(request, attempt_id):
    """Display the results page for a completed exam."""
    attempt = get_attempt_by_uuid_or_id(attempt_id)

    # Verify ownership
    if attempt.student != request.user:
        return HttpResponseForbidden(
            "You do not have permission to view these results."
        )

    # Check if exam is completed
    if attempt.status != "COMPLETED":
        messages.warning(request, "This exam has not been completed yet.")
        return redirect("ielts:exam", attempt_id=attempt_id)

    context = {
        "attempt": attempt,
    }

    return render(request, "student/results.html", context)
