import React from "react";
import { Navbar, Nav, Container, Button, Badge } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <Navbar
        expand="lg"
        sticky="top"
        className="navbar-custom shadow"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container>
          <Navbar.Brand 
            as={Link} 
            to={user ? "/dashboard" : "/"} 
            className="brand-custom"
          >
            <i className="bi bi-brain me-2" style={{ fontSize: '1.5rem' }}></i>
            <span className="fw-bold">MindCare</span>
          </Navbar.Brand>

          <Navbar.Toggle 
            aria-controls="main-navbar-nav" 
            className="border-0"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '8px'
            }}
          >
            <span className="navbar-toggler-icon"></span>
          </Navbar.Toggle>

          <Navbar.Collapse id="main-navbar-nav">
            <Nav className="me-auto ms-lg-4">
              {user ? (
                <>
                  <Nav.Link 
                    as={Link} 
                    to="/dashboard"
                    className={`nav-link-custom ${isActive('/dashboard') ? 'active' : ''}`}
                  >
                    <i className="bi bi-speedometer2 me-2"></i>
                    Dashboard
                  </Nav.Link>
                  <Nav.Link 
                    as={Link} 
                    to="/medications"
                    className={`nav-link-custom ${isActive('/medications') ? 'active' : ''}`}
                  >
                    <i className="bi bi-capsule me-2"></i>
                    Medications
                  </Nav.Link>
                  <Nav.Link 
                    as={Link} 
                    to="/appointments"
                    className={`nav-link-custom ${isActive('/appointments') ? 'active' : ''}`}
                  >
                    <i className="bi bi-calendar-event me-2"></i>
                    Appointments
                  </Nav.Link>
                  <Nav.Link 
                    as={Link} 
                    to="/forum"
                    className={`nav-link-custom ${isActive('/forum') ? 'active' : ''}`}
                  >
                    <i className="bi bi-chat-dots me-2"></i>
                    Forum
                  </Nav.Link>
                  <Nav.Link 
                    as={Link} 
                    to="/profile"
                    className={`nav-link-custom ${isActive('/profile') ? 'active' : ''}`}
                  >
                    <i className="bi bi-person-circle me-2"></i>
                    Profile
                  </Nav.Link>
                </>
              ) : null}
            </Nav>

            <Nav className="align-items-lg-center">
              {user ? (
                <div className="d-flex align-items-center gap-2">
                  {/* Notification Bell */}
                  <NotificationBell />
                  
                  {/* User Info (desktop only) */}
                  <div className="text-white me-2 d-none d-lg-block">
                    <small className="opacity-75">Welcome,</small>
                    <div className="fw-bold" style={{ fontSize: '0.9rem' }}>
                      {user.name || user.email}
                    </div>
                  </div>
                  
                  {/* Logout Button */}
                  <Button
                    variant="light"
                    size="sm"
                    onClick={handleLogout}
                    className="logout-btn"
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="d-flex gap-2 mt-2 mt-lg-0">
                  <Button
                    as={Link}
                    to="/"
                    variant="outline-light"
                    size="sm"
                    className="auth-btn"
                  >
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Login
                  </Button>
                  <Button
                    as={Link}
                    to="/register"
                    variant="light"
                    size="sm"
                    className="auth-btn-register"
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Register
                  </Button>
                </div>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Custom Styles */}
      <style>{`
        .navbar-custom {
          padding: 1rem 0;
          backdrop-filter: blur(10px);
        }

        .brand-custom {
          color: white !important;
          font-size: 1.5rem;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .brand-custom:hover {
          transform: scale(1.05);
          opacity: 0.9;
        }

        .nav-link-custom {
          color: rgba(255, 255, 255, 0.9) !important;
          padding: 0.6rem 1rem !important;
          margin: 0.2rem;
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s ease;
          position: relative;
        }

        .nav-link-custom:hover {
          color: white !important;
          background-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .nav-link-custom.active {
          color: white !important;
          background-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .nav-link-custom.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 3px;
          background-color: white;
          border-radius: 2px;
        }

        .logout-btn {
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.3s ease;
          border: none;
        }

        .logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .auth-btn {
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          border: 2px solid white;
          transition: all 0.3s ease;
        }

        .auth-btn:hover {
          background-color: white;
          color: #667eea !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .auth-btn-register {
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          background-color: white;
          color: #667eea;
          border: 2px solid white;
          transition: all 0.3s ease;
        }

        .auth-btn-register:hover {
          background-color: transparent;
          color: white !important;
          border-color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .navbar-toggler {
          padding: 0.5rem;
        }

        .navbar-toggler:focus {
          box-shadow: 0 0 0 0.25rem rgba(255, 255, 255, 0.3);
        }

        /* Mobile responsiveness */
        @media (max-width: 991px) {
          .nav-link-custom {
            margin: 0.3rem 0;
          }

          .navbar-custom {
            padding: 0.8rem 0;
          }
        }

        /* Smooth collapse animation */
        .navbar-collapse {
          transition: height 0.3s ease;
        }
      `}</style>
    </>
  );
}

export default Navigation;