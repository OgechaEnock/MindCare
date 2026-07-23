import api from './api';

/**
 * Get all medications for the current user
 * @returns {Promise} Array of medications
 */
export const getMedications = async () => {
  const response = await api.get('/api/medications');
  return response.data;
};

/**
 * Add a new medication
 * @param {Object} medication - { name, dosage, frequency }
 * @returns {Promise}
 */
export const createMedication = async (medication) => {
  const response = await api.post('/api/medications', medication);
  return response.data;
};

/**
 * Update reminder settings for a medication
 * @param {number} id
 * @param {Object} reminderSettings - { reminderEnabled, reminderTimes }
 * @returns {Promise}
 */
export const updateMedicationReminders = async (id, reminderSettings) => {
  const response = await api.put(`/api/medications/${id}/reminders`, reminderSettings);
  return response.data;
};

/**
 * Delete a medication
 * @param {number} id
 * @returns {Promise}
 */
export const deleteMedication = async (id) => {
  const response = await api.delete(`/api/medications/${id}`);
  return response.data;
};

const medicationService = {
  getMedications,
  createMedication,
  updateMedicationReminders,
  deleteMedication,
};

export default medicationService;