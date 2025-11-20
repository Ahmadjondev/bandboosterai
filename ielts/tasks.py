"""
Celery tasks for IELTS exam processing.
"""

import logging
import os
from celery import shared_task
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from django.core.files.storage import default_storage

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


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def evaluate_speaking_attempt_task(self, speaking_attempt_id: int):
    """
    Evaluate an IELTS Speaking attempt using Azure Speech Recognition and Gemini AI.

    This task:
    1. Retrieves the SpeakingAttempt and all associated SpeakingAnswers
    2. Downloads audio files from storage
    3. Transcribes audio using Azure Speech Recognition
    4. Evaluates transcripts using Gemini AI with IELTS criteria
    5. Stores results in database
    6. Marks evaluation_status as COMPLETED or FAILED

    Args:
        speaking_attempt_id: ID of the SpeakingAttempt to evaluate

    Returns:
        dict: Result status and data
    """
    from ielts.models import SpeakingAttempt, SpeakingAnswer
    from ai.speaking_evaluator import evaluate_speaking_attempt
    from decimal import Decimal
    import tempfile
    import subprocess

    try:
        # Retrieve the SpeakingAttempt
        from django.core.exceptions import ValidationError
        import uuid as uuid_module

        try:
            uuid_obj = uuid_module.UUID(str(speaking_attempt_id))
            speaking_attempt = SpeakingAttempt.objects.get(uuid=uuid_obj)
        except (ValueError, ValidationError):
            speaking_attempt = SpeakingAttempt.objects.get(id=int(speaking_attempt_id))

        logger.info(
            f"Processing speaking evaluation for SpeakingAttempt ID: {speaking_attempt_id}, "
            f"Student: {speaking_attempt.exam_attempt.student.username}"
        )

        # Update status to PROCESSING
        speaking_attempt.evaluation_status = SpeakingAttempt.EvaluationStatus.PROCESSING
        speaking_attempt.save(update_fields=["evaluation_status"])

        # Get all speaking answers for this attempt
        speaking_answers = (
            SpeakingAnswer.objects.filter(speaking_attempt=speaking_attempt)
            .select_related("question", "question__topic")
            .order_by("question__order")
        )

        if not speaking_answers.exists():
            raise ValueError("No speaking answers found for this attempt")

        logger.info(f"Found {speaking_answers.count()} speaking answers for evaluation")

        # Prepare audio files and questions
        audio_files = {}
        questions = []
        temp_files = []  # Track temporary files for cleanup

        for answer in speaking_answers:
            question_id = str(answer.question.id)
            question_text = answer.question.question_text

            logger.info(
                f"Processing answer for question {question_id}: "
                f"audio_file={'present' if answer.audio_file else 'missing'}, "
                f"audio_file.name={answer.audio_file.name if answer.audio_file else 'N/A'}"
            )

            # Download audio file to temporary location
            if answer.audio_file and answer.audio_file.name:
                try:
                    # Create temporary file for original audio
                    file_ext = os.path.splitext(answer.audio_file.name)[1]
                    temp_file = tempfile.NamedTemporaryFile(
                        delete=False, suffix=file_ext
                    )
                    temp_files.append(temp_file.name)

                    # Download from storage
                    if default_storage.exists(answer.audio_file.name):
                        with default_storage.open(
                            answer.audio_file.name, "rb"
                        ) as audio_file:
                            temp_file.write(audio_file.read())
                        temp_file.close()

                        # Files should already be converted to WAV on upload
                        # But keep fallback conversion for legacy files
                        final_audio_path = temp_file.name
                        if file_ext.lower() not in [".wav"]:
                            logger.warning(
                                f"Non-WAV file detected ({file_ext}) for question {question_id}. "
                                "Files should be converted on upload. Attempting conversion..."
                            )
                            try:
                                # Create WAV file
                                wav_file = tempfile.NamedTemporaryFile(
                                    delete=False, suffix=".wav"
                                )
                                temp_files.append(wav_file.name)
                                wav_file.close()

                                # Use ffmpeg to convert
                                ffmpeg_cmd = [
                                    "ffmpeg",
                                    "-i",
                                    temp_file.name,
                                    "-ar",
                                    "16000",
                                    "-ac",
                                    "1",
                                    "-sample_fmt",
                                    "s16",
                                    "-y",
                                    wav_file.name,
                                ]

                                result = subprocess.run(
                                    ffmpeg_cmd,
                                    capture_output=True,
                                    text=True,
                                    timeout=30,
                                )

                                if result.returncode == 0:
                                    final_audio_path = wav_file.name
                                    logger.info(
                                        f"Converted to WAV for question {question_id}"
                                    )
                                else:
                                    logger.error(f"ffmpeg failed: {result.stderr}")

                            except Exception as conv_error:
                                logger.error(f"Conversion failed: {str(conv_error)}")

                        audio_files[question_id] = final_audio_path
                        questions.append(
                            {"id": answer.question.id, "text": question_text}
                        )

                        logger.info(f"Downloaded audio for question {question_id}")
                    else:
                        logger.warning(
                            f"Audio file not found in storage: {answer.audio_file.name}"
                        )

                except Exception as e:
                    logger.error(
                        f"Error downloading audio for question {question_id}: {str(e)}"
                    )
                    continue
            else:
                logger.warning(
                    f"Skipping question {question_id}: audio_file field is empty or has no name"
                )

        logger.info(
            f"Successfully processed {len(audio_files)} audio files out of {speaking_answers.count()} answers"
        )

        if not audio_files:
            # Provide detailed error message
            error_details = []
            for answer in speaking_answers:
                status = (
                    "no audio_file"
                    if not answer.audio_file
                    else (
                        "no file name"
                        if not answer.audio_file.name
                        else f"file not in storage: {answer.audio_file.name}"
                    )
                )
                error_details.append(f"Question {answer.question.id}: {status}")

            error_msg = (
                f"No valid audio files found for evaluation. "
                f"Details: {'; '.join(error_details)}"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)

        # Determine speaking part type
        first_topic = speaking_answers.first().question.topic
        part_type = (
            first_topic.get_speaking_type_display() if first_topic else "Speaking"
        )

        # Perform evaluation
        logger.info(f"Starting evaluation with {len(audio_files)} audio files")
        evaluation_result = evaluate_speaking_attempt(
            audio_files=audio_files, questions=questions, part_type=part_type
        )

        # Clean up temporary files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {temp_file}: {str(e)}")

        if not evaluation_result.get("success"):
            # Handle incomplete test case
            if evaluation_result.get("is_partial"):
                logger.warning(
                    f"Incomplete speaking test detected: {evaluation_result.get('error')}"
                )

                # Store partial evaluation info in speaking attempt
                speaking_attempt.feedback = {
                    "incomplete_test": True,
                    "completion_rate": evaluation_result.get("completion_rate", 0),
                    "answered_questions": evaluation_result.get(
                        "answered_questions", 0
                    ),
                    "total_questions": evaluation_result.get("total_questions", 0),
                    "error_message": evaluation_result.get("error"),
                    "evaluation_status": "INCOMPLETE",
                }
                speaking_attempt.evaluation_status = (
                    SpeakingAttempt.EvaluationStatus.FAILED
                )
                speaking_attempt.save()

                return {
                    "status": "error",
                    "message": evaluation_result.get("error"),
                    "speaking_attempt_id": speaking_attempt_id,
                    "is_incomplete": True,
                }
            else:
                raise Exception(evaluation_result.get("error", "Evaluation failed"))

        # Store transcripts in individual SpeakingAnswer records
        for transcript_data in evaluation_result.get("transcripts", []):
            question_id = transcript_data["question_id"]
            try:
                answer = speaking_answers.get(question__id=question_id)
                answer.transcript = transcript_data["transcript"]
                answer.feedback = {
                    "pronunciation_score": transcript_data["pronunciation_score"],
                    "fluency_score": transcript_data["fluency_score"],
                    "accuracy_score": transcript_data["accuracy_score"],
                    "words": transcript_data["words"],
                }
                answer.save(update_fields=["transcript", "feedback"])
            except SpeakingAnswer.DoesNotExist:
                logger.warning(f"SpeakingAnswer not found for question {question_id}")

        # Store combined transcripts in SpeakingAttempt
        speaking_attempt.transcripts = {
            "combined": evaluation_result.get("combined_transcript", ""),
            "individual": evaluation_result.get("transcripts", []),
        }

        # Extract evaluation scores
        evaluation = evaluation_result.get("evaluation", {})

        # Store IELTS criteria scores
        speaking_attempt.fluency_and_coherence = Decimal(
            str(evaluation.get("fluency_and_coherence", {}).get("score", 0))
        )
        speaking_attempt.lexical_resource = Decimal(
            str(evaluation.get("lexical_resource", {}).get("score", 0))
        )
        speaking_attempt.grammatical_range_and_accuracy = Decimal(
            str(evaluation.get("grammatical_range_and_accuracy", {}).get("score", 0))
        )
        speaking_attempt.pronunciation = Decimal(
            str(evaluation.get("pronunciation", {}).get("score", 0))
        )
        speaking_attempt.band_score = Decimal(
            str(evaluation.get("overall_band_score", 0))
        )

        # Store detailed feedback including completeness information
        completeness_info = evaluation_result.get("completeness_info", {})

        speaking_attempt.feedback = {
            "fluency_and_coherence": evaluation.get("fluency_and_coherence", {}),
            "lexical_resource": evaluation.get("lexical_resource", {}),
            "grammatical_range_and_accuracy": evaluation.get(
                "grammatical_range_and_accuracy", {}
            ),
            "pronunciation": evaluation.get("pronunciation", {}),
            "overall_band_score": evaluation.get("overall_band_score", 0),
            "overall_feedback": evaluation.get("overall_feedback", ""),
            "strengths": evaluation.get("strengths", []),
            "areas_for_improvement": evaluation.get("areas_for_improvement", []),
            "azure_scores": evaluation_result.get("azure_scores", {}),
            "pronunciation_improvements": evaluation.get(
                "pronunciation_improvements", {}
            ),
            "completeness_info": completeness_info,
        }

        # Log completeness information
        if completeness_info.get("penalty_applied"):
            logger.warning(
                f"Completion penalty applied: {completeness_info.get('completion_rate', 0):.1%} "
                f"({completeness_info.get('answered_questions', 0)}/{completeness_info.get('total_questions', 0)} questions)"
            )

        # Mark as completed
        speaking_attempt.evaluation_status = SpeakingAttempt.EvaluationStatus.COMPLETED
        speaking_attempt.evaluated_at = timezone.now()
        speaking_attempt.save()

        # Update exam attempt speaking score
        exam_attempt = speaking_attempt.exam_attempt
        exam_attempt.speaking_score = speaking_attempt.band_score
        exam_attempt.overall_score = exam_attempt.calculate_overall_score()
        exam_attempt.save(update_fields=["speaking_score", "overall_score"])

        logger.info(
            f"Successfully completed speaking evaluation for SpeakingAttempt ID: {speaking_attempt_id}. "
            f"Band Score: {speaking_attempt.band_score}"
        )

        return {
            "status": "success",
            "speaking_attempt_id": speaking_attempt_id,
            "band_score": float(speaking_attempt.band_score),
            "fluency_and_coherence": float(speaking_attempt.fluency_and_coherence),
            "lexical_resource": float(speaking_attempt.lexical_resource),
            "grammatical_range_and_accuracy": float(
                speaking_attempt.grammatical_range_and_accuracy
            ),
            "pronunciation": float(speaking_attempt.pronunciation),
        }

    except ObjectDoesNotExist:
        error_msg = f"SpeakingAttempt with ID {speaking_attempt_id} not found"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}

    except Exception as exc:
        logger.error(
            f"Error processing speaking evaluation for SpeakingAttempt ID {speaking_attempt_id}: {exc}",
            exc_info=True,
        )

        # Update status to FAILED
        try:
            from django.core.exceptions import ValidationError
            import uuid as uuid_module

            try:
                uuid_obj = uuid_module.UUID(str(speaking_attempt_id))
                speaking_attempt = SpeakingAttempt.objects.get(uuid=uuid_obj)
            except (ValueError, ValidationError):
                speaking_attempt = SpeakingAttempt.objects.get(
                    id=int(speaking_attempt_id)
                )

            speaking_attempt.evaluation_status = SpeakingAttempt.EvaluationStatus.FAILED
            speaking_attempt.save(update_fields=["evaluation_status"])
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
            "speaking_attempt_id": speaking_attempt_id,
        }
