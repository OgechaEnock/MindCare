"""
Scheduler — APScheduler background jobs for reminders.
"""
from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler

from services.notification_service import (
    check_appointment_reminders,
    check_medication_reminders,
)
from utils.logger import get_logger

logger = get_logger(__name__)
_scheduler = None


def initialize_scheduler():
    global _scheduler
    logger.info("Initializing notification scheduler")

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(check_medication_reminders, "cron", minute="*")
    _scheduler.add_job(check_appointment_reminders, "cron", minute=0)
    _scheduler.start()

    logger.info("Notification scheduler started", extra={
        "jobs": ["medication_reminders: every minute", "appointment_reminders: every hour"]
    })
    return _scheduler