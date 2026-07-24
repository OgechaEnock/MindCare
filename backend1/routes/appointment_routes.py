"""
Equivalent to routes/appointmentRoutes.js
"""
from flask import Blueprint, g, jsonify, request

from db import query
from middleware.auth import authenticate_token
from utils.encrypt import decrypt, encrypt
from utils.time_utils import get_appointment_status

appointment_bp = Blueprint("appointments", __name__, url_prefix="/api/appointments")


def _iso_date(value):
    """Postgres DATE -> ISO string (e.g. '2026-07-25'). Flask's default
    JSON encoder handles date/datetime fine, but we normalize explicitly
    so the shape matches what the frontend previously got from Node."""
    return value.isoformat() if value is not None else None


def _iso_time(value):
    """Postgres TIME -> 'HH:MM:SS' string. psycopg2 returns TIME columns
    as datetime.time objects, which Flask's default JSON encoder cannot
    serialize at all (only date/datetime are supported) - this was the
    cause of the 500 error on every endpoint returning appointment_time."""
    return value.isoformat() if value is not None else None


@appointment_bp.post("")
@authenticate_token
def add_appointment():
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        appointment_date = data.get("appointment_date")
        appointment_time = data.get("appointment_time")
        notes = data.get("notes")
        reminder_24h = data.get("reminder_24h")
        reminder_1h = data.get("reminder_1h")
        user_id = g.user["id"]

        if not title or not appointment_date or not appointment_time:
            return jsonify({"error": "Title, date, and time are required"}), 400

        enc_title = encrypt(title)
        enc_notes = encrypt(notes) if notes else None

        # Default reminders to true if not specified
        enable_24h = reminder_24h is not False
        enable_1h = reminder_1h is not False

        rows = query(
            """INSERT INTO appointments (user_id, title, appointment_date, appointment_time, notes, reminder_24h, reminder_1h, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
               RETURNING id, appointment_date, appointment_time, created_at""",
            (user_id, enc_title, appointment_date, appointment_time, enc_notes, enable_24h, enable_1h),
        )

        appointment_id = rows[0]["id"]
        status = get_appointment_status(rows[0]["appointment_date"], rows[0]["appointment_time"])

        if status == "Upcoming":
            try:
                query(
                    """INSERT INTO notifications (user_id, type, message, related_id, created_at)
                       VALUES (%s, %s, %s, %s, NOW())""",
                    (
                        user_id,
                        "appointment_created",
                        f"New appointment: {title} on {appointment_date} at {appointment_time}",
                        appointment_id,
                    ),
                )
            except Exception as notif_err:
                print(f"Failed to create notification: {notif_err}")

        return jsonify({
            "message": "Appointment added successfully",
            "appointment": {
                "id": appointment_id,
                "title": title,
                "appointment_date": _iso_date(rows[0]["appointment_date"]),
                "appointment_time": _iso_time(rows[0]["appointment_time"]),
                "notes": notes,
                "reminder_24h": enable_24h,
                "reminder_1h": enable_1h,
                "status": status,
                "created_at": rows[0]["created_at"],
            },
        }), 201

    except Exception as err:
        print(f"Add appointment error: {err}")
        return jsonify({"error": "Failed to add appointment"}), 500


@appointment_bp.get("")
@authenticate_token
def get_appointments():
    try:
        user_id = g.user["id"]

        rows = query(
            """SELECT id, title, appointment_date, appointment_time, notes, reminder_24h, reminder_1h,
                      notified_24h, notified_1h, created_at
               FROM appointments
               WHERE user_id=%s
               ORDER BY appointment_date ASC, appointment_time ASC""",
            (user_id,),
        )

        decrypted = []
        for row in rows:
            title = decrypt(row["title"])
            notes = decrypt(row["notes"]) if row["notes"] else None
            status = get_appointment_status(row["appointment_date"], row["appointment_time"])

            decrypted.append({
                "id": row["id"],
                "title": title,
                "appointment_date": _iso_date(row["appointment_date"]),
                "appointment_time": _iso_time(row["appointment_time"]),
                "notes": notes,
                "reminder_24h": row["reminder_24h"],
                "reminder_1h": row["reminder_1h"],
                "notified_24h": row["notified_24h"],
                "notified_1h": row["notified_1h"],
                "status": status,
                "created_at": row["created_at"],
            })

        return jsonify(decrypted)
    except Exception as err:
        print(f"Fetch appointments error: {err}")
        return jsonify({"error": "Failed to fetch appointments"}), 500


@appointment_bp.get("/reminders/pending")
@authenticate_token
def get_pending_reminders():
    try:
        rows = query(
            """SELECT id, title, appointment_date, appointment_time, reminder_24h, reminder_1h, notified_24h, notified_1h
               FROM appointments
               WHERE user_id = %s AND appointment_date >= CURRENT_DATE""",
            (g.user["id"],),
        )
        serialized = [
            {**row, "appointment_date": _iso_date(row["appointment_date"]), "appointment_time": _iso_time(row["appointment_time"])}
            for row in rows
        ]
        return jsonify(serialized)
    except Exception as err:
        print(f"Get pending reminders error: {err}")
        return jsonify({"error": "Failed to get pending reminders"}), 500


@appointment_bp.post("/reminders/<int:appt_id>/mark-sent")
@authenticate_token
def mark_reminder_sent(appt_id):
    try:
        data = request.get_json(silent=True) or {}
        reminder_type = data.get("type")

        if reminder_type == "24h":
            query(
                "UPDATE appointments SET notified_24h = true WHERE id = %s AND user_id = %s",
                (appt_id, g.user["id"]),
            )
        elif reminder_type == "1h":
            query(
                "UPDATE appointments SET notified_1h = true WHERE id = %s AND user_id = %s",
                (appt_id, g.user["id"]),
            )

        return jsonify({"message": "Reminder marked as sent"})
    except Exception as err:
        print(f"Mark reminder as sent error: {err}")
        return jsonify({"error": "Failed to mark reminder as sent"}), 500


@appointment_bp.delete("/<int:appt_id>")
@authenticate_token
def delete_appointment(appt_id):
    try:
        user_id = g.user["id"]

        appt_rows = query(
            "SELECT title, appointment_date, appointment_time FROM appointments WHERE id=%s AND user_id=%s",
            (appt_id, user_id),
        )

        if len(appt_rows) == 0:
            return jsonify({"error": "Appointment not found"}), 404

        title = decrypt(appt_rows[0]["title"])
        status = get_appointment_status(appt_rows[0]["appointment_date"], appt_rows[0]["appointment_time"])

        query(
            "DELETE FROM appointments WHERE id=%s AND user_id=%s RETURNING id",
            (appt_id, user_id),
        )

        if status == "Upcoming":
            try:
                query(
                    """INSERT INTO notifications (user_id, type, message, related_id, created_at)
                       VALUES (%s, %s, %s, %s, NOW())""",
                    (user_id, "appointment_cancelled", f"Appointment cancelled: {title}", None),
                )
            except Exception as notif_err:
                print(f"Failed to create notification: {notif_err}")

        return jsonify({"message": "Appointment deleted successfully"})
    except Exception as err:
        print(f"Delete appointment error: {err}")
        return jsonify({"error": "Failed to delete appointment"}), 500