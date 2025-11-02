import express from "express";
import pool from "../config/db.js";
import { encrypt, decrypt } from "../utils/encrypt.js";
import { moderateText } from "../services/moderationService.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * 💬 Create a forum post with LLM moderation (Protected)
 * CRITICAL: Posts are moderated by the LLM API before being saved
 */
router.post("/threads", authenticateToken, async (req, res) => {
  try {
    const { title, body } = req.body;
    const user_id = req.user.id;

    if (!title || !body) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    if (title.length < 5) {
      return res.status(400).json({ error: "Title must be at least 5 characters" });
    }

    if (body.length < 10) {
      return res.status(400).json({ error: "Body must be at least 10 characters" });
    }

    console.log("🔍 Moderating forum post...");

    // ✅ CRITICAL: Moderate content using LLM API
    const combinedText = `${title}\n\n${body}`;
    let moderationResult;

    try {
      moderationResult = await moderateText(combinedText);
    } catch (moderationError) {
      console.error("❌ Moderation service error:", moderationError.message);
      
      // Handle rate limit error
      if (moderationError.message.includes("Rate limit")) {
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait a moment and try again.",
          retryAfter: 2 // seconds
        });
      }
      
      // Handle service unavailable
      if (moderationError.message.includes("unavailable") || moderationError.message.includes("connect")) {
        return res.status(503).json({ 
          error: "Moderation service is currently unavailable. Please try again later.",
          canRetry: true
        });
      }
      
      // Generic error
      return res.status(503).json({ 
        error: "Unable to moderate content at this time. Please try again later."
      });
    }

    // Check if content passed moderation
    if (!moderationResult.safety) {
      console.log("🚫 Post rejected by moderation");
      
      // Store rejected post for audit (optional)
      await pool.query(
        `INSERT INTO forum_posts (user_id, content, approved, moderation_status, moderation_categories, created_at)
         VALUES ($1, $2, false, 'rejected', $3, NOW())`,
        [user_id, encrypt(combinedText), JSON.stringify(moderationResult.categories)]
      );

      return res.status(403).json({
        error: "Your post could not be published due to safety concerns. Please review community guidelines.",
        categories: moderationResult.categories,
        status: "rejected"
      });
    }

    // ✅ Content is safe - encrypt and save
    const encryptedContent = encrypt(body);
    const encryptedTitle = encrypt(title);

    const result = await pool.query(
      `INSERT INTO forum_posts (user_id, content, approved, moderation_status, moderation_categories, created_at)
       VALUES ($1, $2, true, 'approved', $3, NOW()) RETURNING id, created_at`,
      [user_id, encryptedContent, JSON.stringify(moderationResult.categories)]
    );

    console.log("✅ Post approved and published");

    res.status(201).json({
      message: "Post published successfully after moderation",
      status: "approved",
      post: {
        id: result.rows[0].id,
        title,
        body,
        created_at: result.rows[0].created_at,
        moderation_categories: moderationResult.categories
      }
    });

  } catch (err) {
    console.error("❌ Forum post error:", err.message);
    res.status(500).json({ error: "Failed to create forum post" });
  }
});

/**
 * 📜 Fetch all approved forum posts (Public/Protected)
 */
router.get("/threads", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        fp.id, 
        fp.content, 
        fp.approved, 
        fp.moderation_status,
        fp.created_at,
        u.name as author_name
       FROM forum_posts fp
       LEFT JOIN users u ON fp.user_id = u.id
       WHERE fp.approved = true
       ORDER BY fp.created_at DESC
       LIMIT 50`
    );

    // Decrypt content before sending
    const decryptedPosts = result.rows.map((row) => ({
      id: row.id,
      title: "Forum Post", // You can add title field to schema if needed
      body: decrypt(row.content),
      author_name: row.author_name || "Anonymous",
      status: row.moderation_status,
      created_at: row.created_at
    }));

    res.json(decryptedPosts);
  } catch (err) {
    console.error("❌ Fetch posts error:", err.message);
    res.status(500).json({ error: "Failed to fetch forum posts" });
  }
});

/**
 * 🗑️ Delete own forum post (Protected)
 */
router.delete("/posts/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      "DELETE FROM forum_posts WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("❌ Delete post error:", err.message);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;