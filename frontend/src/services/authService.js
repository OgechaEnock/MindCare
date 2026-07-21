import api from "./api";

const login = async (credentials) => {
  const response = await api.post("/api/auth/login", credentials);
  return response.data;
};

const register = async (userData) => {
  const response = await api.post("/api/auth/register", userData);
  return response.data;
};

const getProfile = async () => {
  const response = await api.get("/api/auth/profile");
  return response.data;
};

const logout = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
};

export default {
  login,
  register,
  getProfile,
  logout,
};