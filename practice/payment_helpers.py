"""
Practice Payment Helpers

Utility functions for checking and managing practice attempt access.
Integrates with the payments system to validate user access to premium content.
"""

from django.db import transaction
from payments.models import UserAttempts, UserSubscription, AttemptUsageLog


def get_user_attempt_access(user, section_type: str) -> dict:
    """
    Check if a user has access to a specific section type.
    
    Args:
        user: User instance
        section_type: READING, LISTENING, WRITING, SPEAKING
    
    Returns:
        dict with:
            - has_access: bool
            - attempts_remaining: int (-1 for unlimited)
            - is_unlimited: bool
            - is_subscription: bool (access via subscription vs purchased attempts)
            - reason: str (explanation)
    """
    section_type = section_type.upper()
    field_name = f"{section_type.lower()}_attempts"
    
    # Get or create user attempts record
    attempts, _ = UserAttempts.objects.get_or_create(user=user)
    
    # Check subscription first
    try:
        subscription = UserSubscription.objects.get(user=user)
        if subscription.is_valid() and subscription.plan:
            plan_attempts = getattr(subscription.plan, field_name, 0)
            if plan_attempts == -1:  # Unlimited
                return {
                    "has_access": True,
                    "attempts_remaining": -1,
                    "is_unlimited": True,
                    "is_subscription": True,
                    "reason": f"Unlimited {section_type.lower()} access with active subscription",
                }
            elif plan_attempts > 0:
                # Subscription provides attempts but we need to check UserAttempts for actual balance
                available = getattr(attempts, field_name, 0)
                if available > 0:
                    return {
                        "has_access": True,
                        "attempts_remaining": available,
                        "is_unlimited": False,
                        "is_subscription": True,
                        "reason": f"{available} {section_type.lower()} attempts remaining from subscription",
                    }
    except UserSubscription.DoesNotExist:
        pass
    
    # Check purchased attempts
    available = getattr(attempts, field_name, 0)
    if available > 0:
        return {
            "has_access": True,
            "attempts_remaining": available,
            "is_unlimited": False,
            "is_subscription": False,
            "reason": f"{available} {section_type.lower()} attempts remaining",
        }
    
    return {
        "has_access": False,
        "attempts_remaining": 0,
        "is_unlimited": False,
        "is_subscription": False,
        "reason": f"No {section_type.lower()} attempts available. Purchase attempts to continue.",
    }


def check_practice_access(user, practice) -> dict:
    """
    Check if a user can access a specific practice.
    
    Args:
        user: User instance
        practice: SectionPractice instance
    
    Returns:
        dict with:
            - has_access: bool
            - requires_payment: bool
            - attempts_remaining: int (-1 for unlimited)
            - is_free: bool
            - reason: str
    """
    # Free content is always accessible
    if practice.is_free:
        return {
            "has_access": True,
            "requires_payment": False,
            "attempts_remaining": -1,
            "is_free": True,
            "reason": "Free content",
        }
    
    # Check user's access for this section type
    access = get_user_attempt_access(user, practice.section_type)
    
    return {
        "has_access": access["has_access"],
        "requires_payment": not access["has_access"],
        "attempts_remaining": access["attempts_remaining"],
        "is_free": False,
        "is_unlimited": access.get("is_unlimited", False),
        "reason": access["reason"],
    }


def use_practice_attempt(user, practice, content_id=None) -> dict:
    """
    Use one practice attempt for the given section type.
    Should be called when starting a new practice attempt (not resuming).
    
    Args:
        user: User instance
        practice: SectionPractice instance
        content_id: Optional content identifier for logging
    
    Returns:
        dict with:
            - success: bool
            - attempts_remaining: int
            - is_unlimited: bool
            - error: str (if failed)
    """
    # Free content doesn't use attempts
    if practice.is_free:
        return {
            "success": True,
            "attempts_remaining": -1,
            "is_unlimited": True,
            "is_free": True,
        }
    
    section_type = practice.section_type.upper()
    field_name = f"{section_type.lower()}_attempts"
    
    # Get user attempts
    attempts, _ = UserAttempts.objects.get_or_create(user=user)
    
    # Check subscription for unlimited access
    try:
        subscription = UserSubscription.objects.get(user=user)
        if subscription.is_valid() and subscription.plan:
            plan_attempts = getattr(subscription.plan, field_name, 0)
            if plan_attempts == -1:  # Unlimited
                # Log usage without deducting
                AttemptUsageLog.objects.create(
                    user=user,
                    usage_type=section_type,
                    content_type="SectionPractice",
                    content_id=content_id or practice.id,
                )
                return {
                    "success": True,
                    "attempts_remaining": -1,
                    "is_unlimited": True,
                    "is_free": False,
                }
    except UserSubscription.DoesNotExist:
        pass
    
    # Check and use purchased attempt
    available = getattr(attempts, field_name, 0)
    
    if available <= 0:
        return {
            "success": False,
            "attempts_remaining": 0,
            "is_unlimited": False,
            "error": f"No {section_type.lower()} attempts available",
        }
    
    # Use the attempt
    with transaction.atomic():
        success = attempts.use_attempt(section_type)
        if success:
            # Log usage
            AttemptUsageLog.objects.create(
                user=user,
                usage_type=section_type,
                content_type="SectionPractice",
                content_id=content_id or practice.id,
            )
    
    # Get updated balance
    attempts.refresh_from_db()
    remaining = getattr(attempts, field_name, 0)
    
    return {
        "success": success,
        "attempts_remaining": remaining,
        "is_unlimited": False,
        "is_free": False,
    }


def get_user_all_attempts(user) -> dict:
    """
    Get all attempt balances for a user.
    
    Args:
        user: User instance
    
    Returns:
        dict with all attempt types and their balances
    """
    attempts, _ = UserAttempts.objects.get_or_create(user=user)
    
    result = {
        "reading": {
            "balance": attempts.reading_attempts,
            "is_unlimited": False,
        },
        "listening": {
            "balance": attempts.listening_attempts,
            "is_unlimited": False,
        },
        "writing": {
            "balance": attempts.writing_attempts,
            "is_unlimited": False,
        },
        "speaking": {
            "balance": attempts.speaking_attempts,
            "is_unlimited": False,
        },
    }
    
    # Check subscription for unlimited access
    try:
        subscription = UserSubscription.objects.get(user=user)
        if subscription.is_valid() and subscription.plan:
            plan = subscription.plan
            if plan.reading_attempts == -1:
                result["reading"]["is_unlimited"] = True
                result["reading"]["balance"] = -1
            if plan.listening_attempts == -1:
                result["listening"]["is_unlimited"] = True
                result["listening"]["balance"] = -1
            if plan.writing_attempts == -1:
                result["writing"]["is_unlimited"] = True
                result["writing"]["balance"] = -1
            if plan.speaking_attempts == -1:
                result["speaking"]["is_unlimited"] = True
                result["speaking"]["balance"] = -1
    except UserSubscription.DoesNotExist:
        pass
    
    return result


def refund_practice_attempt(user, section_type: str) -> bool:
    """
    Refund an attempt (e.g., if practice was cancelled due to an error).
    Only works for purchased attempts, not subscription-based unlimited access.
    
    Args:
        user: User instance
        section_type: READING, LISTENING, WRITING, SPEAKING
    
    Returns:
        bool: True if refund successful
    """
    section_type = section_type.upper()
    
    try:
        attempts = UserAttempts.objects.get(user=user)
        return attempts.add_attempts(section_type, 1)
    except UserAttempts.DoesNotExist:
        return False
