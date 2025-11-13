"""
Manager API - Student Management Endpoints
"""

import re
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q

from ielts.models import ExamAttempt
from ..serializers import UserSerializer, UserDetailSerializer
from .utils import (
    check_manager_permission,
    permission_denied_response,
    paginate_queryset,
)

# Import score calculation helper
from .exams import _calculate_attempt_scores

User = get_user_model()


def normalize_phone(phone):
    """
    Normalize phone number by removing all symbols and ensuring + prefix
    Examples:
        '998911234567' -> '+998911234567'
        '+998911234567' -> '+998911234567'
        '998.91.123.45.67' -> '+998911234567'
        '998-91-123-45-67' -> '+998911234567'
        '998 91 123 45 67' -> '+998911234567'
        '+998 (91) 123-45-67' -> '+998911234567'
        '998,91,123,45,67' -> '+998911234567'
    """
    if not phone:
        return phone

    # Remove all non-digit and non-plus characters
    cleaned = re.sub(r"[^\d+]", "", phone)

    # Remove all + symbols first
    cleaned = cleaned.replace("+", "")

    # Add + at the beginning if there are digits
    if cleaned:
        return "+" + cleaned
    print(phone)
    return phone


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_students_list(request):
    """Get list of students"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    search = request.GET.get("search", "")

    students = User.objects.filter(role="STUDENT")

    if search:
        students = students.filter(
            Q(username__icontains=search)
            | Q(email__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
        )

    students = students.order_by("-date_joined")

    paginated = paginate_queryset(students, request)
    serializer = UserSerializer(paginated["results"], many=True)
    return Response(
        {"students": serializer.data, "pagination": paginated["pagination"]}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_student_detail(request, user_id):
    """Get detailed student information"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    student = get_object_or_404(User, id=user_id, role="STUDENT")

    # Get completed exam attempts for this student
    attempts = (
        ExamAttempt.objects.filter(student=student, status="COMPLETED")
        .select_related("exam", "exam__mock_test")
        .order_by("-completed_at")
    )

    # Build results with calculated scores
    results_data = []
    for attempt in attempts:
        scores = _calculate_attempt_scores(attempt)

        results_data.append(
            {
                "id": attempt.id,
                "exam_title": attempt.exam.name,
                "exam_type": attempt.exam.mock_test.get_exam_type_display(),
                "overall_band_score": scores["overall_score"],
                "listening_score": scores["listening_score"],
                "reading_score": scores["reading_score"],
                "writing_score": scores["writing_score"],
                "speaking_score": scores["speaking_score"],
                "completed_at": attempt.completed_at,
            }
        )

    serializer = UserDetailSerializer(student)

    return Response(
        {
            "student": serializer.data,
            "results": results_data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def student_toggle_active(request, user_id):
    """Toggle student active status"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    student = get_object_or_404(User, id=user_id, role="STUDENT")

    student.is_active = not student.is_active
    student.save()

    serializer = UserSerializer(student)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_student(request):
    """Create a new student"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    data = request.data.copy()

    # Normalize phone number
    if "phone" in data and data["phone"]:
        data["phone"] = normalize_phone(data["phone"])

    # Clean password - remove any non-alphanumeric characters
    if "password" in data and data["password"]:
        password = data["password"]
        if isinstance(password, (int, float)):
            password = str(int(password))
        else:
            password = str(password)
        # Remove all non-alphanumeric characters (keep only letters and numbers)
        data["password"] = re.sub(r"[^a-zA-Z0-9]", "", password)

    data["role"] = "STUDENT"

    # Generate username if not provided
    if "username" not in data or not data["username"]:
        # Priority: phone > first_name.last_name
        if data.get("phone"):
            base_username = data["phone"]
        elif data.get("first_name") and data.get("last_name"):
            # Generate from first_name and last_name
            first = data["first_name"].lower().strip()
            last = data["last_name"].lower().strip()
            base_username = f"{first}.{last}"
        elif data.get("first_name"):
            base_username = data["first_name"].lower().strip()
        else:
            return Response(
                {"error": "Either phone or first_name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Ensure unique username
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        data["username"] = username

    # Check for duplicate phone
    if data.get("phone") and User.objects.filter(phone=data["phone"]).exists():
        return Response(
            {"error": f"Phone number {data['phone']} already exists"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = UserSerializer(data=data)
    if serializer.is_valid():
        # Create user with password
        user = User.objects.create_user(
            username=data["username"],
            email=data.get("email", ""),
            password=data.get("password", "defaultpass123"),
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            phone=data.get("phone", ""),
            role="STUDENT",
            is_active=data.get("is_active", True),
        )

        result_serializer = UserSerializer(user)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_student(request, user_id):
    """Update student information"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    student = get_object_or_404(User, id=user_id, role="STUDENT")

    data = request.data.copy()

    # Update fields
    if "first_name" in data:
        student.first_name = data["first_name"]
    if "last_name" in data:
        student.last_name = data["last_name"]
    if "phone" in data:
        normalized_phone = normalize_phone(data["phone"])
        # Check for duplicate phone (excluding current student)
        if User.objects.filter(phone=normalized_phone).exclude(id=student.id).exists():
            return Response(
                {"error": f"Phone number {normalized_phone} already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        student.phone = normalized_phone
    if "is_active" in data:
        student.is_active = data["is_active"]

    student.save()

    serializer = UserSerializer(student)
    return Response(serializer.data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_student(request, user_id):
    """Delete a student"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    student = get_object_or_404(User, id=user_id, role="STUDENT")

    student.delete()

    return Response(
        {"message": "Student deleted successfully"}, status=status.HTTP_200_OK
    )
