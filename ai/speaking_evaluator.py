"""
IELTS Speaking Evaluation Module using Azure Speech Recognition and Gemini 2.5-flash.

This module provides comprehensive evaluation of IELTS Speaking responses based on:
- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
- Pronunciation

Uses Microsoft Azure for Speech-to-Text and Google Gemini for AI evaluation.
"""

import logging
import os
import json
import subprocess
import tempfile
from typing import Dict, List, Optional, Tuple
from decimal import Decimal

import azure.cognitiveservices.speech as speechsdk
from google import genai
from google.genai import types
from decouple import config
from ai.tools import generate_ai, change_to_json

logger = logging.getLogger(__name__)


def convert_audio_to_wav(input_path: str) -> str:
    """
    Convert audio file to WAV format suitable for Azure Speech SDK.

    Azure Speech SDK requires:
    - WAV format with proper headers
    - 16kHz sample rate (recommended)
    - 16-bit PCM
    - Mono channel

    Args:
        input_path: Path to the input audio file (WebM, MP3, etc.)

    Returns:
        Path to the converted WAV file (temporary file)

    Raises:
        RuntimeError: If conversion fails
    """
    # Check if input is already a proper WAV file
    if input_path.lower().endswith(".wav"):
        # Still convert to ensure proper format for Azure
        pass

    # Create a temporary file for the output
    temp_fd, temp_path = tempfile.mkstemp(suffix=".wav")
    os.close(temp_fd)

    try:
        # Use ffmpeg to convert to WAV with Azure-compatible settings
        # -ar 16000: 16kHz sample rate
        # -ac 1: mono channel
        # -sample_fmt s16: 16-bit signed integer
        # -y: overwrite output file
        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-ar",
            "16000",
            "-ac",
            "1",
            "-sample_fmt",
            "s16",
            "-y",
            temp_path,
        ]

        logger.info(f"Converting audio: {input_path} -> {temp_path}")

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=60  # 60 second timeout
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg conversion failed: {result.stderr}")
            # Try alternative conversion without sample_fmt (for older ffmpeg)
            cmd_alt = [
                "ffmpeg",
                "-i",
                input_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-acodec",
                "pcm_s16le",
                "-y",
                temp_path,
            ]
            result = subprocess.run(cmd_alt, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                raise RuntimeError(f"FFmpeg conversion failed: {result.stderr}")

        # Verify the output file exists and has content
        if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
            raise RuntimeError("Conversion produced empty or missing file")

        logger.info(f"Audio conversion successful: {os.path.getsize(temp_path)} bytes")
        return temp_path

    except subprocess.TimeoutExpired:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise RuntimeError("Audio conversion timed out")
    except FileNotFoundError:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise RuntimeError("FFmpeg not found. Please install FFmpeg.")
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise RuntimeError(f"Audio conversion failed: {str(e)}")


class AzureSpeechRecognizer:
    """Handles speech-to-text conversion using Microsoft Azure Speech Services."""

    def __init__(self):
        self.speech_key = config("AZURE_SPEECH_KEY")
        self.speech_region = config("AZURE_SPEECH_REGION")

        if not self.speech_key or not self.speech_region:
            raise ValueError("Azure Speech credentials not configured")

    def transcribe_audio(self, audio_file_path: str) -> Dict[str, any]:
        """
        Transcribe audio file to text with pronunciation assessment.

        Args:
            audio_file_path: Path to the audio file

        Returns:
            Dictionary containing:
                - transcript: Full text transcript
                - pronunciation_score: Overall pronunciation score (0-100)
                - fluency_score: Fluency score (0-100)
                - accuracy_score: Accuracy score (0-100)
                - completeness_score: Completeness score (0-100)
                - words: List of word-level details with pronunciation scores
        """
        converted_path = None
        try:
            # Convert audio to WAV format if needed (WebM, MP3, etc. -> WAV)
            # Azure Speech SDK requires proper WAV format
            if (
                not audio_file_path.lower().endswith(".wav") or True
            ):  # Always convert for safety
                logger.info(f"Converting audio file to WAV format: {audio_file_path}")
                converted_path = convert_audio_to_wav(audio_file_path)
                audio_file_to_use = converted_path
            else:
                audio_file_to_use = audio_file_path

            # Configure speech recognition
            speech_config = speechsdk.SpeechConfig(
                subscription=self.speech_key, region=self.speech_region
            )

            # Set recognition language to English
            speech_config.speech_recognition_language = "en-US"

            # Configure audio input
            audio_config = speechsdk.audio.AudioConfig(filename=audio_file_to_use)

            # Enable pronunciation assessment
            pronunciation_config = speechsdk.PronunciationAssessmentConfig(
                reference_text="",
                grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
                granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
                enable_miscue=True,
            )
            pronunciation_config.enable_prosody_assessment()

            # Create speech recognizer
            speech_recognizer = speechsdk.SpeechRecognizer(
                speech_config=speech_config, audio_config=audio_config
            )

            # Apply pronunciation assessment
            pronunciation_config.apply_to(speech_recognizer)

            # Perform recognition
            result = speech_recognizer.recognize_once()

            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                # Parse pronunciation assessment results
                pronunciation_result = speechsdk.PronunciationAssessmentResult(result)
                print("Pronunciation result:", pronunciation_result)
                # Extract word-level details with enhanced pronunciation analysis
                words = []
                mispronounced_words = []
                omitted_words = []
                inserted_words = []

                if hasattr(result, "properties"):
                    detailed_result = json.loads(
                        result.properties.get(
                            speechsdk.PropertyId.SpeechServiceResponse_JsonResult
                        )
                    )

                    if "NBest" in detailed_result and len(detailed_result["NBest"]) > 0:
                        words_data = detailed_result["NBest"][0].get("Words", [])
                        for word_data in words_data:
                            word = word_data.get("Word", "")
                            pron_assessment = word_data.get(
                                "PronunciationAssessment", {}
                            )
                            accuracy_score = pron_assessment.get("AccuracyScore", 0)
                            error_type = pron_assessment.get("ErrorType", "None")

                            word_info = {
                                "word": word,
                                "accuracy_score": accuracy_score,
                                "error_type": error_type,
                            }

                            # Add phoneme-level details if available
                            if "Phonemes" in word_data:
                                phonemes = []
                                for phoneme in word_data["Phonemes"]:
                                    phonemes.append(
                                        {
                                            "phoneme": phoneme.get("Phoneme", ""),
                                            "score": phoneme.get(
                                                "PronunciationAssessment", {}
                                            ).get("AccuracyScore", 0),
                                        }
                                    )
                                word_info["phonemes"] = phonemes

                            # Add syllable information if available
                            if "Syllables" in word_data:
                                word_info["syllables"] = word_data["Syllables"]

                            words.append(word_info)

                            # Categorize problematic words
                            if error_type == "Mispronunciation" or accuracy_score < 60:
                                mispronounced_words.append(
                                    {
                                        "word": word,
                                        "accuracy_score": accuracy_score,
                                        "phonemes": word_info.get("phonemes", []),
                                    }
                                )
                            elif error_type == "Omission":
                                omitted_words.append(word)
                            elif error_type == "Insertion":
                                inserted_words.append(word)
                return {
                    "transcript": result.text,
                    "pronunciation_score": pronunciation_result.pronunciation_score,
                    "fluency_score": pronunciation_result.fluency_score,
                    "accuracy_score": pronunciation_result.accuracy_score,
                    "completeness_score": pronunciation_result.completeness_score,
                    "words": words,
                    "mispronounced_words": mispronounced_words,
                    "omitted_words": omitted_words,
                    "inserted_words": inserted_words,
                    "total_words": len(words),
                    "mispronunciation_count": len(mispronounced_words),
                    "success": True,
                }

            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.warning(f"No speech recognized in audio file: {audio_file_path}")
                return {
                    "transcript": "",
                    "pronunciation_score": 0,
                    "fluency_score": 0,
                    "accuracy_score": 0,
                    "completeness_score": 0,
                    "words": [],
                    "success": False,
                    "error": "No speech detected",
                }

            else:
                error_details = result.cancellation_details
                logger.error(f"Speech recognition failed: {error_details.reason}")

                return {
                    "transcript": "",
                    "pronunciation_score": 0,
                    "fluency_score": 0,
                    "accuracy_score": 0,
                    "completeness_score": 0,
                    "words": [],
                    "success": False,
                    "error": str(error_details.reason),
                }

        except Exception as e:
            logger.error(f"Error during speech recognition: {str(e)}", exc_info=True)
            return {
                "transcript": "",
                "pronunciation_score": 0,
                "fluency_score": 0,
                "accuracy_score": 0,
                "completeness_score": 0,
                "words": [],
                "success": False,
                "error": str(e),
            }
        finally:
            # Clean up converted temporary file
            if converted_path and os.path.exists(converted_path):
                try:
                    os.remove(converted_path)
                    logger.debug(f"Cleaned up temporary WAV file: {converted_path}")
                except Exception as cleanup_err:
                    logger.warning(
                        f"Failed to clean up temp file {converted_path}: {cleanup_err}"
                    )


class GeminiSpeakingEvaluator:
    """Evaluates IELTS Speaking responses using Google Gemini AI."""

    # IELTS Speaking Band Descriptors
    EVALUATION_PROMPT = """You are an expert IELTS Speaking examiner. Evaluate the following speaking response according to the official IELTS Speaking assessment criteria.

**IELTS Speaking Part**: {part_type}
**Question**: {question}
**Transcript**: {transcript}

**Pronunciation Data from Azure**:
- Overall Pronunciation Score: {pronunciation_score}/100
- Fluency Score: {fluency_score}/100
- Accuracy Score: {accuracy_score}/100

Evaluate the response based on these four criteria:

1. **Fluency and Coherence** (Band 0-9):
   - Speaks fluently with only rare repetition or self-correction
   - Develops topics coherently and appropriately
   - Uses a range of cohesive devices appropriately
   - Speaks at length without noticeable effort or loss of coherence

2. **Lexical Resource** (Band 0-9):
   - Uses vocabulary with full flexibility and precision
   - Uses idiomatic language naturally and accurately
   - Shows awareness of style and collocation
   - Produces rare errors in word choice

3. **Grammatical Range and Accuracy** (Band 0-9):
   - Uses a full range of structures naturally and appropriately
   - Produces consistently accurate structures apart from 'slips'
   - Shows flexibility in using complex structures

4. **Pronunciation** (Band 0-9):
   - Uses a full range of pronunciation features with precision and subtlety
   - Sustains flexible use of features throughout
   - Is effortless to understand
   - Consider the Azure pronunciation score as a reference

**IMPORTANT SCORING GUIDELINES**:
- Band 9: Expert user - Full operational command
- Band 8: Very good user - Fully operational with occasional inaccuracies
- Band 7: Good user - Operational command with occasional inaccuracies
- Band 6: Competent user - Generally effective command despite inaccuracies
- Band 5: Modest user - Partial command, copes with overall meaning
- Band 4: Limited user - Basic competence in familiar situations
- Band 3: Extremely limited user - Conveys only general meaning
- Band 2: Intermittent user - Great difficulty understanding
- Band 1: Non-user - No ability to use the language
- Band 0: Did not attempt

Provide your evaluation in the following JSON format:
{{
    "fluency_and_coherence": {{
        "score": 7.0,
        "feedback": "Detailed feedback on fluency and coherence..."
    }},
    "lexical_resource": {{
        "score": 6.5,
        "feedback": "Detailed feedback on vocabulary usage..."
    }},
    "grammatical_range_and_accuracy": {{
        "score": 7.0,
        "feedback": "Detailed feedback on grammar..."
    }},
    "pronunciation": {{
        "score": 7.5,
        "feedback": "Detailed feedback on pronunciation..."
    }},
    "overall_band_score": 7.0,
    "overall_feedback": "Comprehensive overall feedback...",
    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "areas_for_improvement": ["Area 1", "Area 2", "Area 3"],
    "pronunciation_improvements": {{
        "specific_words": ["List specific mispronounced words that need practice"],
        "phonetic_tips": ["Specific tips for improving pronunciation of problematic sounds"],
        "practice_exercises": ["Suggested practice exercises or techniques"]
    }}
}}

Ensure all scores are realistic IELTS band scores (0-9, in 0.5 increments). The overall band score should be the average of the four criteria, rounded to the nearest 0.5.
If mispronounced words are provided, give specific guidance on how to improve pronunciation of those words."""

    def __init__(self):
        self.api_key = config("GEMINI_API_KEY")
        self.model_name = config("GEMINI_MODEL", default="gemini-2.5-flash")

        if not self.api_key:
            raise ValueError("Gemini API key not configured")

        # Initialize Gemini client
        self.client = genai.Client(api_key=self.api_key)

    def evaluate_speaking(
        self,
        transcript: str,
        question: str,
        part_type: str,
        pronunciation_score: float,
        fluency_score: float,
        accuracy_score: float,
        mispronounced_words: List[Dict] = None,
        omitted_words: List[str] = None,
        inserted_words: List[str] = None,
    ) -> Dict:
        """
        Evaluate speaking response using Gemini AI.

        Args:
            transcript: Transcribed text
            question: The speaking question/prompt
            part_type: Speaking part (Part 1, Part 2, Part 3)
            pronunciation_score: Azure pronunciation score (0-100)
            fluency_score: Azure fluency score (0-100)
            accuracy_score: Azure accuracy score (0-100)
            mispronounced_words: List of mispronounced words with scores
            omitted_words: List of omitted words
            inserted_words: List of inserted words

        Returns:
            Dictionary with evaluation results
        """
        try:
            # Prepare pronunciation details
            mispron_text = ""
            if mispronounced_words and len(mispronounced_words) > 0:
                mispron_text = "\n**Mispronounced Words**:\n"
                for item in mispronounced_words[:10]:  # Limit to top 10
                    mispron_text += (
                        f"- '{item['word']}' (accuracy: {item['accuracy_score']}/100)\n"
                    )

            omitted_text = ""
            if omitted_words and len(omitted_words) > 0:
                omitted_text = f"\n**Omitted Words**: {', '.join(omitted_words[:5])}\n"

            inserted_text = ""
            if inserted_words and len(inserted_words) > 0:
                inserted_text = (
                    f"\n**Inserted Words**: {', '.join(inserted_words[:5])}\n"
                )

            # Format the prompt
            prompt = (
                self.EVALUATION_PROMPT.format(
                    part_type=part_type,
                    question=question,
                    transcript=transcript,
                    pronunciation_score=pronunciation_score,
                    fluency_score=fluency_score,
                    accuracy_score=accuracy_score,
                )
                + mispron_text
                + omitted_text
                + inserted_text
            )

            # Call Gemini API
            response = generate_ai(prompt, model="gemini-2.5-flash")
            if response is None:
                raise ValueError("Gemini API returned no response text")

            # Validate and normalize scores
            result = self._validate_scores(response)

            logger.info(
                f"Successfully evaluated speaking response. Overall band: {result.get('overall_band_score')}"
            )
            return result

        except Exception as e:
            logger.error(f"Error during Gemini evaluation: {str(e)}", exc_info=True)
            raise

    def _validate_scores(self, result: Dict) -> Dict:
        """Validate and normalize band scores to IELTS format (0-9, 0.5 increments)."""

        def normalize_score(score):
            """Normalize score to IELTS band format."""
            try:
                score = float(score)
                # Clamp between 0 and 9
                score = max(0, min(9, score))
                # Round to nearest 0.5
                return round(score * 2) / 2
            except (ValueError, TypeError):
                return 0.0

        # Normalize individual criteria scores
        for criterion in [
            "fluency_and_coherence",
            "lexical_resource",
            "grammatical_range_and_accuracy",
            "pronunciation",
        ]:
            if criterion in result and isinstance(result[criterion], dict):
                result[criterion]["score"] = normalize_score(
                    result[criterion].get("score", 0)
                )

        # Calculate overall band score as average of four criteria
        scores = [
            result.get("fluency_and_coherence", {}).get("score", 0),
            result.get("lexical_resource", {}).get("score", 0),
            result.get("grammatical_range_and_accuracy", {}).get("score", 0),
            result.get("pronunciation", {}).get("score", 0),
        ]

        if all(isinstance(s, (int, float)) for s in scores):
            avg_score = sum(scores) / len(scores)
            result["overall_band_score"] = normalize_score(avg_score)
        else:
            result["overall_band_score"] = 0.0

        return result


def evaluate_speaking_attempt(
    audio_files: Dict[str, str], questions: List[Dict[str, str]], part_type: str
) -> Dict:
    """
    Complete evaluation pipeline for a speaking attempt.

    Args:
        audio_files: Dictionary mapping question IDs to audio file paths
        questions: List of question dictionaries with 'id' and 'text'
        part_type: Speaking part type (e.g., "Part 1: Introduction & Interview")

    Returns:
        Dictionary with complete evaluation results
    """
    try:
        # Initialize services
        speech_recognizer = AzureSpeechRecognizer()
        gemini_evaluator = GeminiSpeakingEvaluator()

        # Validate completeness of the speaking attempt
        total_questions = len(questions)
        answered_questions = len(audio_files)
        completion_rate = (
            answered_questions / total_questions if total_questions > 0 else 0
        )

        logger.info(
            f"Speaking attempt completeness: {answered_questions}/{total_questions} questions "
            f"({completion_rate:.1%}) - Part: {part_type}"
        )

        # IELTS Speaking requires substantial completion for valid evaluation
        # Minimum thresholds based on IELTS standards:
        # - Part 1: At least 8 questions (out of typical 10-12)
        # - Part 2: Must have the long turn response
        # - Part 3: At least 3 questions (out of typical 4-6)
        MIN_COMPLETION_RATE = 0.70  # 70% minimum completion

        if completion_rate < MIN_COMPLETION_RATE:
            logger.warning(
                f"Incomplete speaking attempt: Only {completion_rate:.1%} completed. "
                f"IELTS Speaking evaluation requires at least {MIN_COMPLETION_RATE:.0%} completion."
            )
            # Return partial evaluation with warning
            return {
                "success": False,
                "error": f"Incomplete speaking test: Only {answered_questions}/{total_questions} questions answered. "
                f"IELTS Speaking requires at least {int(MIN_COMPLETION_RATE * 100)}% completion for valid evaluation.",
                "completion_rate": completion_rate,
                "answered_questions": answered_questions,
                "total_questions": total_questions,
                "is_partial": True,
            }

        # Process each audio file
        transcripts = []
        pronunciation_scores = []
        fluency_scores = []
        accuracy_scores = []
        question_evaluations = []
        all_mispronounced_words = []
        all_omitted_words = []
        all_inserted_words = []
        unanswered_questions = []

        for question in questions:
            question_id = str(question["id"])
            question_text = question["text"]

            if question_id not in audio_files:
                logger.warning(
                    f"No audio file for question {question_id}: '{question_text}'"
                )
                unanswered_questions.append(
                    {"question_id": question_id, "question_text": question_text}
                )
                continue

            audio_path = audio_files[question_id]

            # Transcribe audio
            logger.info(f"Transcribing audio for question {question_id}")
            transcription_result = speech_recognizer.transcribe_audio(audio_path)

            if not transcription_result["success"]:
                logger.error(f"Transcription failed for question {question_id}")
                continue

            transcript = transcription_result["transcript"]
            transcripts.append(transcript)
            pronunciation_scores.append(transcription_result["pronunciation_score"])
            fluency_scores.append(transcription_result["fluency_score"])
            accuracy_scores.append(transcription_result["accuracy_score"])

            # Collect pronunciation issues
            all_mispronounced_words.extend(
                transcription_result.get("mispronounced_words", [])
            )
            all_omitted_words.extend(transcription_result.get("omitted_words", []))
            all_inserted_words.extend(transcription_result.get("inserted_words", []))

            # Store individual question evaluation
            question_evaluations.append(
                {
                    "question_id": question_id,
                    "question_text": question_text,
                    "transcript": transcript,
                    "pronunciation_score": transcription_result["pronunciation_score"],
                    "fluency_score": transcription_result["fluency_score"],
                    "accuracy_score": transcription_result["accuracy_score"],
                    "words": transcription_result["words"],
                    "mispronounced_words": transcription_result.get(
                        "mispronounced_words", []
                    ),
                    "omitted_words": transcription_result.get("omitted_words", []),
                    "inserted_words": transcription_result.get("inserted_words", []),
                }
            )

        if not transcripts:
            raise ValueError("No valid transcripts generated")

        # Combine all transcripts for overall evaluation
        combined_transcript = " ".join(transcripts)
        combined_questions = " | ".join([q["text"] for q in questions])

        # Calculate average Azure scores
        avg_pronunciation = (
            sum(pronunciation_scores) / len(pronunciation_scores)
            if pronunciation_scores
            else 0
        )
        avg_fluency = sum(fluency_scores) / len(fluency_scores) if fluency_scores else 0
        avg_accuracy = (
            sum(accuracy_scores) / len(accuracy_scores) if accuracy_scores else 0
        )

        # Evaluate with Gemini - include completeness information
        logger.info("Evaluating speaking with Gemini AI")

        # Add completeness context to the evaluation
        completeness_context = f"""
        IMPORTANT EVALUATION CONTEXT:
        - Total questions in test: {total_questions}
        - Questions answered: {answered_questions}
        - Completion rate: {completion_rate:.1%}
        - Unanswered questions: {len(unanswered_questions)}
        
        This evaluation is based on {answered_questions} out of {total_questions} expected questions.
        """

        if unanswered_questions:
            unanswered_list = [
                f"Q{q['question_id']}: {q['question_text']}"
                for q in unanswered_questions
            ]
            completeness_context += f"\nUnanswered questions:\n" + "\n".join(
                unanswered_list
            )

        # Modify the combined questions to include completeness context
        enhanced_questions = f"{combined_questions}\n\n{completeness_context}"

        evaluation = gemini_evaluator.evaluate_speaking(
            transcript=combined_transcript,
            question=enhanced_questions,
            part_type=part_type,
            pronunciation_score=avg_pronunciation,
            fluency_score=avg_fluency,
            accuracy_score=avg_accuracy,
            mispronounced_words=all_mispronounced_words,
            omitted_words=all_omitted_words,
            inserted_words=all_inserted_words,
        )

        # Apply completion penalty to band scores if not fully complete
        if completion_rate < 1.0:
            logger.info(
                f"Applying completion penalty: {completion_rate:.1%} completion rate"
            )

            # Apply penalty to overall band score and individual criteria
            completion_penalty = max(
                0.5, completion_rate
            )  # Minimum 50% of original score

            if "overall_band_score" in evaluation:
                original_score = evaluation["overall_band_score"]
                evaluation["overall_band_score"] = original_score * completion_penalty
                logger.info(
                    f"Overall band score adjusted: {original_score} → {evaluation['overall_band_score']:.1f}"
                )

            # Apply penalty to individual criteria scores
            for criterion in [
                "fluency_and_coherence",
                "lexical_resource",
                "grammatical_range_and_accuracy",
                "pronunciation",
            ]:
                if (
                    criterion in evaluation
                    and isinstance(evaluation[criterion], dict)
                    and "score" in evaluation[criterion]
                ):
                    original_score = evaluation[criterion]["score"]
                    evaluation[criterion]["score"] = original_score * completion_penalty

                    # Add note about incompleteness to feedback
                    if "feedback" in evaluation[criterion]:
                        evaluation[criterion][
                            "feedback"
                        ] += f"\n\nNOTE: Score adjusted due to incomplete test (only {answered_questions}/{total_questions} questions answered)."

        # Combine results
        return {
            "success": True,
            "transcripts": question_evaluations,
            "combined_transcript": combined_transcript,
            "evaluation": evaluation,
            "azure_scores": {
                "pronunciation": avg_pronunciation,
                "fluency": avg_fluency,
                "accuracy": avg_accuracy,
            },
            "completeness_info": {
                "total_questions": total_questions,
                "answered_questions": answered_questions,
                "completion_rate": completion_rate,
                "unanswered_questions": unanswered_questions,
                "is_complete": completion_rate >= 1.0,
                "penalty_applied": completion_rate < 1.0,
            },
        }

    except Exception as e:
        logger.error(f"Error in speaking evaluation pipeline: {str(e)}", exc_info=True)
        return {"success": False, "error": str(e)}
