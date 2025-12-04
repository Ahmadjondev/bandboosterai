"""
Celery configuration for mockexam project.
"""

import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mockexam.settings")

app = Celery("mockexam")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat schedule for periodic tasks
app.conf.beat_schedule = {
    # Pre-compute analytics for active users every 6 hours
    "precompute-analytics-every-6-hours": {
        "task": "ielts.tasks.batch_precompute_active_users_analytics",
        "schedule": crontab(minute=0, hour="*/6"),  # Every 6 hours
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
