"""
Google OAuth authentication API endpoints
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings

User = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth(request):
    """
    Authenticate or register user with Google OAuth
    POST /accounts/api/google-auth/
    Body: { "token": "google_id_token" }
    """
    google_token = request.data.get("token")

    if not google_token:
        return Response(
            {"error": "Google token is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            google_token, requests.Request(), settings.GOOGLE_OAUTH_CLIENT_ID
        )

        # Get user info from Google
        google_id = idinfo["sub"]
        email = idinfo.get("email")
        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")
        profile_image = idinfo.get("picture")

        if not email:
            return Response(
                {"error": "Email not provided by Google"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user exists with this Google ID
        user = User.objects.filter(google_id=google_id).first()

        if user:
            # Existing user - login
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

        # Check if user exists with this email
        user = User.objects.filter(email=email).first()

        if user:
            # User exists with this email but different auth method
            # Link Google account to existing user
            user.google_id = google_id
            if not user.is_verified:
                user.is_verified = True
            if profile_image and not user.profile_image:
                # Note: You might want to download and save the image
                pass
            user.save()

            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "message": "Google account linked successfully",
                    "user": UserSerializer(user).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "is_new_user": False,
                },
                status=status.HTTP_200_OK,
            )

        # New user - create account
        # Generate username from email
        base_username = email.split("@")[0]
        username = base_username
        counter = 1

        # Ensure username is unique
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Create new user
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            google_id=google_id,
            is_verified=True,  # Google users are auto-verified
            registration_method="GOOGLE",
            role="STUDENT",
        )

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

    except ValueError as e:
        # Invalid token
        return Response(
            {"error": f"Invalid Google token: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response(
            {"error": f"Authentication failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
