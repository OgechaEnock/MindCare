import express from "express";
import pool from "../config/db.js";
import authenticateToken from "../middleware/authMiddleware.js";
import { getUserNotifications, markNotificationAsRead } from "../services/notificationService.js";

const router = express.Router();

/**
 * Get all notifications for current user 
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

/**
 * Get unread notification count
 */
router.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error("Get unread count error:", err);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

/**
 * Mark notification as read 
 */
router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    await markNotificationAsRead(req.params.id, req.user.id);
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Mark notification as read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

/**
 * Mark all notifications as read
 */
router.put("/mark-all-read", authenticateToken, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1",
      [req.user.id]
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

/**
 * Delete a notification
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;