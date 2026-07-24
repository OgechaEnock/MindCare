"""
Equivalent to routes/forumRoutes.js
"""
from flask import Blueprint, g, jsonify, request

from config import config
from db import query
from middleware.auth import authenticate_token
from services.moderation_service import moderate_text
from utils.encrypt import decrypt, encrypt

forum_bp = Blueprint("forum", __name__, url_prefix="/api/forum")


@forum_bp.post("/threads")
@authenticate_token
def create_thread():
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        body = data.get("body")
        category = data.get("category")
        user_id = g.user["id"]

        if not title or not body:
            return jsonify({"error": "Title and body are required"}), 400

        if len(title) < 5:
            return jsonify({"error": "Title must be at least 5 characters"}), 400

        if len(title) > 200:
            return jsonify({"error": "Title must be 200 characters or less"}), 400

        if len(body) < 10:
            return jsonify({"error": "Body must be at least 10 characters"}), 400

        if len(body) > 5000:
            return jsonify({"error": "Body must be 5000 characters or less"}), 400

        print("Moderating forum post...")

        combined_text = f"Title: {title}\n\nBody: {body}"
        moderation_result = moderate_text(combined_text)

        user_rows = query("SELECT name FROM users WHERE id=%s", (user_id,))
        author_name = user_rows[0]["name"] if user_rows else "Anonymous"

        approval_status = "approved"
        moderation_notes = None

        if not moderation_result["safety"]:
            print("Post rejected by moderation")
            return jsonify({
                "error": "Your post cannot be published",
                "reason": "Content did not pass safety checks",
                "message": "Please review our community guidelines and try again.",
                "categories": moderation_result.get("categories", []),
            }), 400

        if moderation_result.get("fallback"):
            approval_status = "pending"
            moderation_notes = "Moderation service unavailable - pending manual review"
            print("Using fallback moderation - post marked as pending")

        encrypted_title = encrypt(title)
        encrypted_body = encrypt(body)

        rows = query(
            """INSERT INTO forum_threads (user_id, title, body, category, author_name, approval_status, moderation_notes, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
               RETURNING id, created_at""",
            (user_id, encrypted_title, encrypted_body, category or "general", author_name, approval_status, moderation_notes),
        )

        thread_id = rows[0]["id"]

        try:
            query(
                """INSERT INTO notifications (user_id, type, message, related_id, created_at)
                   VALUES (%s, %s, %s, %s, NOW())""",
                (
                    user_id,
                    "forum_post_published" if approval_status == "approved" else "forum_post_pending",
                    f'Your post "{title}" has been published' if approval_status == "approved"
                    else f'Your post "{title}" is pending review',
                    thread_id,
                ),
            )
        except Exception as notif_err:
            print(f"Failed to create notification: {notif_err}")

        print(f"Post {approval_status} - ID: {thread_id}")

        if approval_status == "pending":
            return jsonify({
                "id": thread_id,
                "title": title,
                "body": body,
                "category": category or "general",
                "author_name": author_name,
                "approval_status": approval_status,
                "created_at": rows[0]["created_at"],
                "message": "Your post has been submitted and is pending review by moderators.",
                "warning": "Moderation service was temporarily unavailable.",
            }), 201

        return jsonify({
            "id": thread_id,
            "title": title,
            "body": body,
            "category": category or "general",
            "author_name": author_name,
            "approval_status": approval_status,
            "created_at": rows[0]["created_at"],
            "message": "Your post has been published successfully!",
        }), 201

    except Exception as err:
        print(f"Forum post error: {err}")
        return jsonify({"error": "Failed to create forum post"}), 500


@forum_bp.get("/threads")
@authenticate_token
def list_threads():
    try:
        rows = query(
            """SELECT id, title, body, category, author_name, approval_status, created_at, updated_at
               FROM forum_threads
               WHERE approval_status = 'approved'
               ORDER BY created_at DESC
               LIMIT 100"""
        )

        decrypted_posts = [
            {
                "id": row["id"],
                "title": decrypt(row["title"]),
                "body": decrypt(row["body"]),
                "category": row["category"],
                "author_name": row["author_name"] or "Anonymous",
                "approval_status": row["approval_status"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            for row in rows
        ]

        return jsonify(decrypted_posts)
    except Exception as err:
        print(f"Fetch posts error: {err}")
        return jsonify({"error": "Failed to fetch forum posts"}), 500


@forum_bp.delete("/threads/<int:thread_id>")
@authenticate_token
def delete_thread(thread_id):
    try:
        user_id = g.user["id"]

        print(f"Attempting to delete post {thread_id} by user {user_id}")

        post_rows = query("SELECT title, user_id FROM forum_threads WHERE id=%s", (thread_id,))

        if len(post_rows) == 0:
            print(f"Post {thread_id} not found")
            return jsonify({"error": "Post not found"}), 404

        if post_rows[0]["user_id"] != user_id:
            print(f"User {user_id} not authorized to delete post {thread_id}")
            return jsonify({"error": "You are not authorized to delete this post"}), 403

        title = decrypt(post_rows[0]["title"])

        delete_rows = query(
            "DELETE FROM forum_threads WHERE id=%s AND user_id=%s RETURNING id",
            (thread_id, user_id),
        )

        if len(delete_rows) == 0:
            print(f"Failed to delete post {thread_id}")
            return jsonify({"error": "Failed to delete post"}), 500

        print(f"Post {thread_id} deleted successfully")

        try:
            query(
                """INSERT INTO notifications (user_id, type, message, related_id, created_at)
                   VALUES (%s, %s, %s, %s, NOW())""",
                (user_id, "forum_post_deleted", f'Your post "{title}" has been deleted', None),
            )
            print(f"Delete notification created for user {user_id}")
        except Exception as notif_err:
            print(f"Failed to create notification: {notif_err}")

        return jsonify({"message": "Post deleted successfully", "id": thread_id})

    except Exception as err:
        print(f"Delete post error: {err}")
        payload = {"error": "Failed to delete post"}
        if config.NODE_ENV == "development":
            payload["details"] = str(err)
        return jsonify(payload), 500


@forum_bp.get("/threads/<int:thread_id>")
@authenticate_token
def get_thread(thread_id):
    try:
        rows = query(
            """SELECT id, title, body, category, author_name, approval_status, user_id, created_at, updated_at
               FROM forum_threads
               WHERE id=%s AND approval_status = 'approved'""",
            (thread_id,),
        )

        if len(rows) == 0:
            return jsonify({"error": "Post not found"}), 404

        row = rows[0]

        return jsonify({
            "id": row["id"],
            "title": decrypt(row["title"]),
            "body": decrypt(row["body"]),
            "category": row["category"],
            "author_name": row["author_name"] or "Anonymous",
            "approval_status": row["approval_status"],
            "is_author": row["user_id"] == g.user["id"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        })

    except Exception as err:
        print(f"Get post error: {err}")
        return jsonify({"error": "Failed to fetch post"}), 500