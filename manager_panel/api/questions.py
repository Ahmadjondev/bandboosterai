"""
Manager API - Question Management Endpoints
TestHeads (Question Groups) and Questions
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Count

from ielts.models import TestHead, Question, Choice
from ..serializers import TestHeadSerializer, QuestionSerializer
from .utils import check_manager_permission, permission_denied_response


# ============================================================================
# TESTHEAD (QUESTION GROUP) ENDPOINTS
# ============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_testheads(request):
    """Get test heads (question groups)"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    passage_id = request.GET.get("passage_id")
    part_id = request.GET.get("part_id")

    testheads = TestHead.objects.annotate(question_count=Count("questions"))

    if passage_id:
        testheads = testheads.filter(reading_id=passage_id)
    if part_id:
        testheads = testheads.filter(listening_id=part_id)
    print(f"part_id: {part_id}, passage_id: {passage_id}")
    print(f"testheads queryset: {testheads.query}")
    testheads = testheads.order_by("id")

    serializer = TestHeadSerializer(testheads, many=True)
    return Response({"testheads": serializer.data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_testhead(request, testhead_id):
    """Get a single test head with all its questions"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    testhead = get_object_or_404(
        TestHead.objects.prefetch_related("questions__choices"), id=testhead_id
    )

    serializer = TestHeadSerializer(testhead)
    return Response({"testhead": serializer.data})


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def create_testhead(request):
    """Create a new test head"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    serializer = TestHeadSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@permission_classes([IsAuthenticated])
def update_testhead(request, testhead_id):
    """Update a test head"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    testhead = get_object_or_404(TestHead, id=testhead_id)

    # Debug logging
    print(f"=== Update TestHead {testhead_id} ===")
    print(f"Content-Type: {request.content_type}")
    print(f"Request data keys: {request.data.keys()}")
    print(f"Has picture in FILES: {'picture' in request.FILES}")
    if "picture" in request.FILES:
        print(
            f"Picture file: {request.FILES['picture'].name}, Size: {request.FILES['picture'].size}"
        )

    serializer = TestHeadSerializer(testhead, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        print(f"TestHead updated successfully. Picture: {testhead.picture}")
        return Response(serializer.data)

    print(f"Validation errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_testhead(request, testhead_id):
    """Delete a test head"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    testhead = get_object_or_404(TestHead, id=testhead_id)
    testhead.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# QUESTION ENDPOINTS
# ============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_question(request):
    """Create a new question"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    serializer = QuestionSerializer(data=request.data)
    if serializer.is_valid():
        question = serializer.save()

        # Create choices if provided
        choices_data = request.data.get("choices", [])
        for choice_data in choices_data:
            Choice.objects.create(question=question, **choice_data)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_questions_bulk(request):
    """Create multiple questions at once with support for structured data"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    testhead_id = request.data.get("testhead")
    if not testhead_id:
        return Response(
            {"error": "testhead is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    testhead = get_object_or_404(TestHead, id=testhead_id)

    # Handle different question type structures
    matching_data = request.data.get("matching_data")
    summary_data = request.data.get("summary_data")
    structured_data = request.data.get("structured_data")
    questions_data = request.data.get("questions", [])

    created_questions = []

    try:
        # Handle matching questions (MF, MI, MH)
        if matching_data:
            questions_list = matching_data.get("questions", [])
            options = matching_data.get("options", [])

            # Store options in testhead's question_data if needed
            if options:
                import json

                testhead.question_data = json.dumps({"options": options})
                testhead.save()

            for question_data in questions_list:
                question = Question.objects.create(
                    test_head=testhead,
                    question_text=question_data.get("question_text", ""),
                    correct_answer_text=question_data.get("correct_answer_text", ""),
                    answer_two_text=question_data.get("answer_two_text", ""),
                    order=question_data.get("order", len(created_questions) + 1),
                )
                created_questions.append(QuestionSerializer(question).data)

        # Handle summary completion questions
        elif summary_data:
            questions_list = summary_data.get("questions", [])
            summary_text = summary_data.get("summary_text", "")

            # Store summary text in testhead's question_data
            if summary_text:
                import json

                testhead.question_data = json.dumps({"summary_text": summary_text})
                testhead.save()

            for question_data in questions_list:
                question = Question.objects.create(
                    test_head=testhead,
                    question_text=question_data.get("question_text", ""),
                    correct_answer_text=question_data.get("correct_answer_text", ""),
                    answer_two_text=question_data.get("answer_two_text", ""),
                    order=question_data.get("order", len(created_questions) + 1),
                )
                created_questions.append(QuestionSerializer(question).data)

        # Handle structured data (NC, FC, TC)
        elif structured_data:
            questions_list = structured_data.get("questions", [])
            structure = structured_data.get("structure", {})

            # Store structure in testhead's question_data
            if structure:
                import json

                testhead.question_data = json.dumps(structure)
                testhead.save()

            for question_data in questions_list:
                question = Question.objects.create(
                    test_head=testhead,
                    question_text=question_data.get("question_text", ""),
                    correct_answer_text=question_data.get("correct_answer_text", ""),
                    answer_two_text=question_data.get("answer_two_text", ""),
                    order=question_data.get("order", len(created_questions) + 1),
                )
                created_questions.append(QuestionSerializer(question).data)

        # Handle standard questions (MCQ, TFNG, etc.)
        else:
            for question_data in questions_data:
                choices_data = question_data.pop("choices", [])

                question = Question.objects.create(
                    test_head=testhead,
                    question_text=question_data.get("question_text", ""),
                    correct_answer_text=question_data.get("correct_answer_text", ""),
                    answer_two_text=question_data.get("answer_two_text", ""),
                    order=question_data.get("order", len(created_questions) + 1),
                )

                # Create choices for MCQ questions
                for choice_data in choices_data:
                    Choice.objects.create(
                        question=question,
                        choice_text=choice_data.get("choice_text", ""),
                        is_correct=choice_data.get("is_correct", False),
                    )

                created_questions.append(QuestionSerializer(question).data)

        return Response(
            {"questions": created_questions}, status=status.HTTP_201_CREATED
        )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_question(request, question_id):
    """Update a question"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    question = get_object_or_404(Question, id=question_id)

    serializer = QuestionSerializer(question, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()

        # Update choices if provided
        choices_data = request.data.get("choices")
        if choices_data is not None:
            question.choices.all().delete()
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_question(request, question_id):
    """Delete a question"""
    if not check_manager_permission(request.user):
        return permission_denied_response()

    question = get_object_or_404(Question, id=question_id)
    question.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)
