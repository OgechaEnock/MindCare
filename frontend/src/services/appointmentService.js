import api from './api';

/**
 * Get all appointments for the current user
 * @returns {Promise} Array of appointments
 */
export const getAppointments = async () => {
  const response = await api.get('/api/appointments');
  return response.data;
};

/**
 * Create a new appointment
 * @param {Object} appointment - { title, appointment_date, appointment_time, notes, reminder24h, reminder1h }
 * @returns {Promise}
 */
export const createAppointment = async (appointment) => {
  const response = await api.post('/api/appointments', appointment);
  return response.data;
};

/**
 * Update an existing appointment
 * @param {number} id
 * @param {Object} appointment
 * @returns {Promise}
 */
export const updateAppointment = async (id, appointment) => {
  const response = await api.put(`/api/appointments/${id}`, appointment);
  return response.data;
};

/**
 * Delete/cancel an appointment
 * @param {number} id
 * @returns {Promise}
 */
export const deleteAppointment = async (id) => {
  const response = await api.delete(`/api/appointments/${id}`);
  return response.data;
};

const appointmentService = {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};

export default appointmentService;