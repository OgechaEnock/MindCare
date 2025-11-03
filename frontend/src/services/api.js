import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);


/**
 * Get all notifications for current user
 * @returns {Promise} Array of notifications
 */
export const getNotifications = async () => {
  try {
    const response = await api.get('/api/notifications');
    return response.data;
  } catch (error) {
    console.error('Get notifications error:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @returns {Promise} Object with count property
 */
export const getUnreadCount = async () => {
  try {
    const response = await api.get('/api/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Get unread count error:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param {number} notificationId - ID of notification to mark as read
 * @returns {Promise}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Mark notification as read error:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @returns {Promise}
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.put('/api/notifications/mark-all-read');
    return response.data;
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {number} notificationId - ID of notification to delete
 * @returns {Promise}
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  } catch (error) {
    console.error('Delete notification error:', error);
    throw error;
  }
};

/**
 * Get pending appointment reminders
 * @returns {Promise} Object with reminders_24h and reminders_1h arrays
 */
export const getPendingReminders = async () => {
  try {
    const response = await api.get('/api/appointments/reminders/pending');
    return response.data;
  } catch (error) {
    console.error('Get pending reminders error:', error);
    throw error;
  }
};

/**
 * Mark appointment reminder as sent
 * @param {number} appointmentId - ID of appointment
 * @param {string} type - Type of reminder ('24h' or '1h')
 * @returns {Promise}
 */
export const markReminderAsSent = async (appointmentId, type) => {
  try {
    const response = await api.post(`/api/appointments/reminders/${appointmentId}/mark-sent`, { type });
    return response.data;
  } catch (error) {
    console.error('Mark reminder as sent error:', error);
    throw error;
  }
};

// Export notification methods 
export const notificationAPI = {
  getNotifications,
  getUnreadCount,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  deleteNotification,
  getPendingReminders,
  markReminderAsSent
};

export default api;