from typing import Any, Dict

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta, datetime
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    OnboardingSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def _extract_first_error_message(errors: Any) -> str:
    """Return a compact human-readable summary of the first validation error."""

    if isinstance(errors, dict):
        for field, messages in errors.items():
            if isinstance(messages, dict):
                nested_message = _extract_first_error_message(messages)
                if nested_message:
                    return nested_message
            if isinstance(messages, (list, tuple)):
                for message in messages:
                    if isinstance(message, dict):
                        nested_message = _extract_first_error_message(message)
                        if nested_message:
                            return nested_message
                    elif message:
                        message_str = str(message)
                        return (
                            message_str
                            if field == "non_field_errors"
                            else f"{field}: {message_str}"
                        )
            elif messages:
                message_str = str(messages)
                return (
                    message_str
                    if field == "non_field_errors"
                    else f"{field}: {message_str}"
                )
    elif isinstance(errors, (list, tuple)):
        for message in errors:
            nested_message = _extract_first_error_message(message)
            if nested_message:
                return nested_message
    elif errors:
        return str(errors)

    return "Validation error occurred."


def build_error_response(
    message: str,
    *,
    code: str = "validation_error",
    errors: Dict[str, Any] | None = None,
):
    return {
        "success": False,
        "code": code,
        "message": message,
        "errors": errors or {},
    }


def validation_error_response(
    errors: Dict[str, Any], status_code=status.HTTP_400_BAD_REQUEST
):
    message = _extract_first_error_message(errors)
    return Response(
        build_error_response(message, code="validation_error", errors=errors),
        status=status_code,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    """
    API endpoint for user registration with JWT tokens
    POST /accounts/api/register/
    """
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        # Generate JWT tokens for the user
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Registration successful",
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )

    return validation_error_response(serializer.errors)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """
    API endpoint for user login with JWT tokens
    POST /accounts/api/login/
    Accepts username or email with password
    """
    serializer = LoginSerializer(data=request.data)

    if not serializer.is_valid():
        return validation_error_response(serializer.errors)

    username_or_email = serializer.validated_data["username"]
    password = serializer.validated_data["password"]

    # Try to find user by username or email
    user = None
    if "@" in username_or_email:
        # It's an email
        try:
            user_obj = User.objects.get(email=username_or_email)
            username = user_obj.username
        except User.DoesNotExist:
            return Response(
                build_error_response(
                    "username: Invalid credentials",
                    code="authentication_failed",
                    errors={"username": ["Invalid credentials"]},
                ),
                status=status.HTTP_401_UNAUTHORIZED,
            )
    else:
        # It's a username
        username = username_or_email

    # Authenticate user
    user = authenticate(request, username=username, password=password)

    if user is not None:
        # Generate JWT tokens for the user
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Login successful",
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        build_error_response(
            "username: Invalid credentials",
            code="authentication_failed",
            errors={"username": ["Invalid credentials"]},
        ),
        status=status.HTTP_401_UNAUTHORIZED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    API endpoint for user logout with JWT token blacklisting
    POST /accounts/api/logout/
    Requires refresh token in request body
    """
    try:
        refresh_token = request.data.get("refresh")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        return Response(
            {"message": "Logout successful"},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {"error": "Invalid token"},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """
    API endpoint to get current authenticated user
    GET /accounts/api/me/
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    API endpoint to update user profile
    PATCH/PUT /accounts/api/profile/
    """
    user = request.user

    # Get the data from request
    data = request.data.copy()

    # Remove fields that shouldn't be updated via this endpoint
    protected_fields = [
        "email",
        "username",
        "password",
        "role",
        "is_verified",
        "verification_code",
        "code_expires_at",
    ]
    for field in protected_fields:
        data.pop(field, None)

    # Update allowed fields
    allowed_fields = [
        "first_name",
        "last_name",
        "phone",
        "date_of_birth",
        "profile_image",
    ]

    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])

    try:
        user.save()
        serializer = UserSerializer(user)
        return Response(
            {"message": "Profile updated successfully", "user": serializer.data},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to update profile: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST", "GET"])
@permission_classes([IsAuthenticated])
def onboarding_view(request):
    """
    API endpoint to handle user onboarding
    GET /accounts/api/onboarding/ - Get onboarding status and options
    POST /accounts/api/onboarding/ - Submit onboarding data
    """
    user = request.user

    if request.method == "GET":
        # Return onboarding options and current status
        return Response(
            {
                "onboarding_completed": user.onboarding_completed,
                "current_data": {
                    "date_of_birth": user.date_of_birth,
                    "target_score": user.target_score,
                    "exam_type": user.exam_type,
                    "exam_date": user.exam_date,
                    "heard_from": user.heard_from,
                    "main_goal": user.main_goal,
                },
                "options": {
                    "exam_types": [
                        {"value": "ACADEMIC", "label": "Academic"},
                        {"value": "GENERAL", "label": "General Training"},
                        {"value": "UKVI", "label": "UKVI (UK Visas and Immigration)"},
                    ],
                    "heard_from": [
                        {"value": "GOOGLE", "label": "Google Search"},
                        {
                            "value": "SOCIAL_MEDIA",
                            "label": "Social Media (Instagram, TikTok, etc.)",
                        },
                        {"value": "FRIEND", "label": "Friend or Family"},
                        {"value": "YOUTUBE", "label": "YouTube"},
                        {"value": "TELEGRAM", "label": "Telegram"},
                        {"value": "OTHER", "label": "Other"},
                    ],
                    "goals": [
                        {"value": "STUDY_ABROAD", "label": "Study Abroad"},
                        {"value": "IMMIGRATION", "label": "Immigration"},
                        {"value": "WORK", "label": "Work or Career"},
                        {"value": "PERSONAL", "label": "Personal Development"},
                        {"value": "OTHER", "label": "Other"},
                    ],
                    "target_scores": [
                        {"value": "5.0", "label": "Band 5.0"},
                        {"value": "5.5", "label": "Band 5.5"},
                        {"value": "6.0", "label": "Band 6.0"},
                        {"value": "6.5", "label": "Band 6.5"},
                        {"value": "7.0", "label": "Band 7.0"},
                        {"value": "7.5", "label": "Band 7.5"},
                        {"value": "8.0", "label": "Band 8.0"},
                        {"value": "8.5", "label": "Band 8.5+"},
                    ],
                },
            },
            status=status.HTTP_200_OK,
        )

    # POST - Submit onboarding data
    serializer = OnboardingSerializer(user, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "message": "Onboarding completed successfully",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

    return validation_error_response(serializer.errors)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_verification_code(request):
    """
    API endpoint to send 4-digit verification code via email
    POST /accounts/api/send-verification-code/
    """
    user = request.user

    if user.is_verified:
        return Response(
            {"message": "Email is already verified"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not user.email:
        return Response(
            {"error": "No email address associated with this account"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if code was sent recently (within last 1 minute to prevent spam)
    if user.code_expires_at and user.code_expires_at > timezone.now():
        remaining_seconds = int((user.code_expires_at - timezone.now()).total_seconds())
        return Response(
            {
                "error": f"Please wait {remaining_seconds} seconds before requesting another code"
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Generate 4-digit verification code
    verification_code = user.generate_verification_code()

    # Render email template
    html_message = render_to_string(
        "emails/verification_code.html",
        {
            "username": user.username,
            "verification_code": verification_code,
            "year": datetime.now().year,
        },
    )

    # Send verification email
    try:
        send_mail(
            subject="Your Verification Code - IELTS Mock System",
            message=f"Your verification code is: {verification_code}\n\nThis code will expire in 2 minutes.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

        return Response(
            {
                "message": "Verification code sent successfully",
                "expires_in_seconds": 120,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to send verification email: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify_code(request):
    """
    API endpoint to verify 4-digit code
    POST /accounts/api/verify-code/
    Body: { "code": "1234" }
    """
    user = request.user
    code = request.data.get("code")

    if not code:
        return Response(
            {"error": "Verification code is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.is_verified:
        return Response(
            {"message": "Email is already verified"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.is_verification_code_valid(code):
        user.verify_email()
        return Response(
            {"message": "Email verified successfully"},
            status=status.HTTP_200_OK,
        )

    # Check if code expired or invalid
    if not user.code_expires_at or timezone.now() > user.code_expires_at:
        return Response(
            {"error": "Verification code has expired. Please request a new one."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {"error": "Invalid verification code"},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_verification_status(request):
    """
    API endpoint to check email verification status
    GET /accounts/api/verification-status/
    """
    return Response(
        {
            "is_verified": request.user.is_verified,
            "email": request.user.email,
            "has_email": bool(request.user.email),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def purchase_cd_exam(request):
    """
    API endpoint to purchase a CD exam (deduct 50000 UZS from balance)
    POST /accounts/api/purchase-cd-exam/
    """
    user = request.user
    exam_price = 50000  # Fixed price for CD exams

    # Check if user has enough balance
    if user.balance < exam_price:
        return Response(
            {
                "error": "Insufficient balance",
                "current_balance": float(user.balance),
                "required": exam_price,
                "deficit": exam_price - float(user.balance),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Deduct the balance
    user.balance -= exam_price
    user.save(update_fields=["balance"])

    return Response(
        {
            "message": "CD exam purchased successfully",
            "new_balance": float(user.balance),
            "amount_paid": exam_price,
        },
        status=status.HTTP_200_OK,
    )
