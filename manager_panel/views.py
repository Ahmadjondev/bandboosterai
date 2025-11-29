from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Count, Avg
from functools import wraps
from accounts.models import User
from ielts.models import MockExam, ExamAttempt


def manager_required(view_func):
    """Decorator to check if user is manager"""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("login")
        if request.user.role not in ["MANAGER"]:
            messages.error(request, "Access denied. Manager privileges required.")
            return redirect("login")
        return view_func(request, *args, **kwargs)

    return wrapper


@manager_required
def dashboard(request):
    """Manager Dashboard"""

    context = {
        "total_students": User.objects.filter(role="STUDENT").count(),
        "total_exams": MockExam.objects.count(),
        "total_results": ExamAttempt.objects.filter(status="COMPLETED").count(),
        "recent_students": User.objects.filter(role="STUDENT").order_by("-created_at")[
            :5
        ],
        "recent_results": ExamAttempt.objects.filter(status="COMPLETED").order_by(
            "-created_at"
        )[:5],
    }
    return render(request, "manager/dashboard.html", context)


@manager_required
def student_list(request):
    """List all students"""
    students = User.objects.filter(role="STUDENT").order_by("-created_at")

    context = {
        "students": students,
    }
    return render(request, "manager/student_list.html", context)


@manager_required
def student_detail(request, pk):
    """View student details and results"""
    student = get_object_or_404(User, pk=pk, role="STUDENT")
    results = ExamAttempt.objects.filter(student=student, status="COMPLETED").order_by(
        "-created_at"
    )

    context = {
        "student": student,
        "results": results,
    }
    return render(request, "manager/student_detail.html", context)


@manager_required
def exam_list(request):
    """List all exams"""
    exams = MockExam.objects.order_by("-created_at")

    context = {
        "exams": exams,
    }
    return render(request, "manager/exam_list.html", context)


@manager_required
def result_list(request):
    """List all exam results"""
    results = (
        ExamAttempt.objects.filter(status="COMPLETED")
        .select_related("student", "exam")
        .order_by("-created_at")
    )

    context = {
        "results": results,
    }
    return render(request, "manager/result_list.html", context)


@manager_required
def spa_view(request, path=""):
    """Manager SPA (Single Page Application) View"""
    return render(request, "manager/spa.html")
