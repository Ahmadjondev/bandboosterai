from django.contrib import admin
from .models import (
    SubscriptionPlan,
    UserSubscription,
    UserAttempts,
    AttemptPackage,
    PaymentOrder,
    PaymeTransaction,
    AttemptUsageLog,
)


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "plan_type",
        "price",
        "billing_period",
        "writing_attempts",
        "speaking_attempts",
        "is_active",
        "is_popular",
    ]
    list_filter = ["plan_type", "billing_period", "is_active", "is_popular"]
    search_fields = ["name", "description"]
    ordering = ["display_order", "price"]


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "plan",
        "status",
        "started_at",
        "expires_at",
        "auto_renew",
    ]
    list_filter = ["status", "plan", "auto_renew"]
    search_fields = ["user__username", "user__email"]
    raw_id_fields = ["user", "plan"]
    date_hierarchy = "started_at"


@admin.register(UserAttempts)
class UserAttemptsAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "writing_attempts",
        "speaking_attempts",
        "reading_attempts",
        "listening_attempts",
        "last_reset_date",
    ]
    search_fields = ["user__username", "user__email"]
    raw_id_fields = ["user"]


@admin.register(AttemptPackage)
class AttemptPackageAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "attempt_type",
        "attempts_count",
        "price",
        "is_active",
    ]
    list_filter = ["attempt_type", "is_active"]
    search_fields = ["name", "description"]
    ordering = ["display_order", "price"]


@admin.register(PaymentOrder)
class PaymentOrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_id",
        "user",
        "order_type",
        "status",
        "amount",
        "created_at",
        "paid_at",
    ]
    list_filter = ["order_type", "status"]
    search_fields = ["order_id", "user__username", "user__email"]
    raw_id_fields = ["user", "subscription_plan", "attempt_package"]
    date_hierarchy = "created_at"
    readonly_fields = ["order_id"]


@admin.register(PaymeTransaction)
class PaymeTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "payme_id",
        "order",
        "state",
        "amount",
        "created_at",
    ]
    list_filter = ["state", "reason"]
    search_fields = ["payme_id", "order__order_id"]
    raw_id_fields = ["order"]
    date_hierarchy = "created_at"
    readonly_fields = [
        "payme_id",
        "payme_time",
        "create_time",
        "perform_time",
        "cancel_time",
    ]


@admin.register(AttemptUsageLog)
class AttemptUsageLogAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "usage_type",
        "content_type",
        "content_id",
        "used_at",
    ]
    list_filter = ["usage_type"]
    search_fields = ["user__username", "user__email"]
    raw_id_fields = ["user"]
    date_hierarchy = "used_at"
