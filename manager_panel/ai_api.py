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
    SpeakingQuestion,
    SpeakingDefaultAudio,
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
    generate_cambridge_full_test_from_pdf,
)
from ai.tts_generator import (
    AzureTTSGenerator,
    generate_speaking_question_audio,
    generate_cue_card_audio,
    batch_generate_speaking_audio,
)


def check_manager_permission(user):
    """Check if user has manager/admin permissions"""
    if not user.is_authenticated:
        return False
    return user.role in ["MANAGER"]


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
    if not (pdf_file.name.endswith(".pdf") or not pdf_file.name.endswith(".html")):
        return Response(
            {"error": "Only PDF and HTML files are supported"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Read PDF bytes
    pdf_bytes = pdf_file.read()
    pdf_mime_type = pdf_file.content_type or (
        "application/pdf" if pdf_file.name.endswith(".pdf") else "text/html"
    )

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

    Body (JSON or FormData):
        - content_type: reading | listening | writing | speaking
        - data: The extracted data from generate_content_from_pdf (JSON string if FormData)
        - images[key]: Image files for question groups (optional, FormData only)
        - audios[key]: Audio files for listening parts (optional, FormData only)

    Returns:
        - Success message with created object IDs
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Handle both JSON and FormData
    content_type = request.data.get("content_type")
    data = request.data.get("data")

    # If data is a string (from FormData), parse it as JSON
    if isinstance(data, str):
        import json

        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            return Response(
                {"error": "Invalid JSON in data field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if not content_type or not data:
        return Response(
            {"error": "Missing content_type or data"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Extract images and audio files from request
    images = {}
    audios = {}
    for key in request.FILES:
        if key.startswith("images[") and key.endswith("]"):
            # Extract the group key: images[passage-0-group-1] -> passage-0-group-1
            group_key = key[7:-1]
            images[group_key] = request.FILES[key]
        elif key.startswith("audios[") and key.endswith("]"):
            # Extract the part key: audios[part-0] -> part-0
            part_key = key[7:-1]
            audios[part_key] = request.FILES[key]

    try:
        if content_type == "reading":
            return _save_reading_passages(data, request.user, images)
        elif content_type == "listening":
            return _save_listening_parts(data, request.user, images, audios)
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


def _save_reading_passages(data, user, images=None):
    """Helper function to save reading passages with questions to database."""
    passages_data = data.get("passages", [])
    created_passages = []
    images = images or {}

    for idx, passage_data in enumerate(passages_data):
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

        for gidx, group_data in enumerate(question_groups):
            # Create TestHead (question group)
            test_head = TestHead.objects.create(
                reading=passage,  # Note: field name is 'reading' not 'reading_passage'
                title=group_data.get("title", ""),
                question_type=group_data.get("question_type"),
                description=group_data.get("description", ""),
                question_data=group_data.get("question_data"),
                example=group_data.get(
                    "example"
                ),  # Store example question/answer if present
            )

            # Attach image if provided for this group
            image_key = f"passage-{idx}-group-{gidx}"
            if image_key in images:
                test_head.picture = images[image_key]
                test_head.save()

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


def _save_listening_parts(data, user, images=None, audios=None):
    """Helper function to save listening parts with questions to database."""
    parts_data = data.get("parts", [])
    created_parts = []
    images = images or {}
    audios = audios or {}

    for idx, part_data in enumerate(parts_data):
        # Create listening part
        part = ListeningPart.objects.create(
            part_number=part_data.get("part_number"),
            title=part_data.get("title", ""),
            description=part_data.get("description", ""),
            transcript=part_data.get("transcript", ""),
            audio_file="",  # Will be set below if audio provided
        )

        # Attach audio file if provided for this part
        audio_key = f"part-{idx}"
        if audio_key in audios:
            part.audio_file = audios[audio_key]
            part.save()

        # Create question groups (similar to reading)
        question_groups = part_data.get("question_groups", [])
        created_groups = []

        for gidx, group_data in enumerate(question_groups):
            test_head = TestHead.objects.create(
                listening=part,  # Note: field name is 'listening' not 'listening_part'
                title=group_data.get("title", ""),
                question_type=group_data.get("question_type"),
                description=group_data.get("description", ""),
                question_data=group_data.get(
                    "question_data"
                ),  # Save question_data structure
                example=group_data.get(
                    "example"
                ),  # Store example question/answer if present
            )

            # Attach image if provided for this group
            image_key = f"part-{idx}-group-{gidx}"
            if image_key in images:
                test_head.picture = images[image_key]
                test_head.save()

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

    # Count how many audio files were uploaded
    audio_count = sum(1 for idx in range(len(created_parts)) if f"part-{idx}" in audios)

    message = f"Successfully created {len(created_parts)} listening part(s)"
    if audio_count > 0:
        message += f" with {audio_count} audio file(s)"
    else:
        message += ". Audio files can be uploaded separately."

    return Response(
        {
            "success": True,
            "message": message,
            "parts": created_parts,
        }
    )


def _save_writing_tasks(data, user, images=None):
    """Helper function to save writing tasks to database.

    Args:
        data: Writing task data from AI
        user: Current user
        images: Dict of uploaded images with keys like 'writing-task-0', 'writing-task-1'
    """
    tasks_data = data.get("tasks", [])
    created_tasks = []
    images = images or {}

    for task_idx, task_data in enumerate(tasks_data):
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

        # Handle image upload for this task (especially Task 1)
        # Image keys can be: 'writing-task-0', 'writing-task-1', etc.
        image_key = f"writing-task-{task_idx}"
        if image_key in images:
            task.picture = images[image_key]
            task.save()

        created_tasks.append(
            {
                "task_id": task.id,
                "task_type": task.get_task_type_display(),
                "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                "min_words": min_words,
                "has_visual": task_data.get("has_visual", False),
                "has_picture": bool(task.picture),
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
    # Audio URLs from AI preview (if any), keyed by question position
    question_audios = data.get("question_audios", {})
    created_topics = []

    # Group topics by part_number to organize them properly
    # AI returns array like: [{part_number: 1, ...}, {part_number: 2, ...}, {part_number: 3, ...}, ...]
    for topic_idx, topic_data in enumerate(topics_data):
        part_number = topic_data.get("part_number")
        topic_title = topic_data.get("topic", "Speaking Topic")

        if part_number == 1:
            # Part 1: Introduction and interview questions
            questions = topic_data.get("questions", [])
            if questions:
                part1_topic = SpeakingTopic.objects.create(
                    topic=topic_title,
                    speaking_type="PART_1",
                )

                # Create SpeakingQuestion objects for each question
                created_question_ids = []
                if isinstance(questions, list):
                    for q_idx, question_text in enumerate(questions):
                        audio_key = f"topic-{topic_idx}-q-{q_idx}"
                        audio_url = question_audios.get(audio_key)
                        sq = SpeakingQuestion.objects.create(
                            topic=part1_topic,
                            question_text=question_text,
                            audio_url=audio_url,
                            order=q_idx + 1,
                        )
                        created_question_ids.append(sq.id)

                created_topics.append(
                    {
                        "topic_id": part1_topic.id,
                        "part": "Part 1",
                        "topic": part1_topic.topic,
                        "question_count": (
                            len(questions) if isinstance(questions, list) else 1
                        ),
                        "question_ids": created_question_ids,
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
                )

                # Create a single SpeakingQuestion for the cue card with cue_card_points
                audio_key = f"topic-{topic_idx}-cuecard"
                audio_url = question_audios.get(audio_key)
                cue_sq = SpeakingQuestion.objects.create(
                    topic=part2_topic,
                    question_text=main_prompt,
                    cue_card_points=bullet_points,  # Store bullet points in the question
                    audio_url=audio_url,
                    order=1,
                )

                created_topics.append(
                    {
                        "topic_id": part2_topic.id,
                        "part": "Part 2",
                        "topic": part2_topic.topic,
                        "bullet_points": (
                            len(bullet_points) if isinstance(bullet_points, list) else 0
                        ),
                        "question_ids": [cue_sq.id],
                    }
                )

        elif part_number == 3:
            # Part 3: Two-way discussion questions
            questions = topic_data.get("questions", [])
            if questions:
                part3_topic = SpeakingTopic.objects.create(
                    topic=topic_title,
                    speaking_type="PART_3",
                )

                # Create SpeakingQuestion objects for each question
                created_question_ids = []
                if isinstance(questions, list):
                    for q_idx, question_text in enumerate(questions):
                        audio_key = f"topic-{topic_idx}-q-{q_idx}"
                        audio_url = question_audios.get(audio_key)
                        sq = SpeakingQuestion.objects.create(
                            topic=part3_topic,
                            question_text=question_text,
                            audio_url=audio_url,
                            order=q_idx + 1,
                        )
                        created_question_ids.append(sq.id)

                created_topics.append(
                    {
                        "topic_id": part3_topic.id,
                        "part": "Part 3",
                        "topic": part3_topic.topic,
                        "question_count": (
                            len(questions) if isinstance(questions, list) else 1
                        ),
                        "question_ids": created_question_ids,
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_full_test_from_pdf(request):
    """
    Generate COMPLETE IELTS test(s) from a Cambridge IELTS book PDF or similar.
    Extracts all sections: Listening, Reading, Writing, Speaking in one request.

    POST /manager/api/tests/ai-generate-full/

    Body (multipart/form-data):
        - pdf_file: PDF file (Cambridge IELTS book or similar)

    Returns:
        - Complete test data with all sections for multiple tests
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

    # Validate file type
    if not (pdf_file.name.endswith(".pdf") or pdf_file.name.endswith(".html")):
        return Response(
            {"error": "Only PDF and HTML files are supported"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Read PDF bytes
    pdf_bytes = pdf_file.read()
    pdf_mime_type = pdf_file.content_type or (
        "application/pdf" if pdf_file.name.endswith(".pdf") else "text/html"
    )

    try:
        result = generate_cambridge_full_test_from_pdf(pdf_bytes, pdf_mime_type)

        if result.get("success"):
            return Response(
                {
                    "success": True,
                    "content_type": "full_test",
                    "data": result,
                    "message": "Full test content extracted successfully. Review and save sections.",
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
def save_full_test_content(request):
    """
    Save a complete IELTS test (all sections) to database.

    POST /manager/api/tests/ai-save-full/

    Body (JSON or FormData):
        - test_data: Complete test data with listening, reading, writing, speaking
        - audios[part-X]: Audio files for listening parts (FormData only)
        - images[key]: Image files for question groups (FormData only)

    Returns:
        - Success message with created object IDs for all sections
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Handle both JSON and FormData
    test_data = request.data.get("test_data")

    # If data is a string (from FormData), parse it as JSON
    if isinstance(test_data, str):
        import json

        try:
            test_data = json.loads(test_data)
        except json.JSONDecodeError:
            return Response(
                {"error": "Invalid JSON in test_data field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if not test_data:
        return Response(
            {"error": "Missing test_data"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Extract files from request
    images = {}
    audios = {}
    for key in request.FILES:
        if key.startswith("images[") and key.endswith("]"):
            group_key = key[7:-1]
            images[group_key] = request.FILES[key]
        elif key.startswith("audios[") and key.endswith("]"):
            part_key = key[7:-1]
            audios[part_key] = request.FILES[key]

    try:
        results = {
            "listening": None,
            "reading": None,
            "writing": None,
            "speaking": None,
        }

        # Save Listening Parts
        if test_data.get("listening") and test_data["listening"].get("parts"):
            listening_data = {"parts": test_data["listening"]["parts"]}
            listening_result = _save_listening_parts(
                listening_data, request.user, images, audios
            )
            if listening_result.status_code == 200:
                results["listening"] = listening_result.data

        # Save Reading Passages
        if test_data.get("reading") and test_data["reading"].get("passages"):
            reading_data = {"passages": test_data["reading"]["passages"]}
            reading_result = _save_reading_passages(reading_data, request.user, images)
            if reading_result.status_code == 200:
                results["reading"] = reading_result.data

        # Save Writing Tasks (with images for Task 1 charts/graphs)
        if test_data.get("writing") and test_data["writing"].get("tasks"):
            writing_data = {"tasks": test_data["writing"]["tasks"]}
            writing_result = _save_writing_tasks(writing_data, request.user, images)
            if writing_result.status_code == 200:
                results["writing"] = writing_result.data

        # Save Speaking Topics
        if test_data.get("speaking") and test_data["speaking"].get("topics"):
            speaking_data = {
                "topics": test_data["speaking"]["topics"],
                "question_audios": test_data["speaking"].get("question_audios", {}),
            }
            speaking_result = _save_speaking_topics(speaking_data, request.user)
            if speaking_result.status_code == 200:
                results["speaking"] = speaking_result.data

        # Count what was saved
        saved_sections = [k for k, v in results.items() if v and v.get("success")]

        return Response(
            {
                "success": True,
                "message": f"Successfully saved {len(saved_sections)} section(s): {', '.join(saved_sections)}",
                "results": results,
                "saved_sections": saved_sections,
            }
        )

    except Exception as e:
        return Response(
            {"error": f"Error saving content: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_batch_audio(request):
    """
    Upload multiple audio files at once for listening parts.

    POST /manager/api/tests/upload-batch-audio/

    Body (multipart/form-data):
        - audio_files[]: Multiple audio files
        - mapping: JSON mapping of filename to part index

    Returns:
        - List of uploaded audio URLs with their mappings
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    uploaded_files = []
    errors = []

    # Get all audio files from request
    for key in request.FILES:
        if key.startswith("audio_"):
            audio_file = request.FILES[key]
            try:
                # Save to media/listening/temp/
                file_path = f"listening/temp/{audio_file.name}"
                saved_path = default_storage.save(
                    file_path, ContentFile(audio_file.read())
                )

                uploaded_files.append(
                    {
                        "key": key,
                        "filename": audio_file.name,
                        "url": default_storage.url(saved_path),
                        "size": audio_file.size,
                    }
                )
            except Exception as e:
                errors.append(
                    {"key": key, "filename": audio_file.name, "error": str(e)}
                )

    return Response(
        {
            "success": len(errors) == 0,
            "uploaded": uploaded_files,
            "errors": errors,
            "message": f"Uploaded {len(uploaded_files)} audio file(s)"
            + (f" with {len(errors)} error(s)" if errors else ""),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_section_practice(request):
    """
    Create a SectionPractice from saved content (ListeningPart, ReadingPassage, WritingTask, or SpeakingTopic).

    POST /manager/api/tests/create-practice/

    Body (JSON):
        - section_type: LISTENING | READING | WRITING | SPEAKING
        - content_id: The ID of the content (part_id, passage_id, task_id, or topic_id)
        - name: Optional name for the practice
        - description: Optional description
        - difficulty: EASY | MEDIUM | HARD | EXPERT (default: MEDIUM)
        - time_limit: Optional time limit in minutes
        - is_free: Whether the practice is free (default: True)
        - is_active: Whether the practice is active (default: True)

    Returns:
        - Created practice details with ID
    """
    from practice.models import SectionPractice

    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    section_type = request.data.get("section_type", "").upper()
    content_id = request.data.get("content_id")

    if not section_type or not content_id:
        return Response(
            {"error": "section_type and content_id are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_types = ["LISTENING", "READING", "WRITING", "SPEAKING"]
    if section_type not in valid_types:
        return Response(
            {
                "error": f"Invalid section_type. Must be one of: {', '.join(valid_types)}"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get the content based on section type
    content = None
    content_name = ""

    try:
        if section_type == "LISTENING":
            content = ListeningPart.objects.get(id=content_id)
            content_name = content.title or f"Listening Part {content.part_number}"
        elif section_type == "READING":
            content = ReadingPassage.objects.get(id=content_id)
            content_name = content.title
        elif section_type == "WRITING":
            content = WritingTask.objects.get(id=content_id)
            # Extract task number from task_type: TASK_1 -> 1, TASK_2 -> 2
            task_number = (
                content.task_type.split("_")[-1] if "_" in content.task_type else "1"
            )
            content_name = f"Writing Task {task_number}"
        elif section_type == "SPEAKING":
            content = SpeakingTopic.objects.get(id=content_id)
            # Extract part number: PART_1 -> 1, PART_2 -> 2, PART_3 -> 3
            part_number = (
                content.speaking_type.split("_")[-1]
                if "_" in content.speaking_type
                else "1"
            )
            content_name = f"Speaking Part {part_number}: {content.topic or 'Untitled'}"
    except Exception as e:
        return Response(
            {"error": f"Content with ID {content_id} not found for {section_type}"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Create the practice
    practice_data = {
        "section_type": section_type,
        "title": request.data.get("name") or content_name,
        "description": request.data.get("description", ""),
        "difficulty": request.data.get("difficulty", "MEDIUM").upper(),
        "duration_minutes": request.data.get("time_limit"),
        "is_free": request.data.get("is_free", True),
        "is_active": request.data.get("is_active", True),
        "created_by": request.user,
    }

    # Link to appropriate content
    if section_type == "LISTENING":
        practice_data["listening_part"] = content
    elif section_type == "READING":
        practice_data["reading_passage"] = content
    elif section_type == "WRITING":
        practice_data["writing_task"] = content
    elif section_type == "SPEAKING":
        practice_data["speaking_topic"] = content

    try:
        practice = SectionPractice.objects.create(**practice_data)

        return Response(
            {
                "success": True,
                "message": f"Practice created successfully",
                "practice": {
                    "id": practice.id,
                    "uuid": str(practice.uuid),
                    "title": practice.title,
                    "section_type": practice.section_type,
                    "difficulty": practice.difficulty,
                    "content_id": content_id,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {"error": f"Error creating practice: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_practices_batch(request):
    """
    Create multiple SectionPractice records from saved content.

    POST /manager/api/tests/create-practices-batch/

    Body (JSON):
        - practices: Array of practice data, each with:
            - section_type: LISTENING | READING | WRITING | SPEAKING
            - content_id: The ID of the content
            - name: Optional name
            - difficulty: EASY | MEDIUM | HARD | EXPERT (default: MEDIUM)
        - default_difficulty: Default difficulty for all practices if not specified

    Returns:
        - Created practices with their IDs
    """
    from practice.models import SectionPractice

    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    practices_data = request.data.get("practices", [])
    default_difficulty = request.data.get("default_difficulty", "MEDIUM").upper()

    if not practices_data:
        return Response(
            {"error": "No practices data provided"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    created_practices = []
    errors = []

    for idx, practice_info in enumerate(practices_data):
        section_type = practice_info.get("section_type", "").upper()
        content_id = practice_info.get("content_id")

        if not section_type or not content_id:
            errors.append(
                {"index": idx, "error": "section_type and content_id are required"}
            )
            continue

        # Get the content based on section type
        content = None
        content_name = ""

        try:
            if section_type == "LISTENING":
                content = ListeningPart.objects.get(id=content_id)
                content_name = content.title or f"Listening Part {content.part_number}"
            elif section_type == "READING":
                content = ReadingPassage.objects.get(id=content_id)
                content_name = content.title
            elif section_type == "WRITING":
                content = WritingTask.objects.get(id=content_id)
                # Extract task number from task_type: TASK_1 -> 1, TASK_2 -> 2
                task_number = (
                    content.task_type.split("_")[-1]
                    if "_" in content.task_type
                    else "1"
                )
                content_name = f"Writing Task {task_number}"
            elif section_type == "SPEAKING":
                content = SpeakingTopic.objects.get(id=content_id)
                # Extract part number: PART_1 -> 1, PART_2 -> 2, PART_3 -> 3
                part_number = (
                    content.speaking_type.split("_")[-1]
                    if "_" in content.speaking_type
                    else "1"
                )
                content_name = (
                    f"Speaking Part {part_number}: {content.topic or 'Untitled'}"
                )
            else:
                errors.append(
                    {"index": idx, "error": f"Invalid section_type: {section_type}"}
                )
                continue
        except Exception as e:
            errors.append({"index": idx, "error": f"Content not found: {str(e)}"})
            continue

        # Create the practice
        practice_data = {
            "section_type": section_type,
            "title": practice_info.get("name") or content_name,
            "description": practice_info.get("description", ""),
            "difficulty": practice_info.get("difficulty", default_difficulty).upper(),
            "duration_minutes": practice_info.get("time_limit"),
            "is_free": practice_info.get("is_free", True),
            "is_active": practice_info.get("is_active", True),
            "created_by": request.user,
        }

        # Link to appropriate content
        if section_type == "LISTENING":
            practice_data["listening_part"] = content
        elif section_type == "READING":
            practice_data["reading_passage"] = content
        elif section_type == "WRITING":
            practice_data["writing_task"] = content
        elif section_type == "SPEAKING":
            practice_data["speaking_topic"] = content

        try:
            practice = SectionPractice.objects.create(**practice_data)
            created_practices.append(
                {
                    "id": practice.id,
                    "uuid": str(practice.uuid),
                    "title": practice.title,
                    "section_type": practice.section_type,
                    "difficulty": practice.difficulty,
                    "content_id": content_id,
                }
            )
        except Exception as e:
            errors.append({"index": idx, "error": f"Error creating practice: {str(e)}"})

    return Response(
        {
            "success": len(errors) == 0,
            "created_count": len(created_practices),
            "error_count": len(errors),
            "created_practices": created_practices,
            "errors": errors,
            "message": f"Created {len(created_practices)} practice(s)"
            + (f" with {len(errors)} error(s)" if errors else ""),
        },
        status=(
            status.HTTP_201_CREATED
            if created_practices
            else status.HTTP_400_BAD_REQUEST
        ),
    )


# =============================================================================
# TTS (Text-to-Speech) API Endpoints for Speaking Questions
# =============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_tts_for_topic(request, topic_id):
    """
    Generate TTS audio for all questions in a speaking topic.

    POST /manager/api/tests/speaking/<topic_id>/generate-tts/

    Body (JSON):
        - voice: Voice type (female_primary, male_primary, etc.) - optional
        - generate_all_questions: Whether to generate audio for each question - optional

    Returns:
        - audio_urls: Dict of question_id -> audio_url
        - metadata: Generation metadata
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        topic = SpeakingTopic.objects.prefetch_related("questions").get(id=topic_id)
    except SpeakingTopic.DoesNotExist:
        return Response(
            {"error": "Speaking topic not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    voice = request.data.get("voice", "female_primary")

    try:
        generator = AzureTTSGenerator()
        voice_name = generator.VOICE_OPTIONS.get(voice, generator.default_voice)

        speaking_part = topic.speaking_type  # PART_1, PART_2, or PART_3
        audio_results = {}

        # Get or create SpeakingQuestion objects
        questions = list(topic.questions.all())

        if speaking_part == "PART_2":
            # For Part 2, use the first question's cue_card_points
            if questions and questions[0].cue_card_points:
                # Build cue_card dict from SpeakingQuestion.cue_card_points
                cue_card = {
                    "main_prompt": questions[0].question_text,
                    "bullet_points": questions[0].cue_card_points or [],
                }
                audio_url, metadata = generate_cue_card_audio(cue_card, voice)

                # Save to the first SpeakingQuestion
                questions[0].audio_url = audio_url
                questions[0].save()
                audio_results[questions[0].id] = audio_url

                return Response(
                    {
                        "success": True,
                        "topic_id": topic.id,
                        "audio_urls": audio_results,
                        "audio_type": "cue_card",
                        "metadata": metadata,
                    }
                )
            else:
                # No cue_card_points, generate regular question audio
                for q in questions:
                    audio_url, metadata = generator.generate_and_save(
                        text=q.question_text,
                        filename_prefix=f"question_{q.id}",
                        voice=voice_name,
                        speaking_part=speaking_part,
                    )
                    q.audio_url = audio_url
                    q.save()
                    audio_results[q.id] = audio_url
        else:
            # Part 1 or Part 3: Generate audio for each question
            for q in questions:
                audio_url, metadata = generator.generate_and_save(
                    text=q.question_text,
                    filename_prefix=f"question_{q.id}",
                    voice=voice_name,
                    speaking_part=speaking_part,
                )
                q.audio_url = audio_url
                q.save()
                audio_results[q.id] = audio_url

        return Response(
            {
                "success": True,
                "topic_id": topic.id,
                "audio_urls": audio_results,
                "audio_type": "questions",
                "question_count": len(audio_results),
            }
        )

    except Exception as e:
        return Response(
            {"error": f"TTS generation failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_tts_for_saved_question(request, question_id):
    """
    Generate TTS audio for a specific saved SpeakingQuestion.

    POST /manager/api/tests/speaking/question/<question_id>/generate-tts/

    Body (JSON):
        - voice: Voice type (female_primary, male_primary, etc.)

    Returns:
        - audio_url: URL to the generated audio
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        question = SpeakingQuestion.objects.select_related("topic").get(id=question_id)
    except SpeakingQuestion.DoesNotExist:
        return Response(
            {"error": "Speaking question not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    voice = request.data.get("voice", "female_primary")

    try:
        speaking_part = question.topic.speaking_type

        if speaking_part == "PART_2" and question.cue_card_points:
            # Generate cue card audio using the question's cue_card_points
            cue_card = {
                "main_prompt": question.question_text,
                "bullet_points": question.cue_card_points or [],
            }
            audio_url, metadata = generate_cue_card_audio(cue_card, voice)
        else:
            audio_url, metadata = generate_speaking_question_audio(
                question_text=question.question_text,
                speaking_part=speaking_part,
                voice=voice,
            )

        # Save to the SpeakingQuestion
        question.audio_url = audio_url
        question.save()

        return Response(
            {
                "success": True,
                "question_id": question.id,
                "audio_url": audio_url,
                "metadata": metadata,
            }
        )

    except Exception as e:
        return Response(
            {"error": f"TTS generation failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_tts_for_question(request):
    """
    Generate TTS audio for a single question text (without saving to a topic).

    POST /manager/api/tests/speaking/generate-tts/

    Body (JSON):
        - question_text: The question text to synthesize
        - speaking_part: PART_1, PART_2, or PART_3
        - voice: Voice type (female_primary, male_primary, etc.)

    Returns:
        - audio_url: URL to the generated audio
        - metadata: Generation metadata
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    question_text = request.data.get("question_text")
    speaking_part = request.data.get("speaking_part", "PART_1")
    voice = request.data.get("voice", "female_primary")

    if not question_text:
        return Response(
            {"error": "question_text is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        audio_url, metadata = generate_speaking_question_audio(
            question_text=question_text,
            speaking_part=speaking_part,
            voice=voice,
        )

        return Response(
            {
                "success": True,
                "audio_url": audio_url,
                "metadata": metadata,
            }
        )

    except Exception as e:
        return Response(
            {"error": f"TTS generation failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_tts_batch(request):
    """
    Batch generate TTS audio for multiple speaking topics from AI extraction.

    POST /manager/api/tests/speaking/generate-tts-batch/

    Body (JSON):
        - topics: List of topic data (from AI extraction)
        - voice: Voice type
        - generate_all_questions: Whether to generate audio for each individual question

    Returns:
        - results: List of generated audio URLs per topic
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    topics_data = request.data.get("topics", [])
    voice = request.data.get("voice", "female_primary")
    generate_all = request.data.get("generate_all_questions", True)

    if not topics_data:
        return Response(
            {"error": "No topics provided"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        results = batch_generate_speaking_audio(
            topics_data=topics_data,
            voice=voice,
            generate_all_questions=generate_all,
        )

        return Response(results)

    except Exception as e:
        return Response(
            {"error": f"Batch TTS generation failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_tts_voices(request):
    """
    Get available TTS voices for speaking questions.

    GET /manager/api/tests/speaking/tts-voices/

    Returns:
        - voices: List of available voice options with descriptions
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    voices = [
        {
            "id": "female_primary",
            "name": "Sonia (British Female)",
            "voice_name": "en-GB-SoniaNeural",
            "gender": "female",
            "description": "Clear, professional British English female voice",
            "recommended": True,
        },
        {
            "id": "female_secondary",
            "name": "Libby (British Female)",
            "voice_name": "en-GB-LibbyNeural",
            "gender": "female",
            "description": "Alternative British English female voice",
            "recommended": False,
        },
        {
            "id": "male_primary",
            "name": "Ryan (British Male)",
            "voice_name": "en-GB-RyanNeural",
            "gender": "male",
            "description": "Clear, professional British English male voice",
            "recommended": True,
        },
        {
            "id": "male_secondary",
            "name": "Thomas (British Male)",
            "voice_name": "en-GB-ThomasNeural",
            "gender": "male",
            "description": "Alternative British English male voice",
            "recommended": False,
        },
    ]

    return Response(
        {
            "voices": voices,
            "default": "female_primary",
        }
    )


# =============================================================================
# Default Speaking Audio Management
# =============================================================================

# Default scripts for speaking part intros (authentic IELTS examiner scripts)
DEFAULT_SPEAKING_SCRIPTS = {
    "PART_1_INTRO": "Now, in Part 1, I'm going to ask you some questions about yourself. Let's talk about your home or your work or studies.",
    "PART_2_INTRO": "Now I'm going to give you a topic and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say. You can make some notes if you wish. Do you understand?",
    "PART_2_PREP": "All right? Remember, you have one to two minutes for this, so don't worry if I stop you. I'll tell you when the time is up. Can you start speaking now, please?",
    "PART_2_START": "Can you start speaking now, please?",
    "PART_3_INTRO": "We've been talking about the topic from Part 2, and now I'd like to discuss with you some more general questions related to this. Let's consider some broader aspects.",
    "TEST_END": "Thank you. That is the end of the Speaking test.",
}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_default_speaking_audios(request):
    """
    Get all default speaking audios.

    GET /manager/api/tests/speaking/default-audios/

    Returns list of default audios and which ones are missing.
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Get all existing default audios
    existing_audios = SpeakingDefaultAudio.objects.all()
    existing_dict = {
        audio.audio_type: {
            "id": audio.id,
            "audio_type": audio.audio_type,
            "audio_url": audio.audio_url,
            "description": audio.description,
            "script": audio.script,
            "voice": audio.voice,
            "created_at": audio.created_at,
        }
        for audio in existing_audios
    }

    # Build response with all audio types
    audios = []
    for audio_type, label in SpeakingDefaultAudio.AudioType.choices:
        if audio_type in existing_dict:
            audios.append(
                {
                    **existing_dict[audio_type],
                    "label": label,
                    "default_script": DEFAULT_SPEAKING_SCRIPTS.get(audio_type, ""),
                    "exists": True,
                }
            )
        else:
            audios.append(
                {
                    "audio_type": audio_type,
                    "label": label,
                    "default_script": DEFAULT_SPEAKING_SCRIPTS.get(audio_type, ""),
                    "exists": False,
                    "audio_url": None,
                }
            )

    return Response(
        {
            "audios": audios,
            "total": len(SpeakingDefaultAudio.AudioType.choices),
            "generated": existing_audios.count(),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_default_speaking_audio(request):
    """
    Generate or regenerate a default speaking audio.

    POST /manager/api/tests/speaking/default-audios/generate/

    Body:
        - audio_type: The type of audio to generate
        - script: Optional custom script (uses default if not provided)
        - voice: Voice to use (defaults to female_primary)

    Returns:
        - Generated audio details
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    audio_type = request.data.get("audio_type")
    custom_script = request.data.get("script")
    voice = request.data.get("voice", "female_primary")

    if not audio_type:
        return Response(
            {"error": "audio_type is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate audio type
    valid_types = [t[0] for t in SpeakingDefaultAudio.AudioType.choices]
    if audio_type not in valid_types:
        return Response(
            {"error": f"Invalid audio_type. Must be one of: {valid_types}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get script
    script = custom_script or DEFAULT_SPEAKING_SCRIPTS.get(audio_type, "")
    if not script:
        return Response(
            {"error": f"No script available for audio type: {audio_type}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        generator = AzureTTSGenerator()
        voice_name = generator.VOICE_OPTIONS.get(voice, generator.default_voice)

        # Generate audio
        audio_url, metadata = generator.generate_and_save(
            text=script,
            filename_prefix=f"default_{audio_type.lower()}",
            voice=voice_name,
            speaking_part="PART_1",  # Use calm pacing for intro scripts
        )

        # Save or update the default audio
        default_audio, created = SpeakingDefaultAudio.objects.update_or_create(
            audio_type=audio_type,
            defaults={
                "audio_url": audio_url,
                "description": dict(SpeakingDefaultAudio.AudioType.choices).get(
                    audio_type
                ),
                "script": script,
                "voice": voice_name,
            },
        )

        return Response(
            {
                "success": True,
                "audio_type": audio_type,
                "audio_url": audio_url,
                "script": script,
                "voice": voice_name,
                "created": created,
                "metadata": metadata,
            }
        )

    except Exception as e:
        return Response(
            {"error": f"Failed to generate audio: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_all_default_speaking_audios(request):
    """
    Generate all default speaking audios at once.

    POST /manager/api/tests/speaking/default-audios/generate-all/

    Body:
        - voice: Voice to use for all audios

    Returns:
        - List of generated audios
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    voice = request.data.get("voice", "female_primary")

    try:
        generator = AzureTTSGenerator()
        voice_name = generator.VOICE_OPTIONS.get(voice, generator.default_voice)

        results = []
        errors = []

        for audio_type, label in SpeakingDefaultAudio.AudioType.choices:
            script = DEFAULT_SPEAKING_SCRIPTS.get(audio_type)
            if not script:
                errors.append({"audio_type": audio_type, "error": "No default script"})
                continue

            try:
                audio_url, metadata = generator.generate_and_save(
                    text=script,
                    filename_prefix=f"default_{audio_type.lower()}",
                    voice=voice_name,
                    speaking_part="PART_1",
                )

                default_audio, created = SpeakingDefaultAudio.objects.update_or_create(
                    audio_type=audio_type,
                    defaults={
                        "audio_url": audio_url,
                        "description": label,
                        "script": script,
                        "voice": voice_name,
                    },
                )

                results.append(
                    {
                        "audio_type": audio_type,
                        "label": label,
                        "audio_url": audio_url,
                        "created": created,
                    }
                )

            except Exception as e:
                errors.append({"audio_type": audio_type, "error": str(e)})

        return Response(
            {
                "success": len(errors) == 0,
                "generated": results,
                "errors": errors,
                "total_generated": len(results),
                "total_errors": len(errors),
            }
        )

    except Exception as e:
        return Response(
            {"error": f"Failed to generate audios: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_default_speaking_audio(request, audio_type):
    """
    Update a default speaking audio's script and regenerate audio.

    PUT /manager/api/tests/speaking/default-audios/<audio_type>/update/

    Body:
        - script: The new script text
        - voice: Voice to use for TTS (optional)

    Returns:
        - Updated audio details with regenerated audio
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Check if audio_type is valid
    valid_types = [choice[0] for choice in SpeakingDefaultAudio.AudioType.choices]
    if audio_type not in valid_types:
        return Response(
            {"error": f"Invalid audio type: {audio_type}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    script = request.data.get("script", "").strip()
    voice = request.data.get("voice", "female_primary")

    if not script:
        # Fall back to default script
        script = DEFAULT_SPEAKING_SCRIPTS.get(audio_type, "")

    # Get or create the audio record
    audio, created = SpeakingDefaultAudio.objects.get_or_create(
        audio_type=audio_type,
        defaults={
            "description": dict(SpeakingDefaultAudio.AudioType.choices).get(
                audio_type, ""
            ),
        },
    )

    # Update script
    audio.script = script
    audio.voice = voice

    # Generate TTS audio
    try:
        generator = AzureTTSGenerator()
        voice_name = generator.get_voice_name(voice)
        audio_data = generator.synthesize_speech(script, voice_name)

        if audio_data:
            # Save audio file
            from django.core.files.base import ContentFile
            import uuid

            filename = f"speaking_default/{audio_type}_{uuid.uuid4().hex[:8]}.mp3"
            from django.core.files.storage import default_storage

            # Delete old file if exists
            if audio.audio_url:
                try:
                    old_path = audio.audio_url.replace("/media/", "")
                    if default_storage.exists(old_path):
                        default_storage.delete(old_path)
                except Exception:
                    pass

            # Save new file
            saved_path = default_storage.save(filename, ContentFile(audio_data))
            audio.audio_url = f"/media/{saved_path}"
    except Exception as e:
        return Response(
            {"error": f"Failed to generate audio: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    audio.save()

    return Response(
        {
            "success": True,
            "id": audio.id,
            "audio_type": audio.audio_type,
            "script": audio.script,
            "audio_url": audio.audio_url,
            "voice": audio.voice,
        }
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_default_speaking_audio(request, audio_type):
    """
    Delete a default speaking audio.

    DELETE /manager/api/tests/speaking/default-audios/<audio_type>/delete/

    Returns:
        - Success status
    """
    if not check_manager_permission(request.user):
        return Response(
            {"error": "Manager permissions required"},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        audio = SpeakingDefaultAudio.objects.get(audio_type=audio_type)
        audio.delete()
        return Response({"success": True}, status=status.HTTP_200_OK)
    except SpeakingDefaultAudio.DoesNotExist:
        return Response(
            {"error": "Default audio not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
