"""
Manager API Package
Organized API endpoints for the manager panel
"""

# Import all API views for easier access
from .dashboard import get_dashboard_stats
from .students import (
    get_students_list,
    get_student_detail,
    student_toggle_active,
    create_student,
    update_student,
    delete_student,
)
from .tests import (
    # Reading
    get_reading_passages,
    get_reading_passage,
    create_reading_passage,
    update_reading_passage,
    delete_reading_passage,
    # Listening
    get_listening_parts,
    get_listening_part,
    create_listening_part,
    update_listening_part,
    delete_listening_part,
    # Writing
    get_writing_tasks,
    create_writing_task,
    update_writing_task,
    delete_writing_task,
    # Speaking
    get_speaking_topics,
    create_speaking_topic,
    update_speaking_topic,
    delete_speaking_topic,
)
from .questions import (
    get_testheads,
    get_testhead,
    create_testhead,
    update_testhead,
    delete_testhead,
    create_question,
    create_questions_bulk,
    update_question,
    delete_question,
)
from .mock_tests import (
    get_mock_tests,
    get_mock_test,
    create_mock_test,
    update_mock_test,
    toggle_mock_test_status,
    delete_mock_test,
    get_student_results,
    get_available_reading,
    get_available_listening,
    get_available_writing,
    get_available_speaking,
)

__all__ = [
    # Dashboard
    "get_dashboard_stats",
    # Students
    "get_students_list",
    "get_student_detail",
    "student_toggle_active",
    "create_student",
    "update_student",
    "delete_student",
    # Reading
    "get_reading_passages",
    "get_reading_passage",
    "create_reading_passage",
    "update_reading_passage",
    "delete_reading_passage",
    # Listening
    "get_listening_parts",
    "get_listening_part",
    "create_listening_part",
    "update_listening_part",
    "delete_listening_part",
    # Writing
    "get_writing_tasks",
    "create_writing_task",
    "update_writing_task",
    "delete_writing_task",
    # Speaking
    "get_speaking_topics",
    "create_speaking_topic",
    "update_speaking_topic",
    "delete_speaking_topic",
    # Questions
    "get_testheads",
    "get_testhead",
    "create_testhead",
    "update_testhead",
    "delete_testhead",
    "create_question",
    "create_questions_bulk",
    "update_question",
    "delete_question",
    # Mock Tests & Results
    "get_mock_tests",
    "get_mock_test",
    "create_mock_test",
    "update_mock_test",
    "toggle_mock_test_status",
    "delete_mock_test",
    "get_student_results",
    # Available content helpers
    "get_available_reading",
    "get_available_listening",
    "get_available_writing",
    "get_available_speaking",
]
