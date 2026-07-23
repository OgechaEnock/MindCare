import api from './api';

/**
 * Register a new user
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise} Response data containing the access token
 */
export const registerUser = async (name, email, password) => {
  const response = await api.post('/api/auth/register', { name, email, password });
  return response.data;
};

/**
 * Log in an existing user
 * @param {string} email
 * @param {string} password
 * @returns {Promise} Response data containing the access token
 */
export const loginUser = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

/**
 * Fetch the currently authenticated user's profile
 * @returns {Promise}
 */
export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

const authService = {
  registerUser,
  loginUser,
  getCurrentUser,
};

export default authService;