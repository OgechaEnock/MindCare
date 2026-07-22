import api from "./api";

const login = async ({ email, password }) => {
  const response = await api.post("/api/auth/login", { email, password });
  return response.data;
};

const register = async (payload) => {
  const response = await api.post("/api/auth/register", payload);
  return response.data;
};

const getProfile = async () => {
  const response = await api.get("/api/auth/profile");
  return response.data;
};

const logout = () => {
  localStorage.removeItem("authToken");
};

const authService = {
  login,
  register,
  getProfile,
  logout,
};

export default authService;