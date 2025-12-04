from django.urls import path
from .api_views import (
    get_subscription_plans,
    get_attempt_packages,
    get_user_payment_status,
    get_user_attempts,
    create_subscription_order,
    create_attempt_order,
    get_order_status,
    get_payment_history,
    get_attempt_usage_history,
    use_attempt,
    check_access,
    get_checkout_url,
    check_writing_access,
    check_speaking_access,
    check_reading_access,
    check_listening_access,
)
from .payme_api import payme_endpoint

app_name = "payments"

urlpatterns = [
    # Public endpoints
    path("plans/", get_subscription_plans, name="subscription_plans"),
    path("packages/", get_attempt_packages, name="attempt_packages"),
    # User status endpoints
    path("status/", get_user_payment_status, name="payment_status"),
    path("attempts/", get_user_attempts, name="user_attempts"),
    # Order creation
    path(
        "orders/subscription/",
        create_subscription_order,
        name="create_subscription_order",
    ),
    path("orders/attempts/", create_attempt_order, name="create_attempt_order"),
    path("orders/<uuid:order_id>/", get_order_status, name="order_status"),
    path("orders/<uuid:order_id>/checkout/", get_checkout_url, name="checkout_url"),
    # History
    path("history/", get_payment_history, name="payment_history"),
    path("usage-history/", get_attempt_usage_history, name="usage_history"),
    # Attempt usage
    path("use-attempt/", use_attempt, name="use_attempt"),
    path("check-access/", check_access, name="check_access"),
    # Quick access checks
    path("check/writing/", check_writing_access, name="check_writing"),
    path("check/speaking/", check_speaking_access, name="check_speaking"),
    path("check/reading/", check_reading_access, name="check_reading"),
    path("check/listening/", check_listening_access, name="check_listening"),
    # Payme Merchant API endpoint
    path("payme/", payme_endpoint, name="payme_endpoint"),
]
