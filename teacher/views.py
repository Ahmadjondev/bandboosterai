from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Avg, Count, F
from django.utils import timezone
from decimal import Decimal

from .models import TeacherExam, TeacherExamAttempt, TeacherFeedback
from ielts.models import (
    MockExam,
    ReadingPassage,
    ListeningPart,
    WritingTask,
    SpeakingTopic,
)
from .serializers import (
    TeacherExamSerializer,
    TeacherExamDetailSerializer,
    TeacherExamAttemptSerializer,
    TeacherExamAttemptDetailSerializer,
    TeacherFeedbackSerializer,
    StudentResultSerializer,
    DashboardStatsSerializer,
    ExamPerformanceSummarySerializer,
)
from .permissions import IsTeacher


class TeacherDashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for teacher dashboard statistics and insights
    """

    permission_classes = [IsAuthenticated, IsTeacher]

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Get overall dashboard statistics for the teacher
        """
        teacher = request.user

        # Calculate statistics
        total_exams = TeacherExam.objects.filter(teacher=teacher).count()
        active_exams = TeacherExam.objects.filter(
            teacher=teacher, status="PUBLISHED"
        ).count()

        # Get all student IDs who have attempted teacher's exams
        student_ids = (
            TeacherExamAttempt.objects.filter(exam__teacher=teacher)
            .values_list("student_id", flat=True)
            .distinct()
        )
        total_students = len(student_ids)

        # Attempt statistics
        all_attempts = TeacherExamAttempt.objects.filter(exam__teacher=teacher)
        total_attempts = all_attempts.count()
        completed_attempts = all_attempts.filter(
            status__in=["COMPLETED", "GRADED"]
        ).count()
        pending_grading = all_attempts.filter(status="COMPLETED").count()

        # Calculate average score from graded attempts
        graded_attempts = all_attempts.filter(
            status="GRADED", overall_band__isnull=False
        )
        avg_score = graded_attempts.aggregate(avg=Avg("overall_band"))[
            "avg"
        ] or Decimal("0.0")

        # Recent activities (last 10 attempts)
        recent_attempts = all_attempts.select_related("student", "exam").order_by(
            "-updated_at"
        )[:10]
        recent_activities = [
            {
                "id": attempt.id,
                "student": attempt.student.get_full_name(),
                "exam": attempt.exam.title,
                "status": attempt.status,
                "score": float(attempt.overall_band) if attempt.overall_band else None,
                "timestamp": attempt.updated_at,
            }
            for attempt in recent_attempts
        ]

        data = {
            "total_exams": total_exams,
            "active_exams": active_exams,
            "total_students": total_students,
            "total_attempts": total_attempts,
            "completed_attempts": completed_attempts,
            "pending_grading": pending_grading,
            "average_score": avg_score,
            "recent_activities": recent_activities,
        }

        serializer = DashboardStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def recent_exams(self, request):
        """
        Get recent exams created by the teacher
        """
        teacher = request.user
        exams = TeacherExam.objects.filter(teacher=teacher).order_by("-created_at")[:10]
        serializer = TeacherExamSerializer(exams, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pending_grades(self, request):
        """
        Get attempts that need grading
        """
        teacher = request.user
        attempts = TeacherExamAttempt.objects.filter(
            exam__teacher=teacher, status="COMPLETED"
        ).select_related("student", "exam")
        serializer = TeacherExamAttemptSerializer(attempts, many=True)
        return Response(serializer.data)


class TeacherExamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing teacher exams (CRUD operations)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = TeacherExamSerializer

    def get_permissions(self):
        """
        Custom permissions: Students can view/list/join/start exams, teachers can do CRUD
        """
        if self.action in [
            "list",
            "retrieve",
            "my_exams",
            "join_exam",
            "start_exam",
            "my_attempt",
        ]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsTeacher()]

    def get_queryset(self):
        """
        Return exams created by the authenticated teacher,
        or public/assigned exams for students
        """
        if self.request.user.role == "TEACHER":
            return TeacherExam.objects.filter(teacher=self.request.user).select_related(
                "teacher", "mock_exam"
            )
        elif self.request.user.role == "STUDENT":
            # Students can see public exams or exams they're assigned to
            return (
                TeacherExam.objects.filter(
                    Q(is_public=True) | Q(assigned_students=self.request.user),
                    status="PUBLISHED",
                )
                .distinct()
                .select_related("teacher", "mock_exam")
            )
        return TeacherExam.objects.none()

    def get_serializer_class(self):
        """
        Use detailed serializer for retrieve action
        """
        if self.action == "retrieve":
            return TeacherExamDetailSerializer
        return TeacherExamSerializer

    @action(detail=True, methods=["get"])
    def performance(self, request, pk=None):
        """
        Get performance summary for a specific exam
        """
        exam = self.get_object()

        # Calculate statistics
        attempts = TeacherExamAttempt.objects.filter(exam=exam)
        total_students = exam.assigned_students.count() if not exam.is_public else None
        completed_count = attempts.filter(status__in=["COMPLETED", "GRADED"]).count()

        # Average scores by section
        graded = attempts.filter(status="GRADED")
        average_scores = {
            "listening": float(
                graded.aggregate(avg=Avg("listening_score"))["avg"] or 0
            ),
            "reading": float(graded.aggregate(avg=Avg("reading_score"))["avg"] or 0),
            "writing": float(graded.aggregate(avg=Avg("writing_score"))["avg"] or 0),
            "speaking": float(graded.aggregate(avg=Avg("speaking_score"))["avg"] or 0),
            "overall": float(graded.aggregate(avg=Avg("overall_band"))["avg"] or 0),
        }

        # Score distribution (count by band ranges)
        score_distribution = {
            "0-4.5": graded.filter(overall_band__lt=5.0).count(),
            "5.0-5.5": graded.filter(
                overall_band__gte=5.0, overall_band__lt=6.0
            ).count(),
            "6.0-6.5": graded.filter(
                overall_band__gte=6.0, overall_band__lt=7.0
            ).count(),
            "7.0-7.5": graded.filter(
                overall_band__gte=7.0, overall_band__lt=8.0
            ).count(),
            "8.0-9.0": graded.filter(overall_band__gte=8.0).count(),
        }

        # Top and low performers
        top_performers = [
            {
                "student": att.student.get_full_name(),
                "score": float(att.overall_band),
                "id": att.id,
            }
            for att in graded.order_by("-overall_band")[:5]
        ]

        low_performers = [
            {
                "student": att.student.get_full_name(),
                "score": float(att.overall_band),
                "id": att.id,
            }
            for att in graded.order_by("overall_band")[:5]
        ]

        data = {
            "exam": exam,
            "total_students": total_students,
            "completed_count": completed_count,
            "average_scores": average_scores,
            "score_distribution": score_distribution,
            "top_performers": top_performers,
            "low_performers": low_performers,
        }

        serializer = ExamPerformanceSummarySerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def students(self, request, pk=None):
        """
        Get all student attempts for this exam
        """
        exam = self.get_object()
        attempts = TeacherExamAttempt.objects.filter(exam=exam).select_related(
            "student"
        )
        serializer = TeacherExamAttemptSerializer(
            attempts, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def assign_students(self, request, pk=None):
        """
        Assign students to an exam
        """
        exam = self.get_object()
        student_ids = request.data.get("student_ids", [])

        from accounts.models import User

        students = User.objects.filter(id__in=student_ids, role="STUDENT")
        exam.assigned_students.add(*students)

        return Response(
            {"message": f"Assigned {students.count()} students to the exam"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """
        Publish a draft exam
        """
        exam = self.get_object()
        if exam.status == "DRAFT":
            exam.status = "PUBLISHED"
            exam.save()
            return Response(
                {"message": "Exam published successfully"}, status=status.HTTP_200_OK
            )
        return Response(
            {"error": "Exam is not in draft status"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """
        Archive an exam
        """
        exam = self.get_object()
        exam.status = "ARCHIVED"
        exam.save()
        return Response(
            {"message": "Exam archived successfully"}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], url_path="toggle-results-visible")
    def toggle_results_visible(self, request, pk=None):
        """
        Toggle results visibility for students
        """
        exam = self.get_object()
        exam.results_visible = not exam.results_visible
        exam.save()
        return Response(
            {
                "message": f"Results are now {'visible' if exam.results_visible else 'hidden'} to students",
                "results_visible": exam.results_visible,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="available-mock-exams")
    def available_mock_exams(self, request):
        """
        Get all available mock exams that can be used for teacher exams
        """
        mock_exams = MockExam.objects.filter(created_by_id=request.user.id).order_by(
            "-created_at"
        )

        # Serialize mock exam data
        data = [
            {
                "id": exam.id,
                "uuid": str(exam.uuid),
                "title": exam.title,
                "exam_type": exam.exam_type,
                "exam_type_display": exam.get_exam_type_display(),
                "difficulty_level": exam.difficulty_level,
                "duration_minutes": exam.get_default_duration(),
                "description": exam.description,
            }
            for exam in mock_exams
        ]

        return Response(data)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="my_exams",
    )
    def my_exams(self, request):
        """
        Get exams that the student is enrolled in (for students)
        """
        # if request.user.role != "STUDENT":
        #     return Response(
        #         {"error": "Only students can access this endpoint"},
        #         status=status.HTTP_403_FORBIDDEN,
        #     )

        # Get exams where student is assigned or public exams
        exams = TeacherExam.objects.filter(
            Q(assigned_students=request.user) | Q(is_public=True),
            status="PUBLISHED",
        ).distinct()

        serializer = TeacherExamSerializer(
            exams, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="join",
    )
    def join_exam(self, request):
        """
        Join an exam using access code (for students)
        """
        if request.user.role != "STUDENT":
            return Response(
                {"error": "Only students can join exams"},
                status=status.HTTP_403_FORBIDDEN,
            )

        access_code = request.data.get("access_code")
        if not access_code:
            return Response(
                {"error": "Access code is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            exam = TeacherExam.objects.get(access_code=access_code, status="PUBLISHED")
        except TeacherExam.DoesNotExist:
            return Response(
                {"error": "Invalid access code or exam not available"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Add student to assigned students
        exam.assigned_students.add(request.user)

        serializer = TeacherExamSerializer(exam, context={"request": request})
        return Response(
            {
                "message": "Successfully joined the exam",
                "exam": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="start",
    )
    def start_exam(self, request, pk=None):
        """
        Start an exam attempt (for students)
        """
        if request.user.role != "STUDENT":
            return Response(
                {"error": "Only students can start exams"},
                status=status.HTTP_403_FORBIDDEN,
            )

        exam = self.get_object()

        # Check if exam is published
        if exam.status != "PUBLISHED":
            return Response(
                {"error": "This exam is not available"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if student has access
        if not exam.is_public and request.user not in exam.assigned_students.all():
            return Response(
                {"error": "You don't have access to this exam"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if student already has an attempt
        existing_attempt = TeacherExamAttempt.objects.filter(
            exam=exam, student=request.user
        ).first()

        if existing_attempt:
            return Response(
                {"error": "You already have an attempt for this exam"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine first section based on exam type
        exam_type = exam.mock_exam.exam_type if exam.mock_exam else "FULL_TEST"
        first_section_map = {
            "LISTENING": "listening",
            "READING": "reading",
            "WRITING": "writing",
            "SPEAKING": "speaking",
            "LISTENING_READING": "listening",
            "LISTENING_READING_WRITING": "listening",
            "FULL_TEST": "listening",
        }
        first_section = first_section_map.get(exam_type, "listening")

        # Create new attempt
        attempt = TeacherExamAttempt.objects.create(
            exam=exam,
            student=request.user,
            status="IN_PROGRESS",
            current_section=first_section,
            started_at=timezone.now(),
        )

        serializer = TeacherExamAttemptSerializer(attempt, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[IsAuthenticated],
        url_path="my_attempt",
    )
    def my_attempt(self, request, pk=None):
        """
        Get student's attempt for this exam (for students)
        """
        # if request.user.role != "STUDENT":
        #     return Response(
        #         {"error": "Only students can access this endpoint"},
        #         status=status.HTTP_403_FORBIDDEN,
        #     )

        exam = self.get_object()
        attempt = TeacherExamAttempt.objects.filter(
            exam=exam, student=request.user
        ).first()

        if not attempt:
            return Response(
                {"error": "No attempt found for this exam"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TeacherExamAttemptDetailSerializer(
            attempt, context={"request": request}
        )
        return Response(serializer.data)


class TeacherExamAttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing student exam attempts
    """

    permission_classes = [IsAuthenticated]
    serializer_class = TeacherExamAttemptSerializer

    def get_permissions(self):
        """
        Allow students to access their own attempts, teachers to access all
        """
        if self.action in ["submit_attempt", "retrieve", "list"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsTeacher()]

    def get_queryset(self):
        """
        Return attempts for exams created by the authenticated teacher,
        or student's own attempts if student
        """
        queryset = TeacherExamAttempt.objects.none()

        if self.request.user.role == "TEACHER":
            queryset = TeacherExamAttempt.objects.filter(
                exam__teacher=self.request.user
            ).select_related("student", "exam")
        elif self.request.user.role == "STUDENT":
            queryset = TeacherExamAttempt.objects.filter(
                student=self.request.user
            ).select_related("student", "exam")

        # Prefetch related data for detail view
        if self.action in ["retrieve", "analysis"]:
            queryset = queryset.prefetch_related(
                "teacher_feedbacks",
                "writing_attempts__task",
                "user_answers__question__test_head",
            )

        return queryset

    def get_serializer_class(self):
        """
        Use detailed serializer for retrieve action
        """
        if self.action == "retrieve":
            return TeacherExamAttemptDetailSerializer
        return TeacherExamAttemptSerializer

    @action(detail=True, methods=["get"])
    def analysis(self, request, pk=None):
        """
        Get detailed analysis of a student's attempt
        """
        from ielts.models import Question
        from .models import TeacherUserAnswer

        attempt = self.get_object()

        # Get all questions from the mock exam
        if attempt.exam.mock_exam:
            listening_questions = (
                Question.objects.filter(
                    test_head__listening__in=attempt.exam.mock_exam.listening_parts.all()
                )
                .select_related("test_head")
                .order_by("order")
            )

            reading_questions = (
                Question.objects.filter(
                    test_head__reading__in=attempt.exam.mock_exam.reading_passages.all()
                )
                .select_related("test_head")
                .order_by("order")
            )

            # Get user answers
            user_answers_qs = TeacherUserAnswer.objects.filter(
                exam_attempt=attempt
            ).select_related("question__test_head")

            # Create a map of question_id -> user_answer
            user_answers_map = {ua.question_id: ua for ua in user_answers_qs}

            # Calculate listening stats with MCMA support
            listening_user_answers = user_answers_qs.filter(
                question__in=listening_questions
            )
            listening_correct, _ = self._calculate_weighted_score(
                listening_user_answers
            )
            listening_total = self._calculate_total_questions(listening_questions)

            # Calculate reading stats with MCMA support
            reading_user_answers = user_answers_qs.filter(
                question__in=reading_questions
            )
            reading_correct, _ = self._calculate_weighted_score(reading_user_answers)
            reading_total = self._calculate_total_questions(reading_questions)
        else:
            listening_correct = listening_total = 0
            reading_correct = reading_total = 0

        # Calculate section analysis
        section_analysis = {
            "listening": {
                "score": (
                    float(attempt.listening_score) if attempt.listening_score else None
                ),
                "strength": (
                    "Good"
                    if attempt.listening_score and attempt.listening_score >= 6.5
                    else "Needs improvement"
                ),
                "correct": listening_correct,
                "total": listening_total,
            },
            "reading": {
                "score": (
                    float(attempt.reading_score) if attempt.reading_score else None
                ),
                "strength": (
                    "Good"
                    if attempt.reading_score and attempt.reading_score >= 6.5
                    else "Needs improvement"
                ),
                "correct": reading_correct,
                "total": reading_total,
            },
            "writing": {
                "score": (
                    float(attempt.writing_score) if attempt.writing_score else None
                ),
                "strength": (
                    "Good"
                    if attempt.writing_score and attempt.writing_score >= 6.5
                    else "Needs improvement"
                ),
            },
            "speaking": {
                "score": (
                    float(attempt.speaking_score) if attempt.speaking_score else None
                ),
                "strength": (
                    "Good"
                    if attempt.speaking_score and attempt.speaking_score >= 6.5
                    else "Needs improvement"
                ),
            },
        }

        # Generate recommendations
        recommendations = []
        if attempt.overall_band:
            if attempt.overall_band < 5.5:
                recommendations.append(
                    "Focus on building fundamental English skills across all sections"
                )
            elif attempt.overall_band < 6.5:
                recommendations.append(
                    "Work on vocabulary expansion and grammatical accuracy"
                )
            else:
                recommendations.append("Maintain current level with regular practice")

        # Add section-specific recommendations
        for section, data in section_analysis.items():
            if data.get("score") and data["score"] < 6.0:
                recommendations.append(
                    f"Prioritize {section.capitalize()} practice to improve weak areas"
                )

        data = {
            "student": attempt.student,
            "attempt": attempt,
            "section_analysis": section_analysis,
            "recommendations": recommendations,
        }

        serializer = StudentResultSerializer(data)
        return Response(serializer.data)

    def _check_answer_correctness(self, user_answer_text, question):
        """
        Check if a user's answer is correct for a given question.
        For MCMA, returns a tuple of (partial_score, max_possible_score).
        For other types, returns True/False.
        """
        from ielts.models import TestHead

        if not question:
            return False

        user_answer = user_answer_text.strip() if user_answer_text else ""
        correct_answer = question.get_correct_answer() or ""

        if not correct_answer:
            return False

        # Check if answer is correct based on question type
        if question.test_head.question_type in [
            TestHead.QuestionType.MULTIPLE_CHOICE,
            TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS,
        ]:
            # For MCQ/MCMA, compare sorted keys
            user_sorted = "".join(sorted(user_answer.upper()))
            correct_sorted = "".join(sorted(correct_answer.upper()))

            # For MCMA, we need partial credit scoring
            if (
                question.test_head.question_type
                == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
            ):
                return self._calculate_mcma_score(user_sorted, correct_sorted)

            # For regular MCQ, all or nothing
            return user_sorted == correct_sorted
        else:
            # Case-insensitive comparison for text answers
            corrects = correct_answer.lower().split("|")
            for cor_answer in corrects:
                if user_answer.lower() == cor_answer.lower():
                    return True
            return False

    def _calculate_mcma_score(self, user_answer, correct_answer):
        """
        Calculate partial credit for MCMA questions.
        Each correct answer counts as 1 question toward the 40-question total.

        Returns: (score, max_score) tuple
        """
        if not correct_answer:
            return (0, 1)

        user_set = set(user_answer)
        correct_set = set(correct_answer)

        # Count correct selections - each correct selection is worth 1 point
        correct_selections = len(user_set & correct_set)
        score = correct_selections

        max_score = len(correct_set)
        return (score, max_score)

    def _calculate_weighted_score(self, user_answers_queryset):
        """
        Calculate weighted score considering MCMA questions.
        For MCMA questions, each correct answer counts as 1 toward the total.

        Returns: (total_score, max_possible_score)
        """
        total_score = 0
        max_possible_score = 0

        for ua in user_answers_queryset:
            result = self._check_answer_correctness(ua.answer_text, ua.question)

            if isinstance(result, tuple):
                # MCMA question - partial scoring
                score, max_score = result
                total_score += score
                max_possible_score += max_score
            else:
                # Regular question - binary scoring
                total_score += 1 if result else 0
                max_possible_score += 1

        return (total_score, max_possible_score)

    def _calculate_total_questions(self, questions_qs):
        """Calculate total question count (handling MCMA as multiple questions)."""
        from ielts.models import TestHead

        total_count = 0
        for q in questions_qs:
            if (
                q.test_head.question_type
                == TestHead.QuestionType.MULTIPLE_CHOICE_MULTIPLE_ANSWERS
            ):
                correct_answer = q.get_correct_answer() or ""
                total_count += len(set(correct_answer)) if correct_answer else 1
            else:
                total_count += 1

        return total_count

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
        url_path="submit",
    )
    def submit_attempt(self, request, pk=None):
        """
        Submit a completed attempt (for students)
        Auto-calculates listening and reading band scores
        """
        from .models import TeacherUserAnswer
        from ielts.analysis import calculate_band_score

        attempt = self.get_object()

        # Check if student owns this attempt
        if attempt.student != request.user:
            return Response(
                {"error": "You can only submit your own attempts"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if attempt.status != "IN_PROGRESS":
            return Response(
                {"error": "Attempt is not in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate listening and reading scores
        # Get the mock exam to access all questions (40 each for listening/reading)
        from ielts.models import Question

        mock_exam = attempt.exam.mock_exam

        # Get all questions from the mock exam (should be 40 each)
        listening_questions = Question.objects.filter(
            test_head__listening__in=mock_exam.listening_parts.all()
        ).select_related("test_head")

        reading_questions = Question.objects.filter(
            test_head__reading__in=mock_exam.reading_passages.all()
        ).select_related("test_head")

        # Get user answers
        user_answers = TeacherUserAnswer.objects.filter(
            exam_attempt=attempt
        ).select_related("question__test_head")

        # Calculate listening stats with MCMA support
        listening_user_answers = user_answers.filter(question__in=listening_questions)
        listening_correct, _ = self._calculate_weighted_score(listening_user_answers)
        listening_total = self._calculate_total_questions(listening_questions)

        # Calculate reading stats with MCMA support
        reading_user_answers = user_answers.filter(question__in=reading_questions)
        reading_correct, _ = self._calculate_weighted_score(reading_user_answers)
        reading_total = self._calculate_total_questions(reading_questions)

        # Calculate band scores using IELTS algorithm
        scores_calculated = {}
        if listening_total > 0:
            listening_band = calculate_band_score(
                listening_correct, listening_total, "listening"
            )
            attempt.listening_score = Decimal(str(listening_band))
            scores_calculated["listening"] = {
                "correct": listening_correct,
                "total": listening_total,
                "band_score": float(listening_band),
            }

        if reading_total > 0:
            reading_band = calculate_band_score(
                reading_correct, reading_total, "academic_reading"
            )
            attempt.reading_score = Decimal(str(reading_band))
            scores_calculated["reading"] = {
                "correct": reading_correct,
                "total": reading_total,
                "band_score": float(reading_band),
            }

        # Update attempt status
        attempt.status = "COMPLETED"
        attempt.submitted_at = timezone.now()
        attempt.save()

        return Response(
            {
                "message": "Exam submitted successfully",
                "scores": scores_calculated,
                "overall_band": (
                    float(attempt.overall_band) if attempt.overall_band else None
                ),
                "listening_score": (
                    float(attempt.listening_score) if attempt.listening_score else None
                ),
                "reading_score": (
                    float(attempt.reading_score) if attempt.reading_score else None
                ),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def grade(self, request, pk=None):
        """
        Grade a completed attempt
        """
        attempt = self.get_object()
        print(attempt.status)
        if attempt.status != "COMPLETED" and attempt.status != "GRADED":
            return Response(
                {"error": "Attempt is not in completed status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update scores from request data
        listening = request.data.get("listening_score")
        reading = request.data.get("reading_score")
        writing = request.data.get("writing_score")
        speaking = request.data.get("speaking_score")

        if listening is not None:
            attempt.listening_score = Decimal(str(listening))
        if reading is not None:
            attempt.reading_score = Decimal(str(reading))
        if writing is not None:
            attempt.writing_score = Decimal(str(writing))
        if speaking is not None:
            attempt.speaking_score = Decimal(str(speaking))

        # Update strengths and weaknesses if provided
        if "strengths" in request.data:
            attempt.strengths = request.data["strengths"]
        if "weaknesses" in request.data:
            attempt.weaknesses = request.data["weaknesses"]

        attempt.status = "GRADED"
        attempt.save()  # This will auto-calculate overall_band

        return Response(
            TeacherExamAttemptDetailSerializer(attempt).data, status=status.HTTP_200_OK
        )


class TeacherFeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing teacher feedback on student attempts
    """

    permission_classes = [IsAuthenticated, IsTeacher]
    serializer_class = TeacherFeedbackSerializer

    def get_queryset(self):
        """
        Return feedback given by the authenticated teacher
        """
        return TeacherFeedback.objects.filter(teacher=self.request.user).select_related(
            "teacher", "attempt__student", "attempt__exam"
        )

    def perform_create(self, serializer):
        """
        Set teacher when creating feedback
        """
        serializer.save(teacher=self.request.user)


class TeacherMockExamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for teachers to manage mock exams
    Similar to manager but for teacher use
    """

    permission_classes = [IsAuthenticated, IsTeacher]
    queryset = MockExam.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            from ielts.serializers import MockExamSerializer as DetailSerializer

            return DetailSerializer
        from ielts.serializers import MockExamSerializer

        return MockExamSerializer

    def get_queryset(self):
        """
        Teachers can only view and manage their own created mock exams
        """
        # Filter to show only mock exams created by this teacher
        queryset = (
            MockExam.objects.filter(created_by=self.request.user)
            .annotate(attempt_count=Count("scheduled_exams__attempts", distinct=True))
            .order_by("-created_at")
        )

        # Apply filters
        status_filter = self.request.query_params.get("status", "")
        if status_filter == "active":
            queryset = queryset.filter(is_active=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(is_active=False)

        exam_type = self.request.query_params.get("exam_type", "")
        if exam_type:
            queryset = queryset.filter(exam_type=exam_type)

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Create a new mock exam - teachers can create but they're inactive by default
        """
        # Teachers create exams that are inactive by default (need manager approval)
        data = request.data.copy()
        data["is_active"] = False  # Force inactive for teacher-created exams

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        # Set created_by to current teacher
        serializer.save(created_by=request.user)

        return Response(
            {
                "success": True,
                "message": "Mock exam created successfully. It will be reviewed by an admin before activation.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """
        Update mock exam - teachers can only update inactive exams
        """
        instance = self.get_object()

        # Teachers can only edit inactive exams
        if instance.is_active:
            return Response(
                {"error": "Cannot edit active exams. Please contact an administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        Delete mock exam - teachers can only delete inactive exams
        """
        instance = self.get_object()

        # Teachers can only delete inactive exams
        if instance.is_active:
            return Response(
                {
                    "error": "Cannot delete active exams. Please contact an administrator."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """
        Get statistics about teacher's own mock exams
        """
        # Filter stats to only show teacher's own exams
        teacher_exams = MockExam.objects.filter(created_by=request.user)

        total = teacher_exams.count()
        active = teacher_exams.filter(is_active=True).count()
        inactive = teacher_exams.filter(is_active=False).count()

        exam_types = (
            teacher_exams.values("exam_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response(
            {
                "total": total,
                "active": active,
                "inactive": inactive,
                "by_type": list(exam_types),
            }
        )

    @action(detail=False, methods=["get"], url_path="available/reading")
    def available_reading(self, request):
        """Get available reading passages for mock test selection"""
        from ielts.models import ReadingPassage
        from ielts.serializers import ReadingPassageListSerializer

        passages = ReadingPassage.objects.all()

        # Filter by passage number if provided
        passage_number = request.query_params.get("passage_number")
        if passage_number:
            passages = passages.filter(passage_number=int(passage_number))

        # Filter by search
        search = request.query_params.get("search", "").strip()
        if search:
            passages = passages.filter(title__icontains=search)

        serializer = ReadingPassageListSerializer(passages, many=True)
        return Response({"passages": serializer.data})

    @action(detail=False, methods=["get"], url_path="available/listening")
    def available_listening(self, request):
        """Get available listening parts for mock test selection"""
        from ielts.models import ListeningPart
        from ielts.serializers import ListeningPartListSerializer

        parts = ListeningPart.objects.all()

        # Filter by part number if provided
        part_number = request.query_params.get("part_number")
        if part_number:
            parts = parts.filter(part_number=int(part_number))

        # Filter by search
        search = request.query_params.get("search", "").strip()
        if search:
            parts = parts.filter(title__icontains=search)

        serializer = ListeningPartListSerializer(parts, many=True)
        return Response({"parts": serializer.data})

    @action(detail=False, methods=["get"], url_path="available/writing")
    def available_writing(self, request):
        """Get available writing tasks for mock test selection"""
        from ielts.models import WritingTask
        from ielts.serializers import WritingTaskListSerializer

        tasks = WritingTask.objects.all()

        # Filter by task type if provided
        task_type = request.query_params.get("task_type")
        if task_type:
            tasks = tasks.filter(task_type=task_type)

        # Filter by search
        search = request.query_params.get("search", "").strip()
        if search:
            tasks = tasks.filter(title__icontains=search)

        serializer = WritingTaskListSerializer(tasks, many=True)
        return Response({"tasks": serializer.data})

    @action(detail=False, methods=["get"], url_path="available/speaking")
    def available_speaking(self, request):
        """Get available speaking topics for mock test selection"""
        from ielts.models import SpeakingTopic
        from ielts.serializers import SpeakingTopicListSerializer

        topics = SpeakingTopic.objects.all()

        # Filter by speaking type if provided
        speaking_type = request.query_params.get("speaking_type")
        if speaking_type:
            topics = topics.filter(speaking_type=speaking_type)

        # Filter by search
        search = request.query_params.get("search", "").strip()
        if search:
            topics = topics.filter(title__icontains=search)

        serializer = SpeakingTopicListSerializer(topics, many=True)
        return Response({"topics": serializer.data})
