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


# ============================================================================
# ANALYTICS CACHE PRE-COMPUTATION TASKS
# ============================================================================


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def precompute_user_analytics_task(self, user_id: int):
    """
    Pre-compute and cache all analytics data for a user.

    This task runs after exam completion to ensure fresh analytics
    are ready when user visits the analytics page.

    Args:
        user_id: ID of the user to compute analytics for
    """
    from django.contrib.auth import get_user_model
    from django.core.cache import caches
    from ielts.api_views_analytics import (
        get_user_subscription_tier,
        get_history_cutoff,
        CACHE_ANALYTICS,
        TIER_PRO,
        TIER_ULTRA,
    )
    from ielts.models import ExamAttempt, UserAnswer, WritingAttempt, SpeakingAttempt
    from practice.models import SectionPracticeAttempt
    from books.models import UserBookProgress
    from django.db.models import Avg, Count, Q, Max, Sum

    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
        tier = get_user_subscription_tier(user)

        # Get cache
        try:
            analytics_cache = caches["dashboard"]
        except KeyError:
            analytics_cache = caches["default"]

        logger.info(f"Pre-computing analytics for user {user.username} (tier: {tier})")

        # Pre-compute overview data
        cache_key = f"analytics_overview_{user.id}_{tier}"
        cutoff_date = get_history_cutoff(tier)

        base_filter = Q(student=user, status="COMPLETED")
        if cutoff_date:
            base_filter &= Q(completed_at__gte=cutoff_date)

        # Exam statistics
        exam_stats = ExamAttempt.objects.filter(base_filter).aggregate(
            total_exams=Count("id"),
            avg_overall=Avg("overall_score"),
            best_overall=Max("overall_score"),
            avg_listening=Avg("listening_score"),
            avg_reading=Avg("reading_score"),
            avg_writing=Avg("writing_score"),
            avg_speaking=Avg("speaking_score"),
            best_listening=Max("listening_score"),
            best_reading=Max("reading_score"),
            best_writing=Max("writing_score"),
            best_speaking=Max("speaking_score"),
        )

        # Practice statistics
        practice_filter = Q(student=user, status="COMPLETED")
        if cutoff_date:
            practice_filter &= Q(completed_at__gte=cutoff_date)

        practice_stats = SectionPracticeAttempt.objects.filter(
            practice_filter
        ).aggregate(
            total_practices=Count("id"),
            avg_score=Avg("score"),
            total_time=Sum("time_spent_seconds"),
        )

        # Book progress
        book_stats = UserBookProgress.objects.filter(user=user).aggregate(
            books_started=Count("id", filter=Q(is_started=True)),
            books_completed=Count("id", filter=Q(is_completed=True)),
            total_sections=Sum("book__total_sections"),
            completed_sections=Sum("completed_sections"),
            avg_score=Avg("average_score"),
        )

        total_sections = book_stats["total_sections"] or 0
        completed_sections = book_stats["completed_sections"] or 0
        book_progress_pct = (
            (completed_sections / total_sections * 100) if total_sections > 0 else 0
        )

        # Days active calculation
        active_dates = set()
        exam_dates = (
            ExamAttempt.objects.filter(base_filter)
            .values_list("completed_at__date", flat=True)
            .distinct()
        )
        active_dates.update(d for d in exam_dates if d)
        practice_dates = (
            SectionPracticeAttempt.objects.filter(practice_filter)
            .values_list("completed_at__date", flat=True)
            .distinct()
        )
        active_dates.update(d for d in practice_dates if d)
        days_active = len(active_dates)

        # Streak calculation
        streak_days = 0
        if active_dates:
            from datetime import timedelta

            today = timezone.now().date()
            current_date = today
            sorted_dates = sorted(active_dates, reverse=True)
            for date in sorted_dates:
                if date == current_date:
                    streak_days += 1
                    current_date -= timedelta(days=1)
                elif date < current_date:
                    break

        # User level
        overall_avg = float(exam_stats["avg_overall"] or 0)
        if overall_avg >= 8.0:
            current_level = "Expert"
        elif overall_avg >= 7.0:
            current_level = "Advanced"
        elif overall_avg >= 6.0:
            current_level = "Intermediate"
        elif overall_avg >= 5.0:
            current_level = "Pre-Intermediate"
        elif overall_avg > 0:
            current_level = "Beginner"
        else:
            current_level = "Not Started"

        target_band = getattr(user, "target_band", 7.0) or 7.0

        # Tier limits
        has_weakness_analysis = tier in [TIER_PRO, TIER_ULTRA]
        has_band_prediction = tier == TIER_ULTRA
        has_ai_study_plan = tier == TIER_ULTRA
        from ielts.api_views_analytics import HISTORY_LIMITS

        history_days = HISTORY_LIMITS.get(tier, 7) if tier else 7

        overview_data = {
            "total_attempts": exam_stats["total_exams"] or 0,
            "total_practice_sessions": practice_stats["total_practices"] or 0,
            "total_books_completed": book_stats["books_completed"] or 0,
            "overall_average": round(overall_avg, 1) if overall_avg > 0 else None,
            "current_level": current_level,
            "target_band": target_band,
            "days_active": days_active,
            "streak_days": streak_days,
            "section_averages": {
                "reading": (
                    round(float(exam_stats["avg_reading"] or 0), 1)
                    if exam_stats["avg_reading"]
                    else None
                ),
                "listening": (
                    round(float(exam_stats["avg_listening"] or 0), 1)
                    if exam_stats["avg_listening"]
                    else None
                ),
                "writing": (
                    round(float(exam_stats["avg_writing"] or 0), 1)
                    if exam_stats["avg_writing"]
                    else None
                ),
                "speaking": (
                    round(float(exam_stats["avg_speaking"] or 0), 1)
                    if exam_stats["avg_speaking"]
                    else None
                ),
            },
            "subscription_tier": tier,
            "tier_limits": {
                "has_weakness_analysis": has_weakness_analysis,
                "has_band_prediction": has_band_prediction,
                "has_ai_study_plan": has_ai_study_plan,
                "history_days": history_days if history_days else "unlimited",
            },
            "best_scores": {
                "overall": (
                    round(float(exam_stats["best_overall"] or 0), 1)
                    if exam_stats["best_overall"]
                    else None
                ),
                "reading": (
                    round(float(exam_stats["best_reading"] or 0), 1)
                    if exam_stats["best_reading"]
                    else None
                ),
                "listening": (
                    round(float(exam_stats["best_listening"] or 0), 1)
                    if exam_stats["best_listening"]
                    else None
                ),
                "writing": (
                    round(float(exam_stats["best_writing"] or 0), 1)
                    if exam_stats["best_writing"]
                    else None
                ),
                "speaking": (
                    round(float(exam_stats["best_speaking"] or 0), 1)
                    if exam_stats["best_speaking"]
                    else None
                ),
            },
            "books": {
                "started": book_stats["books_started"] or 0,
                "completed": book_stats["books_completed"] or 0,
                "progress_percentage": round(book_progress_pct, 1),
            },
            "cached": True,
            "precomputed_at": timezone.now().isoformat(),
        }

        # Cache for 2 hours (longer than API default since it's pre-computed)
        analytics_cache.set(cache_key, overview_data, timeout=7200)

        logger.info(
            f"Successfully pre-computed analytics overview for user {user.username}"
        )

        return {
            "status": "success",
            "user_id": user_id,
            "cache_key": cache_key,
        }

    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for analytics pre-computation")
        return {"status": "error", "message": f"User {user_id} not found"}
    except Exception as exc:
        logger.error(
            f"Error pre-computing analytics for user {user_id}: {exc}", exc_info=True
        )
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        return {"status": "error", "message": str(exc)}


@shared_task
def invalidate_user_analytics_cache(user_id: int):
    """
    Invalidate all analytics cache for a user.

    Call this when user completes an exam, practice session, or book section
    to ensure stale data is cleared.

    Args:
        user_id: ID of the user whose cache should be invalidated
    """
    from django.core.cache import caches
    from ielts.api_views_analytics import TIER_PLUS, TIER_PRO, TIER_ULTRA

    try:
        analytics_cache = caches["dashboard"]
    except KeyError:
        analytics_cache = caches["default"]

    # All possible tier combinations for cache keys
    tiers = [None, TIER_PLUS, TIER_PRO, TIER_ULTRA]

    cache_prefixes = [
        "analytics_overview",
        "analytics_skills",
        "analytics_weakness",
        "analytics_trends",
        "analytics_prediction",
        "analytics_studyplan",
    ]

    invalidated_keys = []
    for prefix in cache_prefixes:
        for tier in tiers:
            cache_key = f"{prefix}_{user_id}_{tier}"
            analytics_cache.delete(cache_key)
            invalidated_keys.append(cache_key)

    # Also invalidate tier-less keys
    analytics_cache.delete(f"analytics_prediction_{user_id}")
    analytics_cache.delete(f"analytics_studyplan_{user_id}")

    logger.info(
        f"Invalidated {len(invalidated_keys)} analytics cache keys for user {user_id}"
    )

    return {
        "status": "success",
        "user_id": user_id,
        "invalidated_keys": len(invalidated_keys),
    }


@shared_task
def refresh_user_analytics_after_completion(
    user_id: int, completion_type: str = "exam"
):
    """
    Refresh analytics cache after user completes an activity.

    This is a convenience task that invalidates cache and then pre-computes fresh data.

    Args:
        user_id: ID of the user
        completion_type: Type of completion ("exam", "practice", "book")
    """
    logger.info(
        f"Refreshing analytics for user {user_id} after {completion_type} completion"
    )

    # First invalidate old cache
    invalidate_user_analytics_cache.delay(user_id)

    # Then pre-compute fresh data (with slight delay to ensure invalidation completes)
    precompute_user_analytics_task.apply_async(
        args=[user_id], countdown=2  # 2 second delay
    )

    return {
        "status": "scheduled",
        "user_id": user_id,
        "completion_type": completion_type,
    }


@shared_task
def batch_precompute_active_users_analytics():
    """
    Batch job to pre-compute analytics for recently active users.

    Run this periodically (e.g., every 6 hours) to keep cache warm
    for users who are likely to check their analytics.
    """
    from django.contrib.auth import get_user_model
    from ielts.models import ExamAttempt
    from practice.models import SectionPracticeAttempt
    from datetime import timedelta

    User = get_user_model()

    # Find users who were active in the last 24 hours
    yesterday = timezone.now() - timedelta(hours=24)

    # Users with recent exam attempts
    exam_users = set(
        ExamAttempt.objects.filter(
            completed_at__gte=yesterday, status="COMPLETED"
        ).values_list("student_id", flat=True)
    )

    # Users with recent practice attempts
    practice_users = set(
        SectionPracticeAttempt.objects.filter(
            completed_at__gte=yesterday, status="COMPLETED"
        ).values_list("student_id", flat=True)
    )

    active_users = exam_users | practice_users

    logger.info(f"Batch pre-computing analytics for {len(active_users)} active users")

    scheduled_count = 0
    for user_id in active_users:
        # Stagger the tasks to avoid overwhelming the system
        precompute_user_analytics_task.apply_async(
            args=[user_id], countdown=scheduled_count * 2  # 2 seconds apart
        )
        scheduled_count += 1

    return {
        "status": "success",
        "users_scheduled": scheduled_count,
    }
