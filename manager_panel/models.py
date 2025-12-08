"""
Manager Panel Models

Models for manager-specific configurations including AI settings.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class AIProvider(models.TextChoices):
    """Supported AI providers"""

    GEMINI = "gemini", "Google Gemini"
    OPENAI = "openai", "OpenAI"
    ANTHROPIC = "anthropic", "Anthropic Claude"


class AIConfiguration(models.Model):
    """
    AI Configuration model for managing API keys and model settings.
    Allows managers to add, modify, and select primary AI configuration.
    """

    name = models.CharField(
        max_length=100,
        help_text="Friendly name for this configuration (e.g., 'Production Gemini', 'Backup OpenAI')",
    )
    provider = models.CharField(
        max_length=20,
        choices=AIProvider.choices,
        default=AIProvider.GEMINI,
        help_text="AI provider to use",
    )
    api_key = models.CharField(
        max_length=500, help_text="API key for the provider (encrypted at rest)"
    )
    model_name = models.CharField(
        max_length=100,
        help_text="Model name to use (e.g., 'gemini-2.5-pro', 'gpt-4', 'claude-3-opus')",
    )

    # Configuration options
    is_primary = models.BooleanField(
        default=False,
        help_text="Mark as primary configuration to use for all AI operations",
    )
    is_active = models.BooleanField(
        default=True, help_text="Whether this configuration is available for use"
    )

    # Model parameters
    temperature = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(2.0)],
        help_text="Temperature for AI generation (0.0-2.0, lower = more deterministic)",
    )
    max_tokens = models.IntegerField(
        default=8192,
        validators=[MinValueValidator(100), MaxValueValidator(100000)],
        help_text="Maximum tokens for AI response",
    )

    # Usage tracking
    total_requests = models.IntegerField(default=0, help_text="Total API requests made")
    total_tokens_used = models.IntegerField(
        default=0, help_text="Total tokens consumed"
    )
    last_used_at = models.DateTimeField(
        null=True, blank=True, help_text="Last time this config was used"
    )
    last_error = models.TextField(
        null=True, blank=True, help_text="Last error message if any"
    )

    # Metadata
    description = models.TextField(
        blank=True, help_text="Optional description or notes about this configuration"
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_ai_configs"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_configuration"
        ordering = ["-is_primary", "-created_at"]
        verbose_name = "AI Configuration"
        verbose_name_plural = "AI Configurations"

    def __str__(self):
        primary = " (Primary)" if self.is_primary else ""
        active = "" if self.is_active else " [Inactive]"
        return f"{self.name} - {self.get_provider_display()}/{self.model_name}{primary}{active}"

    def save(self, *args, **kwargs):
        # If this is being set as primary, unset others
        if self.is_primary:
            AIConfiguration.objects.filter(is_primary=True).exclude(pk=self.pk).update(
                is_primary=False
            )
        super().save(*args, **kwargs)

    def get_masked_api_key(self):
        """Return masked API key for display (show first 8 and last 4 chars)"""
        if len(self.api_key) > 12:
            return f"{self.api_key[:8]}...{self.api_key[-4:]}"
        return "***"

    def increment_usage(self, tokens_used=0):
        """Increment usage counters"""
        from django.utils import timezone

        self.total_requests += 1
        self.total_tokens_used += tokens_used
        self.last_used_at = timezone.now()
        self.last_error = None
        self.save(
            update_fields=[
                "total_requests",
                "total_tokens_used",
                "last_used_at",
                "last_error",
            ]
        )

    def record_error(self, error_message):
        """Record an error"""
        from django.utils import timezone

        self.last_error = error_message
        self.last_used_at = timezone.now()
        self.save(update_fields=["last_error", "last_used_at"])

    @classmethod
    def get_primary_config(cls):
        """Get the primary active configuration"""
        return cls.objects.filter(is_primary=True, is_active=True).first()

    @classmethod
    def get_active_configs(cls):
        """Get all active configurations"""
        return cls.objects.filter(is_active=True)

    @classmethod
    def get_available_models(cls, provider=None):
        """Get list of available models for a provider"""
        models_dict = {
            AIProvider.GEMINI: [
                {
                    "id": "gemini-2.5-pro",
                    "name": "Gemini 2.5 Pro",
                    "description": "Most capable, best for complex tasks",
                },
                {
                    "id": "gemini-2.5-flash",
                    "name": "Gemini 2.5 Flash",
                    "description": "Fast and efficient for most tasks",
                },
                {
                    "id": "gemini-2.0-flash",
                    "name": "Gemini 2.0 Flash",
                    "description": "Balanced performance",
                },
                {
                    "id": "gemini-1.5-pro",
                    "name": "Gemini 1.5 Pro",
                    "description": "Previous generation pro model",
                },
                {
                    "id": "gemini-1.5-flash",
                    "name": "Gemini 1.5 Flash",
                    "description": "Previous generation flash model",
                },
            ],
            AIProvider.OPENAI: [
                {
                    "id": "gpt-4o",
                    "name": "GPT-4o",
                    "description": "Most capable OpenAI model",
                },
                {
                    "id": "gpt-4o-mini",
                    "name": "GPT-4o Mini",
                    "description": "Smaller, faster, cheaper",
                },
                {
                    "id": "gpt-4-turbo",
                    "name": "GPT-4 Turbo",
                    "description": "Optimized for speed",
                },
                {"id": "gpt-4", "name": "GPT-4", "description": "Original GPT-4 model"},
                {
                    "id": "gpt-3.5-turbo",
                    "name": "GPT-3.5 Turbo",
                    "description": "Fast and cost-effective",
                },
            ],
            AIProvider.ANTHROPIC: [
                {
                    "id": "claude-3-5-sonnet-20241022",
                    "name": "Claude 3.5 Sonnet",
                    "description": "Most capable Claude model",
                },
                {
                    "id": "claude-3-opus-20240229",
                    "name": "Claude 3 Opus",
                    "description": "Best for complex analysis",
                },
                {
                    "id": "claude-3-sonnet-20240229",
                    "name": "Claude 3 Sonnet",
                    "description": "Balanced performance",
                },
                {
                    "id": "claude-3-haiku-20240307",
                    "name": "Claude 3 Haiku",
                    "description": "Fast and efficient",
                },
            ],
        }

        if provider:
            return models_dict.get(provider, [])
        return models_dict


class AIUsageLog(models.Model):
    """
    Log of AI API usage for monitoring and analytics.
    """

    configuration = models.ForeignKey(
        AIConfiguration, on_delete=models.CASCADE, related_name="usage_logs"
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="ai_usage_logs"
    )

    # Request details
    endpoint = models.CharField(max_length=100, help_text="Which feature used the AI")
    request_type = models.CharField(
        max_length=50,
        help_text="Type of request (writing_check, speaking_eval, content_gen)",
    )

    # Usage metrics
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)

    # Response details
    success = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    response_time_ms = models.IntegerField(
        default=0, help_text="Response time in milliseconds"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_usage_log"
        ordering = ["-created_at"]
        verbose_name = "AI Usage Log"
        verbose_name_plural = "AI Usage Logs"

    def __str__(self):
        status = "✓" if self.success else "✗"
        return f"{status} {self.request_type} - {self.configuration.name} ({self.total_tokens} tokens)"
