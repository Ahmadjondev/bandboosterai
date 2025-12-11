"""
BandBooster Classroom Command: Celery Tasks

Background tasks for AI grading and processing of student submissions.
"""

from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_assignment_with_ai(self, assignment_id):
    """
    Process a student assignment with AI grading.

    This task:
    1. Retrieves the student assignment
    2. Processes each item submission (writing tasks get AI feedback)
    3. Calculates tentative scores
    4. Updates assignment status to AI_PROCESSED or PENDING_REVIEW
    """
    from classroom.models import StudentAssignment, StudentItemSubmission
    from ai.writing_checker import check_writing

    try:
        assignment = (
            StudentAssignment.objects.select_related("bundle")
            .prefetch_related("item_submissions", "item_submissions__bundle_item")
            .get(id=assignment_id)
        )

        logger.info(
            f"Processing assignment {assignment_id} for student {assignment.student_id}"
        )

        # Get teacher instructions for AI context
        teacher_instructions = assignment.bundle.teacher_instructions

        # Process each item submission
        total_score = 0
        item_count = 0
        ai_feedback_collection = []

        for submission in assignment.item_submissions.all():
            item = submission.bundle_item

            if item.item_type == "WRITING_TASK" and submission.writing_answer:
                # Process writing with AI
                result = process_writing_submission(submission, teacher_instructions)
                if result:
                    ai_feedback_collection.append(
                        {
                            "item_id": item.id,
                            "item_type": "WRITING_TASK",
                            "score": (
                                float(result["score"]) if result.get("score") else None
                            ),
                            "feedback": result.get("feedback"),
                        }
                    )
                    if result.get("score"):
                        total_score += float(result["score"])
                        item_count += 1

            elif item.item_type in ["READING_PASSAGE", "LISTENING_PART"]:
                # Auto-grade reading/listening based on answers
                result = process_objective_submission(submission)
                if result:
                    ai_feedback_collection.append(
                        {
                            "item_id": item.id,
                            "item_type": item.item_type,
                            "score": result.get("score"),
                            "correct": result.get("correct"),
                            "total": result.get("total"),
                        }
                    )
                    if result.get("band_score"):
                        total_score += result["band_score"]
                        item_count += 1

        # Calculate tentative overall score
        tentative_score = round(total_score / item_count, 1) if item_count > 0 else None

        # Update assignment with AI results
        assignment.mark_ai_processed(
            ai_feedback=ai_feedback_collection, tentative_score=tentative_score
        )

        logger.info(
            f"Assignment {assignment_id} processed. Tentative score: {tentative_score}"
        )

        return {
            "assignment_id": assignment_id,
            "tentative_score": tentative_score,
            "items_processed": item_count,
        }

    except StudentAssignment.DoesNotExist:
        logger.error(f"Assignment {assignment_id} not found")
        return {"error": "Assignment not found"}
    except Exception as e:
        logger.exception(f"Error processing assignment {assignment_id}: {e}")
        # Retry on failure
        self.retry(exc=e, countdown=60)


def process_writing_submission(submission, teacher_instructions=None):
    """
    Process a writing submission with AI.

    Uses the existing writing_checker module with optional teacher instructions.
    """
    from ai.writing_checker import check_writing
    from classroom.models import StudentItemSubmission

    try:
        writing_answer = submission.writing_answer
        if not writing_answer or len(writing_answer.strip()) < 50:
            return None

        # Get writing task details
        writing_task = submission.bundle_item.writing_task
        if not writing_task:
            return None

        # Build prompt with teacher instructions
        task_type = writing_task.task_type  # TASK_1 or TASK_2
        question = writing_task.question or writing_task.topic

        # Call AI writing checker
        result = check_writing(
            essay_text=writing_answer,
            task_type=task_type,
            question=question,
            teacher_instructions=teacher_instructions,  # Pass to AI
        )

        if result:
            # Update submission with AI feedback
            submission.ai_feedback = result.get("feedback", {})
            submission.ai_inline_corrections = result.get("inline", "")
            submission.band_score = result.get("band_score")
            submission.status = "AI_GRADED"
            submission.save()

            return {
                "score": result.get("band_score"),
                "feedback": result,
            }

        return None

    except Exception as e:
        logger.exception(f"Error processing writing submission {submission.id}: {e}")
        return None


def process_objective_submission(submission):
    """
    Auto-grade reading/listening submission based on correct answers.
    """
    from classroom.models import StudentItemSubmission
    from ielts.models import Question

    try:
        answers_json = submission.answers_json
        if not answers_json:
            return None

        item = submission.bundle_item
        correct_count = 0
        total_count = 0

        # Get questions based on item type
        if item.item_type == "READING_PASSAGE" and item.reading_passage:
            questions = Question.objects.filter(
                test_head__reading_passage=item.reading_passage
            )
        elif item.item_type == "LISTENING_PART" and item.listening_part:
            questions = Question.objects.filter(
                test_head__listening_part=item.listening_part
            )
        else:
            return None

        # Check each answer
        for question in questions:
            total_count += 1
            question_id = str(question.id)
            user_answer = answers_json.get(question_id, "").strip().lower()
            correct_answer = question.get_correct_answer()

            if correct_answer:
                correct_answers = [a.strip().lower() for a in correct_answer.split("|")]
                if user_answer in correct_answers:
                    correct_count += 1

        if total_count == 0:
            return None

        # Calculate score percentage and convert to band
        percentage = correct_count / total_count * 100
        band_score = percentage_to_band(percentage)

        # Update submission
        submission.score = correct_count
        submission.max_score = total_count
        submission.band_score = band_score
        submission.status = "AI_GRADED"
        submission.save()

        return {
            "correct": correct_count,
            "total": total_count,
            "percentage": percentage,
            "band_score": band_score,
            "score": band_score,
        }

    except Exception as e:
        logger.exception(f"Error processing objective submission {submission.id}: {e}")
        return None


def percentage_to_band(percentage):
    """
    Convert percentage score to IELTS band score.
    This is an approximation based on IELTS scoring guidelines.
    """
    if percentage >= 89:
        return 9.0
    elif percentage >= 83:
        return 8.5
    elif percentage >= 76:
        return 8.0
    elif percentage >= 70:
        return 7.5
    elif percentage >= 63:
        return 7.0
    elif percentage >= 56:
        return 6.5
    elif percentage >= 50:
        return 6.0
    elif percentage >= 43:
        return 5.5
    elif percentage >= 36:
        return 5.0
    elif percentage >= 30:
        return 4.5
    elif percentage >= 23:
        return 4.0
    elif percentage >= 17:
        return 3.5
    elif percentage >= 10:
        return 3.0
    else:
        return 2.5


@shared_task
def update_student_band_scores(classroom_id):
    """
    Update estimated band scores for all students in a classroom
    based on their assignment performance.
    """
    from classroom.models import Classroom, Enrollment, StudentAssignment
    from django.db.models import Avg

    try:
        classroom = Classroom.objects.get(id=classroom_id)
        enrollments = classroom.enrollments.filter(status="ACTIVE")

        for enrollment in enrollments:
            student = enrollment.student

            # Get completed assignments in this classroom
            assignments = StudentAssignment.objects.filter(
                bundle__classroom=classroom,
                student=student,
                status="COMPLETED",
                band_score__isnull=False,
            )

            if assignments.exists():
                # Calculate average band score
                avg_band = assignments.aggregate(avg=Avg("band_score"))["avg"]
                if avg_band:
                    enrollment.current_band = (
                        round(float(avg_band) * 2) / 2
                    )  # Round to 0.5
                    enrollment.save(update_fields=["current_band", "updated_at"])

        logger.info(f"Updated band scores for classroom {classroom_id}")

    except Classroom.DoesNotExist:
        logger.error(f"Classroom {classroom_id} not found")
    except Exception as e:
        logger.exception(
            f"Error updating band scores for classroom {classroom_id}: {e}"
        )


@shared_task
def send_assignment_notification(assignment_id, notification_type):
    """
    Send notification to student about assignment updates.
    notification_type: 'published', 'graded', 'returned', 'due_reminder'
    """
    from classroom.models import StudentAssignment

    try:
        assignment = StudentAssignment.objects.select_related(
            "student", "bundle", "bundle__classroom"
        ).get(id=assignment_id)

        student = assignment.student
        bundle = assignment.bundle

        # TODO: Implement notification sending (email, push, telegram)
        # This is a placeholder for the notification system

        logger.info(
            f"Notification '{notification_type}' sent to {student.username} "
            f"for assignment {bundle.title}"
        )

    except StudentAssignment.DoesNotExist:
        logger.error(f"Assignment {assignment_id} not found for notification")
