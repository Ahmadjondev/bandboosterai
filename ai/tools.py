import datetime
import json
import os
import ssl
from random import random
from dotenv import load_dotenv
from google import genai
from google.genai import types
import random
import httpx

load_dotenv()

# Global client instance - will be lazy-loaded from database or environment
_client = None
_client_config = None


def get_gemini_client():
    """
    Get or create Gemini client. Tries database config first, falls back to env vars.
    """
    global _client, _client_config

    # Try to get configuration from database
    try:
        from manager_panel.models import AIConfiguration

        db_config = AIConfiguration.get_primary_config()

        if db_config and db_config.provider == "gemini":
            # Check if we need to recreate client (config changed)
            if _client is None or _client_config != db_config.id:
                _client = genai.Client(api_key=db_config.api_key)
                _client_config = db_config.id
                print(
                    f"Using AI config from database: {db_config.name} ({db_config.model_name})"
                )
            return _client, db_config.model_name
    except Exception as e:
        print(f"Could not load AI config from database: {e}")

    # Fallback to environment variables
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

    if not api_key:
        raise ValueError(
            "No AI configuration found. Set up in manager panel or add GEMINI_API_KEY to .env"
        )

    if _client is None:
        try:
            _client = genai.Client(api_key=api_key)
        except Exception as e:
            print(f"Failed to create secure client: {e}")
            # Fallback with relaxed SSL
            try:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                http_client = httpx.Client(
                    verify=False, timeout=300.0, follow_redirects=True
                )
                _client = genai.Client(
                    api_key=api_key, http_options={"client": http_client}
                )
            except Exception as e2:
                print(f"Failed to create client with relaxed SSL: {e2}")
                _client = genai.Client(api_key=api_key)

    return _client, model


# Legacy client for backward compatibility - lazy load
def _get_legacy_client():
    """Get legacy client for code that imports 'client' directly"""
    client, _ = get_gemini_client()
    return client


# For backward compatibility - make 'client' available but lazy-loaded
class LazyClient:
    """Lazy-loaded client wrapper for backward compatibility"""

    _instance = None

    @property
    def models(self):
        if self._instance is None:
            self._instance, _ = get_gemini_client()
        return self._instance.models


client = LazyClient()


def change_to_json(text):
    """
    Extract and parse JSON from AI response text.
    Handles markdown code blocks and extracts valid JSON.
    Properly escapes unescaped newlines in string values.
    """
    import re

    # Remove markdown code blocks
    pas = text.strip()
    pas = pas.replace("```json", "")
    pas = pas.replace("```", "")
    pas = pas.strip()

    # Find first { and last } to extract JSON object
    start_idx = pas.find("{")
    end_idx = pas.rfind("}")

    if start_idx == -1 or end_idx == -1:
        raise ValueError("No valid JSON object found in response")

    # Extract only the JSON part
    json_str = pas[start_idx : end_idx + 1]

    # Clean up common JSON errors

    # 1. Remove trailing commas before closing brackets/braces
    json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

    # 2. Fix unescaped newlines and other issues inside string values
    def escape_and_clean_strings(match):
        """Escape actual newline characters and fix quotes inside JSON strings."""
        string_content = match.group(0)

        # Keep the opening quote
        opening_quote = string_content[0]
        # Get content without quotes
        content = string_content[1:-1]
        # Keep the closing quote
        closing_quote = string_content[-1]

        # Replace literal newlines with \n escape sequence
        content = content.replace("\n", "\\n")
        content = content.replace("\r", "\\r")
        content = content.replace("\t", "\\t")

        # Fix unescaped quotes inside the string
        content = content.replace('\\"', "<<<ESCAPED_QUOTE>>>")
        content = content.replace('"', '\\"')
        content = content.replace("<<<ESCAPED_QUOTE>>>", '\\"')

        return opening_quote + content + closing_quote

    # Match quoted strings
    json_str = re.sub(r'"(?:[^"\\]|\\.)*"', escape_and_clean_strings, json_str)

    # 3. Remove any control characters that might break JSON
    json_str = re.sub(r"[\x00-\x1f\x7f]", "", json_str)

    # 4. Remove any trailing whitespace
    json_str = json_str.strip()

    # 5. Validate and fix bracket/brace matching
    open_braces = json_str.count("{")
    close_braces = json_str.count("}")
    open_brackets = json_str.count("[")
    close_brackets = json_str.count("]")

    # If there are missing closing braces/brackets, add them
    if open_braces > close_braces:
        print(
            f"WARNING: Missing {open_braces - close_braces} closing brace(s), adding them"
        )
        json_str += "}" * (open_braces - close_braces)
    if open_brackets > close_brackets:
        print(
            f"WARNING: Missing {open_brackets - close_brackets} closing bracket(s), adding them"
        )
        json_str += "]" * (open_brackets - close_brackets)

    # Try to parse
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        # Log the problematic JSON for debugging
        print(f"JSON parsing failed at position {e.pos}")
        print(f"Error: {e.msg}")
        # Show context around the error
        start = max(0, e.pos - 100)
        end = min(len(json_str), e.pos + 100)
        print(f"Context: ...{json_str[start:end]}...")

        # Save problematic JSON to file for debugging
        debug_file = f"failed_json_{random.randint(10000, 99999)}.json"
        with open(debug_file, "w", encoding="utf-8") as f:
            f.write(json_str)
        print(f"Saved failed JSON to {debug_file}")
        print(
            f"JSON structure: {open_braces} {{ vs {close_braces} }}, {open_brackets} [ vs {close_brackets} ]"
        )

        raise


def generate_ai(
    prompt,
    model=None,
    mime_type=None,
    document=None,
    max_retries=3,
    request_type="general",
) -> dict:
    """
    Generate AI response using Gemini API with retry logic.
    Uses database configuration if available, falls back to environment variables.
    Tracks usage statistics on the AI configuration.

    Args:
        prompt: The text prompt for the AI
        model: Gemini model to use (default: from config or gemini-2.5-pro)
        mime_type: MIME type of the document (if provided)
        document: Binary document data (if provided)
        max_retries: Maximum number of retry attempts for network errors
        request_type: Type of request for tracking (e.g., 'content_generation', 'writing_check')

    Returns:
        dict: Parsed JSON response from AI
    """
    import time

    start_time = time.time()

    # Get client and model from configuration
    ai_client, config_model = get_gemini_client()

    # Get the database config for usage tracking
    db_config = None
    try:
        from manager_panel.models import AIConfiguration

        db_config = AIConfiguration.get_primary_config()
    except Exception:
        pass

    # Use provided model or fallback to config model
    if model is None:
        model = config_model

    print("DOCUMENT MIME TYPE:", mime_type)
    print("DOCUMENT SIZE:", len(document) if document else 0)
    print(f"Using model: {model}")

    last_error = None

    # Retry loop for network errors
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                wait_time = 2**attempt  # Exponential backoff: 2s, 4s, 8s
                print(
                    f"Retry attempt {attempt + 1}/{max_retries} after {wait_time}s..."
                )
                time.sleep(wait_time)

            contents = []
            contents.append(prompt)
            if document and mime_type:
                contents.append(
                    types.Part.from_bytes(
                        data=document,
                        mime_type=mime_type,
                    )
                )

            print(
                f"Sending request to Gemini AI (attempt {attempt + 1}/{max_retries})..."
            )
            response = ai_client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    thinking_config=types.ThinkingConfig(
                        include_thoughts=True,
                    ),
                ),
            )

            # Log raw response for debugging
            print("RAW AI RESPONSE RECEIVED")
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            response_file = f"ai_response_{timestamp}.json"
            with open(response_file, "w", encoding="utf-8") as f:
                f.write(response.text)
            print(f"Saved raw response to {response_file}")

            text = change_to_json(response.text)
            print("PARSED JSON SUCCESS")

            # Track usage on successful response
            if db_config:
                try:
                    response_time_ms = int((time.time() - start_time) * 1000)
                    # Estimate tokens (Gemini doesn't always provide token count in response)
                    # Rough estimate: ~4 chars per token
                    estimated_tokens = (len(prompt) + len(response.text)) // 4

                    # Update config usage stats
                    db_config.increment_usage(estimated_tokens)

                    # Create usage log if model exists
                    try:
                        from manager_panel.models import AIUsageLog

                        AIUsageLog.objects.create(
                            configuration=db_config,
                            endpoint="generate_ai",
                            request_type=request_type,
                            input_tokens=len(prompt) // 4,
                            output_tokens=len(response.text) // 4,
                            total_tokens=estimated_tokens,
                            success=True,
                            response_time_ms=response_time_ms,
                        )
                    except Exception as log_error:
                        print(f"Failed to create usage log: {log_error}")
                except Exception as track_error:
                    print(f"Failed to track usage: {track_error}")

            return text

        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            if "response" in locals():
                print(f"Response text (first 1000 chars): {response.text[:1000]}")
                print(f"Response text (last 500 chars): {response.text[-500:]}")

            # Track error
            if db_config:
                try:
                    db_config.record_error(f"JSON parsing error: {str(e)}")
                except Exception:
                    pass

            return {
                "error": f"Invalid JSON in AI response: {str(e)}. The AI generated malformed JSON. Please try again.",
                "success": False,
                "details": str(e),
            }
        except ValueError as e:
            print(f"Value error: {e}")

            # Track error
            if db_config:
                try:
                    db_config.record_error(f"Value error: {str(e)}")
                except Exception:
                    pass

            return {
                "error": f"Failed to extract JSON from response: {str(e)}",
                "success": False,
            }
        except (ConnectionError, TimeoutError) as e:
            print(f"Network error on attempt {attempt + 1}: {e}")
            last_error = e
            if attempt < max_retries - 1:
                continue  # Retry
            # Last attempt failed
            import traceback

            traceback.print_exc()
            return {
                "error": "Network connection failed after multiple retries. Please check your internet connection and try again. If you're behind a proxy or firewall, ensure the Gemini AI API (generativelanguage.googleapis.com) is accessible.",
                "success": False,
                "details": str(e),
            }
        except Exception as e:
            error_message = str(e)
            print(f"Error on attempt {attempt + 1}: {e}")

            # Check if it's a retryable network error
            if any(
                keyword in error_message.lower()
                for keyword in ["ssl", "connection", "connect", "timeout"]
            ):
                last_error = e
                if attempt < max_retries - 1:
                    print(f"Network error detected, will retry...")
                    continue  # Retry

            # Non-retryable error or last attempt
            import traceback

            traceback.print_exc()

            # Provide more specific error messages for common issues
            if "SSL" in error_message or "ssl" in error_message.lower():
                return {
                    "error": "SSL/TLS connection error persists after retries. This may be due to:\n• Network firewall blocking AI services\n• Corporate proxy requiring authentication\n• Outdated SSL certificates\n• VPN interference\n\nTry: Disable VPN, use different network, or contact IT support.",
                    "success": False,
                    "details": error_message,
                }
            elif (
                "ConnectError" in error_message or "connection" in error_message.lower()
            ):
                return {
                    "error": "Failed to connect to Gemini AI service after retries. Please check:\n• Internet connection is working\n• Gemini API endpoint is accessible\n• No firewall blocking the connection\n• API key is valid",
                    "success": False,
                    "details": error_message,
                }
            elif "timeout" in error_message.lower():
                return {
                    "error": "Request to Gemini AI timed out. Try:\n• Using a smaller PDF file\n• Better internet connection\n• Try again later when service is less busy",
                    "success": False,
                    "details": error_message,
                }
            elif "api" in error_message.lower() and "key" in error_message.lower():
                return {
                    "error": "API Key error. Please check:\n• GEMINI_API_KEY is set in .env file\n• API key is valid and active\n• API key has proper permissions",
                    "success": False,
                    "details": error_message,
                }
            else:
                return {
                    "error": f"AI generation error: {error_message}",
                    "success": False,
                    "details": error_message,
                }
