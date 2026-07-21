import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import BottomBar from "./components/BottomBar"; 
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Medications from "./pages/Medications";
import Appointments from "./pages/Appointments";
import Forum from "./pages/Forum";
import Profile from "./pages/Profile";

// Loading Screen
function LoadingScreen() {
  return (
    <div className="mc-loading-screen">
      <div className="mc-loading-content">
        <i className="bi bi-brain mc-loading-logo"></i>
        <div className="mc-loading-spinner"></div>
        <p className="mc-loading-text">Loading...</p>
      </div>
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

// Public Route
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// Layout Manager
function Layout() {
  const { user } = useAuth();
  const location = useLocation();

  // Detect login/register pages
  const isAuthPage = ["/", "/register"].includes(location.pathname);

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Hide Navigation on auth pages for a cleaner look */}
      {!isAuthPage && <Navigation />}

      <main className="flex-grow-1">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medications"
            element={
              <ProtectedRoute>
                <Medications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forum"
            element={
              <ProtectedRoute>
                <Forum />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Redirect unknown paths */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      {user && !isAuthPage && <Footer />}

      {/* BottomBar */}
      {!user && isAuthPage && <BottomBar />}
    </div>
  );
}

// App Routes
function AppRoutes() {
  return (
    <BrowserRouter>
      <Layout />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        className="rounded"
      />
    </BrowserRouter>
  );
}

// Main App
function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;