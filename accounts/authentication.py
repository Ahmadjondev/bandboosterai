"""
Custom authentication classes for the accounts app.
"""

from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Session authentication that doesn't enforce CSRF for safe methods (GET, HEAD, OPTIONS).

    This is useful for development when frontend and backend are on different origins.
    For production, use standard SessionAuthentication with proper CSRF token handling.
    """

    def enforce_csrf(self, request):
        """
        Skip CSRF check for safe methods.
        Safe methods (GET, HEAD, OPTIONS, TRACE) don't modify server state.
        """
        # Only enforce CSRF for non-safe methods
        if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
            return  # Skip CSRF check

        # For other methods (POST, PUT, PATCH, DELETE), enforce CSRF
        return super().enforce_csrf(request)
