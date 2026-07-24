"""
Equivalent to routes/medicationRoutes.js
"""
from flask import Blueprint, g, jsonify, request

from db import query
from middleware.auth import authenticate_token
from utils.encrypt import decrypt, encrypt

medication_bp = Blueprint("medications", __name__, url_prefix="/api/medications")


@medication_bp.post("")
@authenticate_token
def add_medication():
    try:
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        dosage = data.get("dosage")
        frequency = data.get("frequency")
        reminder_enabled = data.get("reminderEnabled", False)
        reminder_times = data.get("reminderTimes", [])
        user_id = g.user["id"]

        if not name or not dosage or not frequency:
            return jsonify({"error": "All fields are required"}), 400

        enc_name = encrypt(name)
        enc_dosage = encrypt(dosage)
        enc_frequency = encrypt(frequency)

        rows = query(
            """INSERT INTO medications (user_id, name, dosage, frequency, reminder_enabled, reminder_times, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, NOW())
               RETURNING id, created_at""",
            (user_id, enc_name, enc_dosage, enc_frequency, bool(reminder_enabled), reminder_times or []),
        )

        return jsonify({
            "message": "Medication added successfully",
            "medication": {
                "id": rows[0]["id"],
                "name": name,
                "dosage": dosage,
                "frequency": frequency,
                "reminder_enabled": bool(reminder_enabled),
                "reminder_times": reminder_times or [],
                "created_at": rows[0]["created_at"],
            },
        }), 201

    except Exception as err:
        print(f"Add medication error: {err}")
        return jsonify({"error": "Failed to add medication"}), 500


@medication_bp.get("")
@authenticate_token
def get_medications():
    try:
        user_id = g.user["id"]

        rows = query(
            """SELECT id, name, dosage, frequency, reminder_enabled, reminder_times, created_at
               FROM medications WHERE user_id=%s ORDER BY created_at DESC""",
            (user_id,),
        )

        decrypted = [
            {
                "id": row["id"],
                "name": decrypt(row["name"]),
                "dosage": decrypt(row["dosage"]),
                "frequency": decrypt(row["frequency"]),
                "reminder_enabled": row["reminder_enabled"],
                "reminder_times": row["reminder_times"] or [],
                "created_at": row["created_at"],
            }
            for row in rows
        ]

        return jsonify(decrypted)
    except Exception as err:
        print(f"Fetch medications error: {err}")
        return jsonify({"error": "Failed to fetch medications"}), 500


@medication_bp.put("/<int:med_id>/reminders")
@authenticate_token
def update_medication_reminders(med_id):
    try:
        data = request.get_json(silent=True) or {}
        reminder_enabled = data.get("reminderEnabled")
        reminder_times = data.get("reminderTimes")
        user_id = g.user["id"]

        rows = query(
            """UPDATE medications
               SET reminder_enabled = %s, reminder_times = %s
               WHERE id = %s AND user_id = %s
               RETURNING id""",
            (reminder_enabled, reminder_times, med_id, user_id),
        )

        if len(rows) == 0:
            return jsonify({"error": "Medication not found"}), 404

        return jsonify({
            "message": "Reminder settings updated successfully",
            "reminder_enabled": reminder_enabled,
            "reminder_times": reminder_times,
        })
    except Exception as err:
        print(f"Update reminder error: {err}")
        return jsonify({"error": "Failed to update reminder settings"}), 500


@medication_bp.delete("/<int:med_id>")
@authenticate_token
def delete_medication(med_id):
    try:
        user_id = g.user["id"]

        rows = query(
            "DELETE FROM medications WHERE id=%s AND user_id=%s RETURNING id",
            (med_id, user_id),
        )

        if len(rows) == 0:
            return jsonify({"error": "Medication not found"}), 404

        return jsonify({"message": "Medication deleted successfully"})
    except Exception as err:
        print(f"Delete medication error: {err}")
        return jsonify({"error": "Failed to delete medication"}), 500