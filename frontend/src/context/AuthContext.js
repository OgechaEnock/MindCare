import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import api from "../services/api";

const AuthContext = createContext();

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore user session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedRefresh = localStorage.getItem("refreshToken");
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          // Access token expired — try refresh
          if (storedRefresh) {
            refreshToken(storedRefresh).catch(() => {
              localStorage.removeItem("authToken");
              localStorage.removeItem("refreshToken");
            });
          } else {
            localStorage.removeItem("authToken");
          }
        } else {
          setUser(decoded);
          setToken(storedToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        }
      } catch (err) {
        console.error("Invalid stored token:", err);
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
      }
    }
    setLoading(false);
  }, []);

  const refreshToken = async (refreshTokenValue) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refreshTokenValue}` } }
      );
      const newAccess = res.data.data?.access;
      if (newAccess) {
        localStorage.setItem("authToken", newAccess);
        const decoded = jwtDecode(newAccess);
        setUser(decoded);
        setToken(newAccess);
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;
        return newAccess;
      }
    } catch (err) {
      console.error("Token refresh failed:", err);
      throw err;
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      const res = await api.post("/api/auth/register", { name, email, password });
      const { access, refresh, user: userData } = res.data;

      if (!access) {
        throw new Error("No token received from server");
      }

      const decoded = jwtDecode(access);
      localStorage.setItem("authToken", access);
      localStorage.setItem("refreshToken", refresh);
      setToken(access);
      setUser(decoded);
      api.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      toast.success("Registration successful!");
      return { success: true };
    } catch (err) {
      console.error("Register error:", err);
      const message = err.response?.data?.error || "Registration failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const { access, refresh, user: userData } = res.data;

      if (!access) {
        throw new Error("No token received from server");
      }

      const decoded = jwtDecode(access);
      localStorage.setItem("authToken", access);
      localStorage.setItem("refreshToken", refresh);
      setToken(access);
      setUser(decoded);
      api.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      toast.success("Login successful!");
      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      const message = err.response?.data?.error || "Login failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  // Logout function
  const logout = async () => {
    const refreshTokenVal = localStorage.getItem("refreshToken");
    try {
      await api.post("/api/auth/logout", { refresh: refreshTokenVal });
    } catch (err) {
      // Ignore errors on logout — still clear client-side state
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setToken(null);
    delete axios.defaults.headers.common["Authorization"];
    toast.info("Logged out successfully");
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};