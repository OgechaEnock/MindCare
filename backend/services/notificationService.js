import pool from "../config/db.js";
import { decrypt } from "../utils/encrypt.js";

/**
 * Save notification to database for user to see in app
 */
export const createNotification = async (userId, type, title, message, relatedId = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, notification_type, title, message, related_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, type, title, message, relatedId]
    );
    console.log(`✅ Notification created for user ${userId}: ${title}`);
  } catch (error) {
    console.error("❌ Error creating notification:", error);
  }
};

/**
 * Get all unread notifications for a user
 */
export const getUserNotifications = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
  }
};

/**
 * Check medication reminders (called every minute by scheduler)
 */
export const checkMedicationReminders = async () => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // "HH:MM" format
    
    console.log(`⏰ Checking medication reminders at ${currentTime}...`);

    // Get all medications with reminders enabled
    const result = await pool.query(
      `SELECT m.id, m.user_id, m.name, m.dosage, m.reminder_times
       FROM medications m
       WHERE m.reminder_enabled = true
       AND m.reminder_times IS NOT NULL
       AND array_length(m.reminder_times, 1) > 0`
    );

    for (const med of result.rows) {
      const reminderTimes = med.reminder_times || [];
      
      // Check if current time matches any reminder time
      if (reminderTimes.includes(currentTime)) {
        const medName = decrypt(med.name);
        const medDosage = decrypt(med.dosage);
        
        await createNotification(
          med.user_id,
          'medication',
          '💊 Medication Reminder',
          `Time to take ${medName} (${medDosage})`,
          med.id
        );
        
        console.log(`✅ Sent medication reminder: ${medName} to user ${med.user_id}`);
      }
    }
  } catch (error) {
    console.error("❌ Error checking medication reminders:", error);
  }
};

/**
 * Check appointment reminders (called every hour by scheduler)
 */
export const checkAppointmentReminders = async () => {
  try {
    const now = new Date();
    console.log(`📅 Checking appointment reminders at ${now.toISOString()}...`);

    // Check 24-hour reminders
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const tomorrowHour = tomorrow.getHours();

    const result24h = await pool.query(
      `SELECT a.id, a.user_id, a.title, a.appointment_date, a.appointment_time
       FROM appointments a
       WHERE a.reminder_24h = true
       AND a.notified_24h = false
       AND a.appointment_date = $1
       AND EXTRACT(HOUR FROM a.appointment_time::time) = $2`,
      [tomorrowDate, tomorrowHour]
    );

    for (const apt of result24h.rows) {
      const title = decrypt(apt.title);
      const dateStr = new Date(apt.appointment_date).toLocaleDateString();
      
      await createNotification(
        apt.user_id,
        'appointment',
        '📅 Appointment Tomorrow',
        `${title} on ${dateStr} at ${apt.appointment_time}`,
        apt.id
      );

      // Mark as notified
      await pool.query(
        `UPDATE appointments SET notified_24h = true WHERE id = $1`,
        [apt.id]
      );
      
      console.log(`✅ Sent 24h appointment reminder: ${title} to user ${apt.user_id}`);
    }

    // Check 1-hour reminders
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourDate = oneHourLater.toISOString().split('T')[0];
    const oneHourTime = oneHourLater.toTimeString().substring(0, 5);

    const result1h = await pool.query(
      `SELECT a.id, a.user_id, a.title, a.appointment_date, a.appointment_time
       FROM appointments a
       WHERE a.reminder_1h = true
       AND a.notified_1h = false
       AND a.appointment_date = $1
       AND a.appointment_time::text LIKE $2`,
      [oneHourDate, oneHourTime + '%']
    );

    for (const apt of result1h.rows) {
      const title = decrypt(apt.title);
      
      await createNotification(
        apt.user_id,
        'appointment',
        '⏰ Appointment in 1 Hour',
        `${title} at ${apt.appointment_time}`,
        apt.id
      );

      // Mark as notified
      await pool.query(
        `UPDATE appointments SET notified_1h = true WHERE id = $1`,
        [apt.id]
      );
      
      console.log(`✅ Sent 1h appointment reminder: ${title} to user ${apt.user_id}`);
    }
  } catch (error) {
    console.error("❌ Error checking appointment reminders:", error);
  }
};

export default {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  checkMedicationReminders,
  checkAppointmentReminders
};