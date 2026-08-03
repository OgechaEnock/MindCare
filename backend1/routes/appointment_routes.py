"""
Appointment routes — JWT-authenticated, Marshmallow-validated, rate-limited.

Endpoints:
  GET  /api/appointments                       – list (300/min/user, paginated)
  POST /api/appointments                       – create (300/min/user)
  DELETE /api/appointments/<id>                – delete (300/min/user)
  GET  /api/appointments/reminders/pending     – pending reminders (300/min/user)
  POST /api/appointments/reminders/<id>/mark-sent – mark sent (300/min/user)
"""
from __future__ import annotations

from flask import g, request
from flask_jwt_extended import get_jwt

from db import query
from extensions import limiter
from middleware.decorators import login_required
from schemas import AppointmentCreateSchema, PaginationSchema, validate_query, validate_request
from utils.encrypt import decrypt, encrypt
from utils.logger import get_logger
from utils.responses import error_response, success_response
from utils.time_utils import get_appointment_status

import datetime as _dt

appointment_bp = __import__("flask").Blueprint("appointments", __name__, url_prefix="/api/appointments")
logger = get_logger(__name__)

_MAX_APPTS = 100


def _iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


@appointment_bp.post("")
@limiter.limit("300 per minute")
@validate_request(AppointmentCreateSchema)
@login_required
def add_appointment():
    data = request.validated
    user_id = g.user_id

    enc_title = encrypt(data["title"])
    enc_notes = encrypt(data["notes"]) if data.get("notes") else None

    rows = query(
        """INSERT INTO appointments
           (user_id, title, appointment_date, appointment_time, notes,
            reminder_24h, reminder_1h, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
           RETURNING id, appointment_date, appointment_time, created_at""",
        (user_id, enc_title, data["appointment_date"], data["appointment_time"],
         enc_notes, data.get("reminder_24h", True), data.get("reminder_1h", True)),
    )
    appointment_id = rows[0]["id"]
    status = get_appointment_status(rows[0]["appointment_date"], rows[0]["appointment_time"])

    result = {
        "id": appointment_id,
        "title": data["title"],
        "appointment_date": _iso(rows[0]["appointment_date"]),
        "appointment_time": _iso(rows[0]["appointment_time"]),
        "notes": data.get("notes"),
        "reminder_24h": data.get("reminder_24h", True),
        "reminder_1h": data.get("reminder_1h", True),
        "status": status,
        "created_at": _iso(rows[0]["created_at"]),
    }

    if status == "Upcoming":
        try:
            query(
                """INSERT INTO notifications
                   (user_id, type, message, related_id, created_at)
                   VALUES (%s, %s, %s, %s, NOW())""",
                (user_id, "appointment_created",
                 f"New appointment created", appointment_id),
            )
        except Exception as notif_err:
            logger.error("Failed to create notification", extra={"error": str(notif_err)})

    logger.info("Appointment created", extra={"user_id": user_id, "appointment_id": appointment_id})
    return success_response(data=result, message="Appointment added successfully", status=201)


@appointment_bp.get("")
@limiter.limit("300 per minute")
@validate_query(PaginationSchema)
@login_required
def get_appointments():
    p = request.validated_query
    page = p["page"]
    limit = min(p["limit"], _MAX_APPTS)
    offset = (page - 1) * limit
    user_id = g.user_id

    rows = query(
        """SELECT id, title, appointment_date, appointment_time, notes,
                  reminder_24h, reminder_1h, notified_24h, notified_1h, created_at
           FROM appointments
           WHERE user_id = %s
           ORDER BY appointment_date ASC, appointment_time ASC
           LIMIT %s OFFSET %s""",
        (user_id, limit, offset),
    )

    total_rows = query(
        "SELECT COUNT(*) as c FROM appointments WHERE user_id = %s",
        (user_id,),
    )
    total = int(total_rows[0]["c"]) if total_rows else 0

    decrypted = []
    for row in rows:
        title = decrypt(row["title"])
        notes = decrypt(row["notes"]) if row["notes"] else None
        status = get_appointment_status(row["appointment_date"], row["appointment_time"])
        decrypted.append({
            "id": row["id"],
            "title": title,
            "appointment_date": _iso(row["appointment_date"]),
            "appointment_time": _iso(row["appointment_time"]),
            "notes": notes,
            "reminder_24h": row["reminder_24h"],
            "reminder_1h": row["reminder_1h"],
            "notified_24h": row["notified_24h"],
            "notified_1h": row["notified_1h"],
            "status": status,
            "created_at": _iso(row["created_at"]),
        })

    resp = success_response(data=decrypted, message="Appointments retrieved")
    resp[0].headers["X-Page"] = str(page)
    resp[0].headers["X-Total-Pages"] = str(-(-total // limit)) if limit else "1"
    resp[0].headers["X-Total-Count"] = str(total)
    return resp


@appointment_bp.get("/reminders/pending")
@limiter.limit("300 per minute")
@login_required
def get_pending_reminders():
    rows = query(
        """SELECT id, title, appointment_date, appointment_time,
                  reminder_24h, reminder_1h, notified_24h, notified_1h
           FROM appointments
           WHERE user_id = %s AND appointment_date >= CURRENT_DATE""",
        (g.user_id,),
    )
    serialized = [
        {
            "id": row["id"],
            "title": decrypt(row["title"]),
            "appointment_date": _iso(row["appointment_date"]),
            "appointment_time": _iso(row["appointment_time"]),
            "reminder_24h": row["reminder_24h"],
            "reminder_1h": row["reminder_1h"],
            "notified_24h": row["notified_24h"],
            "notified_1h": row["notified_1h"],
        }
        for row in rows
    ]
    return success_response(data=serialized, message="Pending reminders retrieved")


@appointment_bp.post("/reminders/<int:appt_id>/mark-sent")
@limiter.limit("300 per minute")
@login_required
def mark_reminder_sent(appt_id):
    data = request.get_json(silent=True) or {}
    reminder_type = data.get("type")
    user_id = g.user_id

    if reminder_type == "24h":
        query(
            "UPDATE appointments SET notified_24h = true WHERE id = %s AND user_id = %s",
            (appt_id, user_id),
        )
    elif reminder_type == "1h":
        query(
            "UPDATE appointments SET notified_1h = true WHERE id = %s AND user_id = %s",
            (appt_id, user_id),
        )
    else:
        return error_response("Invalid reminder type", status=400)

    return success_response(message="Reminder marked as sent")


@appointment_bp.delete("/<int:appt_id>")
@limiter.limit("300 per minute")
@login_required
def delete_appointment(appt_id):
    user_id = g.user_id

    appt_rows = query(
        "SELECT title, appointment_date, appointment_time FROM appointments WHERE id = %s AND user_id = %s",
        (appt_id, user_id),
    )
    if not appt_rows:
        return error_response("Appointment not found", status=404)

    title = decrypt(appt_rows[0]["title"]) if appt_rows[0]["title"] else ""
    status = get_appointment_status(
        appt_rows[0]["appointment_date"], appt_rows[0]["appointment_time"]
    )

    query(
        "DELETE FROM appointments WHERE id = %s AND user_id = %s RETURNING id",
        (appt_id, user_id),
    )

    if status == "Upcoming":
        try:
            query(
                """INSERT INTO notifications
                   (user_id, type, message, related_id, created_at)
                   VALUES (%s, %s, %s, %s, NOW())""",
                (user_id, "appointment_cancelled", f"Appointment cancelled", None),
            )
        except Exception as notif_err:
            logger.error("Failed to create notification", extra={"error": str(notif_err)})

    logger.info("Appointment deleted", extra={"user_id": user_id, "appointment_id": appt_id})
    return success_response(message="Appointment deleted successfully")
