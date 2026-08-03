"""
Profile routes — JWT-authenticated, Marshmallow-validated, rate-limited.

Endpoints:
  GET  /api/profile                       – user profile (300/min/user)
  GET  /api/profile/medical-history       – list history (300/min/user, paginated)
  GET  /api/profile/medical-history/<id>   – single entry (300/min/user)
  POST /api/profile/medical-history        – create entry (300/min/user)
  PUT  /api/profile/medical-history/<id>   – update entry (300/min/user)
  DELETE /api/profile/medical-history/<id> – delete entry (300/min/user)
"""
from __future__ import annotations

from flask import g, request

from db import query
from extensions import limiter
from middleware.decorators import login_required
from schemas import MedicalHistorySchema, PaginationSchema, validate_query, validate_request
from utils.encrypt import decrypt, encrypt
from utils.logger import get_logger
from utils.responses import error_response, success_response

profile_bp = __import__("flask").Blueprint("profile", __name__, url_prefix="/api/profile")
logger = get_logger(__name__)

_MAX_HISTORY = 100


def _iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _decrypt_history(row):
    return {
        "id": row["id"],
        "diagnosis": decrypt(row["diagnosis"]) if row["diagnosis"] else "",
        "conditions": decrypt(row["conditions"]) if row["conditions"] else "",
        "allergies": decrypt(row["allergies"]) if row["allergies"] else "",
        "notes": decrypt(row["notes"]) if row["notes"] else "",
        "created_at": _iso(row["created_at"]),
        "updated_at": _iso(row["updated_at"]),
    }


@profile_bp.get("")
@limiter.limit("300 per minute")
@login_required
def get_profile():
    user_id = g.user_id
    rows = query(
        "SELECT id, name, email, role, created_at FROM users WHERE id = %s",
        (user_id,),
    )
    if not rows:
        return error_response("User not found", status=404)
    user = rows[0]
    return success_response(
        data={
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "created_at": _iso(user["created_at"]),
        },
        message="Profile retrieved",
    )


@profile_bp.get("/medical-history")
@limiter.limit("300 per minute")
@validate_query(PaginationSchema)
@login_required
def list_medical_history():
    p = request.validated_query
    page = p["page"]
    limit = min(p["limit"], _MAX_HISTORY)
    offset = (page - 1) * limit
    user_id = g.user_id

    rows = query(
        """SELECT id, diagnosis, conditions, allergies, notes, created_at, updated_at
           FROM medical_history WHERE user_id = %s
           ORDER BY created_at DESC LIMIT %s OFFSET %s""",
        (user_id, limit, offset),
    )

    total_rows = query(
        "SELECT COUNT(*) as c FROM medical_history WHERE user_id = %s",
        (user_id,),
    )
    total = int(total_rows[0]["c"]) if total_rows else 0

    history = [_decrypt_history(r) for r in rows]
    resp = success_response(data=history, message="Medical history retrieved")
    resp[0].headers["X-Page"] = str(page)
    resp[0].headers["X-Total-Pages"] = str(-(-total // limit)) if limit else "1"
    resp[0].headers["X-Total-Count"] = str(total)
    return resp


@profile_bp.get("/medical-history/<int:history_id>")
@limiter.limit("300 per minute")
@login_required
def get_medical_history_entry(history_id):
    user_id = g.user_id
    rows = query(
        """SELECT id, diagnosis, conditions, allergies, notes, created_at, updated_at
           FROM medical_history WHERE id = %s AND user_id = %s""",
        (history_id, user_id),
    )
    if not rows:
        return error_response("Medical history entry not found", status=404)
    return success_response(data=_decrypt_history(rows[0]), message="Entry retrieved")


@profile_bp.post("/medical-history")
@limiter.limit("300 per minute")
@validate_request(MedicalHistorySchema)
@login_required
def add_medical_history():
    data = request.validated
    user_id = g.user_id

    enc_diagnosis = encrypt(data["diagnosis"]) if data.get("diagnosis") else None
    enc_conditions = encrypt(data["conditions"]) if data.get("conditions") else None
    enc_allergies = encrypt(data["allergies"]) if data.get("allergies") else None
    enc_notes = encrypt(data["notes"]) if data.get("notes") else None

    rows = query(
        """INSERT INTO medical_history
           (user_id, diagnosis, conditions, allergies, notes, created_at)
           VALUES (%s, %s, %s, %s, %s, NOW())
           RETURNING id, created_at""",
        (user_id, enc_diagnosis, enc_conditions, enc_allergies, enc_notes),
    )

    result = {
        "id": rows[0]["id"],
        "diagnosis": data.get("diagnosis") or "",
        "conditions": data.get("conditions") or "",
        "allergies": data.get("allergies") or "",
        "notes": data.get("notes") or "",
        "created_at": _iso(rows[0]["created_at"]),
    }
    return success_response(data=result, message="Medical history entry added successfully", status=201)


@profile_bp.put("/medical-history/<int:history_id>")
@limiter.limit("300 per minute")
@validate_request(MedicalHistorySchema)
@login_required
def update_medical_history(history_id):
    data = request.validated
    user_id = g.user_id

    existing = query(
        "SELECT id FROM medical_history WHERE id = %s AND user_id = %s",
        (history_id, user_id),
    )
    if not existing:
        return error_response("Medical history entry not found", status=404)

    enc_diagnosis = encrypt(data["diagnosis"]) if data.get("diagnosis") else None
    enc_conditions = encrypt(data["conditions"]) if data.get("conditions") else None
    enc_allergies = encrypt(data["allergies"]) if data.get("allergies") else None
    enc_notes = encrypt(data["notes"]) if data.get("notes") else None

    query(
        """UPDATE medical_history
           SET diagnosis = %s, conditions = %s, allergies = %s, notes = %s, updated_at = NOW()
           WHERE id = %s AND user_id = %s""",
        (enc_diagnosis, enc_conditions, enc_allergies, enc_notes, history_id, user_id),
    )
    return success_response(message="Medical history entry updated successfully")


@profile_bp.delete("/medical-history/<int:history_id>")
@limiter.limit("300 per minute")
@login_required
def delete_medical_history(history_id):
    rows = query(
        "DELETE FROM medical_history WHERE id = %s AND user_id = %s RETURNING id",
        (history_id, g.user_id),
    )
    if not rows:
        return error_response("Medical history entry not found", status=404)
    return success_response(message="Medical history entry deleted successfully")
