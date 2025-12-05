"""
Section Practices API Package
Organized by section type: Listening, Reading, Writing, Speaking
"""

from .listening import (
    get_listening_practices,
    get_listening_practice,
    create_listening_practice,
    update_listening_practice,
    delete_listening_practice,
    toggle_listening_practice_status,
    bulk_create_listening_practices,
    get_available_listening_content,
)

from .reading import (
    get_reading_practices,
    get_reading_practice,
    create_reading_practice,
    update_reading_practice,
    delete_reading_practice,
    toggle_reading_practice_status,
    bulk_create_reading_practices,
    get_available_reading_content,
)

from .writing import (
    get_writing_practices,
    get_writing_practice,
    create_writing_practice,
    update_writing_practice,
    delete_writing_practice,
    toggle_writing_practice_status,
    bulk_create_writing_practices,
    get_available_writing_content,
)

from .speaking import (
    get_speaking_practices,
    get_speaking_practice,
    create_speaking_practice,
    update_speaking_practice,
    delete_speaking_practice,
    toggle_speaking_practice_status,
    bulk_create_speaking_practices,
    get_available_speaking_content,
)

from .stats import get_practices_stats

__all__ = [
    # Listening
    "get_listening_practices",
    "get_listening_practice",
    "create_listening_practice",
    "update_listening_practice",
    "delete_listening_practice",
    "toggle_listening_practice_status",
    "bulk_create_listening_practices",
    "get_available_listening_content",
    # Reading
    "get_reading_practices",
    "get_reading_practice",
    "create_reading_practice",
    "update_reading_practice",
    "delete_reading_practice",
    "toggle_reading_practice_status",
    "bulk_create_reading_practices",
    "get_available_reading_content",
    # Writing
    "get_writing_practices",
    "get_writing_practice",
    "create_writing_practice",
    "update_writing_practice",
    "delete_writing_practice",
    "toggle_writing_practice_status",
    "bulk_create_writing_practices",
    "get_available_writing_content",
    # Speaking
    "get_speaking_practices",
    "get_speaking_practice",
    "create_speaking_practice",
    "update_speaking_practice",
    "delete_speaking_practice",
    "toggle_speaking_practice_status",
    "bulk_create_speaking_practices",
    "get_available_speaking_content",
    # Stats
    "get_practices_stats",
]
