"""
Manager Panel API for Promo Code Management

CRUD operations for promo codes and usage statistics.
"""

from django.db import models
from django.db.models import Sum, Count
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from payments.models import PromoCode, PromoCodeUsage, SubscriptionPlan
from payments.serializers import (
    PromoCodeSerializer,
    PromoCodeCreateSerializer,
    PromoCodeUsageSerializer,
)
from .utils import check_manager_permission, permission_denied_response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_promo_codes(request):
    """
    Get all promo codes with filtering and stats

    Query params:
    - status: active, inactive, expired, all (default: all)
    - search: search by code or description
    """
    if not check_manager_permission(request.user):
        return permission_denied_response()

    promo_codes = PromoCode.objects.all()

    # Filter by status
    status_filter = request.query_params.get("status", "all")
    now = timezone.now()

    if status_filter == "active":
        promo_codes = promo_codes.filter(is_active=True)
        # Exclude expired ones
        promo_codes = promo_codes.filter(
            models.Q(valid_until__isnull=True) | models.Q(valid_until__gt=now)
        )
    elif status_filter == "inactive":
        promo_codes = promo_codes.filter(is_active=False)
    elif status_filter == "expired":
        promo_codes = promo_codes.filter(valid_until__lt=now)

    # Search
    search = request.query_params.get("search", "")
    if search:
        promo_codes = promo_codes.filter(
            models.Q(code__icontains=search) | models.Q(description__icontains=search)
        )

    # Order by most recent
    promo_codes = promo_codes.order_by("-created_at")

    serializer = PromoCodeSerializer(promo_codes, many=True)

    # Add summary stats
    total_discount = (
        PromoCodeUsage.objects.aggregate(total=Sum("discount_amount"))["total"] or 0
    )

    stats = {
        "total_codes": PromoCode.objects.count(),
        "active_codes": PromoCode.objects.filter(is_active=True).count(),
        "total_usages": PromoCodeUsage.objects.count(),
        "total_discount_given": float(total_discount),
    }

    return Response(
        {
            "promo_codes": serializer.data,
            "stats": stats,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_promo_code(request, promo_id):
    """Get a single promo code with detailed stats"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    try:
        promo = PromoCode.objects.get(id=promo_id)
    except PromoCode.DoesNotExist:
        return Response(
            {"error": "Promo code not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = PromoCodeSerializer(promo)
    data = serializer.data

    # Add usage history
    usages = PromoCodeUsage.objects.filter(promo_code=promo).order_by("-used_at")[:20]
    data["recent_usages"] = PromoCodeUsageSerializer(usages, many=True).data

    # Add detailed stats
    usage_stats = PromoCodeUsage.objects.filter(promo_code=promo).aggregate(
        total_uses=Count("id"),
        total_discount=Sum("discount_amount"),
        total_revenue=Sum("final_amount"),
    )
    data["usage_analytics"] = {
        "total_uses": usage_stats["total_uses"] or 0,
        "total_discount_given": float(usage_stats["total_discount"] or 0),
        "total_revenue_generated": float(usage_stats["total_revenue"] or 0),
    }

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_promo_code(request):
    """Create a new promo code"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    serializer = PromoCodeCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Check if code already exists
    code = serializer.validated_data["code"].upper()
    if PromoCode.objects.filter(code=code).exists():
        return Response(
            {"error": "A promo code with this code already exists"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    promo = serializer.save()

    return Response(
        PromoCodeSerializer(promo).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_promo_code(request, promo_id):
    """Update an existing promo code"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    try:
        promo = PromoCode.objects.get(id=promo_id)
    except PromoCode.DoesNotExist:
        return Response(
            {"error": "Promo code not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = PromoCodeCreateSerializer(
        promo,
        data=request.data,
        partial=request.method == "PATCH",
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Check if code already exists (if changing code)
    new_code = serializer.validated_data.get("code", "").upper()
    if new_code and new_code != promo.code:
        if PromoCode.objects.filter(code=new_code).exclude(id=promo_id).exists():
            return Response(
                {"error": "A promo code with this code already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    promo = serializer.save()

    return Response(PromoCodeSerializer(promo).data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_promo_code(request, promo_id):
    """Delete a promo code"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    try:
        promo = PromoCode.objects.get(id=promo_id)
    except PromoCode.DoesNotExist:
        return Response(
            {"error": "Promo code not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check if code has been used
    if promo.times_used > 0:
        return Response(
            {
                "error": "Cannot delete a promo code that has been used",
                "suggestion": "Consider deactivating it instead",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    promo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_promo_code_status(request, promo_id):
    """Toggle promo code active status"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    try:
        promo = PromoCode.objects.get(id=promo_id)
    except PromoCode.DoesNotExist:
        return Response(
            {"error": "Promo code not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    promo.is_active = not promo.is_active
    promo.save(update_fields=["is_active", "updated_at"])

    return Response(
        {
            "id": promo.id,
            "code": promo.code,
            "is_active": promo.is_active,
            "message": f"Promo code {'activated' if promo.is_active else 'deactivated'}",
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_promo_code_usages(request, promo_id):
    """Get all usages for a specific promo code"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    try:
        promo = PromoCode.objects.get(id=promo_id)
    except PromoCode.DoesNotExist:
        return Response(
            {"error": "Promo code not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    usages = PromoCodeUsage.objects.filter(promo_code=promo).order_by("-used_at")
    serializer = PromoCodeUsageSerializer(usages, many=True)

    return Response(
        {
            "code": promo.code,
            "total_usages": usages.count(),
            "usages": serializer.data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_promo_analytics(request):
    """Get overall promo code analytics"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    now = timezone.now()

    # Time-based stats
    last_30_days = now - timezone.timedelta(days=30)
    last_7_days = now - timezone.timedelta(days=7)

    # Overall stats
    total_codes = PromoCode.objects.count()
    active_codes = PromoCode.objects.filter(is_active=True).count()

    # Usage stats
    total_usages = PromoCodeUsage.objects.count()
    usages_last_30_days = PromoCodeUsage.objects.filter(
        used_at__gte=last_30_days
    ).count()
    usages_last_7_days = PromoCodeUsage.objects.filter(used_at__gte=last_7_days).count()

    # Revenue stats
    revenue_stats = PromoCodeUsage.objects.aggregate(
        total_discount=Sum("discount_amount"),
        total_revenue=Sum("final_amount"),
        total_original=Sum("original_amount"),
    )

    # Top performing codes
    top_codes = (
        PromoCode.objects.filter(times_used__gt=0)
        .order_by("-times_used")[:5]
        .values("id", "code", "times_used", "discount_type", "discount_value")
    )

    # Recent usages
    recent_usages = PromoCodeUsage.objects.select_related(
        "promo_code", "user"
    ).order_by("-used_at")[:10]

    return Response(
        {
            "overview": {
                "total_codes": total_codes,
                "active_codes": active_codes,
                "inactive_codes": total_codes - active_codes,
            },
            "usage_stats": {
                "total_usages": total_usages,
                "usages_last_7_days": usages_last_7_days,
                "usages_last_30_days": usages_last_30_days,
            },
            "revenue_stats": {
                "total_discount_given": float(revenue_stats["total_discount"] or 0),
                "total_revenue_from_promos": float(revenue_stats["total_revenue"] or 0),
                "original_value": float(revenue_stats["total_original"] or 0),
            },
            "top_performing_codes": list(top_codes),
            "recent_usages": PromoCodeUsageSerializer(recent_usages, many=True).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_plans(request):
    """Get available subscription plans for promo code restriction"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    plans = SubscriptionPlan.objects.filter(is_active=True).values(
        "id", "name", "plan_type", "price", "billing_period"
    )
    return Response(list(plans))
