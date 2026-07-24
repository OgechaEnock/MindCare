"""
Equivalent to services/notificationService.js
"""
from datetime import datetime, timedelta

from db import query
from utils.encrypt import decrypt


def create_notification(user_id, notif_type, message, related_id=None):
    try:
        query(
            """INSERT INTO notifications (user_id, type, message, related_id, created_at)
               VALUES (%s, %s, %s, %s, NOW())""",
            (user_id, notif_type, message, related_id),
        )
        print(f"Notification created for user {user_id}: {notif_type}")
    except Exception as error:
        print(f"Error creating notification: {error}")


def get_user_notifications(user_id):
    try:
        return query(
            """SELECT * FROM notifications
               WHERE user_id = %s
               ORDER BY created_at DESC
               LIMIT 50""",
            (user_id,),
        )
    except Exception as error:
        print(f"Error fetching notifications: {error}")
        return []


def mark_notification_as_read(notification_id, user_id):
    try:
        query(
            """UPDATE notifications
               SET is_read = true
               WHERE id = %s AND user_id = %s""",
            (notification_id, user_id),
        )
    except Exception as error:
        print(f"Error marking notification as read: {error}")


def check_medication_reminders():
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")

        print(f"Checking medication reminders at {current_time}...")

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
                med_name = decrypt(med["name"])
                med_dosage = decrypt(med["dosage"])

                create_notification(
                    med["user_id"],
                    "medication_reminder",
                    f"Time to take {med_name} ({med_dosage})",
                    med["id"],
                )
                print(f"Sent medication reminder: {med_name} to user {med['user_id']}")
    except Exception as error:
        print(f"Error checking medication reminders: {error}")


def check_appointment_reminders():
    try:
        now = datetime.now()
        print(f"Checking appointment reminders at {now.isoformat()}...")

        # 24-hour reminders
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
            title = decrypt(apt["title"])
            date_str = apt["appointment_date"].strftime("%m/%d/%Y") if apt["appointment_date"] else ""

            create_notification(
                apt["user_id"],
                "appointment_reminder",
                f"{title} on {date_str} at {apt['appointment_time']}",
                apt["id"],
            )

            query("UPDATE appointments SET notified_24h = true WHERE id = %s", (apt["id"],))
            print(f"Sent 24h appointment reminder: {title} to user {apt['user_id']}")

        # 1-hour reminders
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
            title = decrypt(apt["title"])

            create_notification(
                apt["user_id"],
                "appointment_reminder",
                f"{title} at {apt['appointment_time']}",
                apt["id"],
            )

            query("UPDATE appointments SET notified_1h = true WHERE id = %s", (apt["id"],))
            print(f"Sent 1h appointment reminder: {title} to user {apt['user_id']}")
    except Exception as error:
        print(f"Error checking appointment reminders: {error}")