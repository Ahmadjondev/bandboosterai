"""
BandBooster AI: IELTS Writing Checker with Grammarly-style inline highlighting.

This module integrates with OpenAI's API to provide comprehensive IELTS writing feedback
with inline error highlighting using XML-style tags:
- <g>...</g> for grammar errors (red underline)
- <v>...</v> for vocabulary issues (blue underline)
- <s>...</s> for spelling errors (yellow underline)
- <p>...</p> for punctuation issues (purple underline)
"""

import json
import logging
from typing import Dict, Any, Optional
from django.conf import settings
from openai import OpenAI, OpenAIError
import time

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    organization=(
        settings.OPENAI_ORGANIZATION_ID if settings.OPENAI_ORGANIZATION_ID else None
    ),
)

# System prompt for BandBooster AI
SYSTEM_PROMPT = """You are BandBooster AI, a professional IELTS examiner specialized in analyzing IELTS Writing Task 1 and Task 2 essays.

Your task is to:
1. Highlight mistakes inline using XML-style tags:
   - <g>text</g> for grammar errors
   - <v>text</v> for vocabulary issues
   - <s>text</s> for spelling errors
   - <p>text</p> for punctuation issues

2. After each sentence, provide:
   - Correct: <the corrected sentence>
   - Explanation: <brief reason for the correction>

3. Return ONLY valid JSON in the exact format specified (no markdown, no code blocks)"""


def create_user_prompt(essay: str, task_type: str = "Task 2") -> str:
    """Create the user prompt for the AI."""
    return f"""Analyze this IELTS Writing {task_type} essay:

Highlight all mistakes inline using the tags (<g>, <v>, <s>, <p>).

After each sentence, output:
Correct: <corrected sentence>
Explanation: <reason for correction>

Return JSON ONLY in this exact format (no markdown, no extra text):
{{
  "inline": "essay text with inline tags",
  "sentences": [
    {{
      "original": "original sentence",
      "corrected": "corrected sentence",
      "explanation": "why it was corrected"
    }}
  ],
  "summary": "overall feedback about common mistakes",
  "band_score": "7.5",
  "corrected_essay": "fully corrected essay without tags"
}}

Essay:
{essay}"""


def check_writing(
    essay_text: str,
    task_type: str = "Task 2",
    model: str = None,
    max_retries: int = 3,
    retry_delay: float = 1.0,
) -> Dict[str, Any]:
    """
    Check an IELTS writing essay using OpenAI API.

    Args:
        essay_text: The student's essay text
        task_type: "Task 1" or "Task 2"
        model: OpenAI model to use (defaults to settings.OPENAI_MODEL)
        max_retries: Maximum number of retry attempts on failure
        retry_delay: Delay between retries in seconds

    Returns:
        Dict containing:
        - inline: Essay with inline error tags
        - sentences: List of corrected sentences with explanations
        - summary: Overall feedback
        - band_score: Estimated band score (string)
        - corrected_essay: Fully corrected essay

    Raises:
        Exception: If API call fails after all retries
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured in settings")

    if not essay_text or not essay_text.strip():
        raise ValueError("Essay text cannot be empty")

    model_to_use = model or settings.OPENAI_MODEL

    # Prepare messages following OpenAI API structure
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": create_user_prompt(essay_text, task_type)},
    ]

    last_error = None

    for attempt in range(max_retries):
        try:
            logger.info(
                f"Calling OpenAI API (attempt {attempt + 1}/{max_retries}) with model: {model_to_use}"
            )

            # Call OpenAI Chat Completions API
            response = client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                temperature=0.7,  # Balanced creativity
                max_tokens=2000,  # Sufficient for detailed feedback
                response_format={"type": "json_object"},  # Ensure JSON response
            )

            # Extract the response content
            content = response.choices[0].message.content

            logger.info(f"OpenAI API call successful. Usage: {response.usage}")

            # Parse JSON response
            result = json.loads(content)

            # Validate required fields
            required_fields = [
                "inline",
                "sentences",
                "summary",
                "band_score",
                "corrected_essay",
            ]
            missing_fields = [field for field in required_fields if field not in result]
            if missing_fields:
                logger.warning(f"Missing fields in API response: {missing_fields}")
                # Add default values for missing fields
                if "inline" not in result:
                    result["inline"] = essay_text
                if "sentences" not in result:
                    result["sentences"] = []
                if "summary" not in result:
                    result["summary"] = "Analysis completed."
                if "band_score" not in result:
                    result["band_score"] = "N/A"
                if "corrected_essay" not in result:
                    result["corrected_essay"] = essay_text

            # Add metadata
            result["model_used"] = response.model
            result["tokens_used"] = response.usage.total_tokens

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            last_error = f"Invalid JSON response from API: {str(e)}"

        except OpenAIError as e:
            logger.error(f"OpenAI API error: {e}")
            last_error = f"OpenAI API error: {str(e)}"

        except Exception as e:
            logger.error(f"Unexpected error during API call: {e}")
            last_error = f"Unexpected error: {str(e)}"

        # Wait before retrying (exponential backoff)
        if attempt < max_retries - 1:
            wait_time = retry_delay * (2**attempt)
            logger.info(f"Retrying in {wait_time} seconds...")
            time.sleep(wait_time)

    # All retries failed
    error_msg = f"Failed to check writing after {max_retries} attempts. Last error: {last_error}"
    logger.error(error_msg)
    raise Exception(error_msg)


def extract_band_score(result: Dict[str, Any]) -> Optional[float]:
    """
    Extract numeric band score from API result.

    Args:
        result: The API response dictionary

    Returns:
        Float band score (e.g., 7.5) or None if not parseable
    """
    try:
        band_score_str = result.get("band_score", "")
        # Handle formats like "7.5", "Band 7.5", "7.5/9"
        import re

        match = re.search(r"(\d+(?:\.\d+)?)", band_score_str)
        if match:
            score = float(match.group(1))
            # Validate range
            if 0 <= score <= 9:
                return score
    except (ValueError, AttributeError):
        pass

    return None


# For testing purposes
if __name__ == "__main__":
    # Example usage (won't work without Django settings)
    test_essay = """
    There is many people who believes that technology have changed our lifes.
    They thinks computers and smartphones is very important for education and work.
    However, some peoples says that we spending too much time on devices.
    """

    try:
        result = check_writing(test_essay, task_type="Task 2")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
