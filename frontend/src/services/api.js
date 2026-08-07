import axios from 'axios';

// The Flask API is the single backend contract used by the frontend. Keeping
// this value in one place prevents the proxy and direct Axios calls drifting.
export const API_BASE_URL =(process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - unwrap standardized envelope + refresh logic
api.interceptors.response.use(
  (response) => {
    // Unwrap { success, message, data } envelope for success responses
    if (response.data && typeof response.data === 'object' && response.data.success === true) {
      const { data, message, ...rest } = response.data;
      // If data is null/undefined, use rest (for cases like forum pending posts)
      if (data !== null && data !== undefined) {
        response.data = data;
        // Preserve extra fields like 'warning' by merging into data if it's an object
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          const extraKeys = Object.keys(rest).filter(k => k !== 'message');
          if (extraKeys.length > 0) {
            response.data = { ...data, ...Object.fromEntries(extraKeys.map(k => [k, rest[k]])) };
          }
        }
      } else {
        // data is null — keep the full envelope (e.g., logout, mark-read)
        response.data = rest;
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 — try to refresh the access token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const authPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];
      if (!authPaths.some(p => originalRequest.url.includes(p))) {
        originalRequest._retry = true;

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(api(originalRequest));
              },
              reject,
            });
          });
        }

        isRefreshing = true;
        const refreshToken = localStorage.getItem('refreshToken');

        try {
          if (!refreshToken) {
            throw new Error('No refresh token is available');
          }

          const res = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } }
          );
          const newAccessToken = res.data?.data?.access;
          if (!newAccessToken) {
            throw new Error('Refresh response did not include an access token');
          }

          localStorage.setItem('authToken', newAccessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Map 'message' to 'error' field for backward compatibility
    if (error.response?.data && typeof error.response.data === 'object') {
      if (!error.response.data.error && error.response.data.message) {
        error.response.data.error = error.response.data.message;
      }
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
 * @returns {Promise} Array of pending reminders
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
