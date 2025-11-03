import express from "express";
import pool from "../config/db.js";
import { encrypt, decrypt } from "../utils/encrypt.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Get all medical history entries for user 
 */
router.get("/medical-history", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT id, diagnosis, conditions, allergies, notes, created_at, updated_at 
       FROM medical_history 
       WHERE user_id=$1 
       ORDER BY created_at DESC`,
      [user_id]
    );

    // Decrypt all entries
    const decrypted = result.rows.map(history => ({
      id: history.id,
      diagnosis: history.diagnosis ? decrypt(history.diagnosis) : "",
      conditions: history.conditions ? decrypt(history.conditions) : "",
      allergies: history.allergies ? decrypt(history.allergies) : "",
      notes: history.notes ? decrypt(history.notes) : "",
      created_at: history.created_at,
      updated_at: history.updated_at
    }));

    res.json(decrypted);
  } catch (err) {
    console.error("Get medical history error:", err.message);
    res.status(500).json({ error: "Failed to fetch medical history" });
  }
});

/**
 * Get single medical history entry 
 */
router.get("/medical-history/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT id, diagnosis, conditions, allergies, notes, created_at, updated_at 
       FROM medical_history 
       WHERE id=$1 AND user_id=$2`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Medical history entry not found" });
    }

    const history = result.rows[0];

    // Decrypt fields
    const decrypted = {
      id: history.id,
      diagnosis: history.diagnosis ? decrypt(history.diagnosis) : "",
      conditions: history.conditions ? decrypt(history.conditions) : "",
      allergies: history.allergies ? decrypt(history.allergies) : "",
      notes: history.notes ? decrypt(history.notes) : "",
      created_at: history.created_at,
      updated_at: history.updated_at
    };

    res.json(decrypted);
  } catch (err) {
    console.error("Get medical history entry error:", err.message);
    res.status(500).json({ error: "Failed to fetch medical history entry" });
  }
});

/**
 * ➕ Add new medical history entry 
 */
router.post("/medical-history", authenticateToken, async (req, res) => {
  try {
    const { diagnosis, conditions, allergies, notes } = req.body;
    const user_id = req.user.id;

    // At least one field should be provided
    if (!diagnosis && !conditions && !allergies && !notes) {
      return res.status(400).json({ 
        error: "At least one field (diagnosis, conditions, allergies, or notes) is required" 
      });
    }

    // Encrypt fields
    const encDiagnosis = diagnosis ? encrypt(diagnosis) : null;
    const encConditions = conditions ? encrypt(conditions) : null;
    const encAllergies = allergies ? encrypt(allergies) : null;
    const encNotes = notes ? encrypt(notes) : null;

    const result = await pool.query(
      `INSERT INTO medical_history (user_id, diagnosis, conditions, allergies, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, created_at`,
      [user_id, encDiagnosis, encConditions, encAllergies, encNotes]
    );

    res.status(201).json({ 
      message: "Medical history entry added successfully",
      id: result.rows[0].id,
      created_at: result.rows[0].created_at
    });
  } catch (err) {
    console.error("Add medical history error:", err.message);
    res.status(500).json({ error: "Failed to add medical history entry" });
  }
});

/**
 * Update medical history entry 
 */
router.put("/medical-history/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, conditions, allergies, notes } = req.body;
    const user_id = req.user.id;

    // Check if entry exists and belongs to user
    const existing = await pool.query(
      "SELECT id FROM medical_history WHERE id=$1 AND user_id=$2",
      [id, user_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Medical history entry not found" });
    }

    // Encrypt fields
    const encDiagnosis = diagnosis ? encrypt(diagnosis) : null;
    const encConditions = conditions ? encrypt(conditions) : null;
    const encAllergies = allergies ? encrypt(allergies) : null;
    const encNotes = notes ? encrypt(notes) : null;

    await pool.query(
      `UPDATE medical_history 
       SET diagnosis=$1, conditions=$2, allergies=$3, notes=$4, updated_at=NOW()
       WHERE id=$5 AND user_id=$6`,
      [encDiagnosis, encConditions, encAllergies, encNotes, id, user_id]
    );

    res.json({ message: "Medical history entry updated successfully" });
  } catch (err) {
    console.error("Update medical history error:", err.message);
    res.status(500).json({ error: "Failed to update medical history entry" });
  }
});

/**
 * Delete medical history entry 
 */
router.delete("/medical-history/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      "DELETE FROM medical_history WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Medical history entry not found" });
    }

    res.json({ message: "Medical history entry deleted successfully" });
  } catch (err) {
    console.error("Delete medical history error:", err.message);
    res.status(500).json({ error: "Failed to delete medical history entry" });
  }
});

/**
 * Get user profile 
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id=$1",
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;