"""
Celery tasks for IELTS exam processing.
"""

import logging
from celery import shared_task
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_writing_check_task(self, writing_attempt_id: int):
    """
    Process an IELTS writing essay through AI checker (BandBooster AI).

    This task:
    1. Retrieves the WritingAttempt from database
    2. Calls OpenAI API through writing_checker module
    3. Stores the results in ai_* fields
    4. Marks evaluation_status as COMPLETED or FAILED

    Args:
        writing_attempt_id: ID of the WritingAttempt to process

    Returns:
        dict: Result status and data
    """
    from ielts.models import WritingAttempt
    from ai.writing_checker import check_writing, extract_band_score

    try:
        # Retrieve the WritingAttempt
        writing_attempt = WritingAttempt.objects.get(id=writing_attempt_id)

        logger.info(
            f"Processing writing check for WritingAttempt ID: {writing_attempt_id}, "
            f"Student: {writing_attempt.exam_attempt.student.username}"
        )

        # Update status to PROCESSING
        writing_attempt.evaluation_status = WritingAttempt.EvaluationStatus.PROCESSING
        writing_attempt.save(update_fields=["evaluation_status"])

        # Determine task type
        task_type = writing_attempt.task.get_task_type_display()  # "Task 1" or "Task 2"

        # Call OpenAI API
        result = check_writing(
            essay_text=writing_attempt.answer_text,
            task_type=task_type,
        )

        # Store AI results in database
        writing_attempt.ai_inline = result.get("inline", "")
        writing_attempt.ai_sentences = result.get("sentences", [])
        writing_attempt.ai_summary = result.get("summary", "")
        writing_attempt.ai_band_score = result.get("band_score", "N/A")
        writing_attempt.ai_corrected_essay = result.get("corrected_essay", "")

        # Mark as completed
        writing_attempt.evaluation_status = WritingAttempt.EvaluationStatus.COMPLETED
        writing_attempt.evaluated_at = timezone.now()
        writing_attempt.save()

        logger.info(
            f"Successfully completed writing check for WritingAttempt ID: {writing_attempt_id}. "
            f"Band Score: {writing_attempt.ai_band_score}"
        )

        return {
            "status": "success",
            "writing_attempt_id": writing_attempt_id,
            "band_score": writing_attempt.ai_band_score,
            "tokens_used": result.get("tokens_used", 0),
        }

    except ObjectDoesNotExist:
        error_msg = f"WritingAttempt with ID {writing_attempt_id} not found"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}

    except Exception as exc:
        logger.error(
            f"Error processing writing check for WritingAttempt ID {writing_attempt_id}: {exc}",
            exc_info=True,
        )

        # Update status to FAILED
        try:
            writing_attempt = WritingAttempt.objects.get(id=writing_attempt_id)
            writing_attempt.evaluation_status = WritingAttempt.EvaluationStatus.FAILED
            writing_attempt.save(update_fields=["evaluation_status"])
        except Exception as save_exc:
            logger.error(f"Failed to update status to FAILED: {save_exc}")

        # Retry the task
        if self.request.retries < self.max_retries:
            logger.info(
                f"Retrying task (attempt {self.request.retries + 1}/{self.max_retries})"
            )
            raise self.retry(exc=exc)

        return {
            "status": "error",
            "message": str(exc),
            "writing_attempt_id": writing_attempt_id,
        }
