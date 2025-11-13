"""
Custom authentication backend to support login with phone number or username
"""

import re
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


def normalize_phone(phone):
    """
    Normalize phone number by removing all symbols and ensuring + prefix
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
    return phone


class PhoneOrUsernameBackend(ModelBackend):
    """
    Authenticate using phone number or username with password
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        try:
            # Try to find user by phone number first, then by username
            user = None

            # Check if input looks like a phone number (contains only digits, +, -, spaces)
            if username.replace("+", "").replace("-", "").replace(" ", "").isdigit():
                # Normalize phone number for lookup
                normalized_phone = normalize_phone(username)
                try:
                    user = User.objects.get(phone=normalized_phone)
                except User.DoesNotExist:
                    pass

            # If not found by phone, try username
            if user is None:
                try:
                    user = User.objects.get(username=username)
                except User.DoesNotExist:
                    pass

            # Check password
            if user and user.check_password(password):
                return user

        except Exception:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a nonexistent user
            User().set_password(password)

        return None
