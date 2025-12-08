"""
AI Configuration API Views
Handles CRUD operations for AI configurations in the manager panel.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta

from manager_panel.models import AIConfiguration, AIUsageLog, AIProvider


def check_manager_permission(user):
    """Check if user has manager/admin permissions"""
    if not user.is_authenticated:
        return False
    return user.role in ["MANAGER", "SUPERADMIN"]


# ============================================================================
# AI Configuration CRUD
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_ai_configurations(request):
    """
    Get all AI configurations.

    GET /manager/api/ai-config/

    Returns list of all AI configurations with masked API keys.
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    configs = AIConfiguration.objects.all()

    data = []
    for config in configs:
        data.append(
            {
                "id": config.id,
                "name": config.name,
                "provider": config.provider,
                "provider_display": config.get_provider_display(),
                "model_name": config.model_name,
                "api_key_masked": config.get_masked_api_key(),
                "is_primary": config.is_primary,
                "is_active": config.is_active,
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
                "total_requests": config.total_requests,
                "total_tokens_used": config.total_tokens_used,
                "last_used_at": (
                    config.last_used_at.isoformat() if config.last_used_at else None
                ),
                "last_error": config.last_error,
                "description": config.description,
                "created_at": config.created_at.isoformat(),
                "updated_at": config.updated_at.isoformat(),
            }
        )

    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_ai_configuration(request, config_id):
    """
    Get a single AI configuration by ID.

    GET /manager/api/ai-config/<id>/
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        config = AIConfiguration.objects.get(id=config_id)
    except AIConfiguration.DoesNotExist:
        return Response(
            {"error": "Configuration not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "id": config.id,
            "name": config.name,
            "provider": config.provider,
            "provider_display": config.get_provider_display(),
            "model_name": config.model_name,
            "api_key_masked": config.get_masked_api_key(),
            "is_primary": config.is_primary,
            "is_active": config.is_active,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "total_requests": config.total_requests,
            "total_tokens_used": config.total_tokens_used,
            "last_used_at": (
                config.last_used_at.isoformat() if config.last_used_at else None
            ),
            "last_error": config.last_error,
            "description": config.description,
            "created_at": config.created_at.isoformat(),
            "updated_at": config.updated_at.isoformat(),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_ai_configuration(request):
    """
    Create a new AI configuration.

    POST /manager/api/ai-config/

    Body:
        - name: str (required)
        - provider: str (gemini|openai|anthropic)
        - api_key: str (required)
        - model_name: str (required)
        - is_primary: bool (optional)
        - is_active: bool (optional, default True)
        - temperature: float (optional, default 0.0)
        - max_tokens: int (optional, default 8192)
        - description: str (optional)
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data

    # Validate required fields
    required_fields = ["name", "provider", "api_key", "model_name"]
    for field in required_fields:
        if not data.get(field):
            return Response(
                {"error": f"'{field}' is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Validate provider
    valid_providers = [p[0] for p in AIProvider.choices]
    if data["provider"] not in valid_providers:
        return Response(
            {
                "error": f"Invalid provider. Must be one of: {', '.join(valid_providers)}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create configuration
    config = AIConfiguration.objects.create(
        name=data["name"],
        provider=data["provider"],
        api_key=data["api_key"],
        model_name=data["model_name"],
        is_primary=data.get("is_primary", False),
        is_active=data.get("is_active", True),
        temperature=data.get("temperature", 0.0),
        max_tokens=data.get("max_tokens", 8192),
        description=data.get("description", ""),
        created_by=request.user,
    )

    return Response(
        {
            "id": config.id,
            "name": config.name,
            "provider": config.provider,
            "provider_display": config.get_provider_display(),
            "model_name": config.model_name,
            "api_key_masked": config.get_masked_api_key(),
            "is_primary": config.is_primary,
            "is_active": config.is_active,
            "message": "AI configuration created successfully",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_ai_configuration(request, config_id):
    """
    Update an AI configuration.

    PUT/PATCH /manager/api/ai-config/<id>/

    Body (all optional):
        - name: str
        - provider: str
        - api_key: str (only if changing)
        - model_name: str
        - is_primary: bool
        - is_active: bool
        - temperature: float
        - max_tokens: int
        - description: str
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        config = AIConfiguration.objects.get(id=config_id)
    except AIConfiguration.DoesNotExist:
        return Response(
            {"error": "Configuration not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    data = request.data

    # Update fields if provided
    if "name" in data:
        config.name = data["name"]
    if "provider" in data:
        valid_providers = [p[0] for p in AIProvider.choices]
        if data["provider"] not in valid_providers:
            return Response(
                {
                    "error": f"Invalid provider. Must be one of: {', '.join(valid_providers)}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        config.provider = data["provider"]
    if "api_key" in data and data["api_key"]:
        config.api_key = data["api_key"]
    if "model_name" in data:
        config.model_name = data["model_name"]
    if "is_primary" in data:
        config.is_primary = data["is_primary"]
    if "is_active" in data:
        config.is_active = data["is_active"]
    if "temperature" in data:
        config.temperature = data["temperature"]
    if "max_tokens" in data:
        config.max_tokens = data["max_tokens"]
    if "description" in data:
        config.description = data["description"]

    config.save()

    return Response(
        {
            "id": config.id,
            "name": config.name,
            "provider": config.provider,
            "provider_display": config.get_provider_display(),
            "model_name": config.model_name,
            "api_key_masked": config.get_masked_api_key(),
            "is_primary": config.is_primary,
            "is_active": config.is_active,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
            "message": "AI configuration updated successfully",
        }
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_ai_configuration(request, config_id):
    """
    Delete an AI configuration.

    DELETE /manager/api/ai-config/<id>/
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        config = AIConfiguration.objects.get(id=config_id)
    except AIConfiguration.DoesNotExist:
        return Response(
            {"error": "Configuration not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Don't allow deleting the only primary config
    if config.is_primary and AIConfiguration.objects.filter(is_active=True).count() > 1:
        return Response(
            {
                "error": "Cannot delete the primary configuration. Set another as primary first."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    config_name = config.name
    config.delete()

    return Response(
        {"message": f"AI configuration '{config_name}' deleted successfully"}
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_primary_configuration(request, config_id):
    """
    Set a configuration as the primary one.

    POST /manager/api/ai-config/<id>/set-primary/
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        config = AIConfiguration.objects.get(id=config_id)
    except AIConfiguration.DoesNotExist:
        return Response(
            {"error": "Configuration not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not config.is_active:
        return Response(
            {"error": "Cannot set an inactive configuration as primary"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    config.is_primary = True
    config.save()

    return Response(
        {
            "message": f"'{config.name}' is now the primary AI configuration",
            "id": config.id,
            "name": config.name,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_configuration_status(request, config_id):
    """
    Toggle active status of a configuration.

    POST /manager/api/ai-config/<id>/toggle-status/
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        config = AIConfiguration.objects.get(id=config_id)
    except AIConfiguration.DoesNotExist:
        return Response(
            {"error": "Configuration not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Don't allow deactivating the primary config
    if config.is_primary and config.is_active:
        return Response(
            {
                "error": "Cannot deactivate the primary configuration. Set another as primary first."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    config.is_active = not config.is_active
    config.save()

    return Response(
        {
            "message": f"Configuration {'activated' if config.is_active else 'deactivated'}",
            "id": config.id,
            "is_active": config.is_active,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def test_ai_configuration(request, config_id):
    """
    Test an AI configuration with a simple prompt.

    POST /manager/api/ai-config/<id>/test/
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        config = AIConfiguration.objects.get(id=config_id)
    except AIConfiguration.DoesNotExist:
        return Response(
            {"error": "Configuration not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Import the AI client factory
    from ai.ai_client import create_ai_client

    try:
        client = create_ai_client(config)

        # Simple test prompt
        test_result = client.generate(
            prompt="Say 'Hello! AI configuration test successful.' and nothing else.",
            max_tokens=50,
        )

        return Response(
            {
                "success": True,
                "message": "Configuration test successful",
                "response": test_result.get("text", ""),
                "provider": config.provider,
                "model": config.model_name,
            }
        )
    except Exception as e:
        config.record_error(str(e))
        return Response(
            {
                "success": False,
                "message": "Configuration test failed",
                "error": str(e),
                "provider": config.provider,
                "model": config.model_name,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


# ============================================================================
# Available Models & Providers
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_providers(request):
    """
    Get list of available AI providers.

    GET /manager/api/ai-config/providers/
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    providers = [{"id": p[0], "name": p[1]} for p in AIProvider.choices]

    return Response(providers)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_models(request, provider=None):
    """
    Get list of available models for a provider.

    GET /manager/api/ai-config/models/
    GET /manager/api/ai-config/models/<provider>/
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if provider:
        models = AIConfiguration.get_available_models(provider)
    else:
        models = AIConfiguration.get_available_models()

    return Response(models)


# ============================================================================
# Usage Analytics
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_ai_usage_stats(request):
    """
    Get AI usage statistics.

    GET /manager/api/ai-config/stats/

    Query params:
        - days: int (default 30, stats for last N days)
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    days = int(request.query_params.get("days", 30))
    start_date = timezone.now() - timedelta(days=days)

    # Overall stats
    total_configs = AIConfiguration.objects.count()
    active_configs = AIConfiguration.objects.filter(is_active=True).count()
    primary_config = AIConfiguration.get_primary_config()

    # Usage stats from logs
    usage_logs = AIUsageLog.objects.filter(created_at__gte=start_date)

    total_requests = usage_logs.count()
    total_tokens = usage_logs.aggregate(total=Sum("total_tokens"))["total"] or 0
    successful_requests = usage_logs.filter(success=True).count()
    failed_requests = usage_logs.filter(success=False).count()

    # Stats by provider
    by_provider = usage_logs.values("configuration__provider").annotate(
        requests=Count("id"),
        tokens=Sum("total_tokens"),
    )

    # Stats by request type
    by_type = usage_logs.values("request_type").annotate(
        requests=Count("id"),
        tokens=Sum("total_tokens"),
    )

    # Daily usage for chart
    daily_usage = (
        usage_logs.extra(select={"day": "date(created_at)"})
        .values("day")
        .annotate(
            requests=Count("id"),
            tokens=Sum("total_tokens"),
        )
        .order_by("day")
    )

    return Response(
        {
            "overview": {
                "total_configurations": total_configs,
                "active_configurations": active_configs,
                "primary_configuration": (
                    {
                        "id": primary_config.id,
                        "name": primary_config.name,
                        "provider": primary_config.provider,
                        "model": primary_config.model_name,
                    }
                    if primary_config
                    else None
                ),
            },
            "usage": {
                "period_days": days,
                "total_requests": total_requests,
                "total_tokens": total_tokens,
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "success_rate": (
                    round(successful_requests / total_requests * 100, 1)
                    if total_requests > 0
                    else 0
                ),
            },
            "by_provider": list(by_provider),
            "by_type": list(by_type),
            "daily_usage": list(daily_usage),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_ai_usage_logs(request):
    """
    Get AI usage logs with pagination.

    GET /manager/api/ai-config/logs/

    Query params:
        - page: int
        - page_size: int (default 50)
        - config_id: int (filter by configuration)
        - success: bool (filter by success/failure)
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    logs = AIUsageLog.objects.select_related("configuration", "user")

    # Apply filters
    config_id = request.query_params.get("config_id")
    if config_id:
        logs = logs.filter(configuration_id=config_id)

    success = request.query_params.get("success")
    if success is not None:
        logs = logs.filter(success=success.lower() == "true")

    # Pagination
    page = int(request.query_params.get("page", 1))
    page_size = int(request.query_params.get("page_size", 50))
    start = (page - 1) * page_size
    end = start + page_size

    total = logs.count()
    logs = logs[start:end]

    data = []
    for log in logs:
        data.append(
            {
                "id": log.id,
                "configuration": {
                    "id": log.configuration.id,
                    "name": log.configuration.name,
                    "provider": log.configuration.provider,
                },
                "user": log.user.username if log.user else None,
                "endpoint": log.endpoint,
                "request_type": log.request_type,
                "input_tokens": log.input_tokens,
                "output_tokens": log.output_tokens,
                "total_tokens": log.total_tokens,
                "success": log.success,
                "error_message": log.error_message,
                "response_time_ms": log.response_time_ms,
                "created_at": log.created_at.isoformat(),
            }
        )

    return Response(
        {
            "logs": data,
            "pagination": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size,
            },
        }
    )
