import { createContext, useContext, useEffect, useMemo, useCallback, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

import authService from "../services/authService";
import {
  clearStorage,
  getToken,
  getUser,
  setToken,
  setUser,
} from "../utils/storage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setCurrentUser] = useState(getUser());
  const [loading, setLoading] = useState(true);

  const logout = useCallback((showMessage = true) => {
    authService.logout();

    clearStorage();

    setCurrentUser(null);

    if (showMessage) {
      toast.info("Logged out.");
    }
  }, []);

  const restoreSession = useCallback(() => {
    try {
      const token = getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const decoded = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        logout(false);
        return;
      }

      const savedUser = getUser();

      if (savedUser) {
        setCurrentUser(savedUser);
      } else {
        const newUser = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        };

        setCurrentUser(newUser);
        setUser(newUser);
      }
    } catch (error) {
      clearStorage();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await authService.login(credentials);

      const token =
        response.accessToken ||
        response.token ||
        response.access;

      if (!token) {
        throw new Error("Authentication token not received.");
      }

      const decoded = jwtDecode(token);

      const userData = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
      };

      setToken(token);
      setUser(userData);
      setCurrentUser(userData);

      toast.success("Welcome back!");

      return { success: true };
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Invalid email or password."
      );

      return { success: false };
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      await authService.register(payload);

      toast.success(
        "Account created successfully."
      );

      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Registration failed."
      );

      return false;
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      register,
      isAuthenticated: !!user,
    }),
    [user, loading, login, logout, register]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;