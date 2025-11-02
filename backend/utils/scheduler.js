import cron from 'node-cron';
import { checkMedicationReminders, checkAppointmentReminders } from '../services/notificationService.js';

/**
 * Initialize notification scheduler
 */
export const initializeScheduler = () => {
  console.log('⏰ Initializing notification scheduler...');

  // Check medication reminders every minute
  cron.schedule('* * * * *', async () => {
    await checkMedicationReminders();
  });

  // Check appointment reminders every hour
  cron.schedule('0 * * * *', async () => {
    await checkAppointmentReminders();
  });

  console.log('✅ Notification scheduler started!');
  console.log('   - Medication reminders: Every minute');
  console.log('   - Appointment reminders: Every hour');
};

export default { initializeScheduler };