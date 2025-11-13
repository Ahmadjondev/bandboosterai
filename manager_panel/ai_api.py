"""
AI Content Generation API Views
Handles PDF upload and AI-powered content extraction for IELTS tests.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from ielts.models import (
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
    TestHead,
    Question,
    Choice,
)
from ai.content_generator import (
    detect_content_type_from_pdf,
    generate_reading_passages_from_pdf,
    generate_listening_parts_from_pdf,
    generate_writing_tasks_from_pdf,
    generate_speaking_topics_from_pdf,
)


def check_manager_permission(user):
    """Check if user has manager/admin permissions"""
    if not user.is_authenticated:
        return False
    return user.role in ["MANAGER", "SUPERADMIN"]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_content_from_pdf(request):
    """
    Generate IELTS content from PDF using AI.

    POST /manager/api/tests/ai-generate/

    Body (multipart/form-data):
        - pdf_file: PDF file
        - content_type: reading | listening | writing | speaking | auto

    Returns:
        - Extracted content data (not yet saved to database)
        - Admin can review and then save
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if "pdf_file" not in request.FILES:
        return Response(
            {"error": "No PDF file provided"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pdf_file = request.FILES["pdf_file"]
    content_type = request.data.get("content_type", "auto")

    # Validate file type
    if not pdf_file.name.endswith(".pdf"):
        return Response(
            {"error": "Only PDF files are supported"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Read PDF bytes
    pdf_bytes = pdf_file.read()
    pdf_mime_type = pdf_file.content_type or "application/pdf"

    try:
        # Auto-detect content type if requested
        if content_type == "auto":
            detection_result = detect_content_type_from_pdf(pdf_bytes, pdf_mime_type)
            if detection_result.get("content_type") != "unknown":
                content_type = detection_result["content_type"]
            else:
                return Response(
                    {
                        "error": "Could not automatically detect content type. Please specify manually.",
                        "detection_result": detection_result,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Generate content based on type
        if content_type == "reading":
            result = generate_reading_passages_from_pdf(pdf_bytes, pdf_mime_type)
        elif content_type == "listening":
            result = generate_listening_parts_from_pdf(pdf_bytes, pdf_mime_type)
        elif content_type == "writing":
            result = generate_writing_tasks_from_pdf(pdf_bytes, pdf_mime_type)
        elif content_type == "speaking":
            result = generate_speaking_topics_from_pdf(pdf_bytes, pdf_mime_type)
        else:
            return Response(
                {"error": f"Invalid content type: {content_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if result.get("success"):
            return Response(
                {
                    "success": True,
                    "content_type": content_type,
                    "data": result,
                    "message": "Content extracted successfully. Please review before saving.",
                }
            )
        else:
            return Response(
                {
                    "error": result.get("error", "Failed to extract content"),
                    "details": result,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Exception as e:
        return Response(
            {"error": f"Error processing PDF: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_generated_content(request):
    """
    Save AI-generated content to database.

    POST /manager/api/tests/ai-save/

    Body:
        - content_type: reading | listening | writing | speaking
        - data: The extracted data from generate_content_from_pdf

    Returns:
        - Success message with created object IDs
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    content_type = request.data.get("content_type")
    data = request.data.get("data")

    if not content_type or not data:
        return Response(
            {"error": "Missing content_type or data"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        if content_type == "reading":
            return _save_reading_passages(data, request.user)
        elif content_type == "listening":
            return _save_listening_parts(data, request.user)
        elif content_type == "writing":
            return _save_writing_tasks(data, request.user)
        elif content_type == "speaking":
            return _save_speaking_topics(data, request.user)
        else:
            return Response(
                {"error": f"Invalid content type: {content_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Exception as e:
        return Response(
            {"error": f"Error saving content: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _save_reading_passages(data, user):
    """Helper function to save reading passages with questions to database."""
    passages_data = data.get("passages", [])
    created_passages = []

    for passage_data in passages_data:
        # Create passage
        passage = ReadingPassage.objects.create(
            passage_number=passage_data.get("passage_number"),
            title=passage_data.get("title", ""),
            summary=passage_data.get("summary", ""),
            content=passage_data.get("content", ""),
        )

        # Create question groups
        question_groups = passage_data.get("question_groups", [])
        created_groups = []

        for group_data in question_groups:
            # Create TestHead (question group)
            test_head = TestHead.objects.create(
                reading=passage,  # Note: field name is 'reading' not 'reading_passage'
                title=group_data.get("title", ""),
                question_type=group_data.get("question_type"),
                description=group_data.get("description", ""),
                question_data=group_data.get("question_data"),
            )

            # Create questions
            questions = group_data.get("questions", [])
            created_questions = []

            for q_data in questions:
                question = Question.objects.create(
                    test_head=test_head,
                    order=q_data.get("order"),
                    question_text=q_data.get(
                        "text", ""
                    ),  # Field is 'question_text' not 'text'
                    correct_answer_text=q_data.get(
                        "correct_answer"
                    ),  # Field is 'correct_answer_text'
                )

                # Create choices if MCQ/MCMA
                if "choices" in q_data:
                    correct_answer = q_data.get("correct_answer", "")
                    for choice_data in q_data["choices"]:
                        choice_key = choice_data.get("key", "")
                        # For MCMA: correct_answer is "ACE", check if choice_key is in it
                        # For MCQ: correct_answer is "A", exact match still works
                        is_correct = choice_key in correct_answer
                        Choice.objects.create(
                            question=question,
                            choice_text=choice_data.get(
                                "text", ""
                            ),  # Field is 'choice_text' not 'text'
                            is_correct=is_correct,
                        )

                created_questions.append(question.id)

            created_groups.append(
                {
                    "test_head_id": test_head.id,
                    "title": test_head.title,
                    "question_count": len(created_questions),
                }
            )

        created_passages.append(
            {
                "passage_id": passage.id,
                "passage_number": passage.passage_number,
                "title": passage.title,
                "question_groups": created_groups,
            }
        )

    return Response(
        {
            "success": True,
            "message": f"Successfully created {len(created_passages)} reading passage(s) with questions.",
            "passages": created_passages,
        }
    )


def _save_listening_parts(data, user):
    """Helper function to save listening parts with questions to database."""
    parts_data = data.get("parts", [])
    created_parts = []

    for part_data in parts_data:
        # Create listening part
        part = ListeningPart.objects.create(
            part_number=part_data.get("part_number"),
            title=part_data.get("title", ""),
            description=part_data.get("description", ""),
            transcript=part_data.get("transcript", ""),
            audio_file="",  # Will be uploaded separately
        )

        # Create question groups (similar to reading)
        question_groups = part_data.get("question_groups", [])
        created_groups = []

        for group_data in question_groups:
            test_head = TestHead.objects.create(
                listening=part,  # Note: field name is 'listening' not 'listening_part'
                title=group_data.get("title", ""),
                question_type=group_data.get("question_type"),
                description=group_data.get("description", ""),
                question_data=group_data.get(
                    "question_data"
                ),  # Save question_data structure
            )

            questions = group_data.get("questions", [])
            created_questions = []

            for q_data in questions:
                question = Question.objects.create(
                    test_head=test_head,
                    order=q_data.get("order"),
                    question_text=q_data.get("text", ""),
                    correct_answer_text=q_data.get("correct_answer"),
                )

                # Create choices if MCQ/MCMA
                if "choices" in q_data:
                    correct_answer = q_data.get("correct_answer", "")
                    for choice_data in q_data["choices"]:
                        choice_key = choice_data.get("key", "")
                        # For MCMA: correct_answer is "ACE", check if choice_key is in it
                        # For MCQ: correct_answer is "A", exact match still works
                        is_correct = choice_key in correct_answer
                        Choice.objects.create(
                            question=question,
                            choice_text=choice_data.get("text", ""),
                            is_correct=is_correct,
                        )

                created_questions.append(question.id)

            created_groups.append(
                {
                    "test_head_id": test_head.id,
                    "title": test_head.title,
                    "question_count": len(created_questions),
                }
            )

        created_parts.append(
            {
                "part_id": part.id,
                "part_number": part.part_number,
                "title": part.title,
                "question_groups": created_groups,
            }
        )

    return Response(
        {
            "success": True,
            "message": f"Successfully created {len(created_parts)} listening part(s). Audio files can be uploaded separately.",
            "parts": created_parts,
        }
    )


def _save_writing_tasks(data, user):
    """Helper function to save writing tasks to database."""
    tasks_data = data.get("tasks", [])
    created_tasks = []

    for task_data in tasks_data:
        # Map AI task_type to model's TaskType
        ai_task_type = task_data.get("task_type", "")
        if "TASK1" in ai_task_type.upper() or "TASK_1" in ai_task_type.upper():
            model_task_type = "TASK_1"
        else:
            model_task_type = "TASK_2"

        # Get prompt directly from AI response
        prompt = task_data.get("prompt", "")

        # Get min_words (AI returns min_words, not word_limit)
        min_words = task_data.get(
            "min_words", 150 if model_task_type == "TASK_1" else 250
        )

        # Store additional data (chart info, visual description, etc.)
        task_data_dict = task_data.get("data", {})

        task = WritingTask.objects.create(
            task_type=model_task_type,
            prompt=prompt,
            min_words=min_words,
            data=task_data_dict,  # Store additional metadata
        )

        created_tasks.append(
            {
                "task_id": task.id,
                "task_type": task.get_task_type_display(),
                "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                "min_words": min_words,
                "has_visual": task_data.get("has_visual", False),
            }
        )

    return Response(
        {
            "success": True,
            "message": f"Successfully created {len(created_tasks)} writing task(s).",
            "tasks": created_tasks,
        }
    )


def _save_speaking_topics(data, user):
    """Helper function to save speaking topics to database."""
    topics_data = data.get("topics", [])
    created_topics = []

    # Group topics by part_number to organize them properly
    # AI returns array like: [{part_number: 1, ...}, {part_number: 2, ...}, {part_number: 3, ...}, ...]
    for topic_data in topics_data:
        part_number = topic_data.get("part_number")
        topic_title = topic_data.get("topic", "Speaking Topic")

        if part_number == 1:
            # Part 1: Introduction and interview questions
            questions = topic_data.get("questions", [])
            if questions:
                part1_topic = SpeakingTopic.objects.create(
                    topic=topic_title,
                    speaking_type="PART_1",
                    question=(
                        "\n".join(questions)
                        if isinstance(questions, list)
                        else str(questions)
                    ),
                )
                created_topics.append(
                    {
                        "topic_id": part1_topic.id,
                        "part": "Part 1",
                        "topic": part1_topic.topic,
                        "question_count": (
                            len(questions) if isinstance(questions, list) else 1
                        ),
                    }
                )

        elif part_number == 2:
            # Part 2: Cue card (long turn)
            cue_card = topic_data.get("cue_card", {})
            if cue_card:
                # Extract main prompt and bullet points
                main_prompt = cue_card.get("main_prompt", topic_title)
                bullet_points = cue_card.get("bullet_points", [])

                part2_topic = SpeakingTopic.objects.create(
                    topic=topic_title,
                    speaking_type="PART_2",
                    question=main_prompt,
                    cue_card=cue_card,  # Store the full cue card structure
                )
                created_topics.append(
                    {
                        "topic_id": part2_topic.id,
                        "part": "Part 2",
                        "topic": part2_topic.topic,
                        "bullet_points": (
                            len(bullet_points) if isinstance(bullet_points, list) else 0
                        ),
                    }
                )

        elif part_number == 3:
            # Part 3: Two-way discussion questions
            questions = topic_data.get("questions", [])
            if questions:
                part3_topic = SpeakingTopic.objects.create(
                    topic=topic_title,
                    speaking_type="PART_3",
                    question=(
                        "\n".join(questions)
                        if isinstance(questions, list)
                        else str(questions)
                    ),
                )
                created_topics.append(
                    {
                        "topic_id": part3_topic.id,
                        "part": "Part 3",
                        "topic": part3_topic.topic,
                        "question_count": (
                            len(questions) if isinstance(questions, list) else 1
                        ),
                    }
                )

    return Response(
        {
            "success": True,
            "message": f"Successfully created {len(created_topics)} speaking topic(s).",
            "topics": created_topics,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_audio_temp(request):
    """
    Upload audio file temporarily for listening part.

    POST /manager/api/tests/upload-audio-temp/

    Body (multipart/form-data):
        - audio_file: Audio file
        - part_id: Listening part ID (optional)

    Returns:
        - audio_url: URL of the uploaded audio file
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    if "audio_file" not in request.FILES:
        return Response(
            {"error": "No audio file provided"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    audio_file = request.FILES["audio_file"]

    # Save to media/listening/temp/
    file_path = f"listening/temp/{audio_file.name}"
    saved_path = default_storage.save(file_path, ContentFile(audio_file.read()))

    return Response(
        {
            "success": True,
            "audio_url": default_storage.url(saved_path),
            "audio_filename": audio_file.name,
        }
    )
