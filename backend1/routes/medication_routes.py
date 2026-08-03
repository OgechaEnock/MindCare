"""
Medication routes — JWT-authenticated, Marshmallow-validated, rate-limited.

Endpoints:
  GET  /api/medications                     – list (300/min/user, paginated)
  POST /api/medications                     – create (300/min/user)
  PUT  /api/medications/<id>/reminders      – update reminders (300/min/user)
  DELETE /api/medications/<id>             – delete (300/min/user)
"""
from __future__ import annotations

from flask import g, request
from flask_jwt_extended import get_jwt

from db import query
from extensions import limiter
from middleware.decorators import login_required
from schemas import MedicationCreateSchema, MedicationReminderSchema, PaginationSchema, validate_query, validate_request
from utils.encrypt import decrypt, encrypt
from utils.logger import get_logger
from utils.responses import error_response, success_response

medication_bp = __import__("flask").Blueprint("medications", __name__, url_prefix="/api/medications")
logger = get_logger(__name__)

_MAX_MEDS = 100


def _iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


@medication_bp.post("")
@limiter.limit("300 per minute")
@validate_request(MedicationCreateSchema)
@login_required
def add_medication():
    data = request.validated
    user_id = g.user_id

    enc_name = encrypt(data["name"])
    enc_dosage = encrypt(data["dosage"])
    enc_frequency = encrypt(data["frequency"])
    reminder_times = data.get("reminder_times", [])

    rows = query(
        """INSERT INTO medications
           (user_id, name, dosage, frequency, reminder_enabled, reminder_times, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, NOW())
           RETURNING id, created_at""",
        (user_id, enc_name, enc_dosage, enc_frequency,
         data.get("reminder_enabled", False), reminder_times),
    )

    result = {
        "id": rows[0]["id"],
        "name": data["name"],
        "dosage": data["dosage"],
        "frequency": data["frequency"],
        "reminder_enabled": data.get("reminder_enabled", False),
        "reminder_times": reminder_times,
        "created_at": _iso(rows[0]["created_at"]),
    }
    logger.info("Medication created", extra={"user_id": user_id, "med_id": rows[0]["id"]})
    return success_response(data=result, message="Medication added successfully", status=201)


@medication_bp.get("")
@limiter.limit("300 per minute")
@validate_query(PaginationSchema)
@login_required
def get_medications():
    p = request.validated_query
    page = p["page"]
    limit = min(p["limit"], _MAX_MEDS)
    offset = (page - 1) * limit
    user_id = g.user_id

    rows = query(
        """SELECT id, name, dosage, frequency, reminder_enabled, reminder_times, created_at
           FROM medications WHERE user_id = %s
           ORDER BY created_at DESC LIMIT %s OFFSET %s""",
        (user_id, limit, offset),
    )

    total_rows = query(
        "SELECT COUNT(*) as c FROM medications WHERE user_id = %s",
        (user_id,),
    )
    total = int(total_rows[0]["c"]) if total_rows else 0

    decrypted = [
        {
            "id": row["id"],
            "name": decrypt(row["name"]),
            "dosage": decrypt(row["dosage"]),
            "frequency": decrypt(row["frequency"]),
            "reminder_enabled": row["reminder_enabled"],
            "reminder_times": row["reminder_times"] or [],
            "created_at": _iso(row["created_at"]),
        }
        for row in rows
    ]

    resp = success_response(data=decrypted, message="Medications retrieved")
    resp[0].headers["X-Page"] = str(page)
    resp[0].headers["X-Total-Pages"] = str(-(-total // limit)) if limit else "1"
    resp[0].headers["X-Total-Count"] = str(total)
    return resp


@medication_bp.put("/<int:med_id>/reminders")
@limiter.limit("300 per minute")
@validate_request(MedicationReminderSchema)
@login_required
def update_medication_reminders(med_id):
    data = request.validated
    user_id = g.user_id

    rows = query(
        """UPDATE medications
           SET reminder_enabled = %s, reminder_times = %s
           WHERE id = %s AND user_id = %s
           RETURNING id, reminder_enabled, reminder_times""",
        (data.get("reminder_enabled"), data.get("reminder_times", []), med_id, user_id),
    )
    if not rows:
        return error_response("Medication not found", status=404)

    return success_response(
        data={
            "reminder_enabled": rows[0]["reminder_enabled"],
            "reminder_times": rows[0]["reminder_times"] or [],
        },
        message="Reminder settings updated successfully",
    )


@medication_bp.delete("/<int:med_id>")
@limiter.limit("300 per minute")
@login_required
def delete_medication(med_id):
    rows = query(
        "DELETE FROM medications WHERE id = %s AND user_id = %s RETURNING id",
        (med_id, g.user_id),
    )
    if not rows:
        return error_response("Medication not found", status=404)
    return success_response(message="Medication deleted successfully")
