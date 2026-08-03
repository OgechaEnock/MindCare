"""
Notification routes — JWT-authenticated, rate-limited, paginated.

Endpoints:
  GET  /api/notifications              – list (300/min/user, paginated)
  GET  /api/notifications/unread-count – unread count (300/min/user)
  PUT  /api/notifications/<id>/read    – mark read (300/min/user)
  PUT  /api/notifications/mark-all-read – mark all read (300/min/user)
  DELETE /api/notifications/<id>       – delete (300/min/user)
"""
from __future__ import annotations

from flask import g, request

from db import query
from extensions import limiter
from middleware.decorators import login_required
from schemas import PaginationSchema, validate_query
from services.notification_service import get_user_notifications, mark_notification_as_read
from utils.logger import get_logger
from utils.responses import error_response, success_response

notification_bp = __import__("flask").Blueprint("notifications", __name__, url_prefix="/api/notifications")
logger = get_logger(__name__)

_MAX_NOTIFS = 100


def _iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


@notification_bp.get("")
@limiter.limit("300 per minute")
@validate_query(PaginationSchema)
@login_required
def list_notifications():
    p = request.validated_query
    page = p["page"]
    limit = min(p["limit"], _MAX_NOTIFS)
    offset = (page - 1) * limit

    notifications = get_user_notifications(g.user_id, limit, offset)
    total_rows = query(
        "SELECT COUNT(*) as c FROM notifications WHERE user_id = %s",
        (g.user_id,),
    )
    total = int(total_rows[0]["c"]) if total_rows else 0

    serialized = [
        {
            "id": n["id"],
            "type": n["type"],
            "title": n["title"],
            "message": n["message"],
            "related_id": n["related_id"],
            "is_read": n["is_read"],
            "created_at": _iso(n["created_at"]),
        }
        for n in notifications
    ]

    resp = success_response(data=serialized, message="Notifications retrieved")
    resp[0].headers["X-Page"] = str(page)
    resp[0].headers["X-Total-Pages"] = str(-(-total // limit)) if limit else "1"
    resp[0].headers["X-Total-Count"] = str(total)
    return resp


@notification_bp.get("/unread-count")
@limiter.limit("300 per minute")
@login_required
def unread_count():
    rows = query(
        "SELECT COUNT(*) as c FROM notifications WHERE user_id = %s AND is_read = false",
        (g.user_id,),
    )
    count = int(rows[0]["c"]) if rows else 0
    return success_response(data={"count": count}, message="Unread count retrieved")


@notification_bp.put("/<int:notif_id>/read")
@limiter.limit("300 per minute")
@login_required
def mark_read(notif_id):
    mark_notification_as_read(notif_id, g.user_id)
    return success_response(message="Notification marked as read")


@notification_bp.put("/mark-all-read")
@limiter.limit("300 per minute")
@login_required
def mark_all_read():
    query(
        "UPDATE notifications SET is_read = true WHERE user_id = %s",
        (g.user_id,),
    )
    return success_response(message="All notifications marked as read")


@notification_bp.delete("/<int:notif_id>")
@limiter.limit("300 per minute")
@login_required
def delete_notification(notif_id):
    rows = query(
        "DELETE FROM notifications WHERE id = %s AND user_id = %s RETURNING id",
        (notif_id, g.user_id),
    )
    if not rows:
        return error_response("Notification not found", status=404)
    return success_response(message="Notification deleted")
