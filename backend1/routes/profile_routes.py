"""
Equivalent to routes/profileRoutes.js
"""
from flask import Blueprint, g, jsonify, request

from db import query
from middleware.auth import authenticate_token
from utils.encrypt import decrypt, encrypt

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@profile_bp.get("/medical-history")
@authenticate_token
def list_medical_history():
    try:
        user_id = g.user["id"]

        rows = query(
            """SELECT id, diagnosis, conditions, allergies, notes, created_at, updated_at
               FROM medical_history
               WHERE user_id=%s
               ORDER BY created_at DESC""",
            (user_id,),
        )

        decrypted = [
            {
                "id": h["id"],
                "diagnosis": decrypt(h["diagnosis"]) if h["diagnosis"] else "",
                "conditions": decrypt(h["conditions"]) if h["conditions"] else "",
                "allergies": decrypt(h["allergies"]) if h["allergies"] else "",
                "notes": decrypt(h["notes"]) if h["notes"] else "",
                "created_at": h["created_at"],
                "updated_at": h["updated_at"],
            }
            for h in rows
        ]

        return jsonify(decrypted)
    except Exception as err:
        print(f"Get medical history error: {err}")
        return jsonify({"error": "Failed to fetch medical history"}), 500


@profile_bp.get("/medical-history/<int:history_id>")
@authenticate_token
def get_medical_history_entry(history_id):
    try:
        user_id = g.user["id"]

        rows = query(
            """SELECT id, diagnosis, conditions, allergies, notes, created_at, updated_at
               FROM medical_history
               WHERE id=%s AND user_id=%s""",
            (history_id, user_id),
        )

        if len(rows) == 0:
            return jsonify({"error": "Medical history entry not found"}), 404

        h = rows[0]
        return jsonify({
            "id": h["id"],
            "diagnosis": decrypt(h["diagnosis"]) if h["diagnosis"] else "",
            "conditions": decrypt(h["conditions"]) if h["conditions"] else "",
            "allergies": decrypt(h["allergies"]) if h["allergies"] else "",
            "notes": decrypt(h["notes"]) if h["notes"] else "",
            "created_at": h["created_at"],
            "updated_at": h["updated_at"],
        })
    except Exception as err:
        print(f"Get medical history entry error: {err}")
        return jsonify({"error": "Failed to fetch medical history entry"}), 500


@profile_bp.post("/medical-history")
@authenticate_token
def add_medical_history():
    try:
        data = request.get_json(silent=True) or {}
        diagnosis = data.get("diagnosis")
        conditions = data.get("conditions")
        allergies = data.get("allergies")
        notes = data.get("notes")
        user_id = g.user["id"]

        if not diagnosis and not conditions and not allergies and not notes:
            return jsonify({
                "error": "At least one field (diagnosis, conditions, allergies, or notes) is required"
            }), 400

        enc_diagnosis = encrypt(diagnosis) if diagnosis else None
        enc_conditions = encrypt(conditions) if conditions else None
        enc_allergies = encrypt(allergies) if allergies else None
        enc_notes = encrypt(notes) if notes else None

        rows = query(
            """INSERT INTO medical_history (user_id, diagnosis, conditions, allergies, notes, created_at)
               VALUES (%s, %s, %s, %s, %s, NOW())
               RETURNING id, created_at""",
            (user_id, enc_diagnosis, enc_conditions, enc_allergies, enc_notes),
        )

        return jsonify({
            "message": "Medical history entry added successfully",
            "id": rows[0]["id"],
            "created_at": rows[0]["created_at"],
        }), 201
    except Exception as err:
        print(f"Add medical history error: {err}")
        return jsonify({"error": "Failed to add medical history entry"}), 500


@profile_bp.put("/medical-history/<int:history_id>")
@authenticate_token
def update_medical_history(history_id):
    try:
        data = request.get_json(silent=True) or {}
        diagnosis = data.get("diagnosis")
        conditions = data.get("conditions")
        allergies = data.get("allergies")
        notes = data.get("notes")
        user_id = g.user["id"]

        existing = query(
            "SELECT id FROM medical_history WHERE id=%s AND user_id=%s",
            (history_id, user_id),
        )

        if len(existing) == 0:
            return jsonify({"error": "Medical history entry not found"}), 404

        enc_diagnosis = encrypt(diagnosis) if diagnosis else None
        enc_conditions = encrypt(conditions) if conditions else None
        enc_allergies = encrypt(allergies) if allergies else None
        enc_notes = encrypt(notes) if notes else None

        query(
            """UPDATE medical_history
               SET diagnosis=%s, conditions=%s, allergies=%s, notes=%s, updated_at=NOW()
               WHERE id=%s AND user_id=%s""",
            (enc_diagnosis, enc_conditions, enc_allergies, enc_notes, history_id, user_id),
        )

        return jsonify({"message": "Medical history entry updated successfully"})
    except Exception as err:
        print(f"Update medical history error: {err}")
        return jsonify({"error": "Failed to update medical history entry"}), 500


@profile_bp.delete("/medical-history/<int:history_id>")
@authenticate_token
def delete_medical_history(history_id):
    try:
        user_id = g.user["id"]

        rows = query(
            "DELETE FROM medical_history WHERE id=%s AND user_id=%s RETURNING id",
            (history_id, user_id),
        )

        if len(rows) == 0:
            return jsonify({"error": "Medical history entry not found"}), 404

        return jsonify({"message": "Medical history entry deleted successfully"})
    except Exception as err:
        print(f"Delete medical history error: {err}")
        return jsonify({"error": "Failed to delete medical history entry"}), 500


@profile_bp.get("")
@authenticate_token
def get_profile():
    try:
        user_id = g.user["id"]

        rows = query(
            "SELECT id, name, email, created_at FROM users WHERE id=%s",
            (user_id,),
        )

        if len(rows) == 0:
            return jsonify({"error": "User not found"}), 404

        return jsonify(rows[0])
    except Exception as err:
        print(f"Get profile error: {err}")
        return jsonify({"error": "Failed to fetch profile"}), 500