import express from "express";
import pool from "../config/db.js";
import { encrypt, decrypt } from "../utils/encrypt.js";
import { moderateText } from "../services/moderationService.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

// create forum post
router.post("/threads", authenticateToken, async (req, res) => {
  try {
    const { title, body, category } = req.body;
    const user_id = req.user.id;

    // Validation
    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    if (title.length < 5) {
      return res.status(400).json({ error: "Title must be at least 5 characters" });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: "Title must be 200 characters or less" });
    }

    if (body.length < 10) {
      return res.status(400).json({ error: "Body must be at least 10 characters" });
    }

    if (body.length > 5000) {
      return res.status(400).json({ error: "Body must be 5000 characters or less" });
    }

    console.log(" Moderating forum post...");

    // CRITICAL: Moderate content using LLM API
    const combinedText = `Title: ${title}\n\nBody: ${body}`;
    let moderationResult;

    // The moderateText function now handles fallback internally
    moderationResult = await moderateText(combinedText);

    // Get user info for author name
    const userResult = await pool.query(
      "SELECT name FROM users WHERE id=$1",
      [user_id]
    );
    const authorName = userResult.rows[0]?.name || "Anonymous";

    // Determine approval status
    let approvalStatus = 'approved';
    let moderationNotes = null;

    // Check if content passed moderation
    if (!moderationResult.safety) {
      console.log("Post rejected by moderation");
      
      return res.status(400).json({
        error: "Your post cannot be published",
        reason: "Content did not pass safety checks",
        message: "Please review our community guidelines and try again.",
        categories: moderationResult.categories || []
      });
    }

    // If fallback was used, mark for manual review
    if (moderationResult.fallback) {
      approvalStatus = 'pending';
      moderationNotes = 'Moderation service unavailable - pending manual review';
      console.log("Using fallback moderation - post marked as pending");
    }

    // Content is safe - encrypt and save
    const encryptedTitle = encrypt(title);
    const encryptedBody = encrypt(body);

    const result = await pool.query(
      `INSERT INTO forum_threads (user_id, title, body, category, author_name, approval_status, moderation_notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
       RETURNING id, created_at`,
      [user_id, encryptedTitle, encryptedBody, category || 'general', authorName, approvalStatus, moderationNotes]
    );

    const threadId = result.rows[0].id;

    // Create notification for successful post
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, related_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          user_id,
          approvalStatus === 'approved' ? 'forum_post_published' : 'forum_post_pending',
          approvalStatus === 'approved' 
            ? `Your post "${title}" has been published`
            : `Your post "${title}" is pending review`,
          threadId
        ]
      );
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr.message);
    }

    console.log(`Post ${approvalStatus} - ID: ${threadId}`);

    // Return response based on approval status
    if (approvalStatus === 'pending') {
      return res.status(201).json({
        id: threadId,
        title,
        body,
        category: category || 'general',
        author_name: authorName,
        approval_status: approvalStatus,
        created_at: result.rows[0].created_at,
        message: 'Your post has been submitted and is pending review by moderators.',
        warning: 'Moderation service was temporarily unavailable.'
      });
    }

    res.status(201).json({
      id: threadId,
      title,
      body,
      category: category || 'general',
      author_name: authorName,
      approval_status: approvalStatus,
      created_at: result.rows[0].created_at,
      message: "Your post has been published successfully!"
    });

  } catch (err) {
    console.error("Forum post error:", err);
    res.status(500).json({ error: "Failed to create forum post" });
  }
});

/**
 * Fetch all approved forum posts 
 */
router.get("/threads", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        title,
        body, 
        category,
        author_name,
        approval_status,
        created_at,
        updated_at
       FROM forum_threads
       WHERE approval_status = 'approved'
       ORDER BY created_at DESC
       LIMIT 100`
    );

    // Decrypt content before sending
    const decryptedPosts = result.rows.map((row) => ({
      id: row.id,
      title: decrypt(row.title),
      body: decrypt(row.body),
      category: row.category,
      author_name: row.author_name || "Anonymous",
      approval_status: row.approval_status,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json(decryptedPosts);
  } catch (err) {
    console.error("Fetch posts error:", err.message);
    res.status(500).json({ error: "Failed to fetch forum posts" });
  }
});

/**
 * Delete own forum post
 */
router.delete("/threads/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    console.log(`Attempting to delete post ${id} by user ${user_id}`);

    // Get post details before deleting
    const post = await pool.query(
      "SELECT title, user_id FROM forum_threads WHERE id=$1",
      [id]
    );

    if (post.rows.length === 0) {
      console.log(`Post ${id} not found`);
      return res.status(404).json({ error: "Post not found" });
    }

    // Check ownership
    if (post.rows[0].user_id !== user_id) {
      console.log(`User ${user_id} not authorized to delete post ${id}`);
      return res.status(403).json({ error: "You are not authorized to delete this post" });
    }

    const title = decrypt(post.rows[0].title);

    // Delete the post
    const deleteResult = await pool.query(
      "DELETE FROM forum_threads WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, user_id]
    );

    if (deleteResult.rows.length === 0) {
      console.log(`Failed to delete post ${id}`);
      return res.status(500).json({ error: "Failed to delete post" });
    }

    console.log(`Post ${id} deleted successfully`);

    // Create notification
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, related_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [user_id, 'forum_post_deleted', `Your post "${title}" has been deleted`, null]
      );
      console.log(`Delete notification created for user ${user_id}`);
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr.message);
      
    }

    res.json({ 
      message: "Post deleted successfully",
      id: parseInt(id)
    });

  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ 
      error: "Failed to delete post",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * Get single forum post by ID 
 */
router.get("/threads/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id, 
        title,
        body, 
        category,
        author_name,
        approval_status,
        user_id,
        created_at,
        updated_at
       FROM forum_threads
       WHERE id=$1 AND approval_status = 'approved'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const row = result.rows[0];

    res.json({
      id: row.id,
      title: decrypt(row.title),
      body: decrypt(row.body),
      category: row.category,
      author_name: row.author_name || "Anonymous",
      approval_status: row.approval_status,
      is_author: row.user_id === req.user.id,
      created_at: row.created_at,
      updated_at: row.updated_at
    });

  } catch (err) {
    console.error(" Get post error:", err.message);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

export default router;
