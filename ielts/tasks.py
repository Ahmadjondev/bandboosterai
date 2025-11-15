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
        # Retrieve the WritingAttempt by UUID or integer ID for compatibility
        from django.core.exceptions import ValidationError
        import uuid as uuid_module

        try:
            uuid_obj = uuid_module.UUID(str(writing_attempt_id))
            writing_attempt = WritingAttempt.objects.get(uuid=uuid_obj)
        except (ValueError, ValidationError):
            writing_attempt = WritingAttempt.objects.get(id=int(writing_attempt_id))

        logger.info(
            f"Processing writing check for WritingAttempt ID: {writing_attempt_id}, "
            f"Student: {writing_attempt.exam_attempt.student.username}"
        )

        # Update status to PROCESSING
        writing_attempt.evaluation_status = WritingAttempt.EvaluationStatus.PROCESSING
        writing_attempt.save(update_fields=["evaluation_status"])

        # Determine task type
        task_type = writing_attempt.task.get_task_type_display()  # "Task 1" or "Task 2"

        # Get the task question/prompt for context
        task_question = (
            writing_attempt.task.prompt
            if hasattr(writing_attempt.task, "prompt")
            else None
        )

        # Call Gemini API via writing_checker
        result = check_writing(
            essay_text=writing_attempt.answer_text,
            task_type=task_type,
            task_question=task_question,
        )

        # Store AI results in database
        writing_attempt.ai_inline = result.get("inline", "")
        writing_attempt.ai_sentences = result.get("sentences", [])
        writing_attempt.ai_summary = result.get("summary", "")
        writing_attempt.ai_band_score = result.get("band_score", "N/A")
        writing_attempt.ai_corrected_essay = result.get("corrected_essay", "")

        # Save IELTS criteria scores from AI
        writing_attempt.task_response_or_achievement = result.get(
            "task_response_or_achievement"
        )
        writing_attempt.coherence_and_cohesion = result.get("coherence_and_cohesion")
        writing_attempt.lexical_resource = result.get("lexical_resource")
        writing_attempt.grammatical_range_and_accuracy = result.get(
            "grammatical_range_and_accuracy"
        )

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
            # Attempt to resolve by UUID first, then integer ID
            from django.core.exceptions import ValidationError
            import uuid as uuid_module

            try:
                uuid_obj = uuid_module.UUID(str(writing_attempt_id))
                writing_attempt = WritingAttempt.objects.get(uuid=uuid_obj)
            except (ValueError, ValidationError):
                writing_attempt = WritingAttempt.objects.get(id=int(writing_attempt_id))

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

    # Compatibility wrapper
    @shared_task(
        name="ielts.tasks.evaluate_writing_attempt",
        bind=True,
        max_retries=3,
        default_retry_delay=60,
    )
    def evaluate_writing_attempt(self, *args, **kwargs):
        """
        Compatibility shim for older task name `ielts.tasks.evaluate_writing_attempt`.

        Many workers or queued messages may still reference the old task name. To
        avoid discarding those messages, forward them to the current
        `process_writing_check_task` implementation. This task accepts either a
        single positional arg `writing_attempt_id` or arbitrary args/kwargs; we
        extract the first integer-looking positional argument and forward it.
        """
        try:
            # Attempt to extract writing_attempt_id from args or kwargs
            writing_attempt_id = None
            if args:
                # Some messages may include extra args (e.g., (3, 3)), so pick the first int-like
                for a in args:
                    if isinstance(a, int):
                        writing_attempt_id = a
                        break
                    # If it's bytes/str repr of int, try to parse; otherwise accept as UUID string
                    if isinstance(a, (bytes, str)):
                        a_str = a.decode() if isinstance(a, bytes) else a
                        try:
                            val = int(a_str)
                            writing_attempt_id = val
                            break
                        except Exception:
                            # Not an integer, accept as string (possible UUID)
                            writing_attempt_id = a_str
                            break

            if writing_attempt_id is None and "writing_attempt_id" in kwargs:
                writing_attempt_id = kwargs.get("writing_attempt_id")

            if writing_attempt_id is None:
                logger.error(
                    "evaluate_writing_attempt: could not determine writing_attempt_id from message"
                )
                return {"status": "error", "message": "missing writing_attempt_id"}

            logger.info(
                f"Compat wrapper received evaluate_writing_attempt for id={writing_attempt_id}; forwarding to process_writing_check_task"
            )

            # Forward by enqueueing the current task implementation. We don't call .get() to avoid blocking;
            # this keeps the worker responsive and ensures the real processing task runs under its own task context.
            async_result = process_writing_check_task.delay(writing_attempt_id)
            return {"status": "forwarded", "new_task_id": async_result.id}

        except Exception as exc:
            logger.exception("Error in evaluate_writing_attempt compatibility wrapper")
            # Let the task raise to trigger retries if appropriate
            raise
