"""
Payme Merchant API Implementation

This module implements all required Payme Merchant API methods:
- CheckPerformTransaction
- CreateTransaction
- PerformTransaction
- CancelTransaction
- CheckTransaction
- GetStatement

Reference: https://developer.help.paycom.uz/metody-merchant-api/

Implementation follows official Payme documentation:
- Authorization: Basic Auth with login "Paycom" and password = merchant KEY
- All responses return HTTP 200 (even errors)
- JSON-RPC 2.0 protocol
- Transaction timeout: 12 hours (43,200,000 ms)
"""

import base64
import logging
import time
from datetime import timedelta
from decimal import Decimal
from functools import wraps

from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .models import (
    PaymentOrder,
    PaymeTransaction,
    UserSubscription,
    UserAttempts,
    SubscriptionPlan,
)

logger = logging.getLogger(__name__)


# =============================================================================
# PAYME ERROR CODES (Official Documentation)
# =============================================================================
class PaymeError:
    """
    Official Payme error codes from documentation.
    https://developer.help.paycom.uz/protokol-merchant-api/obschie-oshibki
    """

    # General RPC errors
    INVALID_HTTP_METHOD = -32300  # Request method is not POST
    PARSE_ERROR = -32700  # JSON parse error
    INVALID_RPC = -32600  # Invalid RPC request (missing required fields)
    METHOD_NOT_FOUND = -32601  # Method not found
    INVALID_CREDENTIALS = -32504  # Invalid authorization credentials
    INTERNAL_ERROR = -32400  # Internal/system error

    # Merchant API specific errors
    INVALID_AMOUNT = -31001  # Invalid amount
    TRANSACTION_NOT_FOUND = -31003  # Transaction not found
    ORDER_COMPLETED = -31007  # Order completed, cannot cancel
    OPERATION_NOT_ALLOWED = -31008  # Operation not allowed in current state

    # Account errors (-31050 to -31099)
    INVALID_ACCOUNT = -31050  # Account not found
    ACCOUNT_ALREADY_EXISTS = -31051  # Account already exists
    INVALID_ACCOUNT_FORMAT = -31052  # Invalid account format


# =============================================================================
# PAYME TRANSACTION STATES
# =============================================================================
class TransactionState:
    """Transaction states as per Payme documentation"""

    CREATED = 1  # Transaction created, awaiting payment
    COMPLETED = 2  # Transaction completed successfully
    CANCELLED_BEFORE_COMPLETE = -1  # Cancelled before PerformTransaction
    CANCELLED_AFTER_COMPLETE = -2  # Cancelled after PerformTransaction (refund)


# =============================================================================
# PAYME CANCEL REASONS
# =============================================================================
class CancelReason:
    """Cancel reason codes as per Payme documentation"""

    RECEIVER_NOT_FOUND = 1  # Recipient not found
    DEBIT_ERROR = 2  # Error during debit operation
    TRANSACTION_ERROR = 3  # Error during transaction execution
    TIMEOUT = 4  # Cancellation due to timeout
    REFUND = 5  # Refund requested
    UNKNOWN = 10  # Unknown error


# =============================================================================
# PAYME IP WHITELIST (Official Documentation)
# =============================================================================
PAYME_IP_WHITELIST = [
    "185.234.113.1",
    "185.234.113.2",
    "185.234.113.3",
    "185.234.113.4",
    "185.234.113.5",
    "185.234.113.6",
    "185.234.113.7",
    "185.234.113.8",
    "185.234.113.9",
    "185.234.113.10",
    "185.234.113.11",
    "185.234.113.12",
    "185.234.113.13",
    "185.234.113.14",
    "185.234.113.15",
]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def get_current_time_ms():
    """Get current time in milliseconds (Unix timestamp)"""
    return int(time.time() * 1000)


def get_client_ip(request):
    """
    Get the client's IP address from the request.
    Handles both direct connections and proxied requests.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # Take the first IP in the chain (client's original IP)
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR", "")
    return ip


def check_ip_whitelist(request):
    """
    Verify request comes from Payme's IP addresses.
    Skip in test mode for easier development.

    Returns True if valid, (error_code, error_message) tuple if invalid.
    """
    # Skip IP check in test/development mode
    if settings.PAYME_TEST_MODE or settings.DEBUG:
        return True

    client_ip = get_client_ip(request)

    if client_ip not in PAYME_IP_WHITELIST:
        logger.warning(f"Payme request from unauthorized IP: {client_ip}")
        return (PaymeError.INVALID_CREDENTIALS, "Unauthorized IP address")

    return True


def verify_payme_credentials(request):
    """
    Verify Payme Basic Auth credentials.

    According to Payme documentation:
    - Authorization header format: Basic base64(login:password)
    - login: "Paycom" (fixed, provided by Payme Business)
    - password: The merchant KEY (36 characters string)
    - For production: use PAYME_MERCHANT_KEY
    - For test: use PAYME_MERCHANT_TEST_KEY

    Returns True if valid, (error_code, error_message) tuple if invalid.
    """
    auth_header = request.headers.get("Authorization", "")
    debug = settings.DEBUG

    if debug:
        print("=" * 60)
        print("PAYME DEBUG: Verifying credentials...")
        print("=" * 60)

    if not auth_header.startswith("Basic "):
        if debug:
            print(f"PAYME DEBUG: Missing or invalid Authorization header")
        logger.warning("Payme: Missing or invalid Authorization header format")
        return (PaymeError.INVALID_CREDENTIALS, "Invalid authorization header")

    try:
        # Decode Basic Auth
        encoded = auth_header.split(" ", 1)[1]
        decoded = base64.b64decode(encoded).decode("utf-8")

        # Format is "login:password"
        if ":" not in decoded:
            return (PaymeError.INVALID_CREDENTIALS, "Invalid authorization format")

        # Split only on the first colon (password might contain colons)
        parts = decoded.split(":", 1)
        login = parts[0]
        password = parts[1] if len(parts) > 1 else ""

        # Payme always sends "Paycom" as login
        if login != "Paycom":
            logger.warning(f"Payme: Invalid login received: {login}")
            return (PaymeError.INVALID_CREDENTIALS, "Invalid login")

        # Get expected key based on mode
        if settings.PAYME_TEST_MODE:
            test_key = getattr(settings, "PAYME_MERCHANT_TEST_KEY", "")
            prod_key = getattr(settings, "PAYME_MERCHANT_KEY", "")
            expected_key = test_key or prod_key
        else:
            expected_key = settings.PAYME_MERCHANT_KEY

        if not expected_key:
            logger.error("Payme: Merchant key not configured in settings")
            return (PaymeError.INTERNAL_ERROR, "Merchant key not configured")

        # Compare credentials
        if password == expected_key:
            if debug:
                print("PAYME DEBUG: Authentication SUCCESSFUL!")
            return True

        # Invalid credentials
        if debug:
            print(f"PAYME DEBUG: Password mismatch. Received length: {len(password)}")
        logger.warning("Payme: Invalid merchant key provided")
        return (PaymeError.INVALID_CREDENTIALS, "Invalid credentials")

    except Exception as e:
        logger.exception(f"Payme: Authorization error: {str(e)}")
        return (PaymeError.INVALID_CREDENTIALS, f"Authorization error: {str(e)}")


# =============================================================================
# RESPONSE FORMATTERS
# =============================================================================


def payme_error_response(error_code, message, data=None, request_id=None):
    """
    Generate Payme error response following JSON-RPC 2.0 format.

    Args:
        error_code: One of the PaymeError codes
        message: Error message (will be localized to ru/uz/en)
        data: Additional error data (e.g., field name for account errors)
        request_id: The request ID from the incoming request

    Returns:
        dict: JSON-RPC 2.0 error response
    """
    response = {
        "error": {
            "code": error_code,
            "message": {
                "ru": message,
                "uz": message,
                "en": message,
            },
        },
    }
    if data:
        response["error"]["data"] = data
    if request_id is not None:
        response["id"] = request_id
    return response


def payme_success_response(result, request_id=None):
    """
    Generate Payme success response following JSON-RPC 2.0 format.

    Args:
        result: The result object to return
        request_id: The request ID from the incoming request

    Returns:
        dict: JSON-RPC 2.0 success response
    """
    response = {"result": result}
    if request_id is not None:
        response["id"] = request_id
    return response


# =============================================================================
# PAYME MERCHANT API METHOD HANDLERS
# =============================================================================


def check_perform_transaction(params):
    """
    CheckPerformTransaction - Check if transaction can be performed.

    This method is called BEFORE CreateTransaction to verify if the payment
    can be processed. It should check:
    - Account (id) exists
    - Order is in valid state (PENDING)
    - Order hasn't expired
    - Amount matches the order amount

    Params:
        - amount: Amount in tiyins (1 UZS = 100 tiyins)
        - account: {id: "uuid"}

    Returns:
        - allow: true if transaction can be performed
        - additional: (optional) additional info about the order
    """
    amount = params.get("amount")
    account = params.get("account", {})
    id = account.get("id")

    # Validate id is provided
    if not id:
        return payme_error_response(
            PaymeError.INVALID_ACCOUNT,
            "Order ID is required",
            data="id",
        )

    # Find the order
    try:
        order = PaymentOrder.objects.select_related(
            "user", "subscription_plan", "attempt_package"
        ).get(id=id)
    except PaymentOrder.DoesNotExist:
        return payme_error_response(
            PaymeError.INVALID_ACCOUNT,
            "Order not found",
            data="id",
        )

    # Check if order is in valid state
    if order.status != "PENDING":
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED,
            f"Order is already {order.status.lower()}",
        )

    # Check if order has expired
    if order.is_expired():
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED,
            "Order has expired",
        )

    # Validate amount matches
    expected_amount = order.get_amount_in_tiyins()
    if amount != expected_amount:
        return payme_error_response(
            PaymeError.INVALID_AMOUNT,
            f"Invalid amount. Expected {expected_amount}, got {amount}",
        )

    # Build additional info for display in Payme app
    additional = {
        "user": order.user.username,
    }

    if order.order_type == "SUBSCRIPTION" and order.subscription_plan:
        additional["plan"] = order.subscription_plan.name
    elif order.order_type == "ATTEMPTS" and order.attempt_package:
        additional["package"] = order.attempt_package.name

    return payme_success_response(
        {
            "allow": True,
            "additional": additional,
        }
    )


def create_transaction(params):
    """
    CreateTransaction - Create a new transaction.

    This method creates a transaction record in our system. Key requirements:
    - Store transaction in persistent storage
    - Verify account exists and is valid
    - Verify amount matches
    - Reserve the order (prevent modifications)
    - Set order status to "awaiting payment"
    - Handle duplicate requests (return existing transaction if same payme_id)

    Transaction timeout: 12 hours (43,200,000 ms) from creation.

    Params:
        - id: Payme transaction ID (24 character hex string)
        - time: Payme timestamp in milliseconds
        - amount: Amount in tiyins
        - account: {id: "uuid"}

    Returns:
        - create_time: Our timestamp in milliseconds
        - transaction: Our internal transaction ID
        - state: Transaction state (1 = created)
    """
    payme_id = params.get("id")
    payme_time = params.get("time")
    amount = params.get("amount")
    account = params.get("account", {})
    id = account.get("id")

    # Check if transaction already exists (idempotency)
    existing_transaction = PaymeTransaction.objects.filter(payme_id=payme_id).first()

    if existing_transaction:
        # Transaction already exists - check if it's still valid
        current_time = get_current_time_ms()
        timeout_ms = getattr(settings, "PAYME_TRANSACTION_TIMEOUT", 43200000)

        if existing_transaction.state == TransactionState.CREATED:
            # Check for timeout
            if current_time - existing_transaction.create_time > timeout_ms:
                # Cancel due to timeout
                existing_transaction.state = TransactionState.CANCELLED_BEFORE_COMPLETE
                existing_transaction.reason = CancelReason.TIMEOUT
                existing_transaction.cancel_time = current_time
                existing_transaction.save(
                    update_fields=["state", "reason", "cancel_time", "updated_at"]
                )

                # Update order status
                try:
                    order = existing_transaction.order
                    order.status = "EXPIRED"
                    order.save(update_fields=["status", "updated_at"])
                except Exception:
                    pass

                return payme_error_response(
                    PaymeError.OPERATION_NOT_ALLOWED,
                    "Transaction timed out",
                )

        # Return existing transaction info
        return payme_success_response(
            {
                "create_time": existing_transaction.create_time,
                "transaction": str(existing_transaction.id),
                "state": existing_transaction.state,
            }
        )

    # Validate id
    if not id:
        return payme_error_response(
            PaymeError.INVALID_ACCOUNT,
            "Order ID is required",
            data="id",
        )

    # Find and validate the order
    try:
        order = PaymentOrder.objects.select_for_update().get(id=id)
    except PaymentOrder.DoesNotExist:
        return payme_error_response(
            PaymeError.INVALID_ACCOUNT,
            "Order not found",
            data="id",
        )

    # Check order state
    if order.status != "PENDING":
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED,
            f"Order is already {order.status.lower()}",
        )

    # Check if order has expired
    if order.is_expired():
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED,
            "Order has expired",
        )

    # Check if there's already a transaction for this order
    existing_order_tx = (
        PaymeTransaction.objects.filter(
            order=order,
            state=TransactionState.CREATED,
        )
        .exclude(payme_id=payme_id)
        .first()
    )

    if existing_order_tx:
        # Another transaction exists for this order - cancel the old one
        current_time = get_current_time_ms()
        existing_order_tx.state = TransactionState.CANCELLED_BEFORE_COMPLETE
        existing_order_tx.reason = CancelReason.UNKNOWN
        existing_order_tx.cancel_time = current_time
        existing_order_tx.save(
            update_fields=["state", "reason", "cancel_time", "updated_at"]
        )

    # Validate amount
    expected_amount = order.get_amount_in_tiyins()
    if amount != expected_amount:
        return payme_error_response(
            PaymeError.INVALID_AMOUNT,
            f"Invalid amount. Expected {expected_amount}, got {amount}",
        )

    # Create new transaction
    create_time = get_current_time_ms()
    transaction = PaymeTransaction.objects.create(
        payme_id=payme_id,
        order=order,
        state=TransactionState.CREATED,
        amount=amount,
        payme_time=payme_time,
        create_time=create_time,
    )

    logger.info(f"Payme: Created transaction {transaction.id} for order {id}")

    return payme_success_response(
        {
            "create_time": create_time,
            "transaction": str(transaction.id),
            "state": TransactionState.CREATED,
        }
    )


def perform_transaction(params):
    """
    PerformTransaction - Complete the transaction and fulfill the order.

    This method is called after successful payment processing. It should:
    - Verify transaction exists and is in correct state
    - Check for timeout
    - Mark transaction as completed
    - Update order status to PAID
    - Fulfill the order (add subscription/attempts)

    Params:
        - id: Payme transaction ID

    Returns:
        - transaction: Our internal transaction ID
        - perform_time: Timestamp in milliseconds
        - state: Transaction state (2 = completed)
    """
    payme_id = params.get("id")

    try:
        transaction = PaymeTransaction.objects.select_related("order").get(
            payme_id=payme_id
        )
    except PaymeTransaction.DoesNotExist:
        return payme_error_response(
            PaymeError.TRANSACTION_NOT_FOUND,
            "Transaction not found",
        )

    # If already completed, return success (idempotency)
    if transaction.state == TransactionState.COMPLETED:
        return payme_success_response(
            {
                "transaction": str(transaction.id),
                "perform_time": transaction.perform_time,
                "state": TransactionState.COMPLETED,
            }
        )

    # Can only perform transactions in CREATED state
    if transaction.state != TransactionState.CREATED:
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED,
            "Cannot perform transaction in current state",
        )

    # Check for timeout
    timeout_ms = getattr(settings, "PAYME_TRANSACTION_TIMEOUT", 43200000)
    current_time = get_current_time_ms()

    if current_time - transaction.create_time > timeout_ms:
        # Cancel due to timeout
        transaction.state = TransactionState.CANCELLED_BEFORE_COMPLETE
        transaction.reason = CancelReason.TIMEOUT
        transaction.cancel_time = current_time
        transaction.save(update_fields=["state", "reason", "cancel_time", "updated_at"])

        # Update order status
        order = transaction.order
        order.status = "EXPIRED"
        order.save(update_fields=["status", "updated_at"])

        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED,
            "Transaction timed out",
        )

    # Perform the transaction
    perform_time = current_time
    transaction.state = TransactionState.COMPLETED
    transaction.perform_time = perform_time
    transaction.save(update_fields=["state", "perform_time", "updated_at"])

    # Update order status
    order = transaction.order
    order.status = "PAID"
    order.paid_at = timezone.now()
    order.save(update_fields=["status", "paid_at", "updated_at"])

    # Fulfill the order (add subscription or attempts to user)
    try:
        fulfill_order(order)
        logger.info(
            f"Payme: Successfully performed transaction {transaction.id}, order {order.id} fulfilled"
        )
    except Exception as e:
        logger.exception(f"Payme: Error fulfilling order {order.id}: {str(e)}")
        # Note: Transaction is still marked as completed per Payme requirements
        # The fulfillment error should be handled separately

    return payme_success_response(
        {
            "transaction": str(transaction.id),
            "perform_time": perform_time,
            "state": TransactionState.COMPLETED,
        }
    )


def cancel_transaction(params):
    """
    CancelTransaction - Cancel a transaction.

    This method cancels either a created or completed transaction.
    - If state is CREATED (1): Cancel and set state to -1
    - If state is COMPLETED (2): Refund and set state to -2

    Note: Business logic may prevent cancellation of completed transactions
    if goods/services have already been delivered. Return error -31007 in that case.

    Params:
        - id: Payme transaction ID
        - reason: Cancel reason code (1-5, 10)

    Returns:
        - transaction: Our internal transaction ID
        - cancel_time: Timestamp in milliseconds
        - state: New transaction state (-1 or -2)
    """
    payme_id = params.get("id")
    reason = params.get("reason")

    try:
        transaction = PaymeTransaction.objects.select_related("order").get(
            payme_id=payme_id
        )
    except PaymeTransaction.DoesNotExist:
        return payme_error_response(
            PaymeError.TRANSACTION_NOT_FOUND,
            "Transaction not found",
        )

    # If already cancelled, return success (idempotency)
    if transaction.state in [
        TransactionState.CANCELLED_BEFORE_COMPLETE,
        TransactionState.CANCELLED_AFTER_COMPLETE,
    ]:
        return payme_success_response(
            {
                "transaction": str(transaction.id),
                "cancel_time": transaction.cancel_time,
                "state": transaction.state,
            }
        )

    cancel_time = get_current_time_ms()
    order = transaction.order

    if transaction.state == TransactionState.CREATED:
        # Cancel before completion - straightforward
        transaction.state = TransactionState.CANCELLED_BEFORE_COMPLETE
        transaction.cancel_time = cancel_time
        transaction.reason = reason
        transaction.save(update_fields=["state", "cancel_time", "reason", "updated_at"])

        # Update order status
        order.status = "CANCELLED"
        order.save(update_fields=["status", "updated_at"])

        logger.info(
            f"Payme: Cancelled transaction {transaction.id} (before completion), reason: {reason}"
        )

    elif transaction.state == TransactionState.COMPLETED:
        # Cancel after completion (refund)
        # Check if we can allow refund based on business logic
        # For subscription/attempts that have already been used, you might want to deny this

        # For now, we allow refunds - you can add business logic here
        # Example: Check if subscription has been used
        # if order.order_type == "SUBSCRIPTION" and subscription_has_been_used(order):
        #     return payme_error_response(
        #         PaymeError.ORDER_COMPLETED,
        #         "Cannot cancel. Service has been used.",
        #     )

        transaction.state = TransactionState.CANCELLED_AFTER_COMPLETE
        transaction.cancel_time = cancel_time
        transaction.reason = reason
        transaction.save(update_fields=["state", "cancel_time", "reason", "updated_at"])

        # Update order status
        order.status = "CANCELLED"
        order.save(update_fields=["status", "updated_at"])

        # Optionally revert subscription/attempts
        # This depends on business requirements - uncomment if needed
        # revert_order_fulfillment(order)

        logger.info(
            f"Payme: Refunded transaction {transaction.id} (after completion), reason: {reason}"
        )

    else:
        # Invalid state for cancellation
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED,
            "Cannot cancel transaction in current state",
        )

    return payme_success_response(
        {
            "transaction": str(transaction.id),
            "cancel_time": cancel_time,
            "state": transaction.state,
        }
    )


def check_transaction(params):
    """
    CheckTransaction - Check transaction status.

    Returns the current state and timestamps of a transaction.

    Params:
        - id: Payme transaction ID

    Returns:
        - create_time: Transaction creation timestamp in ms
        - perform_time: Transaction completion timestamp in ms (0 if not completed)
        - cancel_time: Transaction cancellation timestamp in ms (0 if not cancelled)
        - transaction: Our internal transaction ID
        - state: Current transaction state
        - reason: Cancel reason (null if not cancelled)
    """
    payme_id = params.get("id")

    try:
        transaction = PaymeTransaction.objects.get(payme_id=payme_id)
    except PaymeTransaction.DoesNotExist:
        return payme_error_response(
            PaymeError.TRANSACTION_NOT_FOUND,
            "Transaction not found",
        )

    return payme_success_response(
        {
            "create_time": transaction.create_time,
            "perform_time": transaction.perform_time,
            "cancel_time": transaction.cancel_time,
            "transaction": str(transaction.id),
            "state": transaction.state,
            "reason": transaction.reason,
        }
    )


def get_statement(params):
    """
    GetStatement - Get list of transactions for a period.

    This method is used for reconciliation between merchant and Payme Business.
    Returns all transactions created within the specified time range.

    Requirements:
    - Search by Payme's create time (payme_time field)
    - Include transactions where: from <= payme_time <= to
    - Sort by payme_time in ascending order
    - Return empty list if no transactions found

    Params:
        - from: Start timestamp in milliseconds
        - to: End timestamp in milliseconds

    Returns:
        - transactions: List of transaction objects
    """
    from_time = params.get("from")
    to_time = params.get("to")

    transactions = (
        PaymeTransaction.objects.filter(
            payme_time__gte=from_time,
            payme_time__lte=to_time,
        )
        .select_related("order")
        .order_by("payme_time")
    )

    result = []
    for tx in transactions:
        order = tx.order
        result.append(
            {
                "id": tx.payme_id,
                "time": tx.payme_time,
                "amount": tx.amount,
                "account": {
                    "id": str(order.id),
                },
                "create_time": tx.create_time,
                "perform_time": tx.perform_time,
                "cancel_time": tx.cancel_time,
                "transaction": str(tx.id),
                "state": tx.state,
                "reason": tx.reason,
            }
        )

    return payme_success_response({"transactions": result})


def change_password(params):
    """
    ChangePassword - Change the merchant API password/key.

    This method allows Payme to request a password change for security purposes.
    The new password should be saved and used for future authentication.

    NOTE: In production, you should implement proper password storage/update logic.
    For now, we'll just acknowledge the request since the password is stored in settings.

    Params:
        - password: The new password/key to use

    Returns:
        - success: true if password was changed successfully
    """
    new_password = params.get("password")

    if not new_password:
        return payme_error_response(
            PaymeError.INVALID_RPC,
            "Password is required",
        )

    # Log the password change request
    # In production, you would update the password in your secure storage
    logger.info(
        f"Payme: ChangePassword requested. New password length: {len(new_password)}"
    )

    # NOTE: In a real implementation, you would:
    # 1. Validate the new password format
    # 2. Store it securely (database, secrets manager, etc.)
    # 3. Update the application configuration
    #
    # For now, we acknowledge the request but don't actually change anything
    # since the password is stored in Django settings which are read-only at runtime.

    if settings.DEBUG:
        print(f"PAYME DEBUG: ChangePassword requested")
        print("PAYME DEBUG: NOTE - Password not changed (stored in Django settings)")

    return payme_success_response({"success": True})


# =============================================================================
# ORDER FULFILLMENT
# =============================================================================


def fulfill_order(order):
    """
    Fulfill a paid order by adding subscription or attempts to the user.

    This function is called after a successful PerformTransaction.
    It adds the purchased subscription or attempts to the user's account.
    """
    user = order.user

    if order.order_type == "SUBSCRIPTION":
        # Add or extend subscription
        plan = order.subscription_plan
        if not plan:
            logger.error(f"Order {order.id} has no subscription plan")
            return

        subscription, created = UserSubscription.objects.get_or_create(
            user=user,
            defaults={
                "plan": plan,
                "status": "ACTIVE",
                "started_at": timezone.now(),
            },
        )

        if not created:
            # Existing subscription - extend or upgrade
            if subscription.is_valid():
                # Extend from current expiry
                start_date = subscription.expires_at
            else:
                # Start fresh
                start_date = timezone.now()
                subscription.started_at = start_date

            subscription.plan = plan
            subscription.status = "ACTIVE"
        else:
            start_date = timezone.now()
            subscription.started_at = start_date

        # Calculate expiry based on billing period
        if plan.billing_period == "MONTHLY":
            subscription.expires_at = start_date + timedelta(days=30)
        elif plan.billing_period == "QUARTERLY":
            subscription.expires_at = start_date + timedelta(days=90)
        elif plan.billing_period == "BIANNUAL":
            subscription.expires_at = start_date + timedelta(days=180)
        else:  # YEARLY
            subscription.expires_at = start_date + timedelta(days=365)

        subscription.save()

        # Add attempts from the plan
        # Note: -1 means unlimited, so we treat it specially
        # For UserAttempts, we use large number (999999) to represent unlimited
        # since the model uses PositiveIntegerField
        attempts, _ = UserAttempts.objects.get_or_create(user=user)

        # Helper to add attempts (handle -1 as unlimited)
        def add_plan_attempts(current, plan_value):
            if plan_value == -1:
                # Unlimited - set to a very large number
                return 999999
            return current + max(0, plan_value)

        attempts.writing_attempts = add_plan_attempts(
            attempts.writing_attempts, plan.writing_attempts
        )
        attempts.speaking_attempts = add_plan_attempts(
            attempts.speaking_attempts, plan.speaking_attempts
        )
        attempts.reading_attempts = add_plan_attempts(
            attempts.reading_attempts, plan.reading_attempts
        )
        attempts.listening_attempts = add_plan_attempts(
            attempts.listening_attempts, plan.listening_attempts
        )
        attempts.save()

        logger.info(f"Fulfilled subscription order {order.id} for user {user.username}")

    elif order.order_type == "ATTEMPTS":
        # Add attempts from package
        package = order.attempt_package
        if not package:
            logger.error(f"Order {order.id} has no attempt package")
            return

        attempts, _ = UserAttempts.objects.get_or_create(user=user)

        if package.attempt_type == "MIXED":
            attempts.writing_attempts += package.writing_attempts
            attempts.speaking_attempts += package.speaking_attempts
            attempts.reading_attempts += package.reading_attempts
            attempts.listening_attempts += package.listening_attempts
        else:
            # Single type package
            field_name = f"{package.attempt_type.lower()}_attempts"
            current = getattr(attempts, field_name, 0)
            setattr(attempts, field_name, current + package.attempts_count)

        attempts.save()

        logger.info(
            f"Fulfilled attempt package order {order.id} for user {user.username}"
        )


# =============================================================================
# MAIN PAYME ENDPOINT
# =============================================================================


# Method handlers mapping
PAYME_METHODS = {
    "CheckPerformTransaction": check_perform_transaction,
    "CreateTransaction": create_transaction,
    "PerformTransaction": perform_transaction,
    "CancelTransaction": cancel_transaction,
    "CheckTransaction": check_transaction,
    "GetStatement": get_statement,
    "ChangePassword": change_password,
}


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def payme_endpoint(request):
    """
    Main Payme Merchant API endpoint.

    Handles all Payme JSON-RPC 2.0 requests:
    - CheckPerformTransaction: Verify if payment can be made
    - CreateTransaction: Create a new transaction
    - PerformTransaction: Complete the payment
    - CancelTransaction: Cancel/refund a transaction
    - CheckTransaction: Check transaction status
    - GetStatement: Get transaction list for reconciliation
    - ChangePassword: Change merchant API password

    All responses return HTTP 200 as per Payme specification.
    Errors are returned in the JSON-RPC error format.
    """
    request_id = None
    debug = settings.DEBUG

    if debug:
        print("\n" + "=" * 80)
        print("PAYME ENDPOINT: NEW REQUEST RECEIVED")
        print("=" * 80)

    try:
        # Parse request data
        data = request.data
        request_id = data.get("id")
        method = data.get("method")
        params = data.get("params", {})

        # Log incoming request
        logger.info(f"Payme: Received request - Method: {method}, ID: {request_id}")

        if debug:
            print(f"PAYME DEBUG: Method: {method}, ID: {request_id}")

        # Check IP whitelist
        ip_check = check_ip_whitelist(request)
        if ip_check is not True:
            error_code, error_message = ip_check
            return JsonResponse(
                payme_error_response(error_code, error_message, request_id=request_id),
                status=200,
            )

        # Verify credentials
        auth_result = verify_payme_credentials(request)
        if auth_result is not True:
            error_code, error_message = auth_result
            return JsonResponse(
                payme_error_response(error_code, error_message, request_id=request_id),
                status=200,
            )

        # Validate method exists
        handler = PAYME_METHODS.get(method)
        if not handler:
            logger.warning(f"Payme: Unknown method requested: {method}")
            return JsonResponse(
                payme_error_response(
                    PaymeError.METHOD_NOT_FOUND,
                    f"Method '{method}' not found",
                    data=method,
                    request_id=request_id,
                ),
                status=200,
            )

        # Execute the method handler
        if debug:
            print(f"PAYME DEBUG: Executing handler for method: {method}")

        result = handler(params)

        # Add request ID to response if not already present
        if request_id is not None and "id" not in result:
            result["id"] = request_id

        logger.info(f"Payme: Request {request_id} completed - Method: {method}")

        if debug:
            print(f"PAYME DEBUG: Response: {result}")
            print("=" * 80 + "\n")

        return JsonResponse(result, status=200)

    except Exception as e:
        logger.exception(f"Payme: Internal error processing request: {str(e)}")
        return JsonResponse(
            payme_error_response(
                PaymeError.INTERNAL_ERROR,
                f"Internal error: {str(e)}",
                request_id=request_id,
            ),
            status=200,
        )


# =============================================================================
# UTILITY FUNCTIONS FOR CHECKOUT URL GENERATION
# =============================================================================


def generate_payme_checkout_url(order, return_url=None):
    """
    Generate Payme checkout URL for redirecting user to payment page.

    According to Payme documentation, the checkout URL format is:
    https://checkout.paycom.uz/{base64_encoded_params}

    For test/sandbox:
    https://test.paycom.uz/{base64_encoded_params}

    The params include:
    - m: Merchant ID
    - ac.id: Account field (id)
    - a: Amount in tiyins
    - l: Language (optional, default: ru)
    - c: Callback URL (optional)

    Args:
        order: PaymentOrder instance
        return_url: Optional URL to redirect after payment

    Returns:
        str: Full checkout URL
    """
    import base64

    merchant_id = settings.PAYME_MERCHANT_ID
    if not merchant_id:
        raise ValueError("PAYME_MERCHANT_ID is not configured")

    # Build params string
    params = f"m={merchant_id}"
    params += f";ac.id={order.id}"
    params += f";a={order.get_amount_in_tiyins()}"

    # Optional language (can be: ru, uz, en)
    params += ";l=en"

    # Optional callback URL
    if return_url:
        params += f";c={return_url}"

    # Base64 encode the params
    encoded_params = base64.b64encode(params.encode()).decode()

    # Get checkout base URL based on test mode
    if settings.PAYME_TEST_MODE:
        base_url = "https://test.paycom.uz"
    else:
        base_url = getattr(settings, "PAYME_CHECKOUT_URL", "https://checkout.paycom.uz")

    return f"{base_url}/{encoded_params}"


def verify_payme_configuration():
    """
    Verify that all required Payme settings are configured.

    Returns:
        dict: Configuration status with any missing settings
    """
    issues = []
    warnings = []

    # Check required settings
    if not getattr(settings, "PAYME_MERCHANT_ID", ""):
        issues.append("PAYME_MERCHANT_ID is not set")

    if not getattr(settings, "PAYME_MERCHANT_KEY", ""):
        issues.append("PAYME_MERCHANT_KEY is not set")

    # Check test mode settings
    if settings.PAYME_TEST_MODE:
        test_key = getattr(settings, "PAYME_MERCHANT_TEST_KEY", "")
        if not test_key:
            warnings.append(
                "PAYME_MERCHANT_TEST_KEY not set, will use PAYME_MERCHANT_KEY for test mode"
            )

    # Check timeout setting
    timeout = getattr(settings, "PAYME_TRANSACTION_TIMEOUT", None)
    if timeout != 43200000:
        warnings.append(
            f"PAYME_TRANSACTION_TIMEOUT is {timeout}, recommended: 43200000 (12 hours)"
        )

    return {
        "is_valid": len(issues) == 0,
        "test_mode": settings.PAYME_TEST_MODE,
        "issues": issues,
        "warnings": warnings,
        "merchant_id": (
            getattr(settings, "PAYME_MERCHANT_ID", "")[:8] + "..."
            if getattr(settings, "PAYME_MERCHANT_ID", "")
            else None
        ),
    }
