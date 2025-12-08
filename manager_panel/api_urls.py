"""
Manager API URL Configuration
RESTful endpoints for manager administrative functions.
"""

from django.urls import path
from .api import (
    # Dashboard
    get_dashboard_stats,
    # Students
    get_students_list,
    get_student_detail,
    student_toggle_active,
    create_student,
    update_student,
    delete_student,
    # Reading Tests
    get_reading_passages,
    get_reading_passage,
    create_reading_passage,
    update_reading_passage,
    delete_reading_passage,
    # Listening Tests
    get_listening_parts,
    get_listening_part,
    create_listening_part,
    update_listening_part,
    delete_listening_part,
    # Writing Tests
    get_writing_tasks,
    create_writing_task,
    update_writing_task,
    delete_writing_task,
    # Speaking Tests
    get_speaking_topics,
    get_speaking_topic_detail,
    create_speaking_topic,
    update_speaking_topic,
    delete_speaking_topic,
    # Speaking Questions
    add_speaking_question,
    update_speaking_question,
    delete_speaking_question,
    # Questions
    get_testheads,
    get_testhead,
    create_testhead,
    update_testhead,
    delete_testhead,
    create_question,
    create_questions_bulk,
    update_question,
    delete_question,
    # Mock Tests
    get_mock_tests,
    get_mock_test,
    create_mock_test,
    update_mock_test,
    toggle_mock_test_status,
    delete_mock_test,
    # Available content for Mock Tests
    get_available_reading,
    get_available_listening,
    get_available_writing,
    get_available_speaking,
    # Results
    get_student_results,
)
from .api_views import (
    get_csrf_token,
    verify_session,
    get_tokens_for_session,
)
from .ai_api import (
    generate_content_from_pdf,
    save_generated_content,
    upload_audio_temp,
    generate_full_test_from_pdf,
    save_full_test_content,
    upload_batch_audio,
    create_section_practice,
    create_practices_batch,
    # TTS endpoints
    generate_tts_for_topic,
    generate_tts_for_question,
    generate_tts_for_saved_question,
    generate_tts_batch,
    get_tts_voices,
    # Default speaking audio endpoints
    get_default_speaking_audios,
    generate_default_speaking_audio,
    generate_all_default_speaking_audios,
    update_default_speaking_audio,
    delete_default_speaking_audio,
)
from .api.exams import (
    get_exams_list,
    get_exam_detail,
    create_exam,
    update_exam,
    delete_exam,
    toggle_exam_status,
    remove_student_from_exam,
    get_exam_statistics,
    get_exam_results,
    export_exam_results,
    get_student_result_detail,
    evaluate_writing_submission,
)
from .api.books import (
    get_books_manager,
    get_book_manager,
    create_book,
    update_book,
    delete_book,
    toggle_book_status,
    get_sections_manager,
    get_section_manager,
    create_section,
    update_section,
    delete_section,
    bulk_save_sections_manager,
    reorder_sections,
    get_available_content,
    get_book_stats,
)
from .api.promo_codes import (
    get_promo_codes,
    get_promo_code,
    create_promo_code,
    update_promo_code,
    delete_promo_code,
    toggle_promo_code_status,
    get_promo_code_usages,
    get_promo_analytics,
    get_available_plans,
)
from manager_panel.api.section_practices import (
    get_section_practices,
    get_section_practice,
    create_section_practice,
    update_section_practice,
    delete_section_practice,
    toggle_section_practice_status,
    get_available_content as get_practice_available_content,
    get_section_practice_stats,
)

# Section-specific practices imports
from manager_panel.api.practices.listening import (
    get_listening_practices,
    get_listening_practice,
    create_listening_practice,
    update_listening_practice,
    delete_listening_practice,
    toggle_listening_practice_status,
    bulk_create_listening_practices,
    get_available_listening_content,
)
from manager_panel.api.practices.reading import (
    get_reading_practices,
    get_reading_practice,
    create_reading_practice,
    update_reading_practice,
    delete_reading_practice,
    toggle_reading_practice_status,
    bulk_create_reading_practices,
    get_available_reading_content,
)
from manager_panel.api.practices.writing import (
    get_writing_practices,
    get_writing_practice,
    create_writing_practice,
    update_writing_practice,
    delete_writing_practice,
    toggle_writing_practice_status,
    bulk_create_writing_practices,
    get_available_writing_content,
)
from manager_panel.api.practices.speaking import (
    get_speaking_practices,
    get_speaking_practice,
    create_speaking_practice,
    update_speaking_practice,
    delete_speaking_practice,
    toggle_speaking_practice_status,
    bulk_create_speaking_practices,
    get_available_speaking_content,
)
from manager_panel.api.practices.stats import get_practices_stats

# AI Configuration imports
from manager_panel.api.ai_config import (
    get_ai_configurations,
    get_ai_configuration,
    create_ai_configuration,
    update_ai_configuration,
    delete_ai_configuration,
    set_primary_configuration,
    toggle_configuration_status,
    test_ai_configuration,
    get_available_providers,
    get_available_models,
    get_ai_usage_stats,
    get_ai_usage_logs,
)

app_name = "manager_api"

urlpatterns = [
    # Authentication & Session
    path("auth/csrf/", get_csrf_token, name="csrf_token"),
    path("auth/verify-session/", verify_session, name="verify_session"),
    path("auth/get-tokens/", get_tokens_for_session, name="get_tokens"),
    # Dashboard
    path("dashboard/stats/", get_dashboard_stats, name="dashboard_stats"),
    # User Management
    path("users/students/", get_students_list, name="students_list"),
    path("users/students/create/", create_student, name="create_student"),
    path(
        "users/students/<int:user_id>/",
        get_student_detail,
        name="student_detail",
    ),
    path(
        "users/students/<int:user_id>/update/",
        update_student,
        name="update_student",
    ),
    path(
        "users/students/<int:user_id>/delete/",
        delete_student,
        name="delete_student",
    ),
    path(
        "users/students/<int:user_id>/toggle-active/",
        student_toggle_active,
        name="student_toggle_active",
    ),
    # Reading Tests
    path("tests/reading/", get_reading_passages, name="reading_passages"),
    path(
        "tests/reading/create/",
        create_reading_passage,
        name="create_reading_passage",
    ),
    path(
        "tests/reading/<int:passage_id>/",
        get_reading_passage,
        name="get_reading_passage",
    ),
    path(
        "tests/reading/<int:passage_id>/update/",
        update_reading_passage,
        name="update_reading_passage",
    ),
    path(
        "tests/reading/<int:passage_id>/delete/",
        delete_reading_passage,
        name="delete_reading_passage",
    ),
    # TestHead (Question Groups) Management
    path(
        "tests/testheads/",
        get_testheads,
        name="get_testheads",
    ),
    path(
        "tests/testhead/<int:testhead_id>/",
        get_testhead,
        name="get_testhead",
    ),
    path(
        "tests/testhead/create/",
        create_testhead,
        name="create_testhead",
    ),
    path(
        "tests/testhead/<int:testhead_id>/update/",
        update_testhead,
        name="update_testhead",
    ),
    path(
        "tests/testhead/<int:testhead_id>/delete/",
        delete_testhead,
        name="delete_testhead",
    ),
    # Question Management
    path(
        "tests/question/create/",
        create_question,
        name="create_question",
    ),
    path(
        "tests/questions/bulk-create/",
        create_questions_bulk,
        name="create_questions_bulk",
    ),
    path(
        "tests/question/<int:question_id>/update/",
        update_question,
        name="update_question",
    ),
    path(
        "tests/question/<int:question_id>/delete/",
        delete_question,
        name="delete_question",
    ),
    # Listening Tests
    path("tests/listening/", get_listening_parts, name="listening_parts"),
    path(
        "tests/listening/create/",
        create_listening_part,
        name="create_listening_part",
    ),
    path(
        "tests/listening/<int:part_id>/",
        get_listening_part,
        name="get_listening_part",
    ),
    path(
        "tests/listening/<int:part_id>/update/",
        update_listening_part,
        name="update_listening_part",
    ),
    path(
        "tests/listening/<int:part_id>/delete/",
        delete_listening_part,
        name="delete_listening_part",
    ),
    # Writing Tests
    path("tests/writing/", get_writing_tasks, name="writing_tasks"),
    path(
        "tests/writing/create/",
        create_writing_task,
        name="create_writing_task",
    ),
    path(
        "tests/writing/<int:task_id>/update/",
        update_writing_task,
        name="update_writing_task",
    ),
    path(
        "tests/writing/<int:task_id>/delete/",
        delete_writing_task,
        name="delete_writing_task",
    ),
    # Speaking Tests
    path("tests/speaking/", get_speaking_topics, name="speaking_topics"),
    path(
        "tests/speaking/<int:topic_id>/",
        get_speaking_topic_detail,
        name="speaking_topic_detail",
    ),
    path(
        "tests/speaking/create/",
        create_speaking_topic,
        name="create_speaking_topic",
    ),
    path(
        "tests/speaking/<int:topic_id>/update/",
        update_speaking_topic,
        name="update_speaking_topic",
    ),
    path(
        "tests/speaking/<int:topic_id>/delete/",
        delete_speaking_topic,
        name="delete_speaking_topic",
    ),
    # Speaking Question Endpoints
    path(
        "tests/speaking/<int:topic_id>/questions/add/",
        add_speaking_question,
        name="add_speaking_question",
    ),
    path(
        "tests/speaking/questions/<int:question_id>/update/",
        update_speaking_question,
        name="update_speaking_question",
    ),
    path(
        "tests/speaking/questions/<int:question_id>/delete/",
        delete_speaking_question,
        name="delete_speaking_question",
    ),
    # Speaking TTS (Text-to-Speech) Endpoints
    path(
        "tests/speaking/<int:topic_id>/generate-tts/",
        generate_tts_for_topic,
        name="generate_tts_for_topic",
    ),
    path(
        "tests/speaking/generate-tts/",
        generate_tts_for_question,
        name="generate_tts_for_question",
    ),
    path(
        "tests/speaking/question/<int:question_id>/generate-tts/",
        generate_tts_for_saved_question,
        name="generate_tts_for_saved_question",
    ),
    path(
        "tests/speaking/generate-tts-batch/",
        generate_tts_batch,
        name="generate_tts_batch",
    ),
    path(
        "tests/speaking/tts-voices/",
        get_tts_voices,
        name="get_tts_voices",
    ),
    # Default Speaking Audio Endpoints
    path(
        "tests/speaking/default-audios/",
        get_default_speaking_audios,
        name="get_default_speaking_audios",
    ),
    path(
        "tests/speaking/default-audios/generate/",
        generate_default_speaking_audio,
        name="generate_default_speaking_audio",
    ),
    path(
        "tests/speaking/default-audios/generate-all/",
        generate_all_default_speaking_audios,
        name="generate_all_default_speaking_audios",
    ),
    path(
        "tests/speaking/default-audios/<str:audio_type>/update/",
        update_default_speaking_audio,
        name="update_default_speaking_audio",
    ),
    path(
        "tests/speaking/default-audios/<str:audio_type>/delete/",
        delete_default_speaking_audio,
        name="delete_default_speaking_audio",
    ),
    # Mock Tests
    path("mock-tests/", get_mock_tests, name="mock_tests"),
    path("mock-tests/create/", create_mock_test, name="create_mock_test"),
    path("mock-tests/<int:test_id>/", get_mock_test, name="get_mock_test"),
    path(
        "mock-tests/<int:test_id>/update/",
        update_mock_test,
        name="update_mock_test",
    ),
    path(
        "mock-tests/<int:test_id>/toggle/",
        toggle_mock_test_status,
        name="toggle_mock_test_status",
    ),
    path(
        "mock-tests/<int:test_id>/delete/",
        delete_mock_test,
        name="delete_mock_test",
    ),
    # Available content for mock test selection (paginated, supports is_authentic)
    path(
        "mock-tests/available/reading/", get_available_reading, name="available_reading"
    ),
    path(
        "mock-tests/available/listening/",
        get_available_listening,
        name="available_listening",
    ),
    path(
        "mock-tests/available/writing/", get_available_writing, name="available_writing"
    ),
    path(
        "mock-tests/available/speaking/",
        get_available_speaking,
        name="available_speaking",
    ),
    # Results & Feedback
    path("results/students/", get_student_results, name="student_results"),
    # Scheduled Exams
    path("exams/", get_exams_list, name="exams_list"),
    path("exams/create/", create_exam, name="create_exam"),
    path("exams/statistics/", get_exam_statistics, name="exam_statistics"),
    path("exams/<int:exam_id>/", get_exam_detail, name="exam_detail"),
    path("exams/<int:exam_id>/update/", update_exam, name="update_exam"),
    path("exams/<int:exam_id>/delete/", delete_exam, name="delete_exam"),
    path("exams/<int:exam_id>/results/", get_exam_results, name="exam_results"),
    path(
        "exams/<int:exam_id>/export/", export_exam_results, name="export_exam_results"
    ),
    path(
        "exams/<int:exam_id>/toggle-status/",
        toggle_exam_status,
        name="toggle_exam_status",
    ),
    path(
        "exams/<int:exam_id>/remove-student/<int:student_id>/",
        remove_student_from_exam,
        name="remove_student_from_exam",
    ),
    path(
        "results/attempt/<str:attempt_id>/",
        get_student_result_detail,
        name="student_result_detail",
    ),
    path(
        "results/attempt/<str:attempt_id>/writing/<str:task_id>/evaluate/",
        evaluate_writing_submission,
        name="evaluate_writing_submission",
    ),
    # AI Content Generation
    path("tests/ai-generate/", generate_content_from_pdf, name="ai_generate_content"),
    path("tests/ai-save/", save_generated_content, name="ai_save_content"),
    path("tests/upload-audio-temp/", upload_audio_temp, name="upload_audio_temp"),
    # AI Full Test Extraction (Cambridge IELTS books)
    path(
        "tests/ai-generate-full/",
        generate_full_test_from_pdf,
        name="ai_generate_full_test",
    ),
    path("tests/ai-save-full/", save_full_test_content, name="ai_save_full_test"),
    path("tests/upload-batch-audio/", upload_batch_audio, name="upload_batch_audio"),
    # Practice Creation from extracted content
    path("tests/create-practice/", create_section_practice, name="create_practice"),
    path(
        "tests/create-practices-batch/",
        create_practices_batch,
        name="create_practices_batch",
    ),
    # Books Management
    path("books/", get_books_manager, name="books_list"),
    path("books/create/", create_book, name="create_book"),
    path("books/<int:book_id>/", get_book_manager, name="get_book"),
    path("books/<int:book_id>/update/", update_book, name="update_book"),
    path("books/<int:book_id>/delete/", delete_book, name="delete_book"),
    path(
        "books/<int:book_id>/toggle-status/",
        toggle_book_status,
        name="toggle_book_status",
    ),
    path("books/<int:book_id>/stats/", get_book_stats, name="book_stats"),
    path(
        "books/<int:book_id>/reorder-sections/",
        reorder_sections,
        name="reorder_sections",
    ),
    path(
        "books/<int:book_id>/sections/bulk-save/",
        bulk_save_sections_manager,
        name="bulk_save_sections_manager",
    ),
    # Book Sections Management
    path("sections/", get_sections_manager, name="sections_list"),
    path("sections/create/", create_section, name="create_section"),
    path("sections/<int:section_id>/", get_section_manager, name="get_section"),
    path("sections/<int:section_id>/update/", update_section, name="update_section"),
    path("sections/<int:section_id>/delete/", delete_section, name="delete_section"),
    path(
        "sections/available-content/", get_available_content, name="available_content"
    ),
    # Promo Codes Management
    path("promo-codes/", get_promo_codes, name="promo_codes_list"),
    path("promo-codes/create/", create_promo_code, name="create_promo_code"),
    path("promo-codes/analytics/", get_promo_analytics, name="promo_analytics"),
    path("promo-codes/plans/", get_available_plans, name="promo_available_plans"),
    path("promo-codes/<int:promo_id>/", get_promo_code, name="get_promo_code"),
    path(
        "promo-codes/<int:promo_id>/update/",
        update_promo_code,
        name="update_promo_code",
    ),
    path(
        "promo-codes/<int:promo_id>/delete/",
        delete_promo_code,
        name="delete_promo_code",
    ),
    path(
        "promo-codes/<int:promo_id>/toggle-status/",
        toggle_promo_code_status,
        name="toggle_promo_code_status",
    ),
    path(
        "promo-codes/<int:promo_id>/usages/",
        get_promo_code_usages,
        name="promo_code_usages",
    ),
    # Section Practices Management
    path("section-practices/", get_section_practices, name="section_practices_list"),
    path(
        "section-practices/stats/",
        get_section_practice_stats,
        name="section_practice_stats",
    ),
    path(
        "section-practices/available-content/",
        get_practice_available_content,
        name="practice_available_content",
    ),
    path(
        "section-practices/create/",
        create_section_practice,
        name="create_section_practice",
    ),
    path(
        "section-practices/<int:practice_id>/",
        get_section_practice,
        name="get_section_practice",
    ),
    path(
        "section-practices/<int:practice_id>/update/",
        update_section_practice,
        name="update_section_practice",
    ),
    path(
        "section-practices/<int:practice_id>/delete/",
        delete_section_practice,
        name="delete_section_practice",
    ),
    path(
        "section-practices/<int:practice_id>/toggle-status/",
        toggle_section_practice_status,
        name="toggle_section_practice_status",
    ),
    # ============================================================================
    # Listening Practices
    # ============================================================================
    path(
        "practices/listening/", get_listening_practices, name="listening_practices_list"
    ),
    path(
        "practices/listening/available/",
        get_available_listening_content,
        name="available_listening_content",
    ),
    path(
        "practices/listening/create/",
        create_listening_practice,
        name="create_listening_practice",
    ),
    path(
        "practices/listening/bulk-create/",
        bulk_create_listening_practices,
        name="bulk_create_listening_practices",
    ),
    path(
        "practices/listening/<int:practice_id>/",
        get_listening_practice,
        name="get_listening_practice",
    ),
    path(
        "practices/listening/<int:practice_id>/update/",
        update_listening_practice,
        name="update_listening_practice",
    ),
    path(
        "practices/listening/<int:practice_id>/delete/",
        delete_listening_practice,
        name="delete_listening_practice",
    ),
    path(
        "practices/listening/<int:practice_id>/toggle-status/",
        toggle_listening_practice_status,
        name="toggle_listening_practice_status",
    ),
    # ============================================================================
    # Reading Practices
    # ============================================================================
    path("practices/reading/", get_reading_practices, name="reading_practices_list"),
    path(
        "practices/reading/available/",
        get_available_reading_content,
        name="available_reading_content",
    ),
    path(
        "practices/reading/create/",
        create_reading_practice,
        name="create_reading_practice",
    ),
    path(
        "practices/reading/bulk-create/",
        bulk_create_reading_practices,
        name="bulk_create_reading_practices",
    ),
    path(
        "practices/reading/<int:practice_id>/",
        get_reading_practice,
        name="get_reading_practice",
    ),
    path(
        "practices/reading/<int:practice_id>/update/",
        update_reading_practice,
        name="update_reading_practice",
    ),
    path(
        "practices/reading/<int:practice_id>/delete/",
        delete_reading_practice,
        name="delete_reading_practice",
    ),
    path(
        "practices/reading/<int:practice_id>/toggle-status/",
        toggle_reading_practice_status,
        name="toggle_reading_practice_status",
    ),
    # ============================================================================
    # Writing Practices
    # ============================================================================
    path("practices/writing/", get_writing_practices, name="writing_practices_list"),
    path(
        "practices/writing/available/",
        get_available_writing_content,
        name="available_writing_content",
    ),
    path(
        "practices/writing/create/",
        create_writing_practice,
        name="create_writing_practice",
    ),
    path(
        "practices/writing/bulk-create/",
        bulk_create_writing_practices,
        name="bulk_create_writing_practices",
    ),
    path(
        "practices/writing/<int:practice_id>/",
        get_writing_practice,
        name="get_writing_practice",
    ),
    path(
        "practices/writing/<int:practice_id>/update/",
        update_writing_practice,
        name="update_writing_practice",
    ),
    path(
        "practices/writing/<int:practice_id>/delete/",
        delete_writing_practice,
        name="delete_writing_practice",
    ),
    path(
        "practices/writing/<int:practice_id>/toggle-status/",
        toggle_writing_practice_status,
        name="toggle_writing_practice_status",
    ),
    # ============================================================================
    # Speaking Practices
    # ============================================================================
    path("practices/speaking/", get_speaking_practices, name="speaking_practices_list"),
    path(
        "practices/speaking/available/",
        get_available_speaking_content,
        name="available_speaking_content",
    ),
    path(
        "practices/speaking/create/",
        create_speaking_practice,
        name="create_speaking_practice",
    ),
    path(
        "practices/speaking/bulk-create/",
        bulk_create_speaking_practices,
        name="bulk_create_speaking_practices",
    ),
    path(
        "practices/speaking/<int:practice_id>/",
        get_speaking_practice,
        name="get_speaking_practice",
    ),
    path(
        "practices/speaking/<int:practice_id>/update/",
        update_speaking_practice,
        name="update_speaking_practice",
    ),
    path(
        "practices/speaking/<int:practice_id>/delete/",
        delete_speaking_practice,
        name="delete_speaking_practice",
    ),
    path(
        "practices/speaking/<int:practice_id>/toggle-status/",
        toggle_speaking_practice_status,
        name="toggle_speaking_practice_status",
    ),
    # ============================================================================
    # Practices Stats
    # ============================================================================
    path("practices/stats/", get_practices_stats, name="practices_stats"),
    # ============================================================================
    # AI Configuration Management
    # ============================================================================
    path("ai-config/", get_ai_configurations, name="ai_configurations_list"),
    path("ai-config/create/", create_ai_configuration, name="create_ai_configuration"),
    path("ai-config/providers/", get_available_providers, name="ai_providers"),
    path("ai-config/models/", get_available_models, name="ai_models_all"),
    path(
        "ai-config/models/<str:provider>/",
        get_available_models,
        name="ai_models_by_provider",
    ),
    path("ai-config/stats/", get_ai_usage_stats, name="ai_usage_stats"),
    path("ai-config/logs/", get_ai_usage_logs, name="ai_usage_logs"),
    path(
        "ai-config/<int:config_id>/", get_ai_configuration, name="get_ai_configuration"
    ),
    path(
        "ai-config/<int:config_id>/update/",
        update_ai_configuration,
        name="update_ai_configuration",
    ),
    path(
        "ai-config/<int:config_id>/delete/",
        delete_ai_configuration,
        name="delete_ai_configuration",
    ),
    path(
        "ai-config/<int:config_id>/set-primary/",
        set_primary_configuration,
        name="set_primary_ai_configuration",
    ),
    path(
        "ai-config/<int:config_id>/toggle-status/",
        toggle_configuration_status,
        name="toggle_ai_configuration_status",
    ),
    path(
        "ai-config/<int:config_id>/test/",
        test_ai_configuration,
        name="test_ai_configuration",
    ),
]
