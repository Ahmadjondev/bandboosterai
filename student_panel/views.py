from django.forms import model_to_dict
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.db.models import Avg, Q
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from django.contrib.auth import update_session_auth_hash
from functools import wraps
from ielts.models import Exam, MockExam, ExamAttempt
from .forms import StudentProfileForm, StudentPasswordChangeForm


def student_required(view_func):
    """Decorator to ensure user is a student"""

    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("login")
        if request.user.role != "STUDENT":
            messages.error(request, "Access denied. Students only.")
            return redirect("login")
        return view_func(request, *args, **kwargs)

    return _wrapped_view


@student_required
def dashboard(request):
    """Student dashboard showing available exams and enrolled exams"""
    user = request.user
    # Get all exams that the student is enrolled in
    # Show SCHEDULED and ACTIVE exams only
    my_exams = (
        Exam.objects.filter(enrolled_students=user, status__in=["SCHEDULED", "ACTIVE"])
        .select_related("mock_test")
        .prefetch_related("enrolled_students")
        .order_by("start_date")
    )

    # Get all available exams (SCHEDULED or ACTIVE, not full)
    available_exams = (
        Exam.objects.filter(status__in=["SCHEDULED", "ACTIVE"])
        .exclude(enrolled_students=user)
        .select_related("mock_test")
        .order_by("start_date")[:12]  # Limit to 12 exams
    )

    # Get recent results (using ExamAttempt with status COMPLETED or EVALUATED)
    recent_results = (
        ExamAttempt.objects.filter(student=user, status__in=["COMPLETED", "EVALUATED"])
        .select_related("exam__mock_test")
        .order_by("-created_at")[:5]
    )

    context = {
        "my_exams": my_exams,
        "available_exams": available_exams,
        "recent_results": recent_results,
    }
    return render(request, "student/dashboard.html", context)


@student_required
def join_exam(request):
    """Join an exam using PIN"""
    if request.method == "POST":
        pin_code = request.POST.get("pin", "").strip()
        exam_id = request.POST.get("exam_id", "").strip()

        if not pin_code:
            messages.error(request, "Please enter a PIN code.")
            return redirect("student:exam_list")

        try:
            # If exam_id is provided, verify PIN matches that specific exam
            if exam_id:
                exam = Exam.objects.get(
                    id=exam_id,
                    pin_code=pin_code,
                    status__in=["SCHEDULED", "ACTIVE"],
                )
            else:
                # Find exam by PIN code only
                exam = Exam.objects.get(
                    pin_code=pin_code,
                    status__in=["SCHEDULED", "ACTIVE"],
                )

            # Use the built-in enroll_student method
            try:
                exam.enroll_student(request.user, pin_code)
                messages.success(request, f'Successfully joined "{exam.name}"!')
                return redirect("student:exam_detail", exam_id=exam.id)
            except ValidationError as e:
                messages.error(request, str(e))
                return redirect("student:exam_list")

        except Exam.DoesNotExist:
            messages.error(
                request,
                "Invalid PIN code or exam not found. Please check and try again.",
            )
            return redirect("student:exam_list")

    return redirect("student:exam_list")


@student_required
def exam_list(request):
    """List all exams - both enrolled and available"""
    user = request.user
    # Get all enrolled exams (SCHEDULED or ACTIVE)
    enrolled_exams = (
        Exam.objects.filter(enrolled_students=user, status__in=["SCHEDULED", "ACTIVE"])
        .select_related("mock_test")
        .prefetch_related("enrolled_students")
        .order_by("start_date")
    )

    # Get available exams (not enrolled, not full, SCHEDULED or ACTIVE)
    available_exams = (
        Exam.objects.filter(status__in=["SCHEDULED", "ACTIVE"])
        .exclude(enrolled_students=user)
        .select_related("mock_test")
        .prefetch_related("enrolled_students")
        .order_by("start_date")
    )

    # Filter out full exams from available
    available_exams = [exam for exam in available_exams if not exam.is_full]

    context = {
        "enrolled_exams": enrolled_exams,
        "available_exams": available_exams,
    }

    return render(request, "student/exam_list.html", context)


@student_required
def exam_detail(request, exam_id):
    """View details of a specific exam"""
    user = request.user

    exam = get_object_or_404(Exam, id=exam_id, status__in=["SCHEDULED", "ACTIVE"])

    # Check if student is enrolled
    is_enrolled = exam.enrolled_students.filter(id=user.id).exists()

    # Get or create exam attempt for this student
    attempt = None
    if is_enrolled:
        attempt = ExamAttempt.objects.filter(
            student=user,
            exam=exam,
        ).first()

    # Calculate time until start
    time_until_start = 0
    has_started = exam.is_active or (timezone.now() >= exam.start_date)

    if not has_started:
        delta = exam.start_date - timezone.now()
        time_until_start = max(0, int(delta.total_seconds()))

    context = {
        "exam": exam,
        "is_enrolled": is_enrolled,
        "attempt": attempt,
        "has_started": has_started,
        "time_until_start": time_until_start,
    }

    return render(request, "student/exam_detail.html", context)


@student_required
def start_exam(request, exam_id):
    """Start an exam attempt"""
    user = request.user

    exam = get_object_or_404(Exam, id=exam_id, status__in=["SCHEDULED", "ACTIVE"])

    # Check if student is enrolled
    if not exam.enrolled_students.filter(id=user.id).exists():
        messages.error(request, "You are not enrolled in this exam.")
        return redirect("student:exam_detail", exam_id=exam_id)

    # Check if exam has started
    if not (exam.is_active or timezone.now() >= exam.start_date):
        messages.error(request, "This exam has not started yet.")
        return redirect("student:exam_detail", exam_id=exam_id)

    # Check if exam has expired
    if timezone.now() > exam.expire_date:
        messages.error(request, "This exam has expired.")
        return redirect("student:exam_detail", exam_id=exam_id)

    # Get or create exam attempt
    attempt, created = ExamAttempt.objects.get_or_create(
        student=user,
        exam=exam,
        defaults={
            "status": "NOT_STARTED",
            "current_section": "NOT_STARTED",
        },
    )

    # If attempt is already completed, create a new one
    if attempt.status == "COMPLETED":
        messages.warning(
            request, "You have already completed this exam. Starting a new attempt."
        )
        attempt = ExamAttempt.objects.create(
            student=user,
            exam=exam,
            status="NOT_STARTED",
            current_section="NOT_STARTED",
        )

    # Redirect to the exam interface
    return redirect("ielts:exam", attempt_id=attempt.id)


@student_required
def my_results(request):
    """View all exam results"""
    user = request.user

    # Get all completed exam attempts (results are stored in ExamAttempt model)
    results = (
        ExamAttempt.objects.filter(student=user, status__in=["COMPLETED", "EVALUATED"])
        .select_related("exam__mock_test")
        .order_by("-created_at")
    )

    context = {
        "results": results,
    }

    return render(request, "student/my_results.html", context)


@student_required
def result_detail(request, result_id):
    """View detailed result for a specific exam"""
    user = request.user

    # Get the exam attempt (results are stored in ExamAttempt model)
    result = get_object_or_404(
        ExamAttempt,
        id=result_id,
        student=user,
        status__in=["COMPLETED", "EVALUATED"],
    )

    context = {
        "result": result,
    }

    return render(request, "student/result_detail.html", context)


@student_required
def profile(request):
    """View and edit student profile"""
    user = request.user

    if request.method == "POST":
        form = StudentProfileForm(request.POST, request.FILES, instance=user)
        if form.is_valid():
            form.save()
            messages.success(request, "Profile updated successfully!")
            return redirect("student:profile")
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = StudentProfileForm(instance=user)

    context = {
        "form": form,
    }

    return render(request, "student/profile.html", context)


@student_required
def change_password(request):
    """Change student password"""
    user = request.user

    if request.method == "POST":
        form = StudentPasswordChangeForm(user, request.POST)
        if form.is_valid():
            user = form.save()
            # Important: Update session to prevent logout
            update_session_auth_hash(request, user)
            messages.success(request, "Password changed successfully!")
            return redirect("student:profile")
        else:
            messages.error(request, "Please correct the errors below.")
    else:
        form = StudentPasswordChangeForm(user)

    context = {
        "form": form,
    }

    return render(request, "student/change_password.html", context)
