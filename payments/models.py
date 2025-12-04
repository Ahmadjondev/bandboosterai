from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from accounts.models import User
import uuid


class SubscriptionPlan(models.Model):
    """
    Subscription plans for premium features
    - Plus: Basic plan with limited attempts
    - Pro: Standard plan with more attempts
    - Ultra: Premium plan with maximum attempts
    """

    PLAN_TYPES = (
        ("PLUS", "Plus"),
        ("PRO", "Pro"),
        ("ULTRA", "Ultra"),
    )

    BILLING_PERIOD = (
        ("MONTHLY", "Monthly"),
        ("YEARLY", "Yearly"),
    )

    name = models.CharField(max_length=50, verbose_name="Plan Name")
    plan_type = models.CharField(
        max_length=20,
        choices=PLAN_TYPES,
        unique=True,
        verbose_name="Plan Type",
    )
    description = models.TextField(null=True, blank=True, verbose_name="Description")

    # Pricing in UZS (tiyins for Payme = UZS * 100)
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Price (UZS)",
    )
    billing_period = models.CharField(
        max_length=20,
        choices=BILLING_PERIOD,
        default="MONTHLY",
        verbose_name="Billing Period",
    )

    # Attempts included in the plan (-1 means unlimited)
    writing_attempts = models.IntegerField(
        default=0,
        verbose_name="Writing Attempts",
        help_text="Number of writing check attempts per month (-1 for unlimited)",
    )
    speaking_attempts = models.IntegerField(
        default=0,
        verbose_name="Speaking Attempts",
        help_text="Number of speaking practice attempts per month (-1 for unlimited)",
    )
    reading_attempts = models.IntegerField(
        default=0,
        verbose_name="Premium Reading Attempts",
        help_text="Number of premium reading section attempts per month (-1 for unlimited)",
    )
    listening_attempts = models.IntegerField(
        default=0,
        verbose_name="Premium Listening Attempts",
        help_text="Number of premium listening section attempts per month (-1 for unlimited)",
    )
    book_access = models.BooleanField(
        default=False,
        verbose_name="Premium Books Access",
        help_text="Access to premium books",
    )

    # Features as JSON (for flexibility)
    features = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Features",
        help_text="List of features included in this plan",
    )

    # Display order
    display_order = models.PositiveIntegerField(default=0, verbose_name="Display Order")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    is_popular = models.BooleanField(
        default=False,
        verbose_name="Popular Badge",
        help_text="Show 'Most Popular' badge",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "subscription_plans"
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"
        ordering = ["display_order", "price"]

    def __str__(self):
        return (
            f"{self.name} - {self.price:,.0f} UZS/{self.get_billing_period_display()}"
        )

    def get_price_in_tiyins(self):
        """Convert UZS to tiyins for Payme (1 UZS = 100 tiyins)"""
        return int(self.price * 100)


class UserSubscription(models.Model):
    """
    User's active subscription
    """

    STATUS_CHOICES = (
        ("ACTIVE", "Active"),
        ("EXPIRED", "Expired"),
        ("CANCELLED", "Cancelled"),
        ("PENDING", "Pending Payment"),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="subscription",
        verbose_name="User",
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        related_name="subscriptions",
        verbose_name="Plan",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
        verbose_name="Status",
    )

    # Subscription period
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="Started At")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Expires At")

    # Auto renewal
    auto_renew = models.BooleanField(default=True, verbose_name="Auto Renew")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "user_subscriptions"
        verbose_name = "User Subscription"
        verbose_name_plural = "User Subscriptions"

    def __str__(self):
        return f"{self.user.username} - {self.plan.name if self.plan else 'No Plan'}"

    def is_valid(self):
        """Check if subscription is currently valid"""
        if self.status != "ACTIVE":
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True

    def days_remaining(self):
        """Get days remaining in subscription"""
        if not self.expires_at:
            return 0
        delta = self.expires_at - timezone.now()
        return max(0, delta.days)


class UserAttempts(models.Model):
    """
    Track user's available attempts for premium content
    Separate from subscription for flexibility (can purchase additional attempts)
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="attempts",
        verbose_name="User",
    )

    # Current attempt balances
    writing_attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Writing Attempts",
    )
    speaking_attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Speaking Attempts",
    )
    reading_attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Premium Reading Attempts",
    )
    listening_attempts = models.PositiveIntegerField(
        default=0,
        verbose_name="Premium Listening Attempts",
    )

    # Last reset date (for monthly refresh)
    last_reset_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Last Reset Date",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "user_attempts"
        verbose_name = "User Attempts"
        verbose_name_plural = "User Attempts"

    def __str__(self):
        return f"{self.user.username} - W:{self.writing_attempts} S:{self.speaking_attempts}"

    def get_total_attempts(self):
        """Get total attempts count for display"""
        return (
            self.writing_attempts
            + self.speaking_attempts
            + self.reading_attempts
            + self.listening_attempts
        )

    def use_attempt(self, attempt_type):
        """
        Use one attempt of the specified type
        Returns True if successful, False if no attempts available
        """
        field_name = f"{attempt_type.lower()}_attempts"
        if hasattr(self, field_name):
            current = getattr(self, field_name)
            if current > 0:
                setattr(self, field_name, current - 1)
                self.save(update_fields=[field_name, "updated_at"])
                return True
        return False

    def add_attempts(self, attempt_type, count):
        """Add attempts of the specified type"""
        field_name = f"{attempt_type.lower()}_attempts"
        if hasattr(self, field_name):
            current = getattr(self, field_name)
            setattr(self, field_name, current + count)
            self.save(update_fields=[field_name, "updated_at"])
            return True
        return False


class AttemptPackage(models.Model):
    """
    One-time purchase packages for additional attempts
    """

    ATTEMPT_TYPE_CHOICES = (
        ("WRITING", "Writing"),
        ("SPEAKING", "Speaking"),
        ("READING", "Reading"),
        ("LISTENING", "Listening"),
        ("MIXED", "Mixed (All Types)"),
    )

    name = models.CharField(max_length=100, verbose_name="Package Name")
    attempt_type = models.CharField(
        max_length=20,
        choices=ATTEMPT_TYPE_CHOICES,
        verbose_name="Attempt Type",
    )
    description = models.TextField(null=True, blank=True, verbose_name="Description")

    # Attempts included
    attempts_count = models.PositiveIntegerField(
        default=1,
        verbose_name="Attempts Count",
    )
    # For mixed packages
    writing_attempts = models.PositiveIntegerField(default=0)
    speaking_attempts = models.PositiveIntegerField(default=0)
    reading_attempts = models.PositiveIntegerField(default=0)
    listening_attempts = models.PositiveIntegerField(default=0)

    # Price in UZS
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Price (UZS)",
    )

    is_active = models.BooleanField(default=True, verbose_name="Active")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Display Order")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "attempt_packages"
        verbose_name = "Attempt Package"
        verbose_name_plural = "Attempt Packages"
        ordering = ["display_order", "price"]

    def __str__(self):
        return f"{self.name} - {self.attempts_count} attempts - {self.price:,.0f} UZS"

    def get_price_in_tiyins(self):
        """Convert UZS to tiyins for Payme"""
        return int(self.price * 100)


class PaymentOrder(models.Model):
    """
    Payment order for tracking purchases before Payme transaction
    """

    ORDER_TYPE_CHOICES = (
        ("SUBSCRIPTION", "Subscription"),
        ("ATTEMPTS", "Attempt Package"),
    )

    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("CANCELLED", "Cancelled"),
        ("EXPIRED", "Expired"),
    )

    # Unique order ID for Payme
    order_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name="Order ID",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="payment_orders",
        verbose_name="User",
    )
    order_type = models.CharField(
        max_length=20,
        choices=ORDER_TYPE_CHOICES,
        verbose_name="Order Type",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING",
        verbose_name="Status",
    )

    # Order details
    subscription_plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Subscription Plan",
    )
    attempt_package = models.ForeignKey(
        AttemptPackage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Attempt Package",
    )

    # Amount in UZS
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Amount (UZS)",
    )

    # Expiry for pending orders (12 hours as per Payme)
    expires_at = models.DateTimeField(verbose_name="Expires At")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="Paid At")

    class Meta:
        db_table = "payment_orders"
        verbose_name = "Payment Order"
        verbose_name_plural = "Payment Orders"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["order_id"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return f"Order {self.order_id} - {self.user.username} - {self.amount:,.0f} UZS"

    def get_amount_in_tiyins(self):
        """Convert UZS to tiyins for Payme"""
        return int(self.amount * 100)

    def is_expired(self):
        """Check if order has expired"""
        return timezone.now() > self.expires_at


class PaymeTransaction(models.Model):
    """
    Payme transaction record for Merchant API
    """

    STATE_CHOICES = (
        (1, "Created"),
        (2, "Completed"),
        (-1, "Cancelled after create"),
        (-2, "Cancelled after complete"),
    )

    REASON_CHOICES = (
        (1, "Receiver not found"),
        (2, "Debit operation error"),
        (3, "Transaction execution error"),
        (4, "Timeout cancellation"),
        (5, "Refund"),
        (10, "Unknown error"),
    )

    # Payme transaction ID
    payme_id = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Payme Transaction ID",
    )

    # Our internal order
    order = models.ForeignKey(
        PaymentOrder,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name="Order",
    )

    # Transaction state
    state = models.SmallIntegerField(
        choices=STATE_CHOICES,
        default=1,
        verbose_name="State",
    )

    # Amount in tiyins
    amount = models.BigIntegerField(verbose_name="Amount (Tiyins)")

    # Timestamps from Payme (in milliseconds)
    payme_time = models.BigIntegerField(
        verbose_name="Payme Create Time",
        help_text="Timestamp from Payme in milliseconds",
    )

    # Our timestamps
    create_time = models.BigIntegerField(
        verbose_name="Create Time",
        help_text="Our create timestamp in milliseconds",
    )
    perform_time = models.BigIntegerField(
        default=0,
        verbose_name="Perform Time",
        help_text="Transaction perform timestamp in milliseconds",
    )
    cancel_time = models.BigIntegerField(
        default=0,
        verbose_name="Cancel Time",
        help_text="Transaction cancel timestamp in milliseconds",
    )

    # Cancel reason
    reason = models.SmallIntegerField(
        choices=REASON_CHOICES,
        null=True,
        blank=True,
        verbose_name="Cancel Reason",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "payme_transactions"
        verbose_name = "Payme Transaction"
        verbose_name_plural = "Payme Transactions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["payme_id"]),
            models.Index(fields=["state"]),
        ]

    def __str__(self):
        return f"Payme {self.payme_id} - State: {self.get_state_display()}"


class AttemptUsageLog(models.Model):
    """
    Log of attempt usage for tracking and analytics
    """

    USAGE_TYPE_CHOICES = (
        ("WRITING", "Writing Check"),
        ("SPEAKING", "Speaking Practice"),
        ("READING", "Premium Reading"),
        ("LISTENING", "Premium Listening"),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="attempt_usage_logs",
        verbose_name="User",
    )
    usage_type = models.CharField(
        max_length=20,
        choices=USAGE_TYPE_CHOICES,
        verbose_name="Usage Type",
    )

    # Related content (for tracking what was accessed)
    content_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name="Content Type",
    )
    content_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Content ID",
    )

    # Timestamp
    used_at = models.DateTimeField(auto_now_add=True, verbose_name="Used At")

    class Meta:
        db_table = "attempt_usage_logs"
        verbose_name = "Attempt Usage Log"
        verbose_name_plural = "Attempt Usage Logs"
        ordering = ["-used_at"]
        indexes = [
            models.Index(fields=["user", "usage_type"]),
            models.Index(fields=["used_at"]),
        ]

    def __str__(self):
        return (
            f"{self.user.username} - {self.get_usage_type_display()} - {self.used_at}"
        )
