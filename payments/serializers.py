from rest_framework import serializers
from .models import (
    SubscriptionPlan,
    UserSubscription,
    UserAttempts,
    AttemptPackage,
    PaymentOrder,
    PaymeTransaction,
    AttemptUsageLog,
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
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = PaymentOrder
        fields = [
            "order_id",
            "order_type",
            "status",
            "subscription_plan",
            "attempt_package",
            "amount",
            "amount_formatted",
            "expires_at",
            "is_expired",
            "created_at",
            "paid_at",
        ]

    def get_amount_formatted(self, obj):
        return f"{obj.amount:,.0f} UZS"

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
