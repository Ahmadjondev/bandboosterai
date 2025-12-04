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
"""

import base64
import time
from datetime import timedelta
from decimal import Decimal

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


# Payme error codes
class PaymeError:
    INVALID_AMOUNT = -31001
    INVALID_ACCOUNT = -31050
    TRANSACTION_NOT_FOUND = -31003
    OPERATION_NOT_ALLOWED = -31008
    INVALID_CREDENTIALS = -32504
    METHOD_NOT_FOUND = -32601
    INTERNAL_ERROR = -32400


def get_current_time_ms():
    """Get current time in milliseconds"""
    return int(time.time() * 1000)


def verify_payme_credentials(request):
    """
    Verify Payme Basic Auth credentials
    Returns True if valid, (error_code, error_message) if invalid
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Basic "):
        return (PaymeError.INVALID_CREDENTIALS, "Invalid authorization header")

    try:
        # Decode Basic Auth
        encoded = auth_header.split(" ", 1)[1]
        decoded = base64.b64decode(encoded).decode("utf-8")
        login, password = decoded.split(":", 1)

        # Payme sends merchant_id as login and key as password
        expected_login = "Paycom"
        expected_password = settings.PAYME_MERCHANT_KEY

        # In test mode, Payme uses different credentials
        if settings.PAYME_TEST_MODE:
            # Test credentials format: Paycom:test_key
            pass

        if password != expected_password:
            return (PaymeError.INVALID_CREDENTIALS, "Invalid credentials")

        return True
    except Exception as e:
        return (PaymeError.INVALID_CREDENTIALS, f"Authorization error: {str(e)}")


def payme_error_response(error_code, message, data=None, request_id=None):
    """Generate Payme error response"""
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
    if request_id:
        response["id"] = request_id
    return response


def payme_success_response(result, request_id=None):
    """Generate Payme success response"""
    response = {"result": result}
    if request_id:
        response["id"] = request_id
    return response


def check_perform_transaction(params):
    """
    CheckPerformTransaction - Check if transaction can be performed

    Params:
        - amount: Amount in tiyins
        - account: {order_id: "uuid"}

    Returns:
        - allow: true/false
    """
    amount = params.get("amount")
    account = params.get("account", {})
    order_id = account.get("order_id")

    if not order_id:
        return payme_error_response(
            PaymeError.INVALID_ACCOUNT, "Order ID is required", data="order_id"
        )

    try:
        order = PaymentOrder.objects.get(order_id=order_id)
    except PaymentOrder.DoesNotExist:
        return payme_error_response(
            PaymeError.INVALID_ACCOUNT, "Order not found", data="order_id"
        )

    # Check if order is in valid state
    if order.status != "PENDING":
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED, f"Order is already {order.status}"
        )

    # Check if order has expired
    if order.is_expired():
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED, "Order has expired"
        )

    # Check amount matches
    expected_amount = order.get_amount_in_tiyins()
    if amount != expected_amount:
        return payme_error_response(
            PaymeError.INVALID_AMOUNT,
            f"Invalid amount. Expected {expected_amount}, got {amount}",
        )

    return payme_success_response({"allow": True})


def create_transaction(params):
    """
    CreateTransaction - Create a new transaction

    Params:
        - id: Payme transaction ID
        - time: Payme timestamp
        - amount: Amount in tiyins
        - account: {order_id: "uuid"}

    Returns:
        - create_time: Our timestamp
        - transaction: Our transaction ID
        - state: Transaction state
    """
    payme_id = params.get("id")
    payme_time = params.get("time")
    amount = params.get("amount")
    account = params.get("account", {})
    order_id = account.get("order_id")

    # Check if transaction already exists
    existing_transaction = PaymeTransaction.objects.filter(payme_id=payme_id).first()

    if existing_transaction:
        # Transaction already exists, return its state
        # Check if it's still valid (not timed out)
        timeout_ms = settings.PAYME_TRANSACTION_TIMEOUT
        current_time = get_current_time_ms()

        if existing_transaction.state == 1:
            # Check for timeout
            if current_time - existing_transaction.create_time > timeout_ms:
                # Cancel due to timeout
                existing_transaction.state = -1
                existing_transaction.reason = 4  # Timeout
                existing_transaction.cancel_time = current_time
                existing_transaction.save()

                return payme_error_response(
                    PaymeError.OPERATION_NOT_ALLOWED, "Transaction timed out"
                )

        return payme_success_response(
            {
                "create_time": existing_transaction.create_time,
                "transaction": str(existing_transaction.id),
                "state": existing_transaction.state,
            }
        )

    # Get and validate order
    if not order_id:
        return payme_error_response(
            PaymeError.INVALID_ACCOUNT, "Order ID is required", data="order_id"
        )

    try:
        order = PaymentOrder.objects.get(order_id=order_id)
    except PaymentOrder.DoesNotExist:
        return payme_error_response(
            PaymeError.INVALID_ACCOUNT, "Order not found", data="order_id"
        )

    # Check order state
    if order.status != "PENDING":
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED, f"Order is already {order.status}"
        )

    if order.is_expired():
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED, "Order has expired"
        )

    # Validate amount
    expected_amount = order.get_amount_in_tiyins()
    if amount != expected_amount:
        return payme_error_response(
            PaymeError.INVALID_AMOUNT,
            f"Invalid amount. Expected {expected_amount}, got {amount}",
        )

    # Create transaction
    create_time = get_current_time_ms()
    transaction = PaymeTransaction.objects.create(
        payme_id=payme_id,
        order=order,
        state=1,  # Created
        amount=amount,
        payme_time=payme_time,
        create_time=create_time,
    )

    return payme_success_response(
        {
            "create_time": create_time,
            "transaction": str(transaction.id),
            "state": 1,
        }
    )


def perform_transaction(params):
    """
    PerformTransaction - Complete the transaction

    Params:
        - id: Payme transaction ID

    Returns:
        - transaction: Our transaction ID
        - perform_time: Timestamp
        - state: Transaction state (2 = completed)
    """
    payme_id = params.get("id")

    try:
        transaction = PaymeTransaction.objects.get(payme_id=payme_id)
    except PaymeTransaction.DoesNotExist:
        return payme_error_response(
            PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found"
        )

    # Check current state
    if transaction.state == 2:
        # Already performed
        return payme_success_response(
            {
                "transaction": str(transaction.id),
                "perform_time": transaction.perform_time,
                "state": 2,
            }
        )

    if transaction.state != 1:
        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED,
            "Cannot perform transaction in current state",
        )

    # Check for timeout
    timeout_ms = settings.PAYME_TRANSACTION_TIMEOUT
    current_time = get_current_time_ms()

    if current_time - transaction.create_time > timeout_ms:
        # Cancel due to timeout
        transaction.state = -1
        transaction.reason = 4
        transaction.cancel_time = current_time
        transaction.save()

        return payme_error_response(
            PaymeError.OPERATION_NOT_ALLOWED, "Transaction timed out"
        )

    # Perform the transaction
    perform_time = current_time
    transaction.state = 2
    transaction.perform_time = perform_time
    transaction.save()

    # Update order status
    order = transaction.order
    order.status = "PAID"
    order.paid_at = timezone.now()
    order.save()

    # Fulfill the order (add subscription or attempts)
    fulfill_order(order)

    return payme_success_response(
        {
            "transaction": str(transaction.id),
            "perform_time": perform_time,
            "state": 2,
        }
    )


def cancel_transaction(params):
    """
    CancelTransaction - Cancel a transaction

    Params:
        - id: Payme transaction ID
        - reason: Cancel reason code

    Returns:
        - transaction: Our transaction ID
        - cancel_time: Timestamp
        - state: Transaction state (-1 or -2)
    """
    payme_id = params.get("id")
    reason = params.get("reason")

    try:
        transaction = PaymeTransaction.objects.get(payme_id=payme_id)
    except PaymeTransaction.DoesNotExist:
        return payme_error_response(
            PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found"
        )

    # Check current state
    if transaction.state in [-1, -2]:
        # Already cancelled
        return payme_success_response(
            {
                "transaction": str(transaction.id),
                "cancel_time": transaction.cancel_time,
                "state": transaction.state,
            }
        )

    cancel_time = get_current_time_ms()

    if transaction.state == 1:
        # Cancel before perform
        transaction.state = -1
        transaction.cancel_time = cancel_time
        transaction.reason = reason
        transaction.save()

        # Update order status
        order = transaction.order
        order.status = "CANCELLED"
        order.save()

    elif transaction.state == 2:
        # Cancel after perform (refund)
        # Check if we can refund (depends on business logic)
        # For now, we allow cancellation
        transaction.state = -2
        transaction.cancel_time = cancel_time
        transaction.reason = reason
        transaction.save()

        # Revert the order fulfillment
        order = transaction.order
        order.status = "CANCELLED"
        order.save()

        # TODO: Optionally revert subscription/attempts
        # This depends on business requirements

    return payme_success_response(
        {
            "transaction": str(transaction.id),
            "cancel_time": cancel_time,
            "state": transaction.state,
        }
    )


def check_transaction(params):
    """
    CheckTransaction - Check transaction status

    Params:
        - id: Payme transaction ID

    Returns:
        - create_time, perform_time, cancel_time, transaction, state, reason
    """
    payme_id = params.get("id")

    try:
        transaction = PaymeTransaction.objects.get(payme_id=payme_id)
    except PaymeTransaction.DoesNotExist:
        return payme_error_response(
            PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found"
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
    GetStatement - Get list of transactions for a period

    Params:
        - from: Start timestamp (ms)
        - to: End timestamp (ms)

    Returns:
        - transactions: List of transactions
    """
    from_time = params.get("from")
    to_time = params.get("to")

    transactions = PaymeTransaction.objects.filter(
        payme_time__gte=from_time,
        payme_time__lte=to_time,
    ).order_by("payme_time")

    result = []
    for tx in transactions:
        order = tx.order
        result.append(
            {
                "id": tx.payme_id,
                "time": tx.payme_time,
                "amount": tx.amount,
                "account": {
                    "order_id": str(order.order_id),
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


def fulfill_order(order):
    """
    Fulfill a paid order by adding subscription or attempts to the user
    """
    user = order.user

    if order.order_type == "SUBSCRIPTION":
        # Add or extend subscription
        plan = order.subscription_plan
        if not plan:
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
        else:  # YEARLY
            subscription.expires_at = start_date + timedelta(days=365)

        subscription.save()

        # Add attempts from the plan
        attempts, _ = UserAttempts.objects.get_or_create(user=user)
        attempts.writing_attempts += plan.writing_attempts
        attempts.speaking_attempts += plan.speaking_attempts
        attempts.reading_attempts += plan.reading_attempts
        attempts.listening_attempts += plan.listening_attempts
        attempts.save()

    elif order.order_type == "ATTEMPTS":
        # Add attempts from package
        package = order.attempt_package
        if not package:
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


# Main Payme endpoint
@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def payme_endpoint(request):
    """
    Main Payme Merchant API endpoint
    Handles all Payme JSON-RPC requests
    """
    # Verify credentials
    auth_result = verify_payme_credentials(request)
    if auth_result is not True:
        error_code, error_message = auth_result
        return JsonResponse(
            payme_error_response(error_code, error_message),
            status=200,  # Payme expects 200 even for errors
        )

    try:
        data = request.data
        method = data.get("method")
        params = data.get("params", {})
        request_id = data.get("id")

        # Route to appropriate handler
        handlers = {
            "CheckPerformTransaction": check_perform_transaction,
            "CreateTransaction": create_transaction,
            "PerformTransaction": perform_transaction,
            "CancelTransaction": cancel_transaction,
            "CheckTransaction": check_transaction,
            "GetStatement": get_statement,
        }

        handler = handlers.get(method)
        if not handler:
            return JsonResponse(
                payme_error_response(
                    PaymeError.METHOD_NOT_FOUND,
                    f"Method {method} not found",
                    request_id=request_id,
                ),
                status=200,
            )

        result = handler(params)

        # Add request ID to response
        if request_id and "id" not in result:
            result["id"] = request_id

        return JsonResponse(result, status=200)

    except Exception as e:
        return JsonResponse(
            payme_error_response(
                PaymeError.INTERNAL_ERROR, f"Internal error: {str(e)}"
            ),
            status=200,
        )
