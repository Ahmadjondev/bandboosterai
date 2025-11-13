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
    bulk_create_students,
    upload_students_excel,
    download_excel_template,
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
    create_speaking_topic,
    update_speaking_topic,
    delete_speaking_topic,
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
        "users/students/bulk-create/",
        bulk_create_students,
        name="bulk_create_students",
    ),
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
    path(
        "users/students/upload-excel/",
        upload_students_excel,
        name="upload_students_excel",
    ),
    path(
        "users/students/download-template/",
        download_excel_template,
        name="download_excel_template",
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
        "results/attempt/<int:attempt_id>/",
        get_student_result_detail,
        name="student_result_detail",
    ),
    path(
        "results/attempt/<int:attempt_id>/writing/<int:task_id>/evaluate/",
        evaluate_writing_submission,
        name="evaluate_writing_submission",
    ),
    # AI Content Generation
    path("tests/ai-generate/", generate_content_from_pdf, name="ai_generate_content"),
    path("tests/ai-save/", save_generated_content, name="ai_save_content"),
    path("tests/upload-audio-temp/", upload_audio_temp, name="upload_audio_temp"),
]
