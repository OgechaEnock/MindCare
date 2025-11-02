import express from "express";
import pool from "../config/db.js";
import { encrypt, decrypt } from "../utils/encrypt.js";
import authenticateToken from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * 💊 Add a new medication (Protected)
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, dosage, frequency, reminderEnabled, reminderTimes } = req.body; // ✅ Added reminder fields
    const user_id = req.user.id;

    if (!name || !dosage || !frequency) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Encrypt sensitive fields
    const encName = encrypt(name);
    const encDosage = encrypt(dosage);
    const encFrequency = encrypt(frequency);

    const result = await pool.query(
      `INSERT INTO medications (user_id, name, dosage, frequency, reminder_enabled, reminder_times, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, created_at`,
      [user_id, encName, encDosage, encFrequency, reminderEnabled || false, reminderTimes || []]
    );

    res.status(201).json({
      message: "Medication added successfully",
      medication: {
        id: result.rows[0].id,
        name,
        dosage,
        frequency,
        reminder_enabled: reminderEnabled || false,
        reminder_times: reminderTimes || [],
        created_at: result.rows[0].created_at
      }
    });
  } catch (err) {
    console.error("❌ Add medication error:", err.message);
    res.status(500).json({ error: "Failed to add medication" });
  }
});

/**
 * 📋 Get all medications for current user (Protected)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      "SELECT id, name, dosage, frequency, reminder_enabled, reminder_times, created_at FROM medications WHERE user_id=$1 ORDER BY created_at DESC",
      [user_id]
    );

    // Decrypt fields before sending
    const decrypted = result.rows.map((row) => ({
      id: row.id,
      name: decrypt(row.name),
      dosage: decrypt(row.dosage),
      frequency: decrypt(row.frequency),
      reminder_enabled: row.reminder_enabled, // ✅ Added
      reminder_times: row.reminder_times || [], // ✅ Added
      created_at: row.created_at
    }));

    res.json(decrypted);
  } catch (err) {
    console.error("❌ Fetch medications error:", err.message);
    res.status(500).json({ error: "Failed to fetch medications" });
  }
});

/**
 * ✏️ Update medication reminder settings (Protected) ✅ NEW
 */
router.put("/:id/reminders", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reminderEnabled, reminderTimes } = req.body;
    const user_id = req.user.id;

    const result = await pool.query(
      `UPDATE medications 
       SET reminder_enabled = $1, reminder_times = $2 
       WHERE id = $3 AND user_id = $4 
       RETURNING id`,
      [reminderEnabled, reminderTimes, id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Medication not found" });
    }

    res.json({ 
      message: "Reminder settings updated successfully",
      reminder_enabled: reminderEnabled,
      reminder_times: reminderTimes
    });
  } catch (err) {
    console.error("❌ Update reminder error:", err.message);
    res.status(500).json({ error: "Failed to update reminder settings" });
  }
});

/**
 * 🗑️ Delete a medication (Protected)
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      "DELETE FROM medications WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Medication not found" });
    }

    res.json({ message: "Medication deleted successfully" });
  } catch (err) {
    console.error("❌ Delete medication error:", err.message);
    res.status(500).json({ error: "Failed to delete medication" });
  }
});

export default router;