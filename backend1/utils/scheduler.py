"""
Equivalent to utils/scheduler.js (node-cron -> APScheduler)
"""
from apscheduler.schedulers.background import BackgroundScheduler

from services.notification_service import (
    check_appointment_reminders,
    check_medication_reminders,
)

_scheduler = None


def initialize_scheduler():
    global _scheduler
    print("Initializing notification scheduler...")

    _scheduler = BackgroundScheduler()

    # Check medication reminders every minute
    _scheduler.add_job(check_medication_reminders, "cron", minute="*")

    # Check appointment reminders every hour
    _scheduler.add_job(check_appointment_reminders, "cron", minute=0)

    _scheduler.start()

    print("Notification scheduler started!")
    print("   - Medication reminders: Every minute")
    print("   - Appointment reminders: Every hour")

    return _scheduler