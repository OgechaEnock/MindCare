import express from "express";
import pool from "../config/db.js";
import { encrypt, decrypt } from "../utils/encrypt.js";
import authenticateToken from "../middleware/authMiddleware.js";
import { getAppointmentStatus } from "../utils/timeUtils.js";

const router = express.Router();

/**
 * Add an appointment 
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, appointment_date, appointment_time, notes, reminder_24h, reminder_1h } = req.body;
    const user_id = req.user.id;

    if (!title || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: "Title, date, and time are required" });
    }

    const encTitle = encrypt(title);
    const encNotes = notes ? encrypt(notes) : null;

    // Default reminders to true if not specified
    const enable24h = reminder_24h !== false;
    const enable1h = reminder_1h !== false;

    const result = await pool.query(
      `INSERT INTO appointments (user_id, title, appointment_date, appointment_time, notes, reminder_24h, reminder_1h, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       RETURNING id, appointment_date, appointment_time, created_at`,
      [user_id, encTitle, appointment_date, appointment_time, encNotes, enable24h, enable1h]
    );

    const appointmentId = result.rows[0].id;
    const status = getAppointmentStatus(result.rows[0].appointment_date, result.rows[0].appointment_time);

    // Create notification for new appointment
    if (status === 'Upcoming') {
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, related_id, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            user_id,
            'appointment_created',
            `New appointment: ${title} on ${appointment_date} at ${appointment_time}`,
            appointmentId
          ]
        );
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr.message);
        // Don't fail the whole request if notification fails
      }
    }

    res.status(201).json({
      message: "Appointment added successfully",
      appointment: {
        id: appointmentId,
        title,
        appointment_date: result.rows[0].appointment_date,
        appointment_time: result.rows[0].appointment_time,
        notes,
        reminder_24h: enable24h,
        reminder_1h: enable1h,
        status,
        created_at: result.rows[0].created_at
      }
    });
  } catch (err) {
    console.error("Add appointment error:", err.message);
    res.status(500).json({ error: "Failed to add appointment" });
  }
});

/**
 * Get all appointments for current user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT id, title, appointment_date, appointment_time, notes, reminder_24h, reminder_1h, 
              notified_24h, notified_1h, created_at 
       FROM appointments 
       WHERE user_id=$1 
       ORDER BY appointment_date ASC, appointment_time ASC`,
      [user_id]
    );

    const decrypted = result.rows.map((row) => {
      const title = decrypt(row.title);
      const notes = row.notes ? decrypt(row.notes) : null;
      const status = getAppointmentStatus(row.appointment_date, row.appointment_time);

      return {
        id: row.id,
        title,
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time,
        notes,
        reminder_24h: row.reminder_24h,
        reminder_1h: row.reminder_1h,
        notified_24h: row.notified_24h,
        notified_1h: row.notified_1h,
        status,
        created_at: row.created_at
      };
    });

    res.json(decrypted);
  } catch (err) {
    console.error("Fetch appointments error:", err.message);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

/**
 *  Delete an appointment 
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Get appointment details before deleting
    const appointment = await pool.query(
      "SELECT title, appointment_date, appointment_time FROM appointments WHERE id=$1 AND user_id=$2",
      [id, user_id]
    );

    if (appointment.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const title = decrypt(appointment.rows[0].title);
    const status = getAppointmentStatus(appointment.rows[0].appointment_date, appointment.rows[0].appointment_time);

    // Delete the appointment
    const result = await pool.query(
      "DELETE FROM appointments WHERE id=$1 AND user_id=$2 RETURNING id",
      [id, user_id]
    );

    // Create notification for deleted appointment
    if (status === 'Upcoming') {
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, related_id, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            user_id,
            'appointment_cancelled',
            `Appointment cancelled: ${title}`,
            null
          ]
        );
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr.message);
      }
    }

    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    console.error("Delete appointment error:", err.message);
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

export default router;