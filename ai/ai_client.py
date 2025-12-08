"""
AI Client Factory

Provides a unified interface for multiple AI providers (Gemini, OpenAI, Anthropic).
Uses database configuration for API keys and model settings.
"""

import json
import logging
import time
import os
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseAIClient(ABC):
    """Abstract base class for AI clients"""

    def __init__(
        self, api_key: str, model: str, temperature: float = 0.0, max_tokens: int = 8192
    ):
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate AI response"""
        pass

    @abstractmethod
    def generate_with_document(
        self, prompt: str, document: bytes, mime_type: str, **kwargs
    ) -> Dict[str, Any]:
        """Generate AI response with document context"""
        pass


class GeminiClient(BaseAIClient):
    """Google Gemini AI client"""

    def __init__(
        self, api_key: str, model: str, temperature: float = 0.0, max_tokens: int = 8192
    ):
        super().__init__(api_key, model, temperature, max_tokens)
        self._init_client()

    def _init_client(self):
        """Initialize Gemini client"""
        from google import genai

        self.client = genai.Client(api_key=self.api_key)

    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate response using Gemini"""
        from google.genai import types

        response = self.client.models.generate_content(
            model=self.model,
            contents=[prompt],
            config=types.GenerateContentConfig(
                temperature=kwargs.get("temperature", self.temperature),
                max_output_tokens=kwargs.get("max_tokens", self.max_tokens),
            ),
        )

        return {
            "text": response.text,
            "success": True,
        }

    def generate_with_document(
        self, prompt: str, document: bytes, mime_type: str, **kwargs
    ) -> Dict[str, Any]:
        """Generate response with document using Gemini"""
        from google.genai import types

        contents = [
            prompt,
            types.Part.from_bytes(data=document, mime_type=mime_type),
        ]

        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
            config=types.GenerateContentConfig(
                temperature=kwargs.get("temperature", self.temperature),
                max_output_tokens=kwargs.get("max_tokens", self.max_tokens),
                thinking_config=(
                    types.ThinkingConfig(include_thoughts=True)
                    if kwargs.get("include_thoughts")
                    else None
                ),
            ),
        )

        return {
            "text": response.text,
            "success": True,
        }


class OpenAIClient(BaseAIClient):
    """OpenAI API client"""

    def __init__(
        self, api_key: str, model: str, temperature: float = 0.0, max_tokens: int = 8192
    ):
        super().__init__(api_key, model, temperature, max_tokens)
        self._init_client()

    def _init_client(self):
        """Initialize OpenAI client"""
        try:
            from openai import OpenAI

            self.client = OpenAI(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "openai package is required. Install with: pip install openai"
            )

    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate response using OpenAI"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=kwargs.get("temperature", self.temperature),
            max_tokens=kwargs.get("max_tokens", self.max_tokens),
        )

        return {
            "text": response.choices[0].message.content,
            "success": True,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            },
        }

    def generate_with_document(
        self, prompt: str, document: bytes, mime_type: str, **kwargs
    ) -> Dict[str, Any]:
        """Generate response with document using OpenAI (via base64 encoding for images)"""
        import base64

        messages = [{"role": "user", "content": []}]

        # Add text prompt
        messages[0]["content"].append(
            {
                "type": "text",
                "text": prompt,
            }
        )

        # Add document as image if applicable
        if mime_type.startswith("image/"):
            base64_data = base64.b64encode(document).decode("utf-8")
            messages[0]["content"].append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_data}",
                    },
                }
            )
        elif mime_type == "application/pdf":
            # For PDFs, convert to text or use a vision model
            # OpenAI doesn't natively support PDF, so we extract text
            messages[0]["content"][0]["text"] = f"[PDF Document Content]\n\n{prompt}"

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", self.temperature),
            max_tokens=kwargs.get("max_tokens", self.max_tokens),
        )

        return {
            "text": response.choices[0].message.content,
            "success": True,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            },
        }


class AnthropicClient(BaseAIClient):
    """Anthropic Claude API client"""

    def __init__(
        self, api_key: str, model: str, temperature: float = 0.0, max_tokens: int = 8192
    ):
        super().__init__(api_key, model, temperature, max_tokens)
        self._init_client()

    def _init_client(self):
        """Initialize Anthropic client"""
        try:
            import anthropic

            self.client = anthropic.Anthropic(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "anthropic package is required. Install with: pip install anthropic"
            )

    def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate response using Anthropic Claude"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", self.max_tokens),
            messages=[{"role": "user", "content": prompt}],
        )

        return {
            "text": response.content[0].text,
            "success": True,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens
                + response.usage.output_tokens,
            },
        }

    def generate_with_document(
        self, prompt: str, document: bytes, mime_type: str, **kwargs
    ) -> Dict[str, Any]:
        """Generate response with document using Anthropic Claude"""
        import base64

        content = []

        # Add document if it's an image
        if mime_type.startswith("image/"):
            base64_data = base64.b64encode(document).decode("utf-8")
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": base64_data,
                    },
                }
            )
        elif mime_type == "application/pdf":
            # Claude supports PDF via base64
            base64_data = base64.b64encode(document).decode("utf-8")
            content.append(
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": base64_data,
                    },
                }
            )

        # Add text prompt
        content.append(
            {
                "type": "text",
                "text": prompt,
            }
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", self.max_tokens),
            messages=[{"role": "user", "content": content}],
        )

        return {
            "text": response.content[0].text,
            "success": True,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens
                + response.usage.output_tokens,
            },
        }


def create_ai_client(config=None) -> BaseAIClient:
    """
    Factory function to create an AI client based on configuration.

    Args:
        config: AIConfiguration model instance, or None to use primary config

    Returns:
        BaseAIClient instance
    """
    if config is None:
        # Get from database
        from manager_panel.models import AIConfiguration

        config = AIConfiguration.get_primary_config()

        if config is None:
            # Fallback to environment variables
            api_key = os.getenv("GEMINI_API_KEY")
            model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
            if api_key:
                return GeminiClient(api_key=api_key, model=model)
            raise ValueError(
                "No AI configuration found. Please set up an AI configuration in the manager panel."
            )

    # Create client based on provider
    if config.provider == "gemini":
        return GeminiClient(
            api_key=config.api_key,
            model=config.model_name,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )
    elif config.provider == "openai":
        return OpenAIClient(
            api_key=config.api_key,
            model=config.model_name,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )
    elif config.provider == "anthropic":
        return AnthropicClient(
            api_key=config.api_key,
            model=config.model_name,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )
    else:
        raise ValueError(f"Unsupported AI provider: {config.provider}")


def get_primary_ai_client() -> BaseAIClient:
    """Get the primary AI client from database configuration"""
    return create_ai_client(config=None)


def generate_ai_response(
    prompt: str,
    document: bytes = None,
    mime_type: str = None,
    config=None,
    request_type: str = "general",
    user=None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Generate AI response using the configured provider.
    Logs usage and handles errors.

    Args:
        prompt: The text prompt
        document: Optional document bytes
        mime_type: MIME type of document
        config: Optional specific AIConfiguration to use
        request_type: Type of request for logging
        user: User making the request
        **kwargs: Additional arguments for the AI client

    Returns:
        Dict with response text and metadata
    """
    from manager_panel.models import AIConfiguration, AIUsageLog
    import time

    start_time = time.time()

    # Get configuration
    if config is None:
        config = AIConfiguration.get_primary_config()

    if config is None:
        # Fallback to legacy behavior
        logger.warning("No AI configuration found, using environment variables")
        return _legacy_generate_ai(prompt, document, mime_type, **kwargs)

    try:
        client = create_ai_client(config)

        if document and mime_type:
            result = client.generate_with_document(
                prompt, document, mime_type, **kwargs
            )
        else:
            result = client.generate(prompt, **kwargs)

        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)

        # Log usage
        usage = result.get("usage", {})
        AIUsageLog.objects.create(
            configuration=config,
            user=user,
            endpoint=kwargs.get("endpoint", "unknown"),
            request_type=request_type,
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            success=True,
            response_time_ms=response_time_ms,
        )

        # Update config usage
        config.increment_usage(usage.get("total_tokens", 0))

        return result

    except Exception as e:
        response_time_ms = int((time.time() - start_time) * 1000)
        error_message = str(e)

        # Log error
        if config:
            AIUsageLog.objects.create(
                configuration=config,
                user=user,
                endpoint=kwargs.get("endpoint", "unknown"),
                request_type=request_type,
                success=False,
                error_message=error_message,
                response_time_ms=response_time_ms,
            )
            config.record_error(error_message)

        logger.error(f"AI generation error: {e}")
        return {
            "error": error_message,
            "success": False,
        }


def _legacy_generate_ai(
    prompt: str, document: bytes = None, mime_type: str = None, **kwargs
) -> Dict[str, Any]:
    """Legacy generate_ai function for backward compatibility"""
    from ai.tools import generate_ai as old_generate_ai

    if document and mime_type:
        return old_generate_ai(prompt, document=document, mime_type=mime_type, **kwargs)
    return old_generate_ai(prompt, **kwargs)
