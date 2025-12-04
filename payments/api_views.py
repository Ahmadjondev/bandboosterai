"""
Payment API Views

REST API endpoints for:
- Subscription plans listing
- Creating payment orders
- User subscription/attempts status
- Payment history
- Payme checkout URL generation
"""

import base64
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.utils import timezone
from django.db import transaction

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import (
    SubscriptionPlan,
    UserSubscription,
    UserAttempts,
    AttemptPackage,
    PaymentOrder,
    AttemptUsageLog,
)
from .serializers import (
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    UserAttemptsSerializer,
    AttemptPackageSerializer,
    PaymentOrderSerializer,
    CreateSubscriptionOrderSerializer,
    CreateAttemptOrderSerializer,
    PaymentHistorySerializer,
    AttemptUsageLogSerializer,
    UserPaymentStatusSerializer,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_subscription_plans(request):
    """
    Get all active subscription plans

    Returns list of plans with pricing and features
    """
    plans = SubscriptionPlan.objects.filter(is_active=True).order_by("display_order")
    serializer = SubscriptionPlanSerializer(plans, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_attempt_packages(request):
    """
    Get all active attempt packages for one-time purchase
    """
    packages = AttemptPackage.objects.filter(is_active=True).order_by("display_order")
    serializer = AttemptPackageSerializer(packages, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_payment_status(request):
    """
    Get user's current subscription and attempts status
    """
    user = request.user

    # Get or create attempts record
    attempts, _ = UserAttempts.objects.get_or_create(user=user)

    # Get subscription if exists
    subscription = getattr(user, "subscription", None)

    # Check if user has valid subscription
    has_active_subscription = (
        subscription and subscription.is_valid() if subscription else False
    )

    # Check premium book access
    can_access_premium_books = False
    if has_active_subscription and subscription.plan:
        can_access_premium_books = subscription.plan.book_access

    data = {
        "subscription": (
            UserSubscriptionSerializer(subscription).data if subscription else None
        ),
        "attempts": UserAttemptsSerializer(attempts).data,
        "has_active_subscription": has_active_subscription,
        "can_access_premium_books": can_access_premium_books,
    }

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_attempts(request):
    """
    Get user's current attempt balances
    """
    attempts, _ = UserAttempts.objects.get_or_create(user=request.user)
    serializer = UserAttemptsSerializer(attempts)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_subscription_order(request):
    """
    Create a payment order for subscription

    Body: { "plan_id": 1 }
    Returns: Order details with checkout URL
    """
    serializer = CreateSubscriptionOrderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    plan_id = serializer.validated_data["plan_id"]
    plan = SubscriptionPlan.objects.get(id=plan_id)

    # Create order with 12-hour expiry (Payme requirement)
    with transaction.atomic():
        order = PaymentOrder.objects.create(
            user=request.user,
            order_type="SUBSCRIPTION",
            subscription_plan=plan,
            amount=plan.price,
            expires_at=timezone.now() + timedelta(hours=12),
        )

    # Generate Payme checkout URL
    checkout_url = generate_payme_checkout_url(order)

    response_data = PaymentOrderSerializer(order).data
    response_data["checkout_url"] = checkout_url

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_attempt_order(request):
    """
    Create a payment order for attempt package

    Body: { "package_id": 1 }
    Returns: Order details with checkout URL
    """
    serializer = CreateAttemptOrderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    package_id = serializer.validated_data["package_id"]
    package = AttemptPackage.objects.get(id=package_id)

    # Create order
    with transaction.atomic():
        order = PaymentOrder.objects.create(
            user=request.user,
            order_type="ATTEMPTS",
            attempt_package=package,
            amount=package.price,
            expires_at=timezone.now() + timedelta(hours=12),
        )

    # Generate Payme checkout URL
    checkout_url = generate_payme_checkout_url(order)

    response_data = PaymentOrderSerializer(order).data
    response_data["checkout_url"] = checkout_url

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_order_status(request, order_id):
    """
    Get status of a specific order
    """
    try:
        order = PaymentOrder.objects.get(
            order_id=order_id,
            user=request.user,
        )
    except PaymentOrder.DoesNotExist:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = PaymentOrderSerializer(order)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_payment_history(request):
    """
    Get user's payment history
    """
    orders = PaymentOrder.objects.filter(user=request.user).order_by("-created_at")[
        :50
    ]  # Last 50 orders

    serializer = PaymentHistorySerializer(orders, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_attempt_usage_history(request):
    """
    Get user's attempt usage history
    """
    logs = AttemptUsageLog.objects.filter(user=request.user).order_by("-used_at")[
        :100
    ]  # Last 100 usages

    serializer = AttemptUsageLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def use_attempt(request):
    """
    Use an attempt for premium content

    Body: {
        "type": "WRITING" | "SPEAKING" | "READING" | "LISTENING",
        "content_type": "optional content type",
        "content_id": optional_content_id
    }

    Returns: Updated attempts balance or error
    """
    attempt_type = request.data.get("type", "").upper()
    content_type = request.data.get("content_type")
    content_id = request.data.get("content_id")

    valid_types = ["WRITING", "SPEAKING", "READING", "LISTENING"]
    if attempt_type not in valid_types:
        return Response(
            {"error": f"Invalid attempt type. Must be one of: {valid_types}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user
    attempts, _ = UserAttempts.objects.get_or_create(user=user)
    subscription = getattr(user, "subscription", None)
    has_active_subscription = (
        subscription and subscription.is_valid() if subscription else False
    )

    # Check if user has unlimited access via subscription
    if has_active_subscription and subscription.plan:
        plan_field = f"{attempt_type.lower()}_attempts"
        plan_attempts = getattr(subscription.plan, plan_field, 0)
        if plan_attempts == -1:  # Unlimited
            # Log the usage without deducting
            AttemptUsageLog.objects.create(
                user=user,
                usage_type=attempt_type,
                content_type=content_type,
                content_id=content_id,
            )
            return Response(
                {
                    "success": True,
                    "attempts_remaining": -1,  # Unlimited
                    "is_unlimited": True,
                    "type": attempt_type,
                    "attempts": UserAttemptsSerializer(attempts).data,
                }
            )

    # Check if user has attempts available (purchased or from subscription)
    field_name = f"{attempt_type.lower()}_attempts"
    available = getattr(attempts, field_name, 0)

    if available <= 0:
        return Response(
            {
                "error": "No attempts available",
                "attempts_remaining": 0,
                "type": attempt_type,
            },
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    # Use the attempt
    with transaction.atomic():
        success = attempts.use_attempt(attempt_type)
        if success:
            # Log the usage
            AttemptUsageLog.objects.create(
                user=user,
                usage_type=attempt_type,
                content_type=content_type,
                content_id=content_id,
            )

    # Return updated balance
    attempts.refresh_from_db()
    return Response(
        {
            "success": True,
            "attempts_remaining": getattr(attempts, field_name, 0),
            "is_unlimited": False,
            "type": attempt_type,
            "attempts": UserAttemptsSerializer(attempts).data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_access(request):
    """
    Check if user can access premium content

    Body: {
        "type": "WRITING" | "SPEAKING" | "READING" | "LISTENING" | "BOOK",
        "content_id": optional_content_id
    }

    Returns: { "has_access": true/false, "reason": "..." }
    """
    access_type = request.data.get("type", "").upper()
    content_id = request.data.get("content_id")

    user = request.user
    attempts, _ = UserAttempts.objects.get_or_create(user=user)
    subscription = getattr(user, "subscription", None)
    has_active_subscription = (
        subscription and subscription.is_valid() if subscription else False
    )

    # Check book access
    if access_type == "BOOK":
        if (
            has_active_subscription
            and subscription.plan
            and subscription.plan.book_access
        ):
            return Response(
                {
                    "has_access": True,
                    "reason": "Active subscription with book access",
                }
            )
        return Response(
            {
                "has_access": False,
                "reason": "Subscription with book access required",
            }
        )

    # Check attempt-based access
    valid_types = ["WRITING", "SPEAKING", "READING", "LISTENING"]
    if access_type not in valid_types:
        return Response(
            {"error": f"Invalid type. Must be one of: {valid_types + ['BOOK']}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if user has unlimited access via subscription
    if has_active_subscription and subscription.plan:
        plan_field = f"{access_type.lower()}_attempts"
        plan_attempts = getattr(subscription.plan, plan_field, 0)
        if plan_attempts == -1:  # Unlimited
            return Response(
                {
                    "has_access": True,
                    "attempts_remaining": -1,
                    "is_unlimited": True,
                    "reason": "Unlimited access with active subscription",
                }
            )

    field_name = f"{access_type.lower()}_attempts"
    available = getattr(attempts, field_name, 0)

    if available > 0:
        return Response(
            {
                "has_access": True,
                "attempts_remaining": available,
                "is_unlimited": False,
                "reason": "Attempts available",
            }
        )

    return Response(
        {
            "has_access": False,
            "attempts_remaining": 0,
            "is_unlimited": False,
            "reason": "No attempts available. Please purchase more attempts or subscribe.",
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_checkout_url(request, order_id):
    """
    Get Payme checkout URL for an existing order
    """
    try:
        order = PaymentOrder.objects.get(
            order_id=order_id,
            user=request.user,
            status="PENDING",
        )
    except PaymentOrder.DoesNotExist:
        return Response(
            {"error": "Order not found or already processed"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if order.is_expired():
        return Response(
            {"error": "Order has expired"}, status=status.HTTP_400_BAD_REQUEST
        )

    checkout_url = generate_payme_checkout_url(order)
    return Response({"checkout_url": checkout_url})


def generate_payme_checkout_url(order):
    """
    Generate Payme checkout URL for an order

    URL format: https://checkout.paycom.uz/{base64_encoded_params}
    """
    merchant_id = settings.PAYME_MERCHANT_ID
    amount = order.get_amount_in_tiyins()
    order_id = str(order.order_id)

    # Build parameters string
    # Format: m={merchant_id};ac.order_id={order_id};a={amount}
    params_str = f"m={merchant_id};ac.order_id={order_id};a={amount}"

    # Base64 encode
    encoded = base64.b64encode(params_str.encode()).decode()

    # Build checkout URL
    base_url = settings.PAYME_CHECKOUT_URL
    checkout_url = f"{base_url}/{encoded}"

    return checkout_url


# ============================================================================
# Utility endpoints for checking premium content
# ============================================================================


def _check_section_access(user, section_type):
    """
    Helper function to check access for a section type.
    Returns dict with has_access, attempts_remaining, is_unlimited.
    """
    attempts, _ = UserAttempts.objects.get_or_create(user=user)
    subscription = getattr(user, "subscription", None)
    has_active_subscription = (
        subscription and subscription.is_valid() if subscription else False
    )

    # Check unlimited access via subscription
    if has_active_subscription and subscription.plan:
        plan_field = f"{section_type.lower()}_attempts"
        plan_attempts = getattr(subscription.plan, plan_field, 0)
        if plan_attempts == -1:  # Unlimited
            return {
                "has_access": True,
                "attempts_remaining": -1,
                "is_unlimited": True,
            }

    # Check purchased attempts
    field_name = f"{section_type.lower()}_attempts"
    available = getattr(attempts, field_name, 0)
    return {
        "has_access": available > 0,
        "attempts_remaining": available,
        "is_unlimited": False,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_writing_access(request):
    """Quick check for writing access"""
    return Response(_check_section_access(request.user, "WRITING"))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_speaking_access(request):
    """Quick check for speaking access"""
    return Response(_check_section_access(request.user, "SPEAKING"))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_reading_access(request):
    """Quick check for reading access"""
    return Response(_check_section_access(request.user, "READING"))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_listening_access(request):
    """Quick check for listening access"""
    return Response(_check_section_access(request.user, "LISTENING"))
