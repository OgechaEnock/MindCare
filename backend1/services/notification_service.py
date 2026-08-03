"""
Notification service — structured logging, parameterized queries.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from db import query
from utils.encrypt import decrypt
from utils.logger import get_logger

logger = get_logger(__name__)


def create_notification(user_id, notif_type, message, related_id=None, title=None):
    try:
        query(
            """INSERT INTO notifications
               (user_id, type, title, message, related_id, created_at)
               VALUES (%s, %s, %s, %s, %s, NOW())""",
            (user_id, notif_type, title or message, message, related_id),
        )
        logger.info(
            "Notification created",
            extra={"user_id": user_id, "type": notif_type, "related_id": related_id},
        )
    except Exception as error:
        logger.error(
            "Failed to create notification",
            extra={"user_id": user_id, "error": str(error)},
        )


def get_user_notifications(user_id, limit=50, offset=0):
    """Return paginated notifications for user_id."""
    try:
        return query(
            """SELECT id, type, title, message, related_id, is_read, created_at
               FROM notifications
               WHERE user_id = %s
               ORDER BY created_at DESC
               LIMIT %s OFFSET %s""",
            (user_id, limit, offset),
        )
    except Exception as error:
        logger.error("Failed to fetch notifications", extra={"user_id": user_id, "error": str(error)})
        return []


def mark_notification_as_read(notification_id, user_id):
    try:
        query(
            """UPDATE notifications SET is_read = true
               WHERE id = %s AND user_id = %s""",
            (notification_id, user_id),
        )
        logger.info(
            "Notification marked as read",
            extra={"user_id": user_id, "notification_id": notification_id},
        )
    except Exception as error:
        logger.error(
            "Failed to mark notification as read",
            extra={"user_id": user_id, "notification_id": notification_id, "error": str(error)},
        )


def check_medication_reminders():
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        logger.info("Checking medication reminders", extra={"current_time": current_time})

        rows = query(
            """SELECT m.id, m.user_id, m.name, m.dosage, m.reminder_times
               FROM medications m
               WHERE m.reminder_enabled = true
               AND m.reminder_times IS NOT NULL
               AND array_length(m.reminder_times, 1) > 0"""
        )

        for med in rows:
            reminder_times = med.get("reminder_times") or []
            if current_time in reminder_times:
                med_name = decrypt(med["name"]) if med["name"] else ""
                med_dosage = decrypt(med["dosage"]) if med["dosage"] else ""
                create_notification(
                    med["user_id"],
                    "medication_reminder",
                    f"Time to take {med_name} ({med_dosage})",
                    med["id"],
                )
                logger.info("Medication reminder sent",
                    extra={"user_id": med["user_id"], "med_id": med["id"]})
    except Exception as error:
        logger.error("Error checking medication reminders", extra={"error": str(error)})


def check_appointment_reminders():
    try:
        now = datetime.now()
        logger.info("Checking appointment reminders", extra={"time": now.isoformat()})

        tomorrow = now + timedelta(hours=24)
        tomorrow_date = tomorrow.date()
        tomorrow_hour = tomorrow.hour

        result_24h = query(
            """SELECT a.id, a.user_id, a.title, a.appointment_date, a.appointment_time
               FROM appointments a
               WHERE a.reminder_24h = true
               AND a.notified_24h = false
               AND a.appointment_date = %s
               AND EXTRACT(HOUR FROM a.appointment_time::time) = %s""",
            (tomorrow_date, tomorrow_hour),
        )

        for apt in result_24h:
            title = decrypt(apt["title"]) if apt["title"] else ""
            date_str = apt["appointment_date"].strftime("%m/%d/%Y") if apt.get("appointment_date") else ""
            create_notification(
                apt["user_id"], "appointment_reminder",
                f"{title} on {date_str} at {apt['appointment_time']}", apt["id"],
            )
            query("UPDATE appointments SET notified_24h = true WHERE id = %s", (apt["id"],))
            logger.info("24h reminder sent", extra={"user_id": apt["user_id"], "apt_id": apt["id"]})

        one_hour_later = now + timedelta(hours=1)
        one_hour_date = one_hour_later.date()
        one_hour_time = one_hour_later.strftime("%H:%M")

        result_1h = query(
            """SELECT a.id, a.user_id, a.title, a.appointment_date, a.appointment_time
               FROM appointments a
               WHERE a.reminder_1h = true
               AND a.notified_1h = false
               AND a.appointment_date = %s
               AND a.appointment_time::text LIKE %s""",
            (one_hour_date, one_hour_time + "%"),
        )

        for apt in result_1h:
            title = decrypt(apt["title"]) if apt["title"] else ""
            create_notification(
                apt["user_id"], "appointment_reminder",
                f"{title} at {apt['appointment_time']}", apt["id"],
            )
            query("UPDATE appointments SET notified_1h = true WHERE id = %s", (apt["id"],))
            logger.info("1h reminder sent", extra={"user_id": apt["user_id"], "apt_id": apt["id"]})

    except Exception as error:
        logger.error("Error checking appointment reminders", extra={"error": str(error)})