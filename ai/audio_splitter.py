"""
Audio Splitter for IELTS Listening Tests
Splits full listening audio files into parts based on timestamps.
Uses pydub for audio processing.
"""

import os
import tempfile
from typing import List, Dict, Tuple, Optional, BinaryIO
from io import BytesIO
from pydub import AudioSegment
from pydub.utils import mediainfo
from django.core.files.uploadedfile import InMemoryUploadedFile, TemporaryUploadedFile
from django.core.files.base import ContentFile


class AudioSplitter:
    """
    Handles splitting of full IELTS listening audio into 4 parts.

    Features:
    - Accepts various audio formats (mp3, wav, m4a, ogg, flac)
    - Splits by timestamps (in seconds or mm:ss format)
    - Auto-detects audio duration
    - Returns split segments as bytes for further processing
    """

    SUPPORTED_FORMATS = ["mp3", "wav", "ogg", "m4a", "flac", "webm", "aac"]

    def __init__(self, audio_file: BinaryIO | bytes, file_format: str = None):
        """
        Initialize the audio splitter with an audio file.

        Args:
            audio_file: Audio file as file-like object or bytes
            file_format: Audio format (mp3, wav, etc.). Auto-detected if not provided.
        """
        self.audio_file = audio_file
        self.file_format = file_format
        self.audio_segment: Optional[AudioSegment] = None
        self.duration_seconds: float = 0
        self.duration_ms: int = 0

    def load(self) -> "AudioSplitter":
        """
        Load the audio file into memory.

        Returns:
            Self for method chaining
        """
        # Handle Django uploaded files
        if isinstance(self.audio_file, (InMemoryUploadedFile, TemporaryUploadedFile)):
            audio_data = self.audio_file.read()
            self.audio_file.seek(0)  # Reset for potential re-read

            # Auto-detect format from filename
            if not self.file_format:
                filename = getattr(self.audio_file, "name", "")
                ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "mp3"
                self.file_format = ext
        elif isinstance(self.audio_file, bytes):
            audio_data = self.audio_file
        else:
            audio_data = self.audio_file.read()
            if hasattr(self.audio_file, "seek"):
                self.audio_file.seek(0)

        # Default format
        if not self.file_format:
            self.file_format = "mp3"

        # Normalize format
        format_map = {
            "m4a": "mp4",  # pydub uses 'mp4' for m4a
            "aac": "mp4",
        }
        pydub_format = format_map.get(
            self.file_format.lower(), self.file_format.lower()
        )

        # Load audio from bytes
        audio_io = BytesIO(audio_data)
        self.audio_segment = AudioSegment.from_file(audio_io, format=pydub_format)

        # Calculate duration
        self.duration_ms = len(self.audio_segment)
        self.duration_seconds = self.duration_ms / 1000.0

        return self

    def get_duration(self) -> Dict:
        """
        Get the duration of the loaded audio.

        Returns:
            Dictionary with duration info:
            - duration_seconds: Total duration in seconds
            - duration_ms: Total duration in milliseconds
            - duration_formatted: Formatted as "mm:ss"
        """
        if not self.audio_segment:
            raise ValueError("Audio not loaded. Call load() first.")

        minutes = int(self.duration_seconds // 60)
        seconds = int(self.duration_seconds % 60)

        return {
            "duration_seconds": self.duration_seconds,
            "duration_ms": self.duration_ms,
            "duration_formatted": f"{minutes:02d}:{seconds:02d}",
        }

    @staticmethod
    def parse_timestamp(timestamp: str | int | float) -> int:
        """
        Parse timestamp to milliseconds.

        Args:
            timestamp: Can be:
                - Integer/float: seconds
                - String: "mm:ss" or "hh:mm:ss" or just seconds as string

        Returns:
            Time in milliseconds
        """
        if isinstance(timestamp, (int, float)):
            return int(timestamp * 1000)

        # Parse string timestamp
        timestamp = str(timestamp).strip()

        # Check if it's just a number (seconds)
        try:
            return int(float(timestamp) * 1000)
        except ValueError:
            pass

        # Parse mm:ss or hh:mm:ss format
        parts = timestamp.split(":")
        if len(parts) == 2:
            minutes, seconds = parts
            return int(float(minutes) * 60 * 1000 + float(seconds) * 1000)
        elif len(parts) == 3:
            hours, minutes, seconds = parts
            return int(
                float(hours) * 3600 * 1000
                + float(minutes) * 60 * 1000
                + float(seconds) * 1000
            )
        else:
            raise ValueError(f"Invalid timestamp format: {timestamp}")

    @staticmethod
    def format_timestamp(ms: int) -> str:
        """
        Format milliseconds to mm:ss string.

        Args:
            ms: Time in milliseconds

        Returns:
            Formatted timestamp string "mm:ss"
        """
        total_seconds = ms // 1000
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes:02d}:{seconds:02d}"

    def split_by_timestamps(
        self,
        timestamps: List[Tuple[str | int | float, str | int | float]],
        output_format: str = "mp3",
        bitrate: str = "192k",
    ) -> List[Dict]:
        """
        Split audio by timestamp ranges.

        Args:
            timestamps: List of (start, end) tuples for each part.
                        Each can be seconds (int/float) or "mm:ss" string.
            output_format: Output audio format (default: mp3)
            bitrate: Output bitrate for compressed formats

        Returns:
            List of dictionaries with:
            - part_number: 1-4
            - start_ms: Start time in ms
            - end_ms: End time in ms
            - start_formatted: Start time as "mm:ss"
            - end_formatted: End time as "mm:ss"
            - duration_seconds: Part duration in seconds
            - audio_bytes: Split audio segment as bytes
        """
        if not self.audio_segment:
            raise ValueError("Audio not loaded. Call load() first.")

        results = []

        for i, (start, end) in enumerate(timestamps):
            start_ms = self.parse_timestamp(start)
            end_ms = self.parse_timestamp(end)

            # Validate timestamps
            if start_ms < 0:
                start_ms = 0
            if end_ms > self.duration_ms:
                end_ms = self.duration_ms
            if start_ms >= end_ms:
                raise ValueError(
                    f"Invalid timestamp range for part {i + 1}: start ({start}) >= end ({end})"
                )

            # Extract segment
            segment = self.audio_segment[start_ms:end_ms]

            # Export to bytes
            output_io = BytesIO()
            segment.export(output_io, format=output_format, bitrate=bitrate)
            audio_bytes = output_io.getvalue()

            results.append(
                {
                    "part_number": i + 1,
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                    "start_formatted": self.format_timestamp(start_ms),
                    "end_formatted": self.format_timestamp(end_ms),
                    "duration_seconds": (end_ms - start_ms) / 1000.0,
                    "audio_bytes": audio_bytes,
                }
            )

        return results

    def suggest_split_points(self, num_parts: int = 4) -> List[Tuple[int, int]]:
        """
        Suggest equal split points for the audio.

        Args:
            num_parts: Number of parts to split into (default: 4 for IELTS)

        Returns:
            List of (start_ms, end_ms) tuples for each part
        """
        if not self.audio_segment:
            raise ValueError("Audio not loaded. Call load() first.")

        part_duration = self.duration_ms // num_parts
        split_points = []

        for i in range(num_parts):
            start = i * part_duration
            end = (i + 1) * part_duration if i < num_parts - 1 else self.duration_ms
            split_points.append((start, end))

        return split_points

    def auto_split(
        self, num_parts: int = 4, output_format: str = "mp3", bitrate: str = "192k"
    ) -> List[Dict]:
        """
        Automatically split audio into equal parts.

        Args:
            num_parts: Number of parts (default: 4 for IELTS)
            output_format: Output audio format
            bitrate: Output bitrate

        Returns:
            List of split audio info (same as split_by_timestamps)
        """
        split_points = self.suggest_split_points(num_parts)
        return self.split_by_timestamps(split_points, output_format, bitrate)


def get_audio_info(audio_file: BinaryIO | bytes, file_format: str = None) -> Dict:
    """
    Get information about an audio file without fully loading it.

    Args:
        audio_file: Audio file as file-like object or bytes
        file_format: Audio format hint

    Returns:
        Dictionary with audio info
    """
    splitter = AudioSplitter(audio_file, file_format)
    splitter.load()
    return splitter.get_duration()


def split_listening_audio(
    audio_file: BinaryIO | bytes,
    timestamps: List[Dict] = None,
    file_format: str = None,
    output_format: str = "mp3",
) -> Dict:
    """
    Main function to split IELTS listening audio into 4 parts.

    Args:
        audio_file: The full audio file
        timestamps: Optional list of dicts with 'start' and 'end' keys.
                   If not provided, audio is split equally into 4 parts.
        file_format: Input file format (auto-detected if not provided)
        output_format: Output format for split files

    Returns:
        Dictionary with:
        - success: bool
        - original_duration: Duration info of original audio
        - parts: List of split part info with audio bytes
    """
    try:
        splitter = AudioSplitter(audio_file, file_format)
        splitter.load()

        duration_info = splitter.get_duration()

        if timestamps:
            # Use provided timestamps
            timestamp_pairs = [(t["start"], t["end"]) for t in timestamps]
            parts = splitter.split_by_timestamps(timestamp_pairs, output_format)
        else:
            # Auto-split into 4 equal parts
            parts = splitter.auto_split(4, output_format)

        return {
            "success": True,
            "original_duration": duration_info,
            "parts": parts,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "original_duration": None,
            "parts": [],
        }


def analyze_audio_for_splitting(
    audio_file: BinaryIO | bytes, file_format: str = None
) -> Dict:
    """
    Analyze audio and return suggested split points for admin review.

    This provides the admin with information to make informed decisions
    about where to split the audio.

    Args:
        audio_file: The full audio file
        file_format: Format hint

    Returns:
        Dictionary with audio info and suggested split points
    """
    try:
        splitter = AudioSplitter(audio_file, file_format)
        splitter.load()

        duration_info = splitter.get_duration()
        suggested_splits = splitter.suggest_split_points(4)

        # Convert to more readable format
        split_suggestions = []
        for i, (start_ms, end_ms) in enumerate(suggested_splits):
            split_suggestions.append(
                {
                    "part_number": i + 1,
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                    "start_formatted": splitter.format_timestamp(start_ms),
                    "end_formatted": splitter.format_timestamp(end_ms),
                    "duration_seconds": (end_ms - start_ms) / 1000.0,
                }
            )

        return {
            "success": True,
            "duration": duration_info,
            "suggested_splits": split_suggestions,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
