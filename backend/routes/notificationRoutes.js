import express from "express";
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

export default router;