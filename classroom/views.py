"""
BandBooster Classroom Command: Views

DRF ViewSets for Classroom module - handling classrooms, enrollments,
assignment bundles, and student submissions with AI grading integration.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.db.models import Q, Avg, Count, F, Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404
from decimal import Decimal

from .models import (
    Classroom,
    Enrollment,
    AssignmentBundle,
    BundleItem,
    StudentAssignment,
    StudentItemSubmission,
)
from .serializers import (
    ClassroomSerializer,
    ClassroomDetailSerializer,
    ClassroomListSerializer,
    EnrollmentSerializer,
    EnrollmentCreateSerializer,
    StudentRosterSerializer,
    AssignmentBundleSerializer,
    AssignmentBundleCreateSerializer,
    AssignmentBundleListSerializer,
    BundleItemSerializer,
    BundleItemCreateSerializer,
    StudentAssignmentSerializer,
    StudentAssignmentListSerializer,
    GradingQueueSerializer,
    StudentItemSubmissionSerializer,
    StudentItemSubmissionCreateSerializer,
    TeacherGradeSubmissionSerializer,
    ClassroomAnalyticsSerializer,
    StudentProgressSerializer,
)
from teacher.permissions import IsTeacher


class IsTeacherOrStudent(IsAuthenticated):
    """Permission that allows both teachers and students"""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in ["TEACHER", "STUDENT"]


class IsStudent(IsAuthenticated):
    """Permission that allows only students"""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role == "STUDENT"


# ============================================
# Classroom ViewSet (Teacher)
# ============================================


class ClassroomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing classrooms.
    Teachers can create, update, and manage their classrooms.
    """

    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        """Return classrooms owned by the current teacher"""
        return (
            Classroom.objects.filter(teacher=self.request.user)
            .annotate(
                student_count_annotated=Count(
                    "enrollments", filter=Q(enrollments__status="ACTIVE")
                )
            )
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ClassroomDetailSerializer
        if self.action == "list":
            return ClassroomListSerializer
        return ClassroomSerializer

    @action(detail=True, methods=["post"])
    def regenerate_invite(self, request, pk=None):
        """Regenerate the classroom's invite code"""
        classroom = self.get_object()
        new_code = classroom.regenerate_invite_code()
        return Response(
            {
                "invite_code": new_code,
                "magic_link": classroom.magic_link,
            }
        )

    @action(detail=True, methods=["post"])
    def toggle_invites(self, request, pk=None):
        """Toggle invite link enabled/disabled"""
        classroom = self.get_object()
        classroom.invite_enabled = not classroom.invite_enabled
        classroom.save(update_fields=["invite_enabled", "updated_at"])
        return Response(
            {
                "invite_enabled": classroom.invite_enabled,
            }
        )

    @action(detail=True, methods=["get"])
    def roster(self, request, pk=None):
        """Get detailed student roster for a classroom"""
        classroom = self.get_object()
        enrollments = (
            classroom.enrollments.filter(status="ACTIVE")
            .select_related("student")
            .order_by("-last_active", "-enrolled_at")
        )

        serializer = StudentRosterSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def analytics(self, request, pk=None):
        """Get classroom analytics and statistics"""
        classroom = self.get_object()

        enrollments = classroom.enrollments.filter(status="ACTIVE")
        total_students = enrollments.count()

        # Active in last 7 days
        week_ago = timezone.now() - timezone.timedelta(days=7)
        active_students = enrollments.filter(last_active__gte=week_ago).count()

        # Average band score
        avg_band = enrollments.aggregate(avg=Avg("current_band"))["avg"]

        # Assignment stats
        bundles = classroom.assignment_bundles.all()
        published_bundles = bundles.filter(status="PUBLISHED").count()

        # Pending reviews
        pending_reviews = StudentAssignment.objects.filter(
            bundle__classroom=classroom, status="PENDING_REVIEW"
        ).count()

        # Completion rate
        total_assignments = StudentAssignment.objects.filter(
            bundle__classroom=classroom
        ).count()
        completed_assignments = StudentAssignment.objects.filter(
            bundle__classroom=classroom, status="COMPLETED"
        ).count()
        completion_rate = (
            (completed_assignments / total_assignments * 100)
            if total_assignments > 0
            else 0
        )

        # Section averages
        section_averages = {
            "listening": float(
                enrollments.aggregate(avg=Avg("listening_band"))["avg"] or 0
            ),
            "reading": float(
                enrollments.aggregate(avg=Avg("reading_band"))["avg"] or 0
            ),
            "writing": float(
                enrollments.aggregate(avg=Avg("writing_band"))["avg"] or 0
            ),
            "speaking": float(
                enrollments.aggregate(avg=Avg("speaking_band"))["avg"] or 0
            ),
        }

        # Skill breakdown (placeholder for heatmap data)
        skill_breakdown = self._calculate_skill_breakdown(classroom)

        data = {
            "total_students": total_students,
            "active_students": active_students,
            "average_band": avg_band,
            "assignments_published": published_bundles,
            "pending_reviews": pending_reviews,
            "completion_rate": round(completion_rate, 1),
            "section_averages": section_averages,
            "skill_breakdown": skill_breakdown,
        }

        serializer = ClassroomAnalyticsSerializer(data)
        return Response(serializer.data)

    def _calculate_skill_breakdown(self, classroom):
        """Calculate skill breakdown for heatmap (placeholder)"""
        # This will be expanded in Phase 4 for analytics
        return {
            "matching_headings": {"average": 0, "count": 0},
            "multiple_choice": {"average": 0, "count": 0},
            "true_false_ng": {"average": 0, "count": 0},
            "fill_in_blanks": {"average": 0, "count": 0},
            "summary_completion": {"average": 0, "count": 0},
        }

    @action(detail=True, methods=["post"])
    def remove_student(self, request, pk=None):
        """Remove a student from the classroom"""
        classroom = self.get_object()
        student_id = request.data.get("student_id")

        if not student_id:
            return Response(
                {"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            enrollment = Enrollment.objects.get(
                classroom=classroom, student_id=student_id, status="ACTIVE"
            )
            enrollment.status = "REMOVED"
            enrollment.save(update_fields=["status", "updated_at"])
            return Response({"success": True})
        except Enrollment.DoesNotExist:
            return Response(
                {"error": "Student not found in this classroom"},
                status=status.HTTP_404_NOT_FOUND,
            )


# ============================================
# Enrollment ViewSet (Student Join)
# ============================================


class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing student enrollments.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "TEACHER":
            # Teachers see enrollments in their classrooms
            return Enrollment.objects.filter(classroom__teacher=user).select_related(
                "student", "classroom"
            )
        else:
            # Students see their own enrollments
            return Enrollment.objects.filter(student=user).select_related(
                "classroom", "classroom__teacher"
            )

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def join(self, request):
        """Join a classroom via invite code"""
        if request.user.role != "STUDENT":
            return Response(
                {"error": "Only students can join classrooms"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EnrollmentCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        enrollment = serializer.save()

        return Response(
            EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"])
    def my_classrooms(self, request):
        """Get student's enrolled classrooms"""
        if request.user.role != "STUDENT":
            return Response(
                {"error": "Only students can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN,
            )

        enrollments = Enrollment.objects.filter(
            student=request.user, status="ACTIVE"
        ).select_related("classroom", "classroom__teacher")

        serializer = EnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        """Student leaves a classroom"""
        enrollment = self.get_object()

        if enrollment.student != request.user:
            return Response(
                {"error": "Cannot leave someone else's enrollment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        enrollment.status = "LEFT"
        enrollment.save(update_fields=["status", "updated_at"])
        return Response({"success": True})

    @action(detail=True, methods=["post"])
    def update_notes(self, request, pk=None):
        """Teacher updates notes for a student"""
        enrollment = self.get_object()

        if enrollment.classroom.teacher != request.user:
            return Response(
                {"error": "Only the classroom teacher can update notes"},
                status=status.HTTP_403_FORBIDDEN,
            )

        notes = request.data.get("notes", "")
        enrollment.notes = notes
        enrollment.save(update_fields=["notes", "updated_at"])

        return Response(EnrollmentSerializer(enrollment).data)


# ============================================
# Public Join View (Magic Link)
# ============================================


class JoinClassroomView(APIView):
    """
    Public view for checking invite code validity.
    Actual joining requires authentication.
    """

    permission_classes = [AllowAny]

    def get(self, request, invite_code):
        """Check if invite code is valid and return classroom info"""
        try:
            classroom = Classroom.objects.get(invite_code=invite_code)
            can_accept, message = classroom.can_accept_student()

            return Response(
                {
                    "valid": can_accept,
                    "message": message if not can_accept else None,
                    "classroom": (
                        {
                            "name": classroom.name,
                            "teacher": classroom.teacher.get_full_name(),
                            "description": classroom.description,
                            "target_band": classroom.target_band,
                            "student_count": classroom.student_count,
                        }
                        if can_accept
                        else None
                    ),
                }
            )
        except Classroom.DoesNotExist:
            return Response(
                {"valid": False, "message": "Invalid invite code", "classroom": None},
                status=status.HTTP_404_NOT_FOUND,
            )


# ============================================
# Assignment Bundle ViewSet (Teacher)
# ============================================


class AssignmentBundleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing assignment bundles.
    Teachers create and manage bundles for their classrooms.
    """

    permission_classes = [IsAuthenticated, IsTeacher]

    def get_queryset(self):
        """Return bundles for teacher's classrooms"""
        queryset = (
            AssignmentBundle.objects.filter(classroom__teacher=self.request.user)
            .select_related("classroom", "created_by")
            .prefetch_related("items")
        )

        # Filter by classroom if provided
        classroom_id = self.request.query_params.get("classroom")
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)

        # Filter by status
        bundle_status = self.request.query_params.get("status")
        if bundle_status:
            queryset = queryset.filter(status=bundle_status)

        return queryset.order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return AssignmentBundleCreateSerializer
        if self.action == "list":
            return AssignmentBundleListSerializer
        return AssignmentBundleSerializer

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish the assignment bundle"""
        bundle = self.get_object()

        if bundle.status == "PUBLISHED":
            return Response(
                {"error": "Bundle is already published"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if bundle.items.count() == 0:
            return Response(
                {"error": "Cannot publish empty bundle. Add items first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bundle.publish()
        return Response(AssignmentBundleSerializer(bundle).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        """Close the assignment bundle"""
        bundle = self.get_object()
        bundle.status = "CLOSED"
        bundle.save(update_fields=["status", "updated_at"])
        return Response(AssignmentBundleSerializer(bundle).data)

    @action(detail=True, methods=["post"])
    def add_item(self, request, pk=None):
        """Add an item to the bundle"""
        bundle = self.get_object()

        if bundle.status != "DRAFT":
            return Response(
                {"error": "Can only add items to draft bundles"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BundleItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(bundle=bundle)

        return Response(BundleItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="remove_item/(?P<item_id>[^/.]+)")
    def remove_item(self, request, pk=None, item_id=None):
        """Remove an item from the bundle"""
        bundle = self.get_object()

        if bundle.status != "DRAFT":
            return Response(
                {"error": "Can only remove items from draft bundles"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = bundle.items.get(id=item_id)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except BundleItem.DoesNotExist:
            return Response(
                {"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["get"])
    def submissions(self, request, pk=None):
        """Get all student submissions for this bundle"""
        bundle = self.get_object()
        assignments = (
            StudentAssignment.objects.filter(bundle=bundle)
            .select_related("student")
            .order_by("-updated_at")
        )

        serializer = StudentAssignmentListSerializer(assignments, many=True)
        return Response(serializer.data)


# ============================================
# Grading ViewSet (Teacher Co-Pilot)
# ============================================


class GradingViewSet(viewsets.ViewSet):
    """
    ViewSet for the AI Co-Pilot grading interface.
    Teachers review AI-processed submissions and approve/override grades.
    """

    permission_classes = [IsAuthenticated, IsTeacher]

    @action(detail=False, methods=["get"])
    def queue(self, request):
        """Get the grading queue - submissions pending teacher review"""
        assignments = (
            StudentAssignment.objects.filter(
                bundle__classroom__teacher=request.user,
                status__in=["PENDING_REVIEW", "AI_PROCESSED"],
            )
            .select_related("bundle", "bundle__classroom", "student")
            .prefetch_related("item_submissions", "item_submissions__bundle_item")
            .order_by("submitted_at")
        )

        # Filter by classroom
        classroom_id = request.query_params.get("classroom")
        if classroom_id:
            assignments = assignments.filter(bundle__classroom_id=classroom_id)

        serializer = GradingQueueSerializer(assignments, many=True)
        return Response({"count": assignments.count(), "assignments": serializer.data})

    @action(detail=True, methods=["get"], url_path="detail")
    def grading_detail(self, request, pk=None):
        """Get detailed submission for grading"""
        assignment = get_object_or_404(
            StudentAssignment.objects.select_related(
                "bundle", "bundle__classroom", "student"
            ).prefetch_related("item_submissions", "item_submissions__bundle_item"),
            pk=pk,
            bundle__classroom__teacher=request.user,
        )

        serializer = StudentAssignmentSerializer(assignment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def grade(self, request, pk=None):
        """Submit grading decision (approve/override/return)"""
        assignment = get_object_or_404(
            StudentAssignment, pk=pk, bundle__classroom__teacher=request.user
        )

        serializer = TeacherGradeSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data["action"]
        score = serializer.validated_data.get("score")
        feedback = serializer.validated_data.get("feedback")

        if action_type == "approve":
            assignment.approve_ai_grade(request.user)
        elif action_type == "override":
            assignment.override_grade(request.user, score, feedback)
        elif action_type == "return":
            assignment.return_to_student(request.user, feedback)

        return Response(StudentAssignmentSerializer(assignment).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get grading statistics for the teacher"""
        teacher = request.user

        # Total pending
        pending = StudentAssignment.objects.filter(
            bundle__classroom__teacher=teacher, status="PENDING_REVIEW"
        ).count()

        # Graded today
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        graded_today = StudentAssignment.objects.filter(
            bundle__classroom__teacher=teacher, teacher_reviewed_at__gte=today_start
        ).count()

        # Average time to grade (placeholder)
        avg_grade_time = 0

        # Override rate
        total_graded = StudentAssignment.objects.filter(
            bundle__classroom__teacher=teacher,
            status="COMPLETED",
            teacher_reviewed_by=teacher,
        ).count()
        overridden = StudentAssignment.objects.filter(
            bundle__classroom__teacher=teacher,
            status="COMPLETED",
            score_overridden=True,
        ).count()
        override_rate = (overridden / total_graded * 100) if total_graded > 0 else 0

        return Response(
            {
                "pending_count": pending,
                "graded_today": graded_today,
                "avg_grade_time_minutes": avg_grade_time,
                "override_rate": round(override_rate, 1),
                "total_graded": total_graded,
            }
        )


# ============================================
# Student Assignment ViewSet (Student)
# ============================================


class StudentAssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for students to view and work on their assignments.
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get_queryset(self):
        user = self.request.user
        if user.role == "STUDENT":
            return (
                StudentAssignment.objects.filter(student=user)
                .select_related("bundle", "bundle__classroom")
                .prefetch_related("item_submissions")
            )
        elif user.role == "TEACHER":
            # Teachers can view assignments in their classrooms
            return StudentAssignment.objects.filter(
                bundle__classroom__teacher=user
            ).select_related("bundle", "bundle__classroom", "student")
        return StudentAssignment.objects.none()

    def get_serializer_class(self):
        if self.action == "list":
            return StudentAssignmentListSerializer
        return StudentAssignmentSerializer

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start working on an assignment"""
        assignment = self.get_object()

        if assignment.student != request.user:
            return Response(
                {"error": "Cannot start someone else's assignment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if assignment.status != "NOT_STARTED":
            return Response(
                {"error": "Assignment already started"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment.start()
        return Response(StudentAssignmentSerializer(assignment).data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        """Submit the assignment for grading"""
        assignment = self.get_object()

        if assignment.student != request.user:
            return Response(
                {"error": "Cannot submit someone else's assignment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if assignment.status not in ["NOT_STARTED", "IN_PROGRESS"]:
            return Response(
                {"error": "Assignment cannot be submitted in current state"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment.submit()

        # Trigger AI processing (async via Celery)
        from classroom.tasks import process_assignment_with_ai

        process_assignment_with_ai.delay(assignment.id)

        return Response(StudentAssignmentSerializer(assignment).data)

    @action(detail=True, methods=["post"])
    def save_item(self, request, pk=None):
        """Save progress on a specific item"""
        assignment = self.get_object()

        if assignment.student != request.user:
            return Response(
                {"error": "Cannot modify someone else's assignment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        item_id = request.data.get("item_id")
        if not item_id:
            return Response(
                {"error": "item_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create item submission
        try:
            bundle_item = BundleItem.objects.get(id=item_id, bundle=assignment.bundle)
        except BundleItem.DoesNotExist:
            return Response(
                {"error": "Item not found in this bundle"},
                status=status.HTTP_404_NOT_FOUND,
            )

        submission, created = StudentItemSubmission.objects.get_or_create(
            student_assignment=assignment,
            bundle_item=bundle_item,
            defaults={"status": "IN_PROGRESS", "started_at": timezone.now()},
        )

        # Update submission data
        serializer = StudentItemSubmissionCreateSerializer(
            submission, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()

        # Update word count for writing
        if submission.writing_answer:
            submission.word_count = len(submission.writing_answer.split())
            submission.save(update_fields=["word_count"])

        # Update assignment progress
        if assignment.status == "NOT_STARTED":
            assignment.start()

        return Response(StudentItemSubmissionSerializer(submission).data)


# ============================================
# Content Search ViewSet (For Bundle Builder)
# ============================================


class ContentSearchViewSet(viewsets.ViewSet):
    """
    ViewSet for searching available content to add to bundles.
    """

    permission_classes = [IsAuthenticated, IsTeacher]

    @action(detail=False, methods=["get"])
    def mock_exams(self, request):
        """Search mock exams"""
        from ielts.models import MockExam

        query = request.query_params.get("q", "")
        exam_type = request.query_params.get("type")
        difficulty = request.query_params.get("difficulty")

        exams = MockExam.objects.filter(is_active=True)

        if query:
            exams = exams.filter(
                Q(title__icontains=query) | Q(description__icontains=query)
            )
        if exam_type:
            exams = exams.filter(exam_type=exam_type)
        if difficulty:
            exams = exams.filter(difficulty_level=difficulty)

        exams = exams[:20]

        from .serializers import MockExamBasicSerializer

        return Response(MockExamBasicSerializer(exams, many=True).data)

    @action(detail=False, methods=["get"])
    def writing_tasks(self, request):
        """Search writing tasks"""
        from ielts.models import WritingTask

        query = request.query_params.get("q", "")
        task_type = request.query_params.get("type")

        tasks = WritingTask.objects.all()

        if query:
            tasks = tasks.filter(
                Q(topic__icontains=query) | Q(question__icontains=query)
            )
        if task_type:
            tasks = tasks.filter(task_type=task_type)

        tasks = tasks[:20]

        from .serializers import WritingTaskBasicSerializer

        return Response(WritingTaskBasicSerializer(tasks, many=True).data)

    @action(detail=False, methods=["get"])
    def speaking_topics(self, request):
        """Search speaking topics"""
        from ielts.models import SpeakingTopic

        query = request.query_params.get("q", "")
        part = request.query_params.get("part")

        topics = SpeakingTopic.objects.all()

        if query:
            topics = topics.filter(
                Q(title__icontains=query) | Q(description__icontains=query)
            )
        if part:
            topics = topics.filter(part_number=part)

        topics = topics[:20]

        from .serializers import SpeakingTopicBasicSerializer

        return Response(SpeakingTopicBasicSerializer(topics, many=True).data)

    @action(detail=False, methods=["get"])
    def reading_passages(self, request):
        """Search reading passages"""
        from ielts.models import ReadingPassage

        query = request.query_params.get("q", "")
        difficulty = request.query_params.get("difficulty")

        passages = ReadingPassage.objects.all()

        if query:
            passages = passages.filter(
                Q(title__icontains=query) | Q(summary__icontains=query)
            )
        if difficulty:
            passages = passages.filter(difficulty=difficulty)

        passages = passages[:20]

        from .serializers import ReadingPassageBasicSerializer

        return Response(ReadingPassageBasicSerializer(passages, many=True).data)

    @action(detail=False, methods=["get"])
    def listening_parts(self, request):
        """Search listening parts"""
        from ielts.models import ListeningPart

        query = request.query_params.get("q", "")
        part = request.query_params.get("part")

        parts = ListeningPart.objects.all()

        if query:
            parts = parts.filter(
                Q(title__icontains=query) | Q(description__icontains=query)
            )
        if part:
            parts = parts.filter(part_number=part)

        parts = parts[:20]

        from .serializers import ListeningPartBasicSerializer

        return Response(ListeningPartBasicSerializer(parts, many=True).data)

    @action(detail=False, methods=["get"])
    def teacher_exams(self, request):
        """Search teacher's own exams"""
        from teacher.models import TeacherExam

        query = request.query_params.get("q", "")

        exams = TeacherExam.objects.filter(teacher=request.user, status="PUBLISHED")

        if query:
            exams = exams.filter(
                Q(title__icontains=query) | Q(description__icontains=query)
            )

        exams = exams[:20]

        from .serializers import TeacherExamBasicSerializer

        return Response(TeacherExamBasicSerializer(exams, many=True).data)
