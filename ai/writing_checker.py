"""
BandBooster AI: IELTS Writing Checker — REAL EXAMINER CALIBRATED VERSION

This version strictly follows official IELTS descriptors and prevents
models from overrating essays (e.g., giving 8.0 for 7.0-level writing).
"""

import json
import logging
from typing import Dict, Any, Optional
from django.conf import settings
from ai.tools import generate_ai
import time

logger = logging.getLogger(__name__)

# ======================================================
#      🔥 NEW — REAL IELTS EXAMINER SYSTEM PROMPT
# ======================================================

SYSTEM_PROMPT = """
You are BandBooster AI — a highly accurate, strict, REAL IELTS Writing Examiner.
You MUST follow the official IELTS public band descriptors exactly.

Your decisions should mirror a trained examiner:
❗ Never over-score.
❗ Never inflate band scores.
❗ Use balanced calibration: real examiners usually give 0.5–1.0 lower than ideal.

STRICT OUTPUT RULES:
- ALWAYS return pure JSON.
- NO markdown.
- NO commentary.
- NO extra text.
- NO code blocks.
- Never escape characters unnecessarily.

-----------------------------------------------------
INLINE ERROR TAG RULES
-----------------------------------------------------
Mark only incorrect parts using XML-style tags:
<g>...</g>  = grammar error
<v>...</v>  = vocabulary issue
<s>...</s>  = spelling mistake
<p>...</p>  = punctuation issue

NEVER nest tags.
NEVER highlight correct phrases.
NEVER highlight whole sentences unnecessarily.

-----------------------------------------------------
SCORING RULES (STRICT REAL IELTS CALIBRATION)
-----------------------------------------------------

Use OFFICIAL descriptors:

TASK 1:
- Task Achievement
- Coherence & Cohesion
- Lexical Resource
- Grammatical Range & Accuracy

TASK 2:
- Task Response
- Coherence & Cohesion
- Lexical Resource
- Grammatical Range & Accuracy

Band interpretation:
9 = expert, almost no weaknesses  
8 = very strong with minor non-impeding issues  
7 = good, clear, but lacking sophistication  
6 = adequate, errors noticeable, ideas partially developed  
5 = limited, frequent errors  
4 or lower = very limited

Typical examiner calibration:
- Strong essays with clean grammar but simple ideas = Band 7
- Essays lacking advanced vocabulary = max Band 7
- Essays without complex grammar range = max Band 7

NEVER give Band 8 unless:
- Lexical sophistication present
- Complex grammar widely used
- Cohesion seamless
- Ideas sophisticated and deeply developed

-----------------------------------------------------
OUTPUT FORMAT (STRICT)
-----------------------------------------------------

{
  "inline": "...",
  "sentences": [
     {
       "original": "...",
       "corrected": "...",
       "explanation": "..."
     }
  ],
  "summary": "...",
  "band_score": "0.0",
  "corrected_essay": "...",
  "task_response_or_achievement": 0.0,
  "coherence_and_cohesion": 0.0,
  "lexical_resource": 0.0,
  "grammatical_range_and_accuracy": 0.0
}

RETURN ONLY VALID JSON.
"""
1
# ======================================================
#               USER PROMPT BUILDER
# ======================================================


def create_user_prompt(
    essay: str,
    task_type: str = "Task 2",
    task_question: Optional[str] = None,
    teacher_instructions: Optional[str] = None,
) -> str:

    question_block = f"Task Question:\n{task_question}\n\n" if task_question else ""

    teacher_block = ""
    if teacher_instructions:
        teacher_block = f"""
SPECIAL TEACHER INSTRUCTIONS:
The teacher has requested you pay special attention to the following:
{teacher_instructions}

Please incorporate these focus areas into your analysis and feedback.

"""

    return f"""
Analyze the following IELTS Writing {task_type} essay using the STRICT REAL EXAMINER RULES:

{question_block}{teacher_block}Essay:
{essay}

Return ONLY the JSON structure defined earlier.
"""


# ======================================================
#          MAIN CHECKING FUNCTION (IMPROVED)
# ======================================================


def check_writing(
    essay_text: str,
    task_type: str = "Task 2",
    model: str = "gemini-2.5-flash",
    max_retries: int = 3,
    retry_delay: float = 1.2,
    task_question: Optional[str] = None,
    teacher_instructions: Optional[str] = None,
) -> Dict[str, Any]:

    if not essay_text.strip():
        raise ValueError("Essay text is empty.")

    model_to_use = model or getattr(settings, "OPENAI_MODEL", "gemini-2.5-flash")

    full_prompt = (
        SYSTEM_PROMPT
        + "\n\n"
        + create_user_prompt(essay_text, task_type, task_question, teacher_instructions)
    )

    last_error = None

    for attempt in range(max_retries):
        try:
            logger.info(f"BandBooster AI writing check (attempt {attempt + 1})")

            response = generate_ai(
                prompt=full_prompt, model=model_to_use, max_retries=max_retries
            )

            # If the AI reported structured failure, retry
            if isinstance(response, dict) and response.get("success") is False:
                last_error = response.get("error")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (2**attempt))
                    continue
                break

            if not isinstance(response, dict):
                raise ValueError("Invalid response format.")

            required = {
                "inline": essay_text,
                "sentences": [],
                "summary": "Analysis completed.",
                "band_score": "N/A",
                "corrected_essay": essay_text,
                "task_response_or_achievement": None,
                "coherence_and_cohesion": None,
                "lexical_resource": None,
                "grammatical_range_and_accuracy": None,
            }

            for key, default in required.items():
                if key not in response:
                    response[key] = default

            # Attach metadata
            response["model_used"] = model_to_use
            response["tokens_used"] = (
                response.get("tokens_used")
                if isinstance(response.get("tokens_used"), int)
                else None
            )

            return response

        except Exception as e:
            last_error = str(e)

        if attempt < max_retries - 1:
            time.sleep(retry_delay * (2**attempt))

    raise Exception(
        f"BandBooster AI failed after {max_retries} attempts. Last error: {last_error}"
    )


# ======================================================
#             BAND SCORE EXTRACTION
# ======================================================


def extract_band_score(result: Dict[str, Any]) -> Optional[float]:
    try:
        import re

        text = result.get("band_score", "")
        match = re.search(r"(\d+(\.\d+)?)", text)
        if match:
            score = float(match.group(1))
            return score if 0 <= score <= 9 else None
    except:
        return None
    return None
