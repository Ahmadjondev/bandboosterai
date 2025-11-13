from django.urls import path
from .api_views import (
    register_view,
    login_view,
    logout_view,
    current_user_view,
    update_profile_view,
    send_verification_code,
    verify_code,
    check_verification_status,
)
from rest_framework_simplejwt.views import TokenRefreshView

app_name = "accounts_api"

urlpatterns = [
    path("register/", register_view, name="register"),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("me/", current_user_view, name="current_user"),
    path("profile/", update_profile_view, name="update_profile"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "send-verification-code/", send_verification_code, name="send_verification_code"
    ),
    path("verify-code/", verify_code, name="verify_code"),
    path("verification-status/", check_verification_status, name="verification_status"),
]
