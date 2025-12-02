"""
Celery tasks for Section Practice processing.
"""

import logging
import os
import tempfile
from celery import shared_task
from django.utils import timezone
from django.core.files.storage import default_storage
from decimal import Decimal

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def evaluate_speaking_practice_task(self, attempt_id: int):
    """
    Evaluate a Speaking Section Practice attempt using Azure Speech Recognition and Gemini AI.

    This task:
    1. Retrieves the SectionPracticeAttempt and all associated SpeakingPracticeRecordings
    2. Downloads audio files from storage
    3. Transcribes audio using Azure Speech Recognition
    4. Evaluates transcripts using Gemini AI with IELTS criteria
    5. Stores results in database
    6. Updates attempt status

    Args:
        attempt_id: ID of the SectionPracticeAttempt to evaluate

    Returns:
        dict: Result status and data
    """
    from practice.models import SectionPracticeAttempt, SpeakingPracticeRecording
    from ai.speaking_evaluator import evaluate_speaking_attempt
    import uuid as uuid_module

    try:
        # Retrieve the SectionPracticeAttempt
        from django.core.exceptions import ValidationError

        try:
            uuid_obj = uuid_module.UUID(str(attempt_id))
            attempt = SectionPracticeAttempt.objects.select_related(
                "practice", "practice__speaking_topic", "student"
            ).get(uuid=uuid_obj)
        except (ValueError, ValidationError):
            attempt = SectionPracticeAttempt.objects.select_related(
                "practice", "practice__speaking_topic", "student"
            ).get(id=int(attempt_id))

        logger.info(
            f"Processing speaking practice evaluation for Attempt ID: {attempt_id}, "
            f"Student: {attempt.student.username}"
        )

        # Get all recordings for this attempt
        recordings = SpeakingPracticeRecording.objects.filter(attempt=attempt).order_by(
            "question_key"
        )

        if not recordings.exists():
            logger.error(f"No recordings found for attempt {attempt_id}")
            attempt.ai_evaluation = {
                "success": False,
                "error": "No recordings found for this attempt",
            }
            attempt.save(update_fields=["ai_evaluation"])
            return {"status": "failed", "error": "No recordings found"}

        logger.info(f"Found {recordings.count()} recordings for evaluation")

        # Get speaking topic questions
        speaking_topic = attempt.practice.speaking_topic
        if not speaking_topic:
            logger.error(f"No speaking topic found for practice {attempt.practice.id}")
            attempt.ai_evaluation = {
                "success": False,
                "error": "Speaking topic not configured",
            }
            attempt.save(update_fields=["ai_evaluation"])
            return {"status": "failed", "error": "Speaking topic not configured"}

        # Prepare audio files and questions
        audio_files = {}
        questions = []
        temp_files = []  # Track temporary files for cleanup

        # Build questions list from the speaking topic
        # Part 1 questions
        if speaking_topic.part1_questions:
            for i, q in enumerate(speaking_topic.part1_questions):
                question_key = f"part1_q{i}"
                questions.append({"id": question_key, "text": q})

        # Part 2 - cue card
        if speaking_topic.part2_topic:
            questions.append({"id": "part2", "text": speaking_topic.part2_topic})

        # Part 3 questions
        if speaking_topic.part3_questions:
            for i, q in enumerate(speaking_topic.part3_questions):
                question_key = f"part3_q{i}"
                questions.append({"id": question_key, "text": q})

        # Process each recording
        for recording in recordings:
            try:
                if not recording.audio_file or not recording.audio_file.name:
                    logger.warning(
                        f"No audio file for recording {recording.question_key}"
                    )
                    continue

                # Create temporary file
                file_ext = os.path.splitext(recording.audio_file.name)[1] or ".webm"
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
                temp_files.append(temp_file.name)

                # Download from storage
                if default_storage.exists(recording.audio_file.name):
                    with default_storage.open(
                        recording.audio_file.name, "rb"
                    ) as audio_file:
                        temp_file.write(audio_file.read())
                    temp_file.close()

                    # Convert to WAV if needed (Azure requires WAV)
                    wav_path = convert_to_wav(temp_file.name)
                    if wav_path != temp_file.name:
                        temp_files.append(wav_path)

                    audio_files[recording.question_key] = wav_path
                    logger.info(
                        f"Prepared audio for {recording.question_key}: {wav_path}"
                    )
                else:
                    logger.warning(
                        f"Audio file not found in storage: {recording.audio_file.name}"
                    )

            except Exception as e:
                logger.error(
                    f"Error processing recording {recording.question_key}: {str(e)}"
                )
                continue

        if not audio_files:
            logger.error("No valid audio files to evaluate")
            attempt.ai_evaluation = {
                "success": False,
                "error": "No valid audio files to evaluate",
            }
            attempt.save(update_fields=["ai_evaluation"])
            return {"status": "failed", "error": "No valid audio files"}

        # Determine part type based on recordings
        has_part1 = any(k.startswith("part1") for k in audio_files.keys())
        has_part2 = "part2" in audio_files
        has_part3 = any(k.startswith("part3") for k in audio_files.keys())

        if has_part1 and has_part2 and has_part3:
            part_type = "IELTS Speaking Full Test (Parts 1, 2, and 3)"
        elif has_part2:
            part_type = "Part 2: Long Turn (Cue Card)"
        elif has_part3:
            part_type = "Part 3: Discussion"
        else:
            part_type = "Part 1: Introduction and Interview"

        # Call the AI evaluator
        logger.info(f"Starting AI evaluation for {part_type}")
        evaluation_result = evaluate_speaking_attempt(
            audio_files=audio_files, questions=questions, part_type=part_type
        )

        # Clean up temporary files
        for temp_path in temp_files:
            try:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {temp_path}: {e}")

        if evaluation_result.get("success"):
            # Extract overall score
            overall_score = evaluation_result.get("evaluation", {}).get(
                "overall_band_score", 0
            )

            # Store evaluation results
            attempt.score = Decimal(str(overall_score))
            attempt.ai_evaluation = evaluation_result
            attempt.ai_feedback = evaluation_result.get("evaluation", {}).get(
                "overall_feedback", ""
            )

            # Update individual recording scores if available
            transcripts = evaluation_result.get("transcripts", [])
            for transcript_data in transcripts:
                question_key = transcript_data.get("question_id")
                try:
                    recording = recordings.get(question_key=question_key)
                    recording.transcription = transcript_data.get("transcript", "")
                    recording.ai_score = Decimal(
                        str(transcript_data.get("pronunciation_score", 0) / 100 * 9)
                    )  # Convert to band score
                    recording.save(update_fields=["transcription", "ai_score"])
                except SpeakingPracticeRecording.DoesNotExist:
                    pass

            attempt.save(update_fields=["score", "ai_evaluation", "ai_feedback"])

            logger.info(
                f"Successfully evaluated speaking practice for Attempt ID: {attempt_id}. "
                f"Band Score: {overall_score}"
            )

            return {
                "status": "success",
                "attempt_id": str(attempt.uuid),
                "band_score": float(overall_score),
            }

        else:
            error_msg = evaluation_result.get("error", "Unknown evaluation error")
            attempt.ai_evaluation = evaluation_result
            attempt.ai_feedback = f"Evaluation failed: {error_msg}"
            attempt.save(update_fields=["ai_evaluation", "ai_feedback"])

            logger.error(
                f"Speaking evaluation failed for Attempt ID: {attempt_id}: {error_msg}"
            )

            return {"status": "failed", "error": error_msg}

    except Exception as exc:
        logger.exception(
            f"Error in evaluate_speaking_practice_task for attempt {attempt_id}"
        )
        # Retry on transient errors
        raise self.retry(exc=exc)


def convert_to_wav(input_path: str) -> str:
    """
    Convert audio file to WAV format using ffmpeg.

    Args:
        input_path: Path to the input audio file

    Returns:
        Path to the converted WAV file (or original if already WAV)
    """
    import subprocess

    # If already WAV, return as-is
    if input_path.lower().endswith(".wav"):
        return input_path

    output_path = input_path.rsplit(".", 1)[0] + ".wav"

    try:
        # Use ffmpeg to convert
        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-y",  # Overwrite output
            output_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode == 0:
            logger.info(f"Successfully converted {input_path} to WAV")
            return output_path
        else:
            logger.warning(
                f"FFmpeg conversion failed: {result.stderr}. Using original file."
            )
            return input_path

    except subprocess.TimeoutExpired:
        logger.warning(f"FFmpeg conversion timed out for {input_path}")
        return input_path
    except FileNotFoundError:
        logger.warning("FFmpeg not found. Using original file.")
        return input_path
    except Exception as e:
        logger.warning(f"Error converting audio: {e}. Using original file.")
        return input_path
