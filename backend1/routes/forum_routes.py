"""
Forum routes — JWT-authenticated, Marshmallow-validated, rate-limited.

Endpoints:
  GET  /api/forum/threads          – list approved threads (300/min/user)
  GET  /api/forum/threads/<id>     – single thread detail (300/min/user)
  POST /api/forum/threads          – create thread (100/min/user)
  DELETE /api/forum/threads/<id>   – delete own thread (300/min/user)
  GET  /api/forum/categories       – list categories (100/min/IP)
"""
from __future__ import annotations

from datetime import datetime

from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import get_jwt

from db import query
from extensions import limiter
from middleware.decorators import login_required
from schemas import FORUM_CATEGORIES, ForumThreadCreateSchema, PaginationSchema, validate_query, validate_request
from services.moderation_service import moderate_text
from utils.encrypt import decrypt, encrypt
from utils.logger import get_logger
from utils.responses import error_response, success_response

forum_bp = Blueprint("forum", __name__, url_prefix="/api/forum")
logger = get_logger(__name__)

_MAX_THREADS = 100  # hard cap per page


def _serialize_thread(row, requesting_user_id=None):
    """Decrypt + normalize a forum_threads row for JSON output."""
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "title": decrypt(row["title"]) if row["title"] else "",
        "body": decrypt(row["body"]) if row["body"] else "",
        "category": row["category"],
        "author_name": row["author_name"] or "Anonymous",
        "approval_status": row["approval_status"],
        "is_author": requesting_user_id is not None
        and row["user_id"] == requesting_user_id,
        "created_at": _iso(row["created_at"]),
        "updated_at": _iso(row["updated_at"]),
    }


def _iso(value):
    """Convert datetime/date/time to ISO string for JSON."""
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


@forum_bp.get("/threads")
@limiter.limit("300 per minute")
@validate_query(PaginationSchema)
@login_required
def list_threads():
    p = request.validated_query
    page = p["page"]
    limit = min(p["limit"], _MAX_THREADS)
    offset = (page - 1) * limit

    rows = query(
        """SELECT id, user_id, title, body, category, author_name,
                  approval_status, created_at, updated_at
           FROM forum_threads
           WHERE approval_status = 'approved'
           ORDER BY created_at DESC
           LIMIT %s OFFSET %s""",
        (limit, offset),
    )

    # Total count for pagination metadata
    total_rows = query("SELECT COUNT(*) as c FROM forum_threads WHERE approval_status = 'approved'")
    total = int(total_rows[0]["c"]) if total_rows else 0

    threads = [_serialize_thread(r, g_user_id()) for r in rows]
    resp = success_response(
        data=threads,
        message="Threads retrieved",
    )
    resp[0].headers["X-Page"] = str(page)
    resp[0].headers["X-Total-Pages"] = str(-(-total // limit)) if limit else "1"
    resp[0].headers["X-Total-Count"] = str(total)
    return resp


def g_user_id():
    from flask import g
    return getattr(g, "user_id", None)


@forum_bp.get("/threads/<int:thread_id>")
@limiter.limit("300 per minute")
@login_required
def get_thread(thread_id):
    rows = query(
        """SELECT id, user_id, title, body, category, author_name,
                  approval_status, created_at, updated_at
           FROM forum_threads
           WHERE id = %s AND approval_status = 'approved'""",
        (thread_id,),
    )
    if not rows:
        return error_response("Thread not found", status=404)

    thread = _serialize_thread(rows[0], g_user_id())
    return success_response(
        data=thread,
        message="Thread retrieved",
    )


@forum_bp.post("/threads")
@limiter.limit("100 per minute")
@validate_request(ForumThreadCreateSchema)
@login_required
def create_thread():
    data = request.validated
    user_id = g_user_id()
    title = data["title"]
    body = data["body"]
    category = data.get("category", "general")

    logger.info(
        "Moderating forum post",
        extra={"user_id": user_id, "title_len": len(title), "body_len": len(body)},
    )

    combined_text = f"Title: {title}\n\nBody: {body}"
    moderation_result = moderate_text(combined_text)

    # Fetch author name
    user_rows = query("SELECT name FROM users WHERE id = %s", (user_id,))
    author_name = user_rows[0]["name"] if user_rows else "Anonymous"

    approval_status = "approved"
    moderation_notes = None

    # ── Moderation: unsafe content ─────────────────────────────────────
    if not moderation_result.get("safety", True):
        logger.warning(
            "Forum post rejected by moderation",
            extra={
                "user_id": user_id,
                "categories": moderation_result.get("categories", []),
            },
        )
        response_body = {
            "success": False,
            "message": "Your post cannot be published",
            "errors": ["Content did not pass safety checks"],
            "categories": moderation_result.get("categories", []),
            "reason": moderation_result.get("reason", "Content safety check failed"),
        }
        response_body["data"] = None  # keep envelope consistent
        return jsonify(response_body), 400

    # ── Moderation: fallback (service unavailable) → pending review ─────
    if moderation_result.get("fallback"):
        approval_status = "pending"
        moderation_notes = "Moderation service unavailable - pending manual review"
        logger.warning(
            "Moderation fallback - post pending review",
            extra={"user_id": user_id},
        )

    enc_title = encrypt(title)
    enc_body = encrypt(body)

    rows = query(
        """INSERT INTO forum_threads
           (user_id, title, body, category, author_name,
            approval_status, moderation_notes, created_at, updated_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
           RETURNING id, created_at""",
        (user_id, enc_title, enc_body, category, author_name,
         approval_status, moderation_notes),
    )
    thread_id = rows[0]["id"]

    # Create notification
    try:
        if approval_status == "approved":
            query(
                """INSERT INTO notifications
                   (user_id, type, message, related_id, created_at)
                   VALUES (%s, %s, %s, %s, NOW())""",
                (user_id, "forum_post_published",
                 f"Your post has been published", thread_id),
            )
        else:
            query(
                """INSERT INTO notifications
                   (user_id, type, message, related_id, created_at)
                   VALUES (%s, %s, %s, %s, NOW())""",
                (user_id, "forum_post_pending",
                 f"Your post is pending review", thread_id),
            )
    except Exception as notif_err:
        logger.error(
            "Failed to create notification",
            extra={"error": str(notif_err), "user_id": user_id},
        )

    thread_data = {
        "id": thread_id,
        "title": title,
        "body": body,
        "category": category,
        "author_name": author_name,
        "approval_status": approval_status,
        "created_at": _iso(rows[0]["created_at"]),
    }

    if approval_status == "pending":
        from flask import make_response
        resp, status = (
            jsonify({
                "success": True,
                "message": "Your post has been submitted and is pending review by moderators.",
                "data": thread_data,
                "warning": "Moderation service was temporarily unavailable.",
            }),
            201,
        )
        return resp

    return success_response(
        data=thread_data,
        message="Your post has been published successfully!",
        status=201,
    )


@forum_bp.delete("/threads/<int:thread_id>")
@limiter.limit("300 per minute")
@login_required
def delete_thread(thread_id):
    user_id = int(g_user_id())

    post_rows = query(
        "SELECT title, user_id FROM forum_threads WHERE id = %s",
        (thread_id,),
    )
    if not post_rows:
        return error_response("Post not found", status=404)

    # IDOR protection: only the author OR admin/manager can delete
    user_role = g.user_role  # populated by login_required decorator
    if post_rows[0]["user_id"] != user_id and user_role not in ("admin", "manager"):
        logger.warning(
            "IDOR attempt — user tried to delete another user's thread",
            extra={"user_id": user_id, "thread_id": thread_id, "user_role": user_role},
        )
        return error_response("You are not authorized to delete this post", status=403)

    title = decrypt(post_rows[0]["title"]) if post_rows[0]["title"] else ""

    # Admin/manager can delete any post; author can only delete their own
    if user_role in ("admin", "manager"):
        delete_rows = query(
            "DELETE FROM forum_threads WHERE id = %s RETURNING id",
            (thread_id,),
        )
    else:
        delete_rows = query(
            "DELETE FROM forum_threads WHERE id = %s AND user_id = %s RETURNING id",
            (thread_id, user_id),
        )
    if not delete_rows:
        return error_response("Failed to delete post", status=500)

    # Create notification
    try:
        query(
            """INSERT INTO notifications
               (user_id, type, message, related_id, created_at)
               VALUES (%s, %s, %s, %s, NOW())""",
            (user_id, "forum_post_deleted",
             f"Your post has been deleted", None),
        )
    except Exception as notif_err:
        logger.error("Failed to create notification", extra={"error": str(notif_err)})

    return success_response(
        data={"id": thread_id},
        message="Post deleted successfully",
    )


@forum_bp.get("/categories")
@limiter.limit("100 per minute")
def list_categories():
    return success_response(
        data=sorted(FORUM_CATEGORIES),
        message="Forum categories retrieved",
    )
