from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.views import LoginView
from django.contrib import messages
from django.urls import reverse_lazy
from .forms import LoginForm
from rest_framework_simplejwt.tokens import RefreshToken


class CustomLoginView(LoginView):
    """
    Custom login view that redirects users based on their role
    Also generates JWT tokens for API authentication
    """

    form_class = LoginForm
    template_name = "accounts/login.html"

    def form_valid(self, form):
        """Login the user and redirect based on role"""
        user = form.get_user()
        login(self.request, user)

        # Set session to expire in 24 hours (redundant but ensures it's set)
        self.request.session.set_expiry(86400)

        # Generate JWT tokens for API authentication
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Store tokens in session for JavaScript to access
        self.request.session["jwt_access_token"] = access_token
        self.request.session["jwt_refresh_token"] = refresh_token
        # Force session to be saved
        self.request.session.modified = True

        # Redirect based on user role
        if user.is_superadmin() or user.is_manager():
            return redirect(
                "manager:spa"
            )  # Both MANAGER use manager panel
        else:  # Student
            return redirect("student:dashboard")

    def form_invalid(self, form):
        """Handle invalid login"""
        messages.error(self.request, "Invalid username or password.")
        return super().form_invalid(form)

    def get(self, request, *args, **kwargs):
        """Redirect authenticated users"""
        if request.user.is_authenticated:
            if request.user.is_superadmin() or request.user.is_manager():
                return redirect(
                    "manager:spa"
                )  # Both MANAGER use manager panel
            else:
                return redirect("student:dashboard")
        return super().get(request, *args, **kwargs)


def custom_logout(request):
    """
    Custom logout view
    Clears session and JWT tokens
    """
    # Clear JWT tokens from session
    if "jwt_access_token" in request.session:
        del request.session["jwt_access_token"]
    if "jwt_refresh_token" in request.session:
        del request.session["jwt_refresh_token"]

    logout(request)
    messages.success(request, "You have been successfully logged out.")
    return redirect("login")
