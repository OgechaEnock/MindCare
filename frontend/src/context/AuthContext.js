import { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

const AuthContext = createContext();

// ✅ Configure axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Restore user session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          console.log("Token expired, clearing...");
          localStorage.removeItem("authToken");
        } else {
          setUser(decoded);
          setToken(storedToken);
          axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        }
      } catch (err) {
        console.error("Invalid stored token:", err);
        localStorage.removeItem("authToken");
      }
    }
    setLoading(false);
  }, []);

  // ✅ Register function
  const register = async (name, email, password) => {
    try {
      const res = await axios.post("/api/auth/register", { 
        name, 
        email, 
        password 
      });

      const { access, user: userData } = res.data;

      if (!access) {
        throw new Error("No token received from server");
      }

      // Decode token to get user info
      const decoded = jwtDecode(access);

      // Store token
      localStorage.setItem("authToken", access);
      setToken(access);
      setUser(decoded);

      // Set axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      toast.success("Registration successful!");
      return { success: true };
    } catch (err) {
      console.error("Register error:", err);
      const message = err.response?.data?.error || "Registration failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  // ✅ Login function
  const login = async (email, password) => {
    try {
      const res = await axios.post("/api/auth/login", { 
        email, 
        password 
      });

      const { access, user: userData } = res.data;

      if (!access) {
        throw new Error("No token received from server");
      }

      // Decode token
      const decoded = jwtDecode(access);

      // Store token
      localStorage.setItem("authToken", access);
      setToken(access);
      setUser(decoded);

      // Set axios default header
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      toast.success("Login successful!");
      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      const message = err.response?.data?.error || "Login failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  // ✅ Logout function
  const logout = () => {
    localStorage.removeItem("authToken");
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

// ✅ Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};