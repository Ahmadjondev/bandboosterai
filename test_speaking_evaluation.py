#!/usr/bin/env python
"""
Test script for speaking evaluation functionality.
Tests Azure Speech Recognition and Gemini AI evaluation with a sample audio file.
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mockexam.settings")
django.setup()

from ai.speaking_evaluator import evaluate_speaking_attempt
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_speaking_evaluation(audio_file_path: str):
    """
    Test the speaking evaluation with a sample audio file.

    Args:
        audio_file_path: Path to the audio file to test
    """
    logger.info("=" * 80)
    logger.info("SPEAKING EVALUATION TEST")
    logger.info("=" * 80)

    # Check if file exists
    if not os.path.exists(audio_file_path):
        logger.error(f"Audio file not found: {audio_file_path}")
        return False

    logger.info(f"Testing with audio file: {audio_file_path}")
    logger.info(f"File size: {os.path.getsize(audio_file_path)} bytes")

    # Prepare test data
    audio_files = {"1": audio_file_path}

    questions = [{"id": 1, "text": "What is your name?"}]

    part_type = "Part 1"

    try:
        logger.info("\n" + "=" * 80)
        logger.info("Starting evaluation...")
        logger.info("=" * 80 + "\n")

        # Run evaluation
        result = evaluate_speaking_attempt(
            audio_files=audio_files, questions=questions, part_type=part_type
        )

        logger.info("\n" + "=" * 80)
        logger.info("EVALUATION RESULTS")
        logger.info("=" * 80 + "\n")

        if result.get("success"):
            logger.info("✅ Evaluation completed successfully!\n")

            # Display transcripts
            logger.info("📝 TRANSCRIPTS:")
            logger.info("-" * 80)
            for transcript in result.get("transcripts", []):
                logger.info(
                    f"Question {transcript['question_id']}: {transcript['transcript']}"
                )
                logger.info(
                    f"  - Pronunciation Score: {transcript['pronunciation_score']}"
                )
                logger.info(f"  - Fluency Score: {transcript['fluency_score']}")
                logger.info(f"  - Accuracy Score: {transcript['accuracy_score']}")
                logger.info("")

            # Display combined transcript
            logger.info("📄 COMBINED TRANSCRIPT:")
            logger.info("-" * 80)
            logger.info(result.get("combined_transcript", "N/A"))
            logger.info("")

            # Display evaluation scores
            evaluation = result.get("evaluation", {})
            logger.info("🎯 IELTS SCORES:")
            logger.info("-" * 80)
            logger.info(
                f"Overall Band Score: {evaluation.get('overall_band_score', 'N/A')}"
            )
            logger.info("")

            logger.info("Fluency and Coherence:")
            fc = evaluation.get("fluency_and_coherence", {})
            logger.info(f"  Score: {fc.get('score', 'N/A')}")
            logger.info(f"  Feedback: {fc.get('feedback', 'N/A')}")
            logger.info("")

            logger.info("Lexical Resource:")
            lr = evaluation.get("lexical_resource", {})
            logger.info(f"  Score: {lr.get('score', 'N/A')}")
            logger.info(f"  Feedback: {lr.get('feedback', 'N/A')}")
            logger.info("")

            logger.info("Grammatical Range and Accuracy:")
            gra = evaluation.get("grammatical_range_and_accuracy", {})
            logger.info(f"  Score: {gra.get('score', 'N/A')}")
            logger.info(f"  Feedback: {gra.get('feedback', 'N/A')}")
            logger.info("")

            logger.info("Pronunciation:")
            pron = evaluation.get("pronunciation", {})
            logger.info(f"  Score: {pron.get('score', 'N/A')}")
            logger.info(f"  Feedback: {pron.get('feedback', 'N/A')}")
            logger.info("")

            # Display overall feedback
            logger.info("💬 OVERALL FEEDBACK:")
            logger.info("-" * 80)
            logger.info(evaluation.get("overall_feedback", "N/A"))
            logger.info("")

            # Display strengths
            strengths = evaluation.get("strengths", [])
            if strengths:
                logger.info("💪 STRENGTHS:")
                logger.info("-" * 80)
                for strength in strengths:
                    logger.info(f"  • {strength}")
                logger.info("")

            # Display areas for improvement
            improvements = evaluation.get("areas_for_improvement", [])
            if improvements:
                logger.info("📈 AREAS FOR IMPROVEMENT:")
                logger.info("-" * 80)
                for improvement in improvements:
                    logger.info(f"  • {improvement}")
                logger.info("")

            # Display pronunciation improvements
            pron_improvements = evaluation.get("pronunciation_improvements", {})
            if pron_improvements:
                logger.info("🎤 PRONUNCIATION IMPROVEMENT SUGGESTIONS:")
                logger.info("-" * 80)

                specific_words = pron_improvements.get("specific_words", [])
                if specific_words:
                    logger.info("Words to Practice:")
                    for word in specific_words:
                        logger.info(f"  • {word}")
                    logger.info("")

                phonetic_tips = pron_improvements.get("phonetic_tips", [])
                if phonetic_tips:
                    logger.info("Phonetic Tips:")
                    for tip in phonetic_tips:
                        logger.info(f"  • {tip}")
                    logger.info("")

                practice_exercises = pron_improvements.get("practice_exercises", [])
                if practice_exercises:
                    logger.info("Practice Exercises:")
                    for exercise in practice_exercises:
                        logger.info(f"  • {exercise}")
                    logger.info("")

            # Display mispronounced words from Azure
            for transcript in result.get("transcripts", []):
                mispronounced = transcript.get("mispronounced_words", [])
                if mispronounced:
                    logger.info(
                        f"🔴 MISPRONOUNCED WORDS (Question {transcript['question_id']}):"
                    )
                    logger.info("-" * 80)
                    for item in mispronounced[:10]:
                        logger.info(
                            f"  • '{item['word']}' - Accuracy: {item['accuracy_score']}/100"
                        )
                    logger.info("")

            # Display Azure scores
            azure_scores = result.get("azure_scores", {})
            if azure_scores:
                logger.info("🔊 AZURE PRONUNCIATION SCORES:")
                logger.info("-" * 80)
                logger.info(
                    f"Average Pronunciation: {azure_scores.get('average_pronunciation_score', 'N/A')}"
                )
                logger.info(
                    f"Average Accuracy: {azure_scores.get('average_accuracy_score', 'N/A')}"
                )
                logger.info(
                    f"Average Fluency: {azure_scores.get('average_fluency_score', 'N/A')}"
                )
                logger.info("")
                logger.info("")

            logger.info("=" * 80)
            logger.info("✅ TEST PASSED")
            logger.info("=" * 80)
            return True

        else:
            logger.error("❌ Evaluation failed!")
            logger.error(f"Error: {result.get('error', 'Unknown error')}")
            logger.info("=" * 80)
            logger.info("❌ TEST FAILED")
            logger.info("=" * 80)
            return False

    except Exception as e:
        logger.exception("❌ Exception during evaluation:")
        logger.info("=" * 80)
        logger.info("❌ TEST FAILED")
        logger.info("=" * 80)
        return False


if __name__ == "__main__":
    # Default test audio file
    default_audio = "/Users/ahmadjondev/BackendProjects/mocksystem/media/speaking_answers/speaking_PART_1_q1_344Voiq.wav"

    # Allow custom audio file from command line
    audio_file = sys.argv[1] if len(sys.argv) > 1 else default_audio

    success = test_speaking_evaluation(audio_file)
    sys.exit(0 if success else 1)
