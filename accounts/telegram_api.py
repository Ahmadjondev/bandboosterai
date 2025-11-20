"""
API endpoints for Telegram authentication
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .models import TelegramVerification
from .serializers import UserSerializer

User = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_telegram_code(request):
    """
    Verify Telegram code and register/login user
    POST /accounts/api/telegram/verify/
    Body: { "code": "123456" }
    """
    code = request.data.get("code")

    if not code:
        return Response(
            {"error": "Verification code is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Find verification by code
        verification = TelegramVerification.objects.get(
            verification_code=code, is_used=False
        )

        # Check if expired
        if verification.is_expired():
            return Response(
                {
                    "error": "Verification code has expired. Please start the process again in Telegram."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user already exists with this telegram_id
        user = User.objects.filter(telegram_id=verification.telegram_id).first()

        if user:
            # User exists - login
            verification.is_used = True
            verification.save()

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "message": "Login successful",
                    "user": UserSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "is_new_user": False,
                },
                status=status.HTTP_200_OK,
            )

        else:
            # New user - register
            # Generate username from telegram data
            base_username = verification.username or f"user{verification.telegram_id}"
            username = base_username
            counter = 1

            # Ensure username is unique
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            # Create user
            user = User.objects.create_user(
                username=username,
                first_name=verification.first_name or "",
                last_name=verification.last_name or "",
                phone=verification.phone_number,
                telegram_id=verification.telegram_id,
                telegram_username=verification.username,
                telegram_phone=verification.phone_number,
                is_verified=True,  # Telegram users are auto-verified
                registration_method="TELEGRAM",
                role="STUDENT",
            )

            # Mark verification as used
            verification.is_used = True
            verification.save()

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "message": "Registration successful",
                    "user": UserSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "is_new_user": True,
                },
                status=status.HTTP_201_CREATED,
            )

    except TelegramVerification.DoesNotExist:
        return Response(
            {"error": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"error": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def create_telegram_verification(request):
    """
    Create a Telegram verification code (called by bot)
    POST /accounts/api/telegram/create-verification/
    Body: {
        "telegram_id": 123456,
        "phone_number": "+998901234567",
        "username": "john_doe",
        "first_name": "John",
        "last_name": "Doe"
    }
    """
    telegram_id = request.data.get("telegram_id")
    phone_number = request.data.get("phone_number")
    username = request.data.get("username")
    first_name = request.data.get("first_name")
    last_name = request.data.get("last_name")

    if not telegram_id or not phone_number:
        return Response(
            {"error": "telegram_id and phone_number are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Create verification
        verification = TelegramVerification.create_verification(
            telegram_id=telegram_id,
            phone_number=phone_number,
            username=username,
            first_name=first_name,
            last_name=last_name,
        )

        return Response(
            {
                "success": True,
                "verification_code": verification.verification_code,
                "expires_at": verification.expires_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {"error": f"Failed to create verification: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def get_telegram_bot_info(request):
    """
    Get Telegram bot information
    GET /accounts/api/telegram/bot-info/
    """
    from django.conf import settings

    bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", None)

    if not bot_username:
        return Response(
            {"error": "Telegram bot not configured"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {"bot_username": bot_username, "bot_url": f"https://t.me/{bot_username}"},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def check_telegram_verification_status(request):
    """
    Check if a verification code exists and is valid
    POST /accounts/api/telegram/check-status/
    Body: { "code": "123456" }
    """
    code = request.data.get("code")

    if not code:
        return Response(
            {"error": "Verification code is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        verification = TelegramVerification.objects.get(
            verification_code=code, is_used=False
        )

        return Response(
            {
                "exists": True,
                "expired": verification.is_expired(),
                "phone_number": verification.phone_number[-4:],  # Last 4 digits only
                "telegram_username": verification.username,
            },
            status=status.HTTP_200_OK,
        )

    except TelegramVerification.DoesNotExist:
        return Response({"exists": False, "expired": False}, status=status.HTTP_200_OK)
