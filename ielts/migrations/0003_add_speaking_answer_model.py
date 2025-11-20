# Generated manually on 2025-11-19

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ielts", "0002_speakingquestion"),
    ]

    operations = [
        migrations.CreateModel(
            name="SpeakingAnswer",
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
                    "audio_file",
                    models.FileField(
                        help_text="Audio recording for this question",
                        upload_to="speaking_answers/",
                    ),
                ),
                (
                    "transcript",
                    models.TextField(
                        blank=True,
                        help_text="Transcript of the audio answer",
                        null=True,
                    ),
                ),
                (
                    "duration_seconds",
                    models.PositiveIntegerField(
                        blank=True,
                        help_text="Duration of the audio recording in seconds",
                        null=True,
                    ),
                ),
                (
                    "feedback",
                    models.JSONField(
                        blank=True,
                        help_text="AI feedback for this specific answer",
                        null=True,
                    ),
                ),
                ("submitted_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "question",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_answers",
                        to="ielts.speakingquestion",
                        verbose_name="Question",
                    ),
                ),
                (
                    "speaking_attempt",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="answers",
                        to="ielts.speakingattempt",
                        verbose_name="Speaking Attempt",
                    ),
                ),
            ],
            options={
                "verbose_name": "Speaking Answer",
                "verbose_name_plural": "Speaking Answers",
                "db_table": "speaking_answers",
                "ordering": ["question__order"],
            },
        ),
        migrations.AddIndex(
            model_name="speakinganswer",
            index=models.Index(
                fields=["speaking_attempt", "question"], name="speaking_an_speakin_idx"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="speakinganswer",
            unique_together={("speaking_attempt", "question")},
        ),
    ]
