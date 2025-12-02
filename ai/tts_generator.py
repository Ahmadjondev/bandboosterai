"""
IELTS Speaking TTS (Text-to-Speech) Generator using Microsoft Azure Cognitive Services.

This module provides text-to-speech functionality for IELTS Speaking questions,
generating audio that mimics a real IELTS examiner reading questions aloud.

Uses Microsoft Azure Speech Services with British English voices for authentic exam experience.
"""

import logging
import os
import uuid
import io
from typing import Optional, Tuple, Dict
from decouple import config
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings

logger = logging.getLogger(__name__)


class AzureTTSGenerator:
    """
    Handles text-to-speech generation using Microsoft Azure Speech Services.

    Uses British English voices to match the authentic IELTS exam experience.
    Supports multiple voice options for variety.
    """

    # Azure TTS Voice options for IELTS (British English)
    VOICE_OPTIONS = {
        "female_primary": "en-GB-SoniaNeural",  # Clear, professional female voice
        "female_secondary": "en-GB-LibbyNeural",  # Alternative female voice
        "male_primary": "en-GB-RyanNeural",  # Clear, professional male voice
        "male_secondary": "en-GB-ThomasNeural",  # Alternative male voice
    }

    # Speaking part-specific settings (pacing, style)
    SPEAKING_PART_SSML_STYLES = {
        "PART_1": {
            "rate": "0%",  # Normal pace for interview questions
            "pitch": "0%",
            "style": "friendly",
        },
        "PART_2": {
            "rate": "-5%",  # Slightly slower for cue card reading
            "pitch": "0%",
            "style": "calm",
        },
        "PART_3": {
            "rate": "0%",  # Normal pace for discussion
            "pitch": "0%",
            "style": "conversational",
        },
    }

    def __init__(self):
        """Initialize Azure TTS with credentials from environment."""
        # Use dedicated TTS keys or fallback to existing speech keys
        self.speech_key = config("AZURE_TTS_KEY", default=None) or config(
            "AZURE_SPEECH_KEY", default=None
        )
        self.speech_region = config("AZURE_TTS_REGION", default=None) or config(
            "AZURE_SPEECH_REGION", default="westeurope"
        )
        self.endpoint = config("AZURE_TTS_ENDPOINT", default=None)

        if not self.speech_key:
            raise ValueError(
                "Azure TTS credentials not configured. Set AZURE_TTS_KEY or AZURE_SPEECH_KEY in environment."
            )

        # Default voice
        self.default_voice = self.VOICE_OPTIONS["female_primary"]

    def get_voice_name(self, voice_key: str) -> str:
        """
        Get the Azure voice name from a voice key.

        Args:
            voice_key: Voice type key (female_primary, male_primary, etc.)

        Returns:
            Azure voice name string
        """
        return self.VOICE_OPTIONS.get(voice_key, self.default_voice)

    def _build_ssml(
        self,
        text: str,
        voice: str,
        speaking_part: str = "PART_1",
        add_pauses: bool = True,
    ) -> str:
        """
        Build SSML (Speech Synthesis Markup Language) for the given text.

        Args:
            text: The question text to synthesize
            voice: Azure voice name
            speaking_part: IELTS speaking part (PART_1, PART_2, PART_3)
            add_pauses: Whether to add natural pauses

        Returns:
            SSML string for Azure TTS API
        """
        style_settings = self.SPEAKING_PART_SSML_STYLES.get(
            speaking_part, self.SPEAKING_PART_SSML_STYLES["PART_1"]
        )
        rate = style_settings["rate"]
        pitch = style_settings["pitch"]

        # Escape special XML characters
        escaped_text = (
            text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        )

        # Add natural pause at the end of questions
        if add_pauses and escaped_text.strip().endswith("?"):
            escaped_text = escaped_text.strip() + '<break time="500ms"/>'

        ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-GB">
    <voice name="{voice}">
        <prosody rate="{rate}" pitch="{pitch}">
            {escaped_text}
        </prosody>
    </voice>
</speak>"""

        return ssml

    def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        speaking_part: str = "PART_1",
        output_format: str = "audio-24khz-48kbitrate-mono-mp3",
    ) -> Tuple[bytes, Dict]:
        """
        Generate speech audio from text using Azure TTS REST API.

        Args:
            text: The text to convert to speech
            voice: Azure voice name (defaults to en-GB-SoniaNeural)
            speaking_part: IELTS speaking part for appropriate pacing
            output_format: Audio format (default MP3)

        Returns:
            Tuple of (audio_bytes, metadata_dict)
        """
        import requests

        if not voice:
            voice = self.default_voice

        # Build SSML
        ssml = self._build_ssml(text, voice, speaking_part)

        # Azure TTS endpoint - always use tts.speech.microsoft.com
        # The api.cognitive.microsoft.com endpoint is for other services, not TTS
        tts_url = f"https://{self.speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"

        headers = {
            "Ocp-Apim-Subscription-Key": self.speech_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": output_format,
            "User-Agent": "IELTSMockSystem/1.0",
        }

        try:
            response = requests.post(
                tts_url, headers=headers, data=ssml.encode("utf-8"), timeout=30
            )
            response.raise_for_status()

            audio_bytes = response.content

            metadata = {
                "voice": voice,
                "speaking_part": speaking_part,
                "text_length": len(text),
                "audio_size": len(audio_bytes),
                "format": output_format,
            }

            logger.info(
                f"TTS generated successfully: {len(audio_bytes)} bytes for '{text[:50]}...'"
            )
            return audio_bytes, metadata

        except requests.exceptions.RequestException as e:
            logger.error(f"Azure TTS API error: {e}")
            raise Exception(f"Failed to generate TTS audio: {str(e)}")

    def generate_and_save(
        self,
        text: str,
        filename_prefix: str = "speaking_tts",
        voice: Optional[str] = None,
        speaking_part: str = "PART_1",
    ) -> Tuple[str, Dict]:
        """
        Generate TTS audio and save to storage (S3 or local).

        Args:
            text: The text to convert to speech
            filename_prefix: Prefix for the generated filename
            voice: Azure voice name
            speaking_part: IELTS speaking part

        Returns:
            Tuple of (file_url, metadata_dict)
        """
        audio_bytes, metadata = self.generate_audio(text, voice, speaking_part)

        # Generate unique filename
        unique_id = uuid.uuid4().hex[:12]
        filename = f"ielts/speaking_tts/{filename_prefix}_{unique_id}.mp3"

        # Save to storage
        content_file = ContentFile(audio_bytes)
        saved_path = default_storage.save(filename, content_file)

        # Get the URL
        if hasattr(default_storage, "url"):
            file_url = default_storage.url(saved_path)
        else:
            file_url = f"{settings.MEDIA_URL}{saved_path}"

        metadata["file_path"] = saved_path
        metadata["file_url"] = file_url

        logger.info(f"TTS audio saved: {file_url}")
        return file_url, metadata


def generate_speaking_question_audio(
    question_text: str, speaking_part: str = "PART_1", voice: str = "female_primary"
) -> Tuple[str, Dict]:
    """
    Convenience function to generate TTS audio for a speaking question.

    Args:
        question_text: The question to synthesize
        speaking_part: PART_1, PART_2, or PART_3
        voice: Voice type key (female_primary, male_primary, etc.)

    Returns:
        Tuple of (audio_url, metadata)
    """
    generator = AzureTTSGenerator()
    voice_name = generator.VOICE_OPTIONS.get(voice, generator.default_voice)

    return generator.generate_and_save(
        text=question_text,
        filename_prefix=f"q_{speaking_part.lower()}",
        voice=voice_name,
        speaking_part=speaking_part,
    )


def generate_cue_card_audio(
    cue_card: dict, voice: str = "female_primary"
) -> Tuple[str, Dict]:
    """
    Generate TTS audio for a Part 2 cue card (main prompt + bullet points).

    Args:
        cue_card: Dictionary with main_prompt and bullet_points
        voice: Voice type key

    Returns:
        Tuple of (audio_url, metadata)
    """
    # Build the full cue card text
    main_prompt = cue_card.get("main_prompt", "")
    bullet_points = cue_card.get("bullet_points", [])

    # Format the text naturally
    full_text = main_prompt
    if bullet_points:
        full_text += " You should say: "
        for i, point in enumerate(bullet_points):
            if i == len(bullet_points) - 1:
                full_text += f"and {point}."
            else:
                full_text += f"{point}, "

    follow_up = cue_card.get("follow_up")
    if follow_up:
        full_text += f" {follow_up}"

    generator = AzureTTSGenerator()
    voice_name = generator.VOICE_OPTIONS.get(voice, generator.default_voice)

    return generator.generate_and_save(
        text=full_text,
        filename_prefix="cue_card",
        voice=voice_name,
        speaking_part="PART_2",
    )


def batch_generate_speaking_audio(
    topics_data: list,
    voice: str = "female_primary",
    generate_all_questions: bool = True,
) -> dict:
    """
    Batch generate TTS audio for multiple speaking topics.

    Args:
        topics_data: List of topic dictionaries from AI extraction
        voice: Voice type to use
        generate_all_questions: If True, generate audio for each individual question

    Returns:
        Dictionary with topic_index -> audio_urls mapping
    """
    results = {
        "success": True,
        "generated": [],
        "errors": [],
    }

    generator = AzureTTSGenerator()
    voice_name = generator.VOICE_OPTIONS.get(voice, generator.default_voice)

    for idx, topic in enumerate(topics_data):
        try:
            part_number = topic.get("part_number", 1)
            speaking_part = f"PART_{part_number}"

            topic_result = {
                "topic_index": idx,
                "part_number": part_number,
                "question_audios": [],
            }

            if part_number == 2:
                # Generate cue card audio
                cue_card = topic.get("cue_card", {})
                if cue_card:
                    audio_url, metadata = generate_cue_card_audio(cue_card, voice)
                    topic_result["cue_card_audio"] = audio_url
            else:
                # Part 1 or Part 3: Generate audio for each question
                questions = topic.get("questions", [])
                if generate_all_questions:
                    for q_idx, question in enumerate(questions):
                        try:
                            audio_url, metadata = generator.generate_and_save(
                                text=question,
                                filename_prefix=f"q{q_idx+1}_{speaking_part.lower()}",
                                voice=voice_name,
                                speaking_part=speaking_part,
                            )
                            topic_result["question_audios"].append(
                                {
                                    "question_index": q_idx,
                                    "question_text": question,
                                    "audio_url": audio_url,
                                }
                            )
                        except Exception as e:
                            results["errors"].append(
                                {
                                    "topic_index": idx,
                                    "question_index": q_idx,
                                    "error": str(e),
                                }
                            )

            results["generated"].append(topic_result)

        except Exception as e:
            results["errors"].append(
                {
                    "topic_index": idx,
                    "error": str(e),
                }
            )

    results["success"] = len(results["errors"]) == 0
    return results
