from rest_framework import serializers
from .models import (
    SubscriptionPlan,
    UserSubscription,
    UserAttempts,
    AttemptPackage,
    PaymentOrder,
    PaymeTransaction,
    AttemptUsageLog,
    PromoCode,
    PromoCodeUsage,
)


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans (public listing)"""

    price_formatted = serializers.SerializerMethodField()
    reading_unlimited = serializers.SerializerMethodField()
    listening_unlimited = serializers.SerializerMethodField()
    writing_unlimited = serializers.SerializerMethodField()
    speaking_unlimited = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            "id",
            "name",
            "plan_type",
            "description",
            "price",
            "price_formatted",
            "billing_period",
            "writing_attempts",
            "speaking_attempts",
            "reading_attempts",
            "listening_attempts",
            "cd_exam_attempts",
            "reading_unlimited",
            "listening_unlimited",
            "writing_unlimited",
            "speaking_unlimited",
            "book_access",
            "features",
            "is_popular",
        ]

    def get_price_formatted(self, obj):
        return f"{obj.price:,.0f} UZS"

    def get_reading_unlimited(self, obj):
        return obj.reading_attempts == -1

    def get_listening_unlimited(self, obj):
        return obj.listening_attempts == -1

    def get_writing_unlimited(self, obj):
        return obj.writing_attempts == -1

    def get_speaking_unlimited(self, obj):
        return obj.speaking_attempts == -1


class UserSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for user's subscription status"""

    plan = SubscriptionPlanSerializer(read_only=True)
    is_valid = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = UserSubscription
        fields = [
            "id",
            "plan",
            "status",
            "started_at",
            "expires_at",
            "auto_renew",
            "is_valid",
            "days_remaining",
        ]

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_days_remaining(self, obj):
        return obj.days_remaining()


class UserAttemptsSerializer(serializers.ModelSerializer):
    """Serializer for user's attempt balances"""

    total_attempts = serializers.SerializerMethodField()

    class Meta:
        model = UserAttempts
        fields = [
            "writing_attempts",
            "speaking_attempts",
            "reading_attempts",
            "listening_attempts",
            "total_attempts",
            "last_reset_date",
        ]

    def get_total_attempts(self, obj):
        return obj.get_total_attempts()


class AttemptPackageSerializer(serializers.ModelSerializer):
    """Serializer for attempt packages (one-time purchases)"""

    price_formatted = serializers.SerializerMethodField()

    class Meta:
        model = AttemptPackage
        fields = [
            "id",
            "name",
            "attempt_type",
            "description",
            "attempts_count",
            "writing_attempts",
            "speaking_attempts",
            "reading_attempts",
            "listening_attempts",
            "price",
            "price_formatted",
        ]

    def get_price_formatted(self, obj):
        return f"{obj.price:,.0f} UZS"


class PaymentOrderSerializer(serializers.ModelSerializer):
    """Serializer for payment orders"""

    subscription_plan = SubscriptionPlanSerializer(read_only=True)
    attempt_package = AttemptPackageSerializer(read_only=True)
    amount_formatted = serializers.SerializerMethodField()
    original_amount_formatted = serializers.SerializerMethodField()
    discount_amount_formatted = serializers.SerializerMethodField()
    promo_code_display = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = PaymentOrder
        fields = [
            "order_id",
            "order_type",
            "status",
            "subscription_plan",
            "attempt_package",
            "original_amount",
            "original_amount_formatted",
            "discount_amount",
            "discount_amount_formatted",
            "promo_code_display",
            "amount",
            "amount_formatted",
            "expires_at",
            "is_expired",
            "created_at",
            "paid_at",
        ]

    def get_amount_formatted(self, obj):
        return f"{obj.amount:,.0f} UZS"

    def get_original_amount_formatted(self, obj):
        if obj.original_amount:
            return f"{obj.original_amount:,.0f} UZS"
        return None

    def get_discount_amount_formatted(self, obj):
        if obj.discount_amount:
            return f"{obj.discount_amount:,.0f} UZS"
        return None

    def get_promo_code_display(self, obj):
        if obj.promo_code:
            return obj.promo_code.code
        return None

    def get_is_expired(self, obj):
        return obj.is_expired()


class CreateSubscriptionOrderSerializer(serializers.Serializer):
    """Serializer for creating a subscription order"""

    plan_id = serializers.IntegerField()

    def validate_plan_id(self, value):
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive subscription plan")
        return value


class CreateAttemptOrderSerializer(serializers.Serializer):
    """Serializer for creating an attempt package order"""

    package_id = serializers.IntegerField()

    def validate_package_id(self, value):
        try:
            package = AttemptPackage.objects.get(id=value, is_active=True)
        except AttemptPackage.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive attempt package")
        return value


class PaymeCheckoutSerializer(serializers.Serializer):
    """Serializer for generating Payme checkout URL"""

    order_id = serializers.UUIDField()

    def validate_order_id(self, value):
        try:
            order = PaymentOrder.objects.get(order_id=value, status="PENDING")
            if order.is_expired():
                raise serializers.ValidationError("Order has expired")
        except PaymentOrder.DoesNotExist:
            raise serializers.ValidationError("Order not found or already processed")
        return value


class PaymentHistorySerializer(serializers.ModelSerializer):
    """Serializer for payment history"""

    order_type_display = serializers.CharField(source="get_order_type_display")
    status_display = serializers.CharField(source="get_status_display")

    class Meta:
        model = PaymentOrder
        fields = [
            "order_id",
            "order_type",
            "order_type_display",
            "status",
            "status_display",
            "amount",
            "created_at",
            "paid_at",
        ]


class AttemptUsageLogSerializer(serializers.ModelSerializer):
    """Serializer for attempt usage logs"""

    usage_type_display = serializers.CharField(source="get_usage_type_display")

    class Meta:
        model = AttemptUsageLog
        fields = [
            "usage_type",
            "usage_type_display",
            "content_type",
            "content_id",
            "used_at",
        ]


class UserPaymentStatusSerializer(serializers.Serializer):
    """Combined serializer for user's payment/subscription status"""

    subscription = UserSubscriptionSerializer(allow_null=True)
    attempts = UserAttemptsSerializer()
    has_active_subscription = serializers.BooleanField()
    can_access_premium_books = serializers.BooleanField()


# ============== Promo Code Serializers ==============


class PromoCodeSerializer(serializers.ModelSerializer):
    """Full promo code serializer for manager panel"""

    applicable_plans_info = serializers.SerializerMethodField()
    discount_display = serializers.SerializerMethodField()
    is_currently_valid = serializers.SerializerMethodField()
    usage_stats = serializers.SerializerMethodField()

    class Meta:
        model = PromoCode
        fields = [
            "id",
            "code",
            "description",
            "discount_type",
            "discount_value",
            "discount_display",
            "applicable_plans",
            "applicable_plans_info",
            "min_purchase_amount",
            "max_discount_amount",
            "usage_limit",
            "usage_limit_per_user",
            "times_used",
            "usage_stats",
            "valid_from",
            "valid_until",
            "is_active",
            "is_currently_valid",
            "created_at",
            "updated_at",
        ]

    def get_applicable_plans_info(self, obj):
        plans = obj.applicable_plans.all()
        if not plans:
            return {"all_plans": True, "plans": []}
        return {
            "all_plans": False,
            "plans": [
                {"id": p.id, "name": p.name, "plan_type": p.plan_type} for p in plans
            ],
        }

    def get_discount_display(self, obj):
        if obj.discount_type == "PERCENTAGE":
            return f"{obj.discount_value}% off"
        return f"{obj.discount_value:,.0f} UZS off"

    def get_is_currently_valid(self, obj):
        return obj.is_valid()

    def get_usage_stats(self, obj):
        return {
            "times_used": obj.times_used,
            "limit": obj.usage_limit,
            "remaining": (
                (obj.usage_limit - obj.times_used) if obj.usage_limit else None
            ),
        }


class PromoCodeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating promo codes"""

    class Meta:
        model = PromoCode
        fields = [
            "code",
            "description",
            "discount_type",
            "discount_value",
            "applicable_plans",
            "min_purchase_amount",
            "max_discount_amount",
            "usage_limit",
            "usage_limit_per_user",
            "valid_from",
            "valid_until",
            "is_active",
        ]

    def validate_code(self, value):
        code = value.upper().strip()
        if len(code) < 3:
            raise serializers.ValidationError(
                "Promo code must be at least 3 characters"
            )
        if len(code) > 50:
            raise serializers.ValidationError("Promo code cannot exceed 50 characters")
        return code

    def validate_discount_value(self, value):
        if value <= 0:
            raise serializers.ValidationError("Discount value must be greater than 0")
        return value

    def validate(self, data):
        discount_type = data.get("discount_type", "PERCENTAGE")
        discount_value = data.get("discount_value", 0)

        if discount_type == "PERCENTAGE" and discount_value > 100:
            raise serializers.ValidationError(
                {"discount_value": "Percentage discount cannot exceed 100%"}
            )

        valid_from = data.get("valid_from")
        valid_until = data.get("valid_until")
        if valid_from and valid_until and valid_from >= valid_until:
            raise serializers.ValidationError(
                {"valid_until": "End date must be after start date"}
            )

        return data


class PromoCodeValidateSerializer(serializers.Serializer):
    """Serializer for validating a promo code"""

    code = serializers.CharField(max_length=50)
    plan_id = serializers.IntegerField(required=False)

    def validate_code(self, value):
        return value.upper().strip()


class PromoCodeApplyResponseSerializer(serializers.Serializer):
    """Response serializer for promo code application"""

    valid = serializers.BooleanField()
    code = serializers.CharField()
    discount_type = serializers.CharField()
    discount_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    original_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    final_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    message = serializers.CharField(required=False)


class PromoCodeUsageSerializer(serializers.ModelSerializer):
    """Serializer for promo code usage history"""

    promo_code_display = serializers.CharField(source="promo_code.code")
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = PromoCodeUsage
        fields = [
            "id",
            "promo_code_display",
            "user_info",
            "original_amount",
            "discount_amount",
            "final_amount",
            "used_at",
        ]

    def get_user_info(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "full_name": obj.user.get_full_name() or obj.user.username,
        }


class CreateSubscriptionOrderWithPromoSerializer(serializers.Serializer):
    """Serializer for creating a subscription order with optional promo code"""

    plan_id = serializers.IntegerField()
    promo_code = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_plan_id(self, value):
        try:
            SubscriptionPlan.objects.get(id=value, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive subscription plan")
        return value

    def validate_promo_code(self, value):
        if value:
            return value.upper().strip()
        return value
