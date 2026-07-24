"""
Equivalent to routes/notificationRoutes.js
"""
from flask import Blueprint, g, jsonify, request

from db import query
from middleware.auth import authenticate_token
from services.notification_service import get_user_notifications, mark_notification_as_read

notification_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notification_bp.get("")
@authenticate_token
def list_notifications():
    try:
        notifications = get_user_notifications(g.user["id"])
        return jsonify(notifications)
    except Exception as err:
        print(f"Get notifications error: {err}")
        return jsonify({"error": "Failed to fetch notifications"}), 500


@notification_bp.get("/unread-count")
@authenticate_token
def unread_count():
    try:
        rows = query(
            "SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = false",
            (g.user["id"],),
        )
        return jsonify({"count": int(rows[0]["count"])})
    except Exception as err:
        print(f"Get unread count error: {err}")
        return jsonify({"error": "Failed to get unread count"}), 500


@notification_bp.put("/<int:notif_id>/read")
@authenticate_token
def mark_read(notif_id):
    try:
        mark_notification_as_read(notif_id, g.user["id"])
        return jsonify({"message": "Notification marked as read"})
    except Exception as err:
        print(f"Mark notification as read error: {err}")
        return jsonify({"error": "Failed to mark notification as read"}), 500


@notification_bp.put("/mark-all-read")
@authenticate_token
def mark_all_read():
    try:
        query(
            "UPDATE notifications SET is_read = true WHERE user_id = %s",
            (g.user["id"],),
        )
        return jsonify({"message": "All notifications marked as read"})
    except Exception as err:
        print(f"Mark all read error: {err}")
        return jsonify({"error": "Failed to mark all notifications as read"}), 500


@notification_bp.delete("/<int:notif_id>")
@authenticate_token
def delete_notification(notif_id):
    try:
        rows = query(
            "DELETE FROM notifications WHERE id = %s AND user_id = %s RETURNING id",
            (notif_id, g.user["id"]),
        )

        if len(rows) == 0:
            return jsonify({"error": "Notification not found"}), 404

        return jsonify({"message": "Notification deleted"})
    except Exception as err:
        print(f"Delete notification error: {err}")
        return jsonify({"error": "Failed to delete notification"}), 500