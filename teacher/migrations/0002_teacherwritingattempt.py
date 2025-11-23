# Generated manually for TeacherWritingAttempt model

import django.core.validators
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("teacher", "0001_initial"),
        ("ielts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="TeacherWritingAttempt",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "uuid",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        unique=True,
                        verbose_name="UUID",
                    ),
                ),
                (
                    "answer_text",
                    models.TextField(
                        help_text="Student's writing response",
                        verbose_name="Answer Text",
                    ),
                ),
                (
                    "word_count",
                    models.PositiveIntegerField(default=0, verbose_name="Word Count"),
                ),
                (
                    "score",
                    models.DecimalField(
                        blank=True,
                        decimal_places=1,
                        max_digits=3,
                        null=True,
                        validators=[
                            django.core.validators.MinValueValidator(0),
                            django.core.validators.MaxValueValidator(9),
                        ],
                        verbose_name="Score",
                    ),
                ),
                (
                    "feedback",
                    models.JSONField(
                        blank=True,
                        help_text="Detailed feedback from teacher on the writing task",
                        null=True,
                        verbose_name="Feedback",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Created At"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Updated At"),
                ),
                (
                    "exam_attempt",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="writing_attempts",
                        to="teacher.teacherexamattempt",
                        verbose_name="Exam Attempt",
                    ),
                ),
                (
                    "task",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="teacher_writing_attempts",
                        to="ielts.writingtask",
                        verbose_name="Writing Task",
                    ),
                ),
            ],
            options={
                "verbose_name": "Teacher Writing Attempt",
                "verbose_name_plural": "Teacher Writing Attempts",
                "db_table": "teacher_writing_attempts",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="teacherwritingattempt",
            index=models.Index(fields=["exam_attempt"], name="teacher_wri_exam_at_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="teacherwritingattempt",
            unique_together={("exam_attempt", "task")},
        ),
    ]
